import dotenv from 'dotenv';
dotenv.config(); // Only needed locally

const config = {
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT || 3000,
  jwt:{
      secret:'my_super_secret_key',
  },
};
export default config