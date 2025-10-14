// const express = require('express');
// const axios = require('axios');
// require('dotenv').config();

// const app = express();

// const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
// const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
// const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;

// let cachedToken = null;
// let tokenExpiry = null;

// // Get or reuse OpenSky OAuth token
// async function getAccessToken() {
//   const now = Date.now();
//   if (cachedToken && tokenExpiry && now < tokenExpiry - 120000) {
//     return cachedToken;
//   }

//   const params = new URLSearchParams();
//   params.append('grant_type', 'client_credentials');
//   params.append('client_id', OPENSKY_CLIENT_ID);
//   params.append('client_secret', OPENSKY_CLIENT_SECRET);

//   try {
//     const response = await axios.post(TOKEN_URL, params, {
//       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     });
//     cachedToken = response.data.access_token;
//     tokenExpiry = now + response.data.expires_in * 1000;
//     console.log('✅ OpenSky token fetched successfully');
//     return cachedToken;
//   } catch (err) {
//     console.error('❌ Error fetching token:', err.response?.data || err.message);
//     throw new Error('Failed to fetch OpenSky access token');
//   }
// }

// // India bounding box
// const INDIA_BOUNDS = { lamin: 6, lamax: 37, lomin: 68, lomax: 97 };

// // Live flights over India (authenticated)
// app.get('/api/live-flights', async (req, res) => {
//   try {
//     const token = await getAccessToken();

//     const response = await axios.get('https://opensky-network.org/api/states/all', {
//       headers: { Authorization: `Bearer ${token}` }
//     });

//     const states = response.data.states || [];

//     const indiaFlights = states
//       .filter(f => {
//         const lat = f[6];
//         const lon = f[5];
//         return lat >= INDIA_BOUNDS.lamin &&
//                lat <= INDIA_BOUNDS.lamax &&
//                lon >= INDIA_BOUNDS.lomin &&
//                lon <= INDIA_BOUNDS.lomax;
//       })
//       .map(f => ({
//         icao24: f[0],
//         callsign: f[1]?.trim() || 'UNKNOWN',
//         origin_country: f[2],
//         time_position: f[3],
//         last_contact: f[4],
//         longitude: f[5],
//         latitude: f[6],
//         altitude: f[7],
//         on_ground: f[8],
//         velocity: f[9],
//         heading: f[10],
//         vertical_rate: f[11]
//       }));

//     res.json({
//       total_flights: indiaFlights.length,
//       flights: indiaFlights
//     });

//   } catch (err) {
//     console.error('❌ Error fetching live flights:', err.message);
//     res.status(500).json({ error: 'Failed to fetch live flights' });
//   }
// });

// const port = 3000;
// app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
