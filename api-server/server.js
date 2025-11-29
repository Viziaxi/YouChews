import express from 'express';
import { Pool } from 'pg';
import { check_all } from './auth_helper.js';
import cors from 'cors';
import {
    registerUser,
    loginUser,
    registerRestaurant,
    loginRestaurant,
    adminLogin,
    logPreference,
    getRecommendations, getRestaurantsWithinDistance
} from './function.js';

import {
    manageQueue,
    uploadRestaurant,
    view_queue,
    find_restaurant,
} from "./restaurant_operations.js";

const pool = new Pool({
  connectionString: "postgresql://youchews_db_xoi5_user:zptvD9AU0HjAEbhKJEirMxV7IvOovRWn@dpg-d4d7euf5r7bs73aqdnf0-a.oregon-postgres.render.com/youchews_db_xoi5",
  ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => console.log('Connected to PostgreSQL successfully!'))
    .catch((err) => console.error('Database connection error:', err));

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.use(cors({
  origin: true,
  credentials: true,
}));


app.get('/', (req, res) => {
    res.status(200).send('API Server is Running');
});

app.post('/register', async (req, res) => {
    const result = await registerUser(req.body, pool);
    res.status(result.status).send(result);
});

app.post('/login', async (req, res) => {
    const result = await loginUser(req.body, pool);
    res.status(result.status).send(result);
});

app.post('/restaurant_register', async (req, res) => {
    const result = await registerRestaurant(req.body, pool);
    res.status(result.status).send(result);
});

app.post('/restaurant_login', async (req, res) => {
    const result = await loginRestaurant(req.body, pool);
    res.status(result.status).send(result);
});

app.post('/admin_login', async (req, res) => {
    const result = await adminLogin(req.body, pool);
    res.status(result.status).send(result);
});

app.post('/manage_queue', async (req, res) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ error: 'Authorization header missing' });
    }
    const token = req.headers.authorization.split(' ')[1];
    const result = await manageQueue(req.body, token, pool, check_all);
    res.status(result.status).send(result);
});

app.post('/upload_restaurant', async (req, res) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ error: 'Authorization header missing' });
    }
    const token = req.headers.authorization.split(' ')[1];
    const result = await uploadRestaurant(req.body, token, pool, check_all);
    res.status(result.status).send(result);
});

app.get('/find_restaurant', async (req, res) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ error: 'Authorization header missing' });
    }
    const token = req.headers.authorization.split(' ')[1];
    const result = await find_restaurant(req.body, token, pool, check_all);
    res.status(result.status).send(result);
})

app.get('/get_queue',async (req,res)=>{
    if (!req.headers.authorization) {
        return res.status(401).send({ error: 'Authorization header missing' });
    }
    const token = req.headers.authorization.split(' ')[1];
    const result = await view_queue(token, pool, check_all);
    res.status(result.status).send(result);
})

app.get('/getRecommendation', async (req, res) => {
  // 1. Auth check
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid or missing Authorization header' });
  }

  const token = req.headers.authorization.split(' ')[1];

  // 2. Get user's location from query params (sent by frontend)
  const { lat, lon, radius = 10 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);
  const radiusKm = parseFloat(radius);

  if (isNaN(userLat) || isNaN(userLon) || isNaN(radiusKm)) {
    return res.status(400).json({ error: 'Invalid latitude, longitude, or radius' });
  }

  try {
    // 3. Get nearby restaurants (using your Haversine function)
    const nearbyRestaurants = await getRestaurantsWithinDistance(
      pool,
      userLat,
      userLon,
      radiusKm,
      100  // limit
    );

    if (nearbyRestaurants.length === 0) {
      return res.status(200).json({
        status: 200,
        message: 'No restaurants found nearby',
        data: []
      });
    }

    // 4. Extract user ID from request body (or you can get it from token later)
    const userId = req.body.id; // or decode from JWT token

    if (!userId) {
      return res.status(400).json({ error: 'user id required in request body' });
    }

    // 5. Get personalized recommendations (filtered to nearby only)
    const pythonRecommendations = await getRecommendations(
      token,
      pool,
      { id: userId },
      check_all,
      10 // num recommendations
    );

    if (pythonRecommendations.status !== 200) {
      return res.status(pythonRecommendations.status).json(pythonRecommendations);
    }

    // 6. Filter Python results to only include restaurants that are actually nearby
    const nearbyIds = new Set(nearbyRestaurants.map(r => r.id));
    const finalRecommendations = pythonRecommendations.data
      .filter(rec => nearbyIds.has(rec.id))
      .map(rec => {
        const match = nearbyRestaurants.find(r => r.id === rec.id);
        return {
          ...rec,
          distance_km: match?.distance_km?.toFixed(2),
          distance_miles: match?.distance_miles
        };
      });

    res.status(200).json({
      status: 200,
      user_location: { lat: userLat, lon: userLon },
      radius_km: radiusKm,
      total_nearby: nearbyRestaurants.length,
      recommendations: finalRecommendations
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/logPreference', async (req, res) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ error: 'Authorization header missing' });
    }
    const token = req.headers.authorization.split(' ')[1];
    const result = await logPreference(req.body.res, token, pool, check_all);
    res.status(result.status).send(result);
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
