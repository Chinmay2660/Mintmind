require('dotenv').config();

/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.jsx",
    dialect: 'postgresql',
    dbCredentials: {
      url: process.env.DATABASE_URL,
    }
  };