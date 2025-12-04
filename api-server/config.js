import dotenv from 'dotenv';
dotenv.config();
const config = {
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT || 3000,
  jwt:{
      secret:'KEY',
  },
};
export default config