const { v4: uuidv4 } = require('uuid');

class AlertService {
  constructor() {
    this.alerts = new Map(); // Store alerts by ID
    this.flightAlerts = new Map(); // Track alerts per flight
    this.restrictedZones = this._initializeRestrictedZones();
  }

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

  // Check for lost communication alerts
  checkLostCommunication(flights) {
    const newAlerts = [];
    
    flights.forEach(flight => {
      if (flight.status === 'lost comm') {
        const alertKey = `lost-comm-${flight.id}`;
        
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
        const alertKey = `lost-comm-${flight.id}`;
        if (this.flightAlerts.has(alertKey)) {
          const alertId = this.flightAlerts.get(alertKey);
          this.alerts.delete(alertId);
          this.flightAlerts.delete(alertKey);
        }
      }
    });
    
    return newAlerts;
  }

  // Check for restricted zone entry alerts
  checkRestrictedZoneEntry(flights) {
    const newAlerts = [];
    
    flights.forEach(flight => {
      this.restrictedZones.forEach(zone => {
        const distance = this._calculateDistance(
          [flight.latitude, flight.longitude],
          zone.center
        );
        
        if (distance <= zone.radius) {
          const alertKey = `restricted-zone-${flight.id}-${zone.id}`;
          
          // Only create alert if we don't already have one for this flight in this zone
          if (!this.flightAlerts.has(alertKey)) {
            const alert = {
              id: uuidv4(),
              flightId: flight.id,
              type: 'restricted-zone',
              message: `Flight ${flight.flightNumber} has entered ${zone.name}`,
              timestamp: new Date(),
              severity: zone.type === 'military' ? 'high' : zone.type === 'restricted' ? 'medium' : 'low',
              zoneId: zone.id,
              zoneName: zone.name,
              zoneType: zone.type
            };
            
            this.alerts.set(alert.id, alert);
            this.flightAlerts.set(alertKey, alert.id);
            newAlerts.push(alert);
          }
        } else {
          // If flight is no longer in the zone, remove the alert
          const alertKey = `restricted-zone-${flight.id}-${zone.id}`;
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

  // Calculate distance between two points in meters
  _calculateDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this._toRadians(point2[0] - point1[0]);
    const dLon = this._toRadians(point2[1] - point1[1]);
    const lat1 = this._toRadians(point1[0]);
    const lat2 = this._toRadians(point2[0]);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  _toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Process all flights and generate alerts
  processFlights(flights) {
    const lostCommAlerts = this.checkLostCommunication(flights);
    const restrictedZoneAlerts = this.checkRestrictedZoneEntry(flights);
    
    return [...lostCommAlerts, ...restrictedZoneAlerts];
  }

  // Get all active alerts
  getAllAlerts() {
    return Array.from(this.alerts.values());
  }

  // Get alerts for a specific flight
  getFlightAlerts(flightId) {
    return Array.from(this.alerts.values()).filter(alert => alert.flightId === flightId);
  }

  // Dismiss an alert
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

  // Get restricted zones
  getRestrictedZones() {
    return this.restrictedZones;
  }

  // Clear all alerts
  clearAllAlerts() {
    this.alerts.clear();
    this.flightAlerts.clear();
  }
}

module.exports = new AlertService();
