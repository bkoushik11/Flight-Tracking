/**
 * Geographic utility functions for flight tracking
 * Centralizes all geographic calculations to avoid duplication
 */

/**
 * Calculate the distance between two geographic points using the Haversine formula
 * @param {Array<number>} point1 - [latitude, longitude] of first point
 * @param {Array<number>} point2 - [latitude, longitude] of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the bearing (heading) from one point to another
 * @param {Array<number>} from - [latitude, longitude] of starting point
 * @param {Array<number>} to - [latitude, longitude] of destination point
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(from, to) {
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Check if a point is within a circular area
 * @param {Array<number>} point - [latitude, longitude] of the point
 * @param {Array<number>} center - [latitude, longitude] of the circle center
 * @param {number} radius - Radius in meters
 * @returns {boolean} True if point is within the circle
 */
function isPointInCircle(point, center, radius) {
  return calculateDistance(point, center) <= radius;
}

/**
 * Generate a random point within geographic bounds
 * @param {Object} bounds - {latMin, latMax, lngMin, lngMax}
 * @returns {Array<number>} [latitude, longitude]
 */
function randomPointInBounds(bounds) {
  const lat = bounds.latMin + Math.random() * (bounds.latMax - bounds.latMin);
  const lng = bounds.lngMin + Math.random() * (bounds.lngMax - bounds.lngMin);
  return [lat, lng];
}

/**
 * Interpolate between two points
 * @param {Array<number>} point1 - [latitude, longitude] of first point
 * @param {Array<number>} point2 - [latitude, longitude] of second point
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {Array<number>} Interpolated [latitude, longitude]
 */
function interpolatePoint(point1, point2, factor) {
  const [lat1, lng1] = point1;
  const [lat2, lng2] = point2;
  
  return [
    lat1 + (lat2 - lat1) * factor,
    lng1 + (lng2 - lng1) * factor
  ];
}

module.exports = {
  calculateDistance,
  toRadians,
  calculateBearing,
  isPointInCircle,
  randomPointInBounds,
  interpolatePoint
};
