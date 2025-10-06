import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

// Create airport icon
const createAirportIcon = () => {
  return L.divIcon({
    className: 'custom-airport-icon',
    html: `
      <div style="
        width: 20px; 
        height: 20px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
      ">
        <div style="
          width: 16px; 
          height: 16px; 
          background: #f59e0b; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
        ">
          <div style="
            width: 6px; 
            height: 6px; 
            background: white; 
            border-radius: 50%;
          "></div>
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Define major Indian airports (30 airports)
export const INDIAN_AIRPORTS = [
  { name: "Indira Gandhi International Airport", city: "New Delhi", lat: 28.556160, lng: 77.100281 },
  { name: "Chhatrapati Shivaji International Airport", city: "Mumbai", lat: 19.097403, lng: 72.874245 },
  { name: "Kempegowda International Airport", city: "Bangalore", lat: 13.199379, lng: 77.710136 },
  { name: "Chennai International Airport", city: "Chennai", lat: 12.994444, lng: 80.170833 },
  { name: "Netaji Subhash Chandra Bose International Airport", city: "Kolkata", lat: 22.654733, lng: 88.446722 },
  { name: "Rajiv Gandhi International Airport", city: "Hyderabad", lat: 17.231317, lng: 78.429856 },
  { name: "Sardar Vallabh Bhai Patel International Airport", city: "Ahmedabad", lat: 23.071949, lng: 72.628738 },
  { name: "Cochin International Airport", city: "Kochi", lat: 10.155556, lng: 76.391389 },
  { name: "Dabolim Airport", city: "Goa", lat: 15.380833, lng: 73.834167 },
  { name: "Jaipur International Airport", city: "Jaipur", lat: 26.824167, lng: 75.812222 },
  { name: "Lokpriya Gopinath Bordoloi International Airport", city: "Guwahati", lat: 26.106111, lng: 91.585833 },
  { name: "Biju Patnaik International Airport", city: "Bhubaneswar", lat: 20.254780, lng: 85.816521 },
  { name: "Visakhapatnam Airport", city: "Visakhapatnam", lat: 17.728647, lng: 83.223549 },
  { name: "Sri Guru Ram Dass Jee International Airport", city: "Amritsar", lat: 31.709583, lng: 74.797222 },
  { name: "Chandigarh International Airport", city: "Chandigarh", lat: 30.667767, lng: 76.786232 },
  { name: "Trivandrum International Airport", city: "Thiruvananthapuram", lat: 8.486389, lng: 76.918889 },
  { name: "Calicut International Airport", city: "Calicut", lat: 11.136889, lng: 75.955389 },
  { name: "Coimbatore International Airport", city: "Coimbatore", lat: 11.030097, lng: 77.043383 },
  { name: "Lucknow Airport", city: "Lucknow", lat: 26.760583, lng: 80.889389 },
  { name: "Bhopal Airport", city: "Bhopal", lat: 23.287583, lng: 77.337389 },
  { name: "Nagpur Airport", city: "Nagpur", lat: 21.092833, lng: 79.047183 },
  { name: "Patna Airport", city: "Patna", lat: 25.591389, lng: 85.087983 },
  { name: "Vadodara Airport", city: "Vadodara", lat: 22.336183, lng: 73.226289 },
  { name: "Vijayawada Airport", city: "Vijayawada", lat: 16.530483, lng: 80.799083 },
  { name: "Tiruchirappalli Airport", city: "Tiruchirappalli", lat: 10.765389, lng: 78.710083 },
  { name: "Madurai Airport", city: "Madurai", lat: 9.834583, lng: 78.093383 },
  { name: "Mangalore Airport", city: "Mangalore", lat: 12.961283, lng: 74.890183 },
  { name: "Raipur Airport", city: "Raipur", lat: 21.180483, lng: 81.738083 },
  { name: "Kochi Airport", city: "Kochi", lat: 9.949083, lng: 76.271083 },
  { name: "Dehradun Airport", city: "Dehradun", lat: 30.191883, lng: 78.178083 }
];

// Component for airport markers
export const IndianAirports: React.FC = () => {
  const markers = useMemo(() => {
    return INDIAN_AIRPORTS.map((airport, index) => (
      <Marker
        key={index}
        position={[airport.lat, airport.lng]}
        icon={createAirportIcon()}
        title={`${airport.name} (${airport.city})`}
      />
    ));
  }, []);

  return <>{markers}</>;
};

export default IndianAirports;