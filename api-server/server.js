import express,{response,request} from 'express';
import {Pool} from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from './config.js';

const pool  = new Pool({
    user: config.db.user,
    host: config.db.host,
    password: config.db.password,
    port: config.db.port,
    database: config.db.database,
})

pool.connect()
    .then(() => console.log(' Connected to PostgreSQL successfully!'))
    .catch((err) => console.error('Database connection error:', err));

const app = express();
const PORT = 3000;
app.use(express.json());

app.post('/register',async (req,res)=>{
    try {
        const {name, password} = req.body;
        console.log(name, password);

        if (!name || !password) {
            res.status(400).send({error: 'Missing required field'});
            return;
        }
        const check = await pool.query('SELECT name FROM users WHERE name=$1', [name]);
        if (check.rows.length > 0) {
            res.status(400).send({error: 'Username already exists'});
            return;
        }
        const salt = 10
        const hashed_password = await bcrypt.hash(password, salt);
        const result = await pool.query('INSERT INTO users (name,password) VALUES ($1,$2) RETURNING *', [name, hashed_password]);
        console.log(result);
        const newUser = result.rows[0];
        const token = jwt.sign(
            {id: newUser.id, name: newUser.name,role:'user'},
            config.jwt.secret,
            {expiresIn: '5h'}
        );
        res.status(201).json({
            message: 'User registered successfully',
            user: {id: newUser.id, name: newUser.name},
            token: token
        });
    }catch (error) {
        console.log("Registration error:" , error);
        res.status(900).send({error: error});
    }

})

app.post('/login',async (req,res)=>{
    try {
        const {name, password} = req.body;
        console.log(name, password);
        if (!name || !password) {
            res.status(400).send({error: 'Missing required field'});
            return;
        }
        const user_list = await pool.query('SELECT id,name,password FROM users WHERE name=$1', [name]);
        if (user_list.rows.length < 1) {
            res.status(400).send({error: 'Username Not Found'});
            return;
        }
        const user = user_list.rows[0]
        const check_password = await bcrypt.compare(password, user.password);
        if (!check_password) {
            res.status(401).send({error: 'Username or Passwords do not match'});
            return;
        }
        const token = jwt.sign(
            {id: user.id, name: user.name,role:'user'},
            config.jwt.secret,
            {expiresIn: '5h'}
        )
        res.status(201).json({
            message: 'Restaurant login successfully',
            user: {id: user.id, name: user.name},
            token: token
        })
    }catch (error) {
        console.log("Login error:" , error);
        res.status(900).send({error: error});
    }
})


app.post('/restaurant_register',async (req,res)=>{
    try {
        const {name, password} = req.body;
        console.log(name, password);

        if (!name || !password) {
            res.status(400).send({error: 'Missing required field'});
            return;
        }
        const check = await pool.query('SELECT name FROM users WHERE name=$1', [name]);
        if (check.rows.length > 0) {
            res.status(400).send({error: 'Username already exists'});
            return;
        }
        const salt = 10
        const hashed_password = await bcrypt.hash(password, salt);
        const result = await pool.query('INSERT INTO restaurants (name,password) VALUES ($1,$2) RETURNING *', [name, hashed_password]);
        console.log(result);
        const restaurant = result.rows[0];
        const token = jwt.sign(
            {id: restaurant.id, name: restaurant.name,role:'restaurant'},
            config.jwt.secret,
            {expiresIn: '5h'}
        );
        res.status(201).json({
            message: 'Restaurant registered successfully',
            user: {id: restaurant.id, name: restaurant.name},
            token: token
        });
    }catch (error) {
        console.log("Registration error:" , error);
        res.status(900).send({error: error});
    }

})

app.post('/restaurant_login',async (req,res)=>{
    try {
        const {name, password} = req.body;
        console.log(name, password);
        if (!name || !password) {
            res.status(400).send({error: 'Missing required field'});
            return;
        }
        const restaurants = await pool.query('SELECT id,name,password FROM restaurants WHERE name=$1', [name]);
        if (restaurants.rows.length < 1) {
            res.status(400).send({error: 'Username Not Found'});
            return;
        }
        const restaurant = restaurants.rows[0]
        const check_password = await bcrypt.compare(password, restaurant.password);
        if (!check_password) {
            res.status(401).send({error: 'Username or Passwords do not match'});
            return;
        }
        const token = jwt.sign(
            {id: restaurant.id, name: restaurant.name,role:'restaurant'},
            config.jwt.secret,
            {expiresIn: '5h'}
        )
        res.status(201).json({
            message: 'restaruant login successfully',
            user: {id: restaurant.id, name: restaurant.name},
            token: token
        })
    }catch (error) {
        console.log("Login error:" , error);
        res.status(900).send({error: error});
    }
})
app.get('/', (req, res) => {
    res.status(200).send('API Server is Running');
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});