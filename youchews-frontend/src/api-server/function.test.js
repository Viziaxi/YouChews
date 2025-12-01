const {
    registerUser,
    loginUser,
    registerRestaurant,
    loginRestaurant,
    adminLogin,
    manageQueue,
    uploadRestaurant,
    updateRestaurant,
    getRecommendations
} = require('./function.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'fake-jwt-token'),
}));

jest.mock('./config.js', () => ({
  jwt: { secret: 'test-secret-key' },
}));

beforeEach(() => {
  mockPool = { query: jest.fn() };
  jest.clearAllMocks();
});


const rows = (data) => ({ rows: Array.isArray(data) ? data : [data] });


describe('User Auth Functions', () => {
    test('1.1 registerUser - success',
        async () => {
            mockPool.query.mockResolvedValueOnce(rows([])).mockResolvedValueOnce(rows({id: 1, name: 'alice'}));
            bcrypt.hash.mockResolvedValue('hashed123');

            const result = await registerUser({name: 'alice', password: 'pass'}, mockPool);
            expect(result.status).toBe(201);
            expect(result.user.name).toBe('alice');
            expect(jwt.sign).toHaveBeenCalledWith(
                {id: 1, name: 'alice', role: 'user'},
                'test-secret-key',
                {expiresIn: '5h'}
            );
        });

    test('1.2 registerUser - missing fields', async () => {
        const result = await registerUser({ name: 'alice' }, mockPool);
        expect(result.status).toBe(400);
        expect(result.error).toBe('Missing required field');
    });

    test('1.3 registerUser - username already exists', async () => {
        mockPool.query.mockResolvedValueOnce(rows([{ name: 'alice' }]));
        const result = await registerUser({ name: 'alice', password: 'pass' }, mockPool);
        expect(result.status).toBe(400);
        expect(result.error).toBe('Username already exists');
    });

    test('1.4 loginUser - success', async () => {
        mockPool.query.mockResolvedValueOnce(rows({ id: 1, name: 'alice', password: 'hashed123' }));
        bcrypt.compare.mockResolvedValue(true);
        const result = await loginUser({ name: 'alice', password: 'pass' }, mockPool);
        expect(result.status).toBe(201);
        expect(result.token).toBeDefined();
    });

    test('1.5 loginUser - wrong password', async () => {
        mockPool.query.mockResolvedValueOnce(rows({ id: 1, password: 'hashed123' }));
        bcrypt.compare.mockResolvedValue(false);
        const result = await loginUser({ name: 'alice', password: 'wrong' }, mockPool);
        expect(result.status).toBe(401);
    });
});

describe('Restaurant Auth Functions', () => {

    test('2.1 registerRestaurant - success', async () => {
        mockPool.query
            .mockResolvedValueOnce(rows([]))
            .mockResolvedValueOnce(rows({ id: 10, name: 'KFC' }));

        bcrypt.hash.mockResolvedValue('balabalawhatever');
        const result = await registerRestaurant({ name: 'KFC', password: 'secret' }, mockPool);
        expect(result.status).toBe(201);
        expect(result.user.id).toBe(10);
    });

    test('2.2 registerRestaurant - username taken', async () => {
        mockPool.query.mockResolvedValueOnce(rows([{ name: 'KFC' }]));
        const result = await registerRestaurant({ name: 'KFC', password: 'secret' }, mockPool);
        expect(result.status).toBe(400);
        expect(result.error).toBe('Username already exists');
    });

    test('2.3 loginRestaurant - not found', async () => {
        mockPool.query.mockResolvedValueOnce(rows([]));
        const result = await loginRestaurant({ name: 'unknown', password: 'x' }, mockPool);
        expect(result.status).toBe(400);
        expect(result.error).toBe('Username Not Found');
    });

    test('2.4 loginRestaurant - success', async () => {
        mockPool.query.mockResolvedValueOnce(rows({ id: 5, name: 'IN&OUTS', password: 'hash' }));
        bcrypt.compare.mockResolvedValue(true);
        const result = await loginRestaurant({ name: 'IN&OUTS', password: 'pass' }, mockPool);
        expect(result.status).toBe(201);
        expect(jwt.sign).toHaveBeenCalledWith(
            expect.objectContaining({ role: 'restaurant' }),
            'test-secret-key',
            { expiresIn: '5h' }
        );
    });

    test('2.5 loginRestaurant - wrong password', async () => {
        mockPool.query.mockResolvedValueOnce(rows({ password: 'hash' }));
        bcrypt.compare.mockResolvedValue(false);
        const result = await loginRestaurant({ name: 'IN&OUTS', password: 'wrong' }, mockPool);
        expect(result.status).toBe(401);
    });
});


describe('Admin Operations', () => {
    const mockCheckAll = jest.fn();
    beforeEach(() => {
        mockCheckAll.mockResolvedValue({ status: 200 });
    });

    test('3.1 adminLogin - success', async () => {
        mockPool.query.mockResolvedValueOnce(rows({ name: 'admin1', password: 'adminpass' }));
        const result = await adminLogin({ name: 'admin1', password: 'adminpass' }, mockPool);
        expect(result.status).toBe(201);
        expect(result.token).toBeDefined();
    });
    test('3.2 adminLogin - wrong password', async () => {
        mockPool.query.mockResolvedValueOnce(rows({ password: 'adminpass' }));
        const result = await adminLogin({ name: 'admin1', password: 'wrong' }, mockPool);
        expect(result.status).toBe(401);
    });

    test('3.3 manageQueue - approve one, deny one', async () => {
        mockPool.query
            .mockResolvedValueOnce(rows({ restaurant_info: { name: 'TacoBell' } }))
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce(rows({}))
            .mockResolvedValueOnce({});

        const result = await manageQueue(
            { approved_list: [{ id: 1 }], denied_list: [{ id: 2 }]},
            'valid-token',
            mockPool,
            mockCheckAll
        );
        expect(result.status).toBe(200);
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO restaurant'),
            ['TacoBell', '12345678', { name: 'TacoBell' }]
        );
    });

    test('3.4 manageQueue - missing name in restaurant_info', async () => {
        mockPool.query.mockResolvedValueOnce(rows({ restaurant_info: { location: 'NY' } }));

        const result = await manageQueue(
            { approved_list: [{ id: 1 }], denied_list: [] },
            'token',
            mockPool,
            mockCheckAll
        );
        expect(result.status).toBe(400);
        expect(result.error).toContain('Missing \'name\'');
    });

    test('3.5 manageQueue - unauthorized', async () => {
        mockCheckAll.mockResolvedValue({ status: 403, message: 'Forbidden' });
        const result = await manageQueue(
            { approved_list: [], denied_list: [] },
            'bad token',
            mockPool,
            mockCheckAll
        );
        expect(result.status).toBe(403);
    });
});

describe('Restaurant operations', () => {
    const mockCheckAll = jest.fn().mockResolvedValue({ status: 200 });

    test('4.1 uploadRestaurant - success', async () => {
        const data = { name: 'SushiPlace', cuisine: 'Japanese' };
        mockPool.query.mockResolvedValueOnce({});
        const result = await uploadRestaurant({ data }, 'token', mockPool, mockCheckAll);
        expect(result.status).toBe(200);
        expect(mockPool.query).toHaveBeenCalledWith(
            'INSERT INTO queue (restaurant_info) VALUES ($1::jsonb)',
            [JSON.stringify(data)]
        );
    });

    test('4.2 uploadRestaurant - missing name', async () => {
        const result = await uploadRestaurant({ data: { cuisine: 'Italian' } }, 'token', mockPool, mockCheckAll);
        expect(result.status).toBe(400);
        expect(result.error).toBe('Missing required field: name');
    });

    test('4.3 updateRestaurant - success', async () => {
        mockPool.query
            .mockResolvedValueOnce(rows({}))
            .mockResolvedValueOnce({});
        const data = { id: 7, phone: '123-456' };
        const result = await updateRestaurant(data, 'token', mockPool, mockCheckAll);
        expect(result.status).toBe(200);
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE queue SET restaurant_info = restaurant_info ||'),
            [7, JSON.stringify(data)]
        );
    });

    test('4.4 updateRestaurant - not found', async () => {
        mockPool.query.mockResolvedValueOnce(rows([]));
        const result = await updateRestaurant({ id: 999 }, 'token', mockPool, mockCheckAll);
        expect(result.status).toBe(404);
    });

    test('4.5 updateRestaurant - unauthorized', async () => {
        mockCheckAll.mockResolvedValue({ status: 403, message: 'Forbidden' });
        const result = await updateRestaurant({ id: 1 }, 'bad', mockPool, mockCheckAll);
        expect(result.status).toBe(403);
    });
});

describe('User Operations', () => {
    test('5.1 getRecommendations', async () => {
        mockPool.query.mockResolvedValueOnce(rows([
            {
                id: 9,
                name: 'Panda Expression',
                price: 'low',
                service_style: 'fast food',
                menu: ['Orange Chicken','Egg Roll','Soup Dumplings','Fried Rice'],
                flavors: ['spicy','sweet']
            },
            {
                id: 10,
                name: 'Six Guys',
                price: 'low',
                service_style: 'fast food',
                menu: ['Signature Double','Signature Single','Baconburger'],
                flavors: ['savory','fresh']
            },
            {
                id: 11,
                name: 'Dave\'s Pretty Hot Chicken',
                price: 'low',
                service_style: 'fast food',
                menu: ['Dave\'s #2','Dave\'s #3','Mac n Cheese'],
                flavors: ['spicy']
            },
        ]));
        
        mockPool.query.mockResolvedValueOnce(rows({
            id: 5,
            prefs: [
                {
                    item_id: 10,
                    like_level: 0.5
                },
                {
                    item_id: 9,
                    like_level: 1.0
                }
            ]
        }));
        
        const result = await getRecommendations([9, 10, 11], 5, 2);
        expect(result[0]).toBe(11);
        expect(result[1]).toBe(10);
    });
});