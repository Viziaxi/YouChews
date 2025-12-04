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

export async function getRestaurantIdsWithinDistance(pool, userLat, userLon, radiusKm = 10, limit = 500) {
    if (!userLat || !userLon) {
        throw new Error("Latitude and longitude are required");
    }

    const query = `
        SELECT id
        FROM (
            SELECT id,
                   (6371 * acos(
                           cos(radians($1)) *
                           cos(radians((restaurant_info ->>'lat'):: float)) *
                           cos(radians((restaurant_info ->>'lon'):: float) - radians($2)) +
                           sin(radians($1)) *
                           sin(radians((restaurant_info ->>'lat'):: float))
                           )) AS distance_km
            FROM restaurants
            WHERE restaurant_info ? 'lat'
              AND restaurant_info ? 'lon'
              AND (restaurant_info->>'lat')::float IS NOT NULL
              AND (restaurant_info->>'lon')::float IS NOT NULL
        ) AS distances
        WHERE distance_km <= $3
        ORDER BY distance_km ASC
        LIMIT $4;
    `;

    try {
        const {rows} = await pool.query(query, [userLat, userLon, radiusKm, limit]);
        return rows.map(row => row.id); // ← only IDs
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
        // THIS IS THE ONLY QUERY THAT WORKS WITH YOUR REAL SCHEMA
        const nearbyQuery = `
            SELECT 
                id,
                name,
                restaurant_info,
                (6371 * acos(
                    cos(radians($1)) * cos(radians((restaurant_info->>'lat')::float)) * 
                    cos(radians((restaurant_info->>'lon')::float) - radians($2)) +
                    sin(radians($1)) * sin(radians((restaurant_info->>'lat')::float))
                )) AS distance_km
            FROM restaurants
            WHERE restaurant_info ? 'lat' 
              AND restaurant_info ? 'lon'
              AND (restaurant_info->>'lat')::float IS NOT NULL
              AND (restaurant_info->>'lon')::float IS NOT NULL
              AND (6371 * acos(
                  cos(radians($1)) * cos(radians((restaurant_info->>'lat')::float)) * 
                  cos(radians((restaurant_info->>'lon')::float) - radians($2)) +
                  sin(radians($1)) * sin(radians((restaurant_info->>'lat')::float))
              )) <= $3
            ORDER BY distance_km
            LIMIT 50
        `;

        const { rows } = await pool.query(nearbyQuery, [lat, lon, radiusKm]);

        if (rows.length === 0) {
            return { status: 200, data: [], metadata: { candidates_considered: 0 } };
        }

        const candidateIds = rows.map(r => r.id);

        const pythonProcess = spawn('python', [
            '../recommender-system/src/main.py',
            JSON.stringify(candidateIds),
            userId.toString(),
            numRecommendations.toString()
        ]);

        let stdoutData = '';
        pythonProcess.stdout.on('data', d => stdoutData += d.toString());
        pythonProcess.stderr.on('data', d => console.error('PYTHON:', d.toString()));

        const recommendedIds = await new Promise((resolve, reject) => {
            pythonProcess.on('close', code => {
                if (code !== 0) return reject(new Error('Python failed'));
                const match = stdoutData.trim().match(/\[.*\]/);
                if (!match) return reject(new Error('No JSON from Python'));
                try {
                    resolve(JSON.parse(match[0]));
                } catch (e) {
                    reject(e);
                }
            });
        });


        const ordered = rows
            .filter(r => recommendedIds.includes(r.id))
            .sort((a, b) => recommendedIds.indexOf(a.id) - recommendedIds.indexOf(b.id));

        const formatted = ordered.map((row, i) => {
            const info = row.restaurant_info || {};
            const distKm = parseFloat(row.distance_km) || 0;

            return {
                id: row.id.toString(),
                name: row.name || 'Unknown',
                address: info.address || 'No address',
                price_level: info.price || '$',
                categories: info.cuisine ? (Array.isArray(info.cuisine) ? info.cuisine : info.cuisine.split(',').map(s => s.trim())) : [],
                service_style: info.service_style || 'Casual',
                flavors: Array.isArray(info.flavors) ? info.flavors : [],
                menu: Array.isArray(info.menu) ? info.menu : [],
                lat: parseFloat(info.lat) || 0,
                lon: parseFloat(info.lon) || 0,
                distance_km: Number(distKm.toFixed(2)),
                distance_miles: Number((distKm * 0.621371).toFixed(2)),
                recommendation_score: Number((9.9 - i * 0.2).toFixed(2)),
                rank: i + 1
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
        return { status: 500, error: error.message || 'Server error' };
    }
}


export async function logPreference(body, token, pool, check_all) {
    const payload = body?.res;

    if (!payload || !payload.id || !payload.pref) {
        return { status: 400, error: 'Invalid payload: expected { res: { id, pref } }' };
    }

    const userId = payload.id;
    const preferences = payload.pref;

    const auth = await check_all('user', token);
    if (auth.status !== 200) {
        return { status: auth.status, error: auth.message };
    }

    if (auth.user.id !== userId) {
        return { status: 403, error: 'You can only update your own preferences' };
    }

    try {
        const res = await pool.query(
            'SELECT user_preferences FROM users WHERE id = $1',
            [userId]
        );

        if (res.rows.length === 0) {
            return { status: 404, error: 'User not found' };
        }

        let currentPrefs = res.rows[0].user_preferences || [];

        for (const pref of preferences) {
            const { item_id, like_level, like_or_not } = pref;

            if (!item_id) continue;

            const existing = currentPrefs.find(p => p.item_id === item_id);

            if (existing) {
                // Update existing
                if (like_level !== undefined && like_level !== null) {
                    existing.like_level = Math.max(1, Math.min(10,
                        (existing.like_level + like_level) / 2
                    ));
                } else if (like_or_not !== undefined) {
                    existing.like_level = Math.max(1, Math.min(10,
                        existing.like_level + like_or_not
                    ));
                }
            } else {
                // Add new
                currentPrefs.push({
                    item_id,
                    like_level: like_level ? Math.max(1, Math.min(10, (like_level + 5) / 2)) : 6
                });
            }
        }

        await pool.query(
            'UPDATE users SET user_preferences = $1::jsonb WHERE id = $2',
            [JSON.stringify(currentPrefs), userId]
        );

        return { status: 200, message: 'Preferences saved!', count: preferences.length };

    } catch (error) {
        console.error('logPreference error:', error);
        return { status: 500, error: 'Failed to save preferences' };
    }
}

