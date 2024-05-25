require('dotenv').config();
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./utils/schema.jsx",
    out: "./drizzle",
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    }
});