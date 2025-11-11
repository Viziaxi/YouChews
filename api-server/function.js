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
            status: 200,
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
            status: 200,
            message: 'User login successfully',
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
            status: 200,
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
            status: 200,
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
            status: 200,
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

        return { status: 200, message: 'Successfully updated restaurant_info JSON' };postgres
    } catch (error) {
        console.error(error);
        return { status: 500, error: error.message };
    }
}

async function prepareDataForPython(data) {
    return JSON.stringify(data).replace(/"/g, '\\"');
}

async function getRecommendations(token, pool, data,check_all,numRecommendations) {
    try {
        const check_authorization = await check_all('restaurant', token);
        if (check_authorization.status !== 200) {
            return { status: check_authorization.status, error: check_authorization.message };
        }

        if (!data || !data.id) {
            return { status: 400, error: 'Missing required field: data.id' };
        }
        const userId = data.id;
        const res = await pool.query(
            'SELECT user_preferences FROM users WHERE id = $1',
            [userId]
        );
        if (res.rows.length === 0) {
            return { status: 404, error: 'User not found' };
        }
        const contentRes = await pool.query(
            `SELECT id, 
                    restaurant_info->>'flavors' AS flavors,
                    restaurant_info->>'menu' AS menu,
                    restaurant_info->>'name' AS name,
                    restaurant_info->>'price' AS price,
                    restaurant_info->>'service_style' AS service_style
             FROM restaurants`
        );

        const contentData = contentRes.rows;
        const userData = res.rows[0].user_preferences;

        const contentString = prepareDataForPython(contentData);
        const userDataString = prepareDataForPython(userData);

        const runPython = new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [
                '../recommender-system/src/main.py',
                contentString,
                userDataString,
                numRecommendations.toString()
            ]);

            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdoutData);
                        resolve(result);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse Python output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Python process failed: ${stderrData}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn Python process: ${error.message}`));
            });
        });

        const recommendations = await runPython;
        return { status: 200, data: recommendations };

    } catch (error) {
        console.error('Error in getRecommendations:', error);
        return { status: 500, error: error.message };
    }
}

async function logPreference(data,token,pool,check_all) {
    if (!data || !data.id) {
        return { status: 400, error: 'Missing required field: data.id' };
    }

    const check_authorization = await check_all('user', token);
    if (check_authorization.status !== 200) {
        return { status: check_authorization.status, error: check_authorization.message };
    }

    const userId = data.id;
    const res = await pool.query(
            'SELECT user_preferences FROM users WHERE id = $1',
            [userId]
    );

    if (res.rows.length === 0) {
        return { status: 404, error: 'User not found' };
    }

    if(!data.pref){
        return { status: 400, error: 'Missing required field: data.pref' };
    }

    try{

        let currentPrefs = res.rows[0].user_preferences || []; // list
        for (let i = 0; i < data.pref.length; i++) {
            const newPref = data.pref[i];
            const { item_id, like_level ,like_or_not} = newPref; // like_level : int range 1 - 10; Like_or_not int range 1 or -1
            if (!item_id){
                console.warn('Missing item _id unable to find matches');
                continue;
            }

            let found = false;

            for (let j = 0; j < currentPrefs.length; j++) {
                if (currentPrefs[j].item_id === item_id) {
                    if (like_level !== null){
                        currentPrefs[j].like_level = Math.max(1, Math.min(10, (currentPrefs[j].like_level + like_level) / 2));

                    }
                    else {
                        currentPrefs[j].like_level = Math.max(1, Math.min(10, currentPrefs[j].like_level + like_or_not));

                    }
                    found = true;
                    break;
                }
            }

            if (!found) {
                currentPrefs.push({
                  item_id,
                  like_level: (like_level + 5) / 2
                });
            }
        }
        // Save back to DB
        await pool.query(
            'UPDATE users SET user_preferences = $1::jsonb WHERE id = $2',
            [JSON.stringify(currentPrefs), userId]
        );

        return { status: 200, message: 'User preferences updated successfully' };
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
    logPreference
};