const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

const OPENSKY_API_BASE = 'https://opensky-network.org/api/states/all';
const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;

// 🔹 Cache token to avoid fetching every request
let cachedToken = null;
let tokenExpiry = null;

// 🔸 Function to get or refresh token
async function getAccessToken() {
  const now = Date.now();

  // Reuse token if still valid (within 2 minutes of expiry)
  if (cachedToken && tokenExpiry && now < tokenExpiry - 120000) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', OPENSKY_CLIENT_ID);
  params.append('client_secret', OPENSKY_CLIENT_SECRET);

  try {
    const response = await axios.post(TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    cachedToken = response.data.access_token;
    tokenExpiry = now + response.data.expires_in * 1000;
    console.log('OpenSky token fetched successfully');
    return cachedToken;
  } catch (err) {
    console.error('Error fetching token:', err.response?.data || err.message);
    throw new Error('Failed to fetch OpenSky access token');
  }
}

// 🛫 Route to get live flight positions
app.get('/api/positions', async (req, res) => {
  try {
    const token = await getAccessToken();

    const response = await axios.get(OPENSKY_API_BASE, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'Flight-Tracker-App/1.0',
      },
      timeout: 15000,
    });

    const data = response.data;
    if (!data.states) {
      return res.status(500).json({ error: 'No state data returned from OpenSky' });
    }

    // Transform and return flight data
    const positions = data.states.map((flight) => ({
      icao: flight[0],
      longitude: flight[5],
      latitude: flight[6],
      altitude: flight[7],
      velocity: flight[9],
    }));

    res.json(positions);
  } catch (error) {
    console.error('Error fetching flight data:', error.message);
    

    const status = error.response?.status || 500;
    const message =
      status === 401
        ? 'Unauthorized – check your OpenSky credentials'
        : status === 403
        ? 'Forbidden – you may not have access'
        : status === 429
        ? 'Rate limit exceeded – try again later'
        : 'Server error fetching flight data';

    res.status(status).json({ error: message });
  }
});

const port = 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
