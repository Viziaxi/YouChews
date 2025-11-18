const {check_all } = require('./auth_helper.js');
const jwt = require('jsonwebtoken');
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

const MOCK_VALID_PAYLOAD = {
    id: 'user123',
    name: 'Test User',
    role: 'user'
};

const MOCK_AUTH_TOKEN = 'mock.auth.token';
const MOCK_INVALID_TOKEN = 'invalid.auth.token';
const MOCK_EXPIRED_TOKEN = 'expired.auth.token';

describe('Auth Middleware Unit Tests (auth_helper.js)', () => {
    beforeEach(() => {jwt.verify.mockClear();});

    test('1. Successful Authentication', async () => {
        jwt.verify.mockReturnValue(MOCK_VALID_PAYLOAD);
        const result = await check_all('user', MOCK_AUTH_TOKEN);
        expect(result.status).toBe(200);
        expect(result.message).toBe('Authentication and authorization successful.');
        expect(result.user).toEqual(MOCK_VALID_PAYLOAD);
    });

    test('2. Incorrect Authorization Role', async () => {
        jwt.verify.mockReturnValue(MOCK_VALID_PAYLOAD);
        const result = await check_all('admin', MOCK_AUTH_TOKEN);
        expect(result.status).toBe(403);
        expect(result.message).toBe('Unauthorized, incorrect login type');
        expect(result.user).toBeUndefined();
    });

    test('3. Token Expired', async () => {
        const expiredError = new Error('jwt expired');
        expiredError.name = 'TokenExpiredError';
        jwt.verify.mockImplementation(() => {
            throw expiredError;
        });

        const result = await check_all('user', MOCK_EXPIRED_TOKEN);
        expect(result.status).toBe(401);
        expect(result.message).toBe('Token expired, please re-login');
    });

    test('4. Invalid Token Signature', async () => {
        const jwtError = new Error('invalid signature');
        jwtError.name = 'JsonWebTokenError';
        jwt.verify.mockImplementation(() => {
            throw jwtError;
        });
        const result = await check_all('user', MOCK_INVALID_TOKEN);
        expect(result.status).toBe(401);
        expect(result.message).toMatch(/^Invalid token:/);
    });

    test('5. Unexpected error', async () => {
        const unknownError = new Error('Database connection failed');
        unknownError.name = 'DatabaseError';
        jwt.verify.mockImplementation(() => {
            throw unknownError;
        });

        const result = await check_all('user', 'some.token');

        expect(result.status).toBe(900);
        expect(result.message).toMatch(/^Unexpected error :/);
    });
});
