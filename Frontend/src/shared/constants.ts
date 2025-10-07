/**
 * Shared constants and utility functions for the Flight Tracker application
 * Centralizes common values and functions to avoid duplication across components
 */

// Application configuration
export const APP_CONFIG = {
  DEFAULT_FLIGHT_COUNT: Number.MAX_SAFE_INTEGER, // Set to maximum for unlimited flights
  UPDATE_INTERVAL: 10000, // Increased from 3000 to 10000 for more stable updates
  MAX_HISTORY_LENGTH: 50,
  ICON_CACHE_BUCKET_SIZE: 15, // Degrees
  THROTTLE_INTERVAL: 300, // Milliseconds
  RECONNECT_MAX_ATTEMPTS: 10,
  RECONNECT_DELAY: 1000
} as const;

// UI configuration
export const UI_CONFIG = {
  MAP_DEFAULT_CENTER: [20.0, 77.0] as [number, number],
  MAP_DEFAULT_ZOOM: 3,
  MAP_FOCUS_ZOOM: 5,
  POPUP_MAX_WIDTH: 'min-w-48',
  MODAL_MAX_WIDTH: 'max-w-2xl',
  ANIMATION_DURATION: 1.5
} as const;

/**
 * Format altitude for display
 * @param altitude - Altitude in feet
 * @returns Formatted altitude string
 */
export function formatAltitude(altitude: number): string {
  return altitude.toLocaleString() + ' ft';
}

/**
 * Format speed for display
 * @param speed - Speed in knots
 * @returns Formatted speed string
 */
export function formatSpeed(speed: number): string {
  return speed + ' kts';
}

/**
 * Format heading for display
 * @param heading - Heading in degrees
 * @returns Formatted heading string
 */
export function formatHeading(heading: number): string {
  return heading + '°';
}
