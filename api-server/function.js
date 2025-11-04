const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config.js');
const spawn = require('child_process').spawn;

async function registerUser({name, password}, pool) {
    try {
        if (!name || !password) {
            return { status: 400 , error: 'Missing required field' };
        }
        const check = await pool.query('SELECT name FROM users WHERE name=$1', [name]);
        if (check.rows.length > 0) {
            return { status: 400 , error: 'Username already exists' };
        }
        const salt = 10;
        const hashed_password = await bcrypt.hash(password, salt);
        const result = await pool.query(
            'INSERT INTO users (name, password) VALUES ($1, $2) RETURNING *',
            [name, hashed_password]
        );

        const newUser = result.rows[0];
        const token = jwt.sign(
            { id: newUser.id, name: newUser.name, role: 'user' },
            config.jwt.secret,
            { expiresIn: '5h' }
        );
        return {
            status: 201,
            message: 'User registered successfully',
            user: { id: newUser.id, name: newUser.name },
            token
        };
    } catch (error) {
        console.log("Registration error:", error);
        return { status: 500, error: error.message || 'Internal server error' };
    }
}

async function loginUser({ name, password }, pool) {
    try {
        if (!name || !password) {
            return { status: 400, error: 'Missing required field' };
        }

        const user_list = await pool.query('SELECT id, name, password FROM users WHERE name=$1', [name]);
        if (user_list.rows.length < 1) {
            return { status: 400, error: 'Username Not Found' };
        }

        const user = user_list.rows[0];
        const check_password = await bcrypt.compare(password, user.password);
        if (!check_password) {
            return { status: 401, error: 'Username or Passwords do not match' };
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, role: 'user' },
            config.jwt.secret,
            { expiresIn: '5h' }
        );

        return {
            status: 201,
            message: 'Restaurant login successfully',
            user: { id: user.id, name: user.name },
            token
        };
    } catch (error) {
        console.log("Login error:", error);
        return { status: 500, error: error.message || 'Internal server error' };
    }
}

async function registerRestaurant({ name, password }, pool) {
    try {
        if (!name || !password) {
            return { status: 400, error: 'Missing required field' };
        }

        const check = await pool.query('SELECT name FROM restaurants WHERE name=$1', [name]);
        if (check.rows.length > 0) {
            return { status: 400, error: 'Username already exists' };
        }

        const salt = 10;
        const hashed_password = await bcrypt.hash(password, salt);
        const result = await pool.query(
            'INSERT INTO restaurants (name, password) VALUES ($1, $2) RETURNING *',
            [name, hashed_password]
        );

        const restaurant = result.rows[0];
        const token = jwt.sign(
            { id: restaurant.id, name: restaurant.name, role: 'restaurant' },
            config.jwt.secret,
            { expiresIn: '5h' }
        );

        return {
            status: 201,
            message: 'Restaurant registered successfully',
            user: { id: restaurant.id, name: restaurant.name },
            token
        };
    } catch (error) {
        console.log("Registration error:", error);
        return { status: 500, error: error.message || 'Internal server error' };
    }
}

async function loginRestaurant({ name, password }, pool) {
    try {
        if (!name || !password) {
            return { status: 400, error: 'Missing required field' };
        }

        const restaurants = await pool.query('SELECT id, name, password FROM restaurants WHERE name=$1', [name]);
        if (restaurants.rows.length < 1) {
            return { status: 400, error: 'Username Not Found' };
        }

        const restaurant = restaurants.rows[0];
        const check_password = await bcrypt.compare(password, restaurant.password);
        if (!check_password) {
            return { status: 401, error: 'Username or Passwords do not match' };
        }

        const token = jwt.sign(
            { id: restaurant.id, name: restaurant.name, role: 'restaurant' },
            config.jwt.secret,
            { expiresIn: '5h' }
        );

        return {
            status: 201,
            message: 'restaruant login successfully',
            user: { id: restaurant.id, name: restaurant.name },
            token
        };
    } catch (error) {
        console.log("Login error:", error);
        return { status: 500, error: error.message || 'Internal server error' };
    }
}

async function adminLogin({ name, password }, pool) {
    try {
        if (!name || !password) {
            return { status: 400, error: 'Missing required field' };
        }

        const admins = await pool.query('SELECT name, password FROM admins WHERE name=$1', [name]);
        if (admins.rows.length < 1) {
            return { status: 400, error: 'Username Not Found' };
        }

        const admin = admins.rows[0];
        const check_password = (password === admin.password); // Not secure leave here for now
        if (!check_password) {
            return { status: 401, error: 'Username or Passwords do not match' };
        }

        const token = jwt.sign(
            { id: 1, name: admin.name, role: 'admin' },
            config.jwt.secret,
            { expiresIn: '5h' }
        );

        return {
            status: 201,
            message: 'Admin login successfully',
            user: { name: admin.name },
            token
        };
    } catch (error) {
        console.log("Login error:", error);
        return { status: 500, error: error.message || 'Internal server error' };
    }
}

async function manageQueue({ approved_list = [], denied_list = [] }, token, pool, check_all) {
    const check_authorization = await check_all('admin', token);
    if (check_authorization.status !== 200) {
        return { status: check_authorization.status, error: check_authorization.message };
    }

    for (const item of approved_list) {
        const { id: itemId } = item;
        const selectResult = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1', [itemId]);
        const row = selectResult.rows[0];

        if (!row) {
            return { status: 404, error: `Data not found for ID: ${itemId}` };
        }

        const { restaurant_info: restaurantInfo } = row;
        if (!restaurantInfo?.name) {
            return { status: 400, error: `Missing 'name' in restaurant_info for ID: ${itemId}` };
        }

        try {
            await pool.query(
                'INSERT INTO restaurant (name, password, restaurant_info) VALUES ($1, $2, $3)',
                [restaurantInfo.name, '12345678', restaurantInfo]
            );
            await pool.query('DELETE FROM queue WHERE id = $1', [itemId]);
        } catch (error) {
            console.error(`DB error for ID ${itemId}:`, error);
            return { status: 500, error: `Failed to process ID: ${itemId}` };
        }
    }

    for (const { id: itemId } of denied_list) {
        const selectDelete = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1', [itemId]);
        if (selectDelete.rows.length === 0) {
            return { status: 400, error: `Item not found for ${itemId}` };
        }
        try {
            await pool.query('DELETE FROM queue WHERE id = $1', [itemId]);
        } catch (error) {
            return { status: 500, error: `Failed to delete item ${itemId}` };
        }
    }

    return {
        status: 200,
        message: `Successfully processed ${approved_list.length + denied_list.length} restaurants.`
    };
}

async function uploadRestaurant({ data }, token, pool, check_all) {
    const check_authorization = await check_all('restaurant', token);
    if (check_authorization.status !== 200) {
        return { status: check_authorization.status, error: check_authorization.message };
    }

    if (!data?.name) {
        return { status: 400, error: 'Missing required field: name' };
    }

    try {
        await pool.query('INSERT INTO queue (restaurant_info) VALUES ($1::jsonb)', [JSON.stringify(data)]);
        return { status: 200, message: 'Successfully inserted to queue' };
    } catch (error) {
        return { status: 500, error: error.message };
    }
}

async function updateRestaurant(data, token, pool, check_all) {
    if (!data || !data.id) {
        return { status: 400, error: 'Missing required field: data.id' };
    }

    const check_authorization = await check_all('restaurant', token);
    if (check_authorization.status !== 200) {
        return { status: check_authorization.status, error: check_authorization.message };
    }

    try {
        const existing = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1', [data.id]);
        if (existing.rows.length === 0) {
            return { status: 404, error: 'Restaurant record not found for given ID' };
        }

        await pool.query(
            `UPDATE queue SET restaurant_info = restaurant_info || $2::jsonb WHERE id = $1`,
            [data.id, JSON.stringify(data)]// does not support nested merge, leave here for now
        );

        return { status: 200, message: 'Successfully updated restaurant_info JSON' };
    } catch (error) {
        console.error(error);
        return { status: 500, error: error.message };
    }
}

async function getRecommendations(ids, user_prefs_ids, pool, num) {
    try {
        const restaruant_info = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1', ids);
        if (restaruant_info.rows.length === 0) {
            return { status: 404, error: 'Restaurant record not found for given IDs' };
        }

        const user_info = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1', user_prefs_ids);
        if (restaruant_info.rows.length === 0) {
            return { status: 404, error: 'User has no preferences' };
        }

        const content_string = JSON.stringify(restaruant_info);
        const userdata_string = JSON.stringify(user_info);

        let runPython = new Promise(function(success, nosuccess) {
            const pythonProcess = spawn('python', ['recommender-system/src/main.py', content_string, userdata_string, num]);

            pythonProcess.stdout.on('data', function(data) {
                success(data);
            });

            pythonProcess.stderr.on('data', function(data) {
                nosuccess(data);
            });
        });
        
        runPython.then(function(data) {
            console.log(data.toString());
        });
    } catch (error) {
        console.error(error);
        return { status: 500, error: error.message };
    }
}

module.exports = {
    registerUser,
    loginUser,
    registerRestaurant,
    loginRestaurant,
    adminLogin,
    manageQueue,
    uploadRestaurant,
    updateRestaurant,
    getRecommendations,
};