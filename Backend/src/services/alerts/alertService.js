const { v4: uuidv4 } = require('uuid');
const { calculateDistance } = require('../../utils/geoUtils');

/**
 * AlertService - Manages flight alerts and restricted zone monitoring
 * 
 * This service handles:
 * - Lost communication alerts
 * - Restricted zone entry/exit alerts
 * - Alert lifecycle management (create, dismiss, clear)
 * - Geographic calculations for zone violations
 */
class AlertService {
  constructor() {
    // In-memory storage for alerts
    this.alerts = new Map(); // Store alerts by ID
    this.flightAlerts = new Map(); // Track alerts per flight for deduplication
    
    // Initialize restricted zones for monitoring
    this.restrictedZones = this._initializeRestrictedZones();
  }

  /**
   * Initialize predefined restricted zones for monitoring
   * These represent real-world restricted airspace areas in India
   * @returns {Array<Object>} Array of restricted zone objects
   */
  _initializeRestrictedZones() {
    return [
      {
        id: 'zone-1',
        name: 'Delhi Military Zone',
        center: [28.6139, 77.2090], // Delhi coordinates
        radius: 50000, // 50km radius
        type: 'military'
      },
      {
        id: 'zone-2', 
        name: 'Mumbai Airport Zone',
        center: [19.0896, 72.8656], // Mumbai coordinates
        radius: 30000, // 30km radius
        type: 'airport'
      },
      {
        id: 'zone-3',
        name: 'Bangalore Restricted Zone',
        center: [12.9716, 77.5946], // Bangalore coordinates
        radius: 40000, // 40km radius
        type: 'restricted'
      },
      {
        id: 'zone-4',
        name: 'Chennai Airport Zone',
        center: [13.0827, 80.2707], // Chennai coordinates
        radius: 25000, // 25km radius
        type: 'airport'
      }
    ];
  }

  /**
   * Check for lost communication alerts
   * Monitors flights with 'lost comm' status and creates/manages alerts accordingly
   * @param {Array<Object>} flights - Array of flight objects to check
   * @returns {Array<Object>} Array of new alerts created
   */
  checkLostCommunication(flights) {
    const newAlerts = [];
    
    flights.forEach(flight => {
      const alertKey = `lost-comm-${flight.id}`;
      
      if (flight.status === 'lost comm') {
        // Only create alert if we don't already have one for this flight
        if (!this.flightAlerts.has(alertKey)) {
          const alert = {
            id: uuidv4(),
            flightId: flight.id,
            type: 'lost-comm',
            message: `Flight ${flight.flightNumber} has lost communication`,
            timestamp: new Date(),
            severity: 'high'
          };
          
          this.alerts.set(alert.id, alert);
          this.flightAlerts.set(alertKey, alert.id);
          newAlerts.push(alert);
        }
      } else {
        // If flight is no longer in lost comm status, remove the alert
        if (this.flightAlerts.has(alertKey)) {
          const alertId = this.flightAlerts.get(alertKey);
          this.alerts.delete(alertId);
          this.flightAlerts.delete(alertKey);
        }
      }
    });
    
    return newAlerts;
  }

  /**
   * Check for restricted zone entry/exit alerts
   * Monitors flights entering or exiting restricted airspace zones
   * @param {Array<Object>} flights - Array of flight objects to check
   * @returns {Array<Object>} Array of new alerts created
   */
  checkRestrictedZoneEntry(flights) {
    const newAlerts = [];
    
    flights.forEach(flight => {
      this.restrictedZones.forEach(zone => {
        const alertKey = `restricted-zone-${flight.id}-${zone.id}`;
        
        // Calculate distance from flight to zone center
        const distance = calculateDistance(
          [flight.latitude, flight.longitude],
          zone.center
        );
        
        if (distance <= zone.radius) {
          // Flight is inside the restricted zone
          if (!this.flightAlerts.has(alertKey)) {
            const alert = {
              id: uuidv4(),
              flightId: flight.id,
              type: 'restricted-zone',
              message: `Flight ${flight.flightNumber} has entered ${zone.name}`,
              timestamp: new Date(),
              severity: this._getZoneSeverity(zone.type),
              zoneId: zone.id,
              zoneName: zone.name,
              zoneType: zone.type
            };
            
            this.alerts.set(alert.id, alert);
            this.flightAlerts.set(alertKey, alert.id);
            newAlerts.push(alert);
          }
        } else {
          // Flight is outside the zone - remove alert if it exists
          if (this.flightAlerts.has(alertKey)) {
            const alertId = this.flightAlerts.get(alertKey);
            this.alerts.delete(alertId);
            this.flightAlerts.delete(alertKey);
          }
        }
      });
    });
    
    return newAlerts;
  }

  /**
   * Get severity level based on zone type
   * @param {string} zoneType - Type of restricted zone
   * @returns {string} Severity level ('high', 'medium', 'low')
   */
  _getZoneSeverity(zoneType) {
    const severityMap = {
      'military': 'high',
      'restricted': 'medium',
      'airport': 'low'
    };
    return severityMap[zoneType] || 'low';
  }

  /**
   * Process all flights and generate alerts
   * Main entry point for alert processing - checks all alert types
   * @param {Array<Object>} flights - Array of flight objects to process
   * @returns {Array<Object>} Combined array of all new alerts
   */
  processFlights(flights) {
    const lostCommAlerts = this.checkLostCommunication(flights);
    const restrictedZoneAlerts = this.checkRestrictedZoneEntry(flights);
    
    return [...lostCommAlerts, ...restrictedZoneAlerts];
  }

  /**
   * Get all active alerts
   * @returns {Array<Object>} Array of all current alerts
   */
  getAllAlerts() {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alerts for a specific flight
   * @param {string} flightId - ID of the flight
   * @returns {Array<Object>} Array of alerts for the specified flight
   */
  getFlightAlerts(flightId) {
    return Array.from(this.alerts.values()).filter(alert => alert.flightId === flightId);
  }

  /**
   * Dismiss an alert by ID
   * Removes the alert from both storage maps
   * @param {string} alertId - ID of the alert to dismiss
   * @returns {boolean} True if alert was found and dismissed, false otherwise
   */
  dismissAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      // Remove from flight alerts tracking
      const alertKey = `${alert.type}-${alert.flightId}${alert.zoneId ? `-${alert.zoneId}` : ''}`;
      this.flightAlerts.delete(alertKey);
      
      // Remove from main alerts
      this.alerts.delete(alertId);
      return true;
    }
    return false;
  }

  /**
   * Get all restricted zones
   * @returns {Array<Object>} Array of restricted zone objects
   */
  getRestrictedZones() {
    return this.restrictedZones;
  }

  /**
   * Clear all alerts
   * Removes all alerts from storage (useful for testing or reset)
   */
  clearAllAlerts() {
    this.alerts.clear();
    this.flightAlerts.clear();
  }
}

module.exports = new AlertService();
