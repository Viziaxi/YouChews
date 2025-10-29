// Converted to CommonJS (require/module.exports) to resolve Jest environment SyntaxError.
const jwt = require("jsonwebtoken");
const config = require("./config.js");

async function check_token(JWTtoken) {
    try{
        // jwt.verify is mocked, so the execution path depends on our mock setup
        const payload = jwt.verify(JWTtoken, config.jwt.secret);
        return {
            status: 200 ,
            message: "Valid token",
            user:{
                id: payload.id,
                name: payload.name,
                role: payload.role
            }
        }
    }catch(e){
        if (e.name === "TokenExpiredError") {
            return {
                status: 401,
                message: "Token expired, please re-login"
            }
        }else if (e.name === "JsonWebTokenError") {
            return {
                status: 401,
                message: `Invalid token: ${e.message}`
            };
        }
        else {
            return {
                status: 900 ,
                message: `Unexpected error : ${e.message}`
            };
        }
    }
}

async function check_authorization_type(target,src) {
    if (target !== src.user.role){
        return {
            status: 403,
            message: "Unauthorized, incorrect login type"
        };
    }else{
        return {
            status: 200,
            message: "valid",
        }
    }
}

async function check_all(authorization_type ,auth_token){
    const check = await check_token(auth_token)
    if (check.status !== 200) {
        return check;
    }
    const check_type = await check_authorization_type(authorization_type, check);
    if (check_type.status !== 200) {
        return check_type;
    }
    return {
        status: 200,
        user: check.user,
        message: "Authentication and authorization successful."
    };
}

// Export the functions using CommonJS syntax
module.exports = {
    check_token,
    check_authorization_type,
    check_all
};
