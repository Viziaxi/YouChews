async function geocodeAddress(address) {
    const searchQuery = encodeURIComponent(address + ", United States");
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&countrycodes=us&limit=1`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'MyDistanceApp/1.0' // Required by Nominatim policy
        }
    });

    const data = await response.json();

    if (data && data.length > 0) {
        const result = data[0];
        return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            formattedAddress: result.display_name
        };
    } else {
        throw new Error("Address not found. Try being more specific.");
    }
}

async function check_integrity(data , token, check_all) {
    const check_authorization = await check_all('restaurant', token);
    if (check_authorization.status !== 200) {
        return { status: check_authorization.status, error: check_authorization.message };
    }
    const requiredFields = [
        'name',
        'id',
        'address',
        'service_type',
        'menu',
        'flavors'
    ];


    for (const field of requiredFields) {
        const value = data?.[field];

        if (value === null || typeof value === 'undefined' || (typeof value === 'string' && value.trim() === '')) {
            return {
                status: 400,
                error: `Missing or empty required field: ${field}`
            };
        }
    }
    return { status: 200, message: 'Integrity check passed.' };
}

export async function manageQueue({ approved_list = [], denied_list = [] }, token, pool, check_all) {
    const check_authorization = await check_all('admin', token);
    if (check_authorization.status !== 200) {
        return { status: check_authorization.status, error: check_authorization.message };
    }

    for (const itemId of approved_list) {
        const selectResult = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1', [itemId]);
        const row = selectResult.rows[0];

        if (!row) {
            console.warn('no restaurant found')
            continue
        }
        try {
            const restaurantInfo = row.restaurant_info;
            const restaurantName = restaurantInfo?.name || `restaurant_${itemId}`;

            // Check if restaurant with this name already exists
            const checkExisting = await pool.query('SELECT id FROM restaurants WHERE name = $1', [restaurantName]);
            if (checkExisting.rows.length > 0) {
                console.warn(`Restaurant with name "${restaurantName}" already exists, skipping`);
                await pool.query('DELETE FROM queue WHERE id = $1', [itemId]);
                continue;
            }

            // Generate a default password using the restaurant ID
            const defaultPassword = `temp_${itemId}_${Date.now()}`;

            await pool.query(
                'INSERT INTO restaurants (name, password, restaurant_info) VALUES ($1, $2, $3)',
                [restaurantName, defaultPassword, restaurantInfo]
            );
            await pool.query('DELETE FROM queue WHERE id = $1', [itemId]);
        } catch (error) {
            console.error(`DB error for ID ${itemId}:`, error);
            return { status: 500, error: `Failed to process ID: ${itemId}: ${error.message}` };
        }
    }

    for (const { id: itemId } of denied_list) {
        const selectDelete = await pool.query('SELECT restaurant_info FROM queue WHERE id = $1', [itemId]);
        if (selectDelete.rows.length === 0) {
            console.warn('no restaurant found')
            continue
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

export async function uploadRestaurant(data, token, pool, check_all) {
  try {
    const check_res = await check_integrity(data, token, check_all);
    if (check_res.status !== 200) {
      return check_res;
    }

    const geo = await geocodeAddress(data.address);
    data.lat = geo.lat;
    data.lon = geo.lng;
    data.formatted_address = geo.formattedAddress;

    // Normalize field names to align with restaurants.restaurant_info structure
    // - Store service type under "attributes"
    const normalized = {
      id: data.id,
      name: data.name,
      address: data.address,

      formatted_address: data.formatted_address,
      attributes: { service_type: data.service_type },
      menu: data.menu,
      flavors: data.flavors,
      lat: data.lat,
      lon: data.lon,
    };

    await pool.query(
      'INSERT INTO queue (restaurant_info, id) VALUES ($1::jsonb, $2)',
      [JSON.stringify(normalized), data.id]
    );

    return { status: 200, message: 'Successfully inserted to queue' };
  } catch (error) {
    console.error('uploadRestaurant error:', error);
    return { status: 500, error: error.message };
  }
}

export async function view_queue(token, pool, check_all) {
    const auth = await check_all('admin', token);
    if (auth.status !== 200) return auth;

    const { rows } = await pool.query('SELECT id, restaurant_info FROM queue ORDER BY time_created DESC LIMIT 20');

    return {
        status: 200,
        message: 'Queue retrieved',
        data: rows.map(r => {
            const info = r.restaurant_info || {};
            const attributes = info.attributes || {};
            return {
                id: r.id,
                ...info,
                service_type: attributes.service_type || info.service_type || '',
            };
        })
    };
}

export async function find_restaurant(data ,token,pool, check_all) {
    const check_authorization = await check_all('restaurant', token);
    if (check_authorization.status !== 200) {
        return { status: check_authorization.status, error: check_authorization.message };
    }
    if (!data?.id){
        return {
                status: 400,
                error: `Missing or empty required field: id`
        };
    }

    const queue_res = await pool.query('SELECT * FROM queue WHERE id = $1', [data.id]);
    if (queue_res.rows.length !== 0) {
        return {status : 200,message:'Successfully found a restaurant', data: queue_res.rows[0]};
    }
    const restaurants_res = await pool.query('SELECT * FROM restaurants WHERE id = $1', [data.id]);
    if (restaurants_res.rows.length !== 0) {
        return {status : 200,message:'Successfully found a restaurant', data: restaurants_res.rows[0]};
    }
    return {status: 400, message: 'Failed to retrieve restaurants'};
}

export async function view_all_restaurants(token, pool, check_all) {
    const auth = await check_all('admin', token);
    if (auth.status !== 200) return auth;

    const { rows } = await pool.query(
        'SELECT id, name, restaurant_info FROM restaurants ORDER BY id DESC LIMIT 100'
    );

    return {
        status: 200,
        message: 'Restaurants retrieved',
        data: rows.map(r => {
            const info = r.restaurant_info || {};
            const attributes = info.attributes || {};
            return {
                id: r.id,
                name: r.name,
                ...info,
                service_type: attributes.service_type || info.service_type || '',
            };
        })
    };
}