async function price_conversion(raw_price) {
    if (!raw_price || typeof raw_price !== 'number' || raw_price <= 0) {
        console.error('Invalid price passed or price is 0 (price_conversion).');
        return '';
    }

    if (raw_price <= 15) {
        return '$';
    }
    else if (raw_price <= 30) {
        return '$$';
    }
    else if (raw_price <= 60) {
        return '$$$';
    }
    else {
        return '$$$$';
    }
}

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
        'cuisine',
        'service_style',
        'menu',
        'price',
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
            await pool.query(
                'INSERT INTO restaurants (restaurant_info) VALUES ($1)',
                [row.restaurant_info]
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

    data.price = await price_conversion(data.price);

    const geo = await geocodeAddress(data.address);
    data.lat = geo.lat;
    data.lon = geo.lng;
    data.formatted_address = geo.formattedAddress;

    await pool.query(
      'INSERT INTO queue (restaurant_info, id) VALUES ($1::jsonb, $2)',
      [JSON.stringify(data), data.id]
    );

    return { status: 200, message: 'Successfully inserted to queue' };
  } catch (error) {
    console.error('uploadRestaurant error:', error);
    return { status: 500, error: error.message };
  }
}

export async function view_queue(token, pool, check_all) {
    try {
        const auth = await check_all('admin', token);
        if (auth.status !== 200) return auth;

        const { rows } = await pool.query('SELECT id, restaurant_info FROM queue ORDER BY time_created DESC LIMIT 20');

        return {
            status: 200,
            message: 'Queue retrieved',
            data: rows.map(r => ({
                id: r.id,
                ...r.restaurant_info
            }))
        };
    } catch (error) {
        console.error('view_queue error:', error);
        return {
            status: 500,
            error: error.message || 'Failed to retrieve queue'
        };
    }
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