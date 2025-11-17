import dotenv from 'dotenv';
dotenv.config(); // Only needed locally

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT || 3000,
};