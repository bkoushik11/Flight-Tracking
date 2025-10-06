// // import express from 'express';
// // import axios from 'axios';
// const express = require('express');
// const axios = require('axios'); 



// const hi = "hello"

// const OPENSKY_API_BASE = 'https://opensky-network.org/api/states/all';



// const app = express();


// console.log(hi);




// app.get('/api/external', async (req, res) => {
//     try {
//         const response = await axios.get(OPENSKY_API_BASE);
//         res.json(response.data); 
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Failed to fetch data' });
//     }
// });

// app.get('/api/positions', async (req, res) => {
//     try{
//     const response = await axios.get(OPENSKY_API_BASE);
//     const states = response.data.states || [] 

//     const positions = states.map(flight => ({
//         icao: flight[0],
//         latitude: flight[6],
//         longitude:flight[5]
//     }));
//     res.json(positions)
//     }
//     catch (error){
//         console.error(error);
//         res.status(500).json({error: 'failed to fetch lat, long'})
//     }
// })

// app.get('/api/position', (req, res) => {
//     console.log("Route hit!");
//     res.json([{ latitude: 10, longitude: 20 }]);
// });






// const port = 3000;

// app.listen(port, () => {
//     console.log(`Server running at http://localhost:${port}`);
// });



