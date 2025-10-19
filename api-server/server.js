import express,{response,request} from 'express';
import {Pool} from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from './config.js';
import res from "express/lib/response.js";
import selectResult from "pg/lib/query";
/*
200 -> OK
201 - >Created
400 - > missing entry
401 - > invalid
900 - > all errors not catch
403 -> forbidden
*/

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

async function check_token(JWTtoken) {
    try{
        const payload = jwt.verify(JWTtoken, config.jwt.secret);
        return {
            status: 200 ,
            message: "Valid token",
            user:{
                id: payload.id,
                name: payload.name,
                role: payload.role
            }
        }
    }catch(e){
        if (e.name === "TokenExpiredError") {
            return {
                status: 401,
                message: "Token expired, please re-login"
            }
        }else if (e.name === "JsonWebTokenError") {
            return {
                status: 401,
                message: `Invalid token: ${e.message}`
            };
        }
        else {
            return {
                status: 900 ,
                message: `Unexpected error : ${e.message}`
            };
        }
    }
}
async function check_authorization_type(target,src) {
    if (target !== src.user.role){
        return {
            status: 403,
            message: "Unauthorized, incorrect login type"
        };
    }else{
        return {
            status: 200,
            message: "valid",
        }
    }
}

async function check_all(authorization_type ,auth_token){
    const check = await check_token(auth_token)
    if (check.status !== 200) {
        return check;
    }
    const check_type = await check_authorization_type(authorization_type, check);
    if (check_type.status !== 200) {
        return check_type;
    }
    return {
        status: 200,
        user: check.user, // Return the user data needed for the route handler
        message: "Authentication and authorization successful."
    };

}
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

app.post('/admin_login',async (req,res)=>{

    try {
        const {name, password} = req.body;
        console.log(name, password);
        if (!name || !password) {
            res.status(400).send({error: 'Missing required field'});
            return;
        }
        const admins = await pool.query('SELECT name,password FROM admins WHERE name=$1', [name]);
        if (admins.rows.length < 1) {
            res.status(400).send({error: 'Username Not Found'});
            return;
        }
        const admin = admins.rows[0]
        console.log(admin.password)
        const check_password =  (password === admin.password);// Not secure might need to improve
        if (!check_password) {
            res.status(401).send({error: 'Username or Passwords do not match'});
            return;
        }
        const token = jwt.sign(
            {id:1,name: admin.name,role:'admin'},
            config.jwt.secret,
            {expiresIn: '5h'}
        )
        res.status(201).json({
            message: 'Admin login successfully',
            user: {name: admin.name},
            token: token
        })
    }catch (error) {
        console.log("Login error:" , error);
        res.status(900).send({error: error});
    }
})
app.post('./manage_queue',async (req,res) =>{
    const {token} = req.header.authorization;
    const {approved_list,denied_list} = req.body;
    const check_authorization = await check_all('admin',token);
    if (check_authorization.status !== 200){
        return res.status(check_authorization.status).send({error: check_authorization.message});
    }

    for (let i = 0; i < approved_list.length; i++) {
        const itemId = approved_list[i].id;

        const selectResult = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1', [itemId]);
        const row = selectResult.rows[0];

        if (!row) {
            return res.status(404).send({ error: `Data not found for ID: ${itemId}` });
        }

        const restaurantInfo = row.restaurant_info;

        if (!restaurantInfo || !restaurantInfo.name) {
            return res.status(400).send({ error: `Missing 'name' in restaurant_info for ID: ${itemId}` });
        }
        try {
            const insertResult = await pool.query(
                'INSERT INTO restaurant (name, password, restaurant_info) VALUES ($1, $2, $3)',
                [restaurantInfo.name, '12345678', restaurantInfo] // Insecure
            );
            const deleteResult = await pool.query(
                'DELETE FROM queue WHERE id = $1',
                [itemId]
            )
        } catch (error) {
            console.error(`Database error during INSERT/DELETING for ID ${itemId}:`, error);
            return res.status(500).send({ error: `Failed to insert/delete into restaurant for ID: ${itemId}` });
        }
    }

    for (let i = 0; i < denied_list.length; i++) {
        const selectDelete = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1',[denied_list[i].id]);
        const row = selectDelete.rows[0];
        if (!row) {
            return res.status(400).send({error:`Item not found for ${denied_list[i].id}`});
        }
        try{
            const deleteResult = await pool.query('DELETE FROM queue WHERE id = $1',[denied_list[i].id]);
        }catch(error) {
            return res.status(500).send({error: `Item found but failed to delete ${denied_list[i].id}`,});
        }
    }
    return res.status(200).send({ message: `Successfully processed ${approved_list.length + denied_list.length} restaurants.` });
})

app.post('/upload_restaurant',async (req,res)=>{
    const {token} = req.header.authorization;
    const {data} = req.body;
    const check_authorization = await check_all('restaurant',token);
    if (check_authorization.status !== 200){
        return res.status(check_authorization.status).send({error: check_authorization.message});
    }
    if (data.name === null){
        return res.status(400).send({error: 'Missing required field'});
    }
    try{
        const insertResult = await pool.query('INSERT INTO queue (restaurant_info) VALUES (data)');
    }catch(error){
        return res.status(500).send({error: error});
    }
    return res.status(200).send({message:"Successfully inserted to queue "});
})
/*
app.post('/upload_restaurant_change',async (req,res)=>{
    const {token} = req.header.authorization;
    const {data} = req.body;
    const check_authorization = await check_all('restaurant',token);
    for (let i = 0; i<)
})*/