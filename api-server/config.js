import dotenv from 'dotenv';
dotenv.config(); // Only needed locally

const config = {
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT || 3000,
  jwt:{
      secret:process.env.JWT_SECRET,
  },
};
export default config