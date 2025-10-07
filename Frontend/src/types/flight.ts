export interface Flight {
  id: string;
  flightNumber: string;
  latitude: number;
  longitude: number;
  altitude: number; // feet
  speed: number; // knots
  heading: number; // degrees
  // status: FlightStatus; // Removed as requested
  aircraft: string;
  origin: string;
  destination: string;
  lastUpdate: Date;
  path: [number, number][];
}

// export type FlightStatus = 
//   | 'on-time' 
//   | 'delayed' 
//   | 'landed' 
//   | 'lost-comm'
//   | 'boarding'; // Removed as requested