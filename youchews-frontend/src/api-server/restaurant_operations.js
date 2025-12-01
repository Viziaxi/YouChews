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

export async function uploadRestaurant( data , token, pool, check_all) {
    const check_res = await check_integrity(data , token, check_all)
    if (check_res.status !== 200) {
        return check_res
    }
    data.price = price_conversion(data.price)
    try {
        await pool.query('INSERT INTO queue (restaurant_info,id) VALUES ($1::jsonb)', [JSON.stringify(data),data.id]);
        return { status: 200, message: 'Successfully inserted to queue' };
    } catch (error) {
        return { status: 500, error: error.message };
    }
}

export async function view_queue(token,pool, check_all) {
    const check_authorization = await check_all('admin', token);
    if (check_authorization.status !== 200) {
        return { status: check_authorization.status, error: check_authorization.message };
    }
    let queue;
    try {
        const result = await pool.query('SELECT * FROM queue LIMIT 10');
        queue = result.rows;
    } catch (error) {
        return { status: 500, error: error.message };
    }

    return {
        status: 200,
        message: 'successfully retrieved queue',
        data: queue
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