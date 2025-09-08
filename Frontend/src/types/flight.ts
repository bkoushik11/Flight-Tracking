export interface Flight {
  id: string;
  flightNumber: string;
  latitude: number;
  longitude: number;
  altitude: number; // feet
  speed: number; // knots
  heading: number; // degrees
  status: FlightStatus;
  aircraft: string;
  origin: string;
  destination: string;
  lastUpdate: Date;
  path: [number, number][];
}

export type FlightStatus = 
  | 'on-time' 
  | 'delayed' 
  | 'landed' 
  | 'lost-communication';

export interface RestrictedZone {
  id: string;
  name: string;
  center: [number, number];
  radius: number; // meters
  type: 'military' | 'airport' | 'restricted';
}

export interface Alert {
  id: string;
  flightId: string;
  type: 'restricted-zone' | 'lost-comm';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}