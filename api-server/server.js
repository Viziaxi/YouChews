const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config.js');
const { check_all } = require('./auth_helpers.js');
const {
    registerUser,
    loginUser,
    registerRestaurant,
    loginRestaurant,
    adminLogin,
    manageQueue,
    uploadRestaurant,
    updateRestaurant
} = require('./logic.js');

const pool = new Pool({
    user: config.db.user,
    host: config.db.host,
    password: config.db.password,
    port: config.db.port,
    database: config.db.database,
});

pool.connect()
    .then(() => console.log('Connected to PostgreSQL successfully!'))
    .catch((err) => console.error('Database connection error:', err));

const app = express();
const PORT = 3000;
app.use(express.json());

// Home
app.get('/', (req, res) => {
    res.status(200).send('API Server is Running');
});

// User Routes
app.post('/register', async (req, res) => {
    const result = await registerUser(req.body, pool);
    res.status(result.status).send(result);
});

app.post('/login', async (req, res) => {
    const result = await loginUser(req.body, pool);
    res.status(result.status).send(result);
});

// Restaurant Routes
app.post('/restaurant_register', async (req, res) => {
    const result = await registerRestaurant(req.body, pool);
    res.status(result.status).send(result);
});

app.post('/restaurant_login', async (req, res) => {
    const result = await loginRestaurant(req.body, pool);
    res.status(result.status).send(result);
});

// Admin Routes
app.post('/admin_login', async (req, res) => {
    const result = await adminLogin(req.body, pool);
    res.status(result.status).send(result);
});

app.post('/manage_queue', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    const result = await manageQueue(req.body, token, pool, check_all);
    res.status(result.status).send(result);
});

app.post('/upload_restaurant', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const result = await uploadRestaurant(req.body, token, pool, check_all);
    res.status(result.status).send(result);
});

app.post('/update_restaurant', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const result = await updateRestaurant(req.body.data, token, pool, check_all);
    res.status(result.status).send(result);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});