require('dotenv').config();
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./utils/schema.jsx",
    out: "./drizzle",
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.NEXT_PUBLIC_DATABASE_URL,
    }
});