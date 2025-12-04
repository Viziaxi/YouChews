import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from './config.js';
import { spawn } from 'child_process';

export async function registerUser({name, password}, pool) {
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

export async function loginUser({ name, password }, pool) {
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
            user: { id: user.id, name: user.name},
            token
        };
    } catch (error) {
        console.log("Login error:", error);
        return { status: 500, error: error.message || 'Internal server error' };
    }
}

export async function registerRestaurant({ name, password }, pool) {
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

export async function loginRestaurant({ name, password }, pool) {
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
            message: 'restaurant login successfully',
            user: { id: restaurant.id, name: restaurant.name },
            token
        };
    } catch (error) {
        console.log("Login error:", error);
        return { status: 500, error: error.message || 'Internal server error' };
    }
}

export async function adminLogin({ name, password }, pool) {
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

// function.js (refactored parts only)

export async function getRestaurantIdsWithinDistance(pool, userLat, userLon, radiusKm = 10, limit = 500) {
    if (!userLat || !userLon) {
        throw new Error("Latitude and longitude are required");
    }

    const query = `
        SELECT id
        FROM restaurants
        WHERE restaurant_info ? 'lat'
          AND restaurant_info ? 'lon'
          AND (restaurant_info->>'lat')::float IS NOT NULL
          AND (restaurant_info->>'lon')::float IS NOT NULL
          AND (
            6371 * acos(
                cos(radians($1)) *
                cos(radians((restaurant_info->>'lat')::float)) *
                cos(radians((restaurant_info->>'lon')::float) - radians($2)) +
                sin(radians($1)) *
                sin(radians((restaurant_info->>'lat')::float))
            )
          ) <= $3
        ORDER BY (
            6371 * acos(
                cos(radians($1)) *
                cos(radians((restaurant_info->>'lat')::float)) *
                cos(radians((restaurant_info->>'lon')::float) - radians($2)) +
                sin(radians($1)) *
                sin(radians((restaurant_info->>'lat')::float))
            )
        ) ASC
        LIMIT $4;
    `;

    try {
        const { rows } = await pool.query(query, [userLat, userLon, radiusKm, limit]);
        return rows.map(row => row.id);
    } catch (error) {
        console.error("Failed to get nearby restaurant IDs:", error);
        throw error;
    }
}

export async function getRecommendations(token, pool, body, check_all, numRecommendations = 10) {
    const auth = await check_all('user', token);
    if (auth.status !== 200) {
        return { status: auth.status, error: auth.message };
    }

    const userId = auth.user.id;
    const { lat, lon } = body;
    if (!lat || !lon) {
        return { status: 400, error: 'Latitude and longitude are required' };
    }

    const radiusKm = 10;

    try {
        // 1. Get nearby restaurants
        const nearbyQuery = `
            SELECT id, name, address, price_level, cuisine, service_style, flavors, lat, lon,
                   (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) +
                   sin(radians($1)) * sin(radians(lat)))) AS distance_km
            FROM restaurants
            WHERE (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) +
                   sin(radians($1)) * sin(radians(lat)))) <= $3
            ORDER BY distance_km
            LIMIT 50
        `;

        const { rows } = await pool.query(nearbyQuery, [lat, lon, radiusKm]);
        if (rows.length === 0) {
            return { status: 200, data: [], metadata: { candidates_considered: 0 } };
        }

        const candidateIds = rows.map(r => r.id);

        // 2. Spawn Python recommender
        const pythonProcess = spawn('python', [
            '../recommender-system/src/main.py',
            JSON.stringify(candidateIds),
            userId.toString(),
            numRecommendations.toString()
        ]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            const text = data.toString();
            stdoutData += text;
            console.log('PYTHON STDOUT:', text.trim()); // Visible in Render logs
        });

        pythonProcess.stderr.on('data', (data) => {
            const text = data.toString();
            stderrData += text;
            console.error('PYTHON STDERR:', text.trim()); // Critical errors
        });

        const pythonExit = new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('Python exited with code', code);
                    console.error('STDERR:', stderrData);
                    return reject(new Error(`Python error: ${stderrData || 'Unknown error'}`));
                }

                // CRITICAL FIX: Extract only the last valid JSON line
                const lines = stdoutData.trim().split('\n');
                let jsonLine = lines[lines.length - 1]; // Last line should be the JSON array

                // Clean any trailing junk
                const jsonMatch = jsonLine.match(/\[.*\]/);
                if (!jsonMatch) {
                    console.error('No JSON found in Python output:', stdoutData);
                    return reject(new Error('Invalid JSON from Python'));
                }

                try {
                    const recommendedIds = JSON.parse(jsonMatch[0]);
                    resolve(recommendedIds);
                } catch (parseErr) {
                    console.error('JSON parse failed on:', jsonMatch[0]);
                    reject(parseErr);
                }
            });
        });

        const recommendedIds = await pythonExit;

        // 3. Sort final results by recommendation order
        const recommendedRows = rows
            .filter(row => recommendedIds.includes(row.id))
            .sort((a, b) => recommendedIds.indexOf(a.id) - recommendedIds.indexOf(b.id));

        const formatted = recommendedRows.map((row, index) => {
            const distanceKm = parseFloat(row.distance_km) || 0;
            const distanceMiles = distanceKm * 0.621371;

            let categories = [];
            if (row.cuisine) {
                categories = row.cuisine.split(',').map(c => c.trim()).filter(Boolean);
            }

            let flavors = [];
            try {
                if (row.flavors) {
                    flavors = typeof row.flavors === 'string'
                        ? JSON.parse(row.flavors)
                        : (Array.isArray(row.flavors) ? row.flavors : [row.flavors]);
                }
            } catch {
                if (typeof row.flavors === 'string') {
                    flavors = row.flavors.split(',').map(f => f.trim().replace(/[\[\]"]+/g, ''));
                }
            }

            return {
                id: row.id.toString(),
                name: row.name || 'Unknown Restaurant',
                address: row.address || '',
                price_level: row.price_level || '$',
                categories,
                service_style: row.service_style || 'Unknown',
                flavors,
                lat: parseFloat(row.lat) || 0,
                lon: parseFloat(row.lon) || 0,
                distance_km: Number(distanceKm.toFixed(2)),
                distance_miles: Number(distanceMiles.toFixed(2)),
                recommendation_score: Number((9.8 - index * 0.2).toFixed(2)),
                rank: index + 1
            };
        });

        return {
            status: 200,
            data: formatted,
            metadata: {
                user_location: { lat, lng: lon },
                search_radius_km: radiusKm,
                candidates_considered: candidateIds.length,
                recommendations_returned: formatted.length
            }
        };

    } catch (error) {
        console.error('getRecommendations error:', error);
        return { status: 500, error: error.message || 'Internal recommendation error' };
    }
}

export async function logPreference(data,token,pool,check_all) {
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

