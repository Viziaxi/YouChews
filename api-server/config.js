import dotenv from 'dotenv'

dotenv.config()

const config = {
    db:{
        user:process.env.DB_USER,
        host:process.env.DB_HOST,
        database:process.env.DB_NAME,
        password:process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    },
    jwt:{
        secret:process.env.JWT_SECRET,
    },
};
export default config;