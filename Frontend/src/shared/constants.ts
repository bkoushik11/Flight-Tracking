/**
 * Shared constants and utility functions for the Flight Tracker application
 * Centralizes common values and functions to avoid duplication across components
 */

// Flight status definitions with consistent styling
export const FLIGHT_STATUSES = {
  ON_TIME: 'on-time',
  DELAYED: 'delayed',
  LANDED: 'landed',
  LOST_COMM: 'lost-comm'
} as const;

export type FlightStatus = typeof FLIGHT_STATUSES[keyof typeof FLIGHT_STATUSES];

// Status color mappings for consistent UI
export const STATUS_COLORS = {
  [FLIGHT_STATUSES.ON_TIME]: '#10b981',    // Green
  [FLIGHT_STATUSES.DELAYED]: '#f59e0b',    // Yellow
  [FLIGHT_STATUSES.LANDED]: '#3b82f6',     // Blue
  [FLIGHT_STATUSES.LOST_COMM]: '#ef4444'   // Red
} as const;

// Status background colors for UI components
export const STATUS_BG_COLORS = {
  [FLIGHT_STATUSES.ON_TIME]: 'bg-green-100 text-green-600',
  [FLIGHT_STATUSES.DELAYED]: 'bg-yellow-100 text-yellow-600',
  [FLIGHT_STATUSES.LANDED]: 'bg-gray-100 text-gray-600',
  [FLIGHT_STATUSES.LOST_COMM]: 'bg-red-100 text-red-600'
} as const;

// Application configuration
export const APP_CONFIG = {
  DEFAULT_FLIGHT_COUNT: 80,
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
 * Get status color for a given flight status
 * @param status - Flight status
 * @returns Hex color code
 */
export function getStatusColor(status: FlightStatus): string {
  return STATUS_COLORS[status] || STATUS_COLORS[FLIGHT_STATUSES.ON_TIME];
}

/**
 * Get status background color classes for UI components
 * @param status - Flight status
 * @returns Tailwind CSS classes
 */
export function getStatusBgColor(status: FlightStatus): string {
  return STATUS_BG_COLORS[status] || STATUS_BG_COLORS[FLIGHT_STATUSES.ON_TIME];
}

/**
 * Format flight status for display
 * @param status - Flight status
 * @returns Formatted status string
 */
export function formatFlightStatus(status: FlightStatus): string {
  return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

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
