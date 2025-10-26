const { check_token, check_authorization_type, check_all } = require('./auth_helper.js');
const jwt = require('jsonwebtoken');

// Mock the entire 'jsonwebtoken' module
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

const MOCK_VALID_PAYLOAD = {
    id: 'user123',
    name: 'Test User',
    role: 'customer'
};

const MOCK_AUTH_TOKEN = 'mock.auth.token';
const MOCK_INVALID_TOKEN = 'invalid.auth.token';
const MOCK_EXPIRED_TOKEN = 'expired.auth.token';

describe('Auth Middleware Unit Tests (auth_helper.js)', () => {
    beforeEach(() => {jwt.verify.mockClear();});

    //Case 1: Successful Authentication
    test('1. Should return 200 for valid token and matching role', async () => {
        jwt.verify.mockReturnValue(MOCK_VALID_PAYLOAD);
        const result = await check_all('customer', MOCK_AUTH_TOKEN);
        expect(result.status).toBe(200);
        expect(result.message).toBe('Authentication and authorization successful.');
        expect(result.user).toEqual(MOCK_VALID_PAYLOAD);
        expect(jwt.verify).toHaveBeenCalled();
    });

    // Case 2: Incorrect Authorization Role
    test('2. Should return 403 for valid token but non-matching role', async () => {
        jwt.verify.mockReturnValue(MOCK_VALID_PAYLOAD);
        const result = await check_all('admin', MOCK_AUTH_TOKEN);
        expect(result.status).toBe(403);
        expect(result.message).toBe('Unauthorized, incorrect login type');
        expect(result.user).toBeUndefined();
        expect(jwt.verify).toHaveBeenCalled();
    });

    //Case 3:Token Expired
    test('3. Should return 401 for an expired token', async () => {
        const expiredError = new Error('jwt expired');
        expiredError.name = 'TokenExpiredError';
        jwt.verify.mockImplementation(() => {
            throw expiredError;
        });

        const result = await check_all('customer', MOCK_EXPIRED_TOKEN);
        expect(result.status).toBe(401);
        expect(result.message).toBe('Token expired, please re-login');
        expect(jwt.verify).toHaveBeenCalled();
    });

    //  Case 4: Failed Authentication - Invalid Token Signature
    test('4. Should return 401 for an invalid or malformed token (JsonWebTokenError)', async () => {
        const jwtError = new Error('invalid signature');
        jwtError.name = 'JsonWebTokenError';
        jwt.verify.mockImplementation(() => {
            throw jwtError;
        });
        const result = await check_all('customer', MOCK_INVALID_TOKEN);
        expect(result.status).toBe(401);
        expect(result.message).toMatch(/^Invalid token:/); // Message should start with "Invalid token:"
        expect(jwt.verify).toHaveBeenCalled();
    });

    //  Case 5: Failed Authentication - Unexpected error
    test('5. Should return 900 for an unexpected verification error', async () => {
        const unknownError = new Error('Database connection failed');
        unknownError.name = 'DatabaseError'; // A name other than the expected JWT ones
        jwt.verify.mockImplementation(() => {
            throw unknownError;
        });

        const result = await check_all('customer', 'some.token');

        expect(result.status).toBe(900);
        expect(result.message).toMatch(/^Unexpected error :/); // Message should start with "Unexpected error :"
        expect(jwt.verify).toHaveBeenCalled();
    });
});
