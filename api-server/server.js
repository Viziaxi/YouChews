import express from 'express';
import { Pool } from 'pg';
import config from './config.js';
import { check_all } from './auth_helper.js';
import {
    registerUser,
    loginUser,
    registerRestaurant,
    loginRestaurant,
    adminLogin,
    logPreference,
    getRecommendations
} from './function.js';
import cors from 'cors';
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

app.options("*", cors());

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
    if (!req.headers.authorization) {
        return res.status(401).send({ error: 'Authorization header missing' });
    }
    const token = req.headers.authorization.split(' ')[1];
    const result = await getRecommendations(token, pool, req.body.res, check_all, 1);
    res.status(result.status).send(result);
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
