import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as schema from './schema'

config({ path: ".env" });

const URL = process.env.DATABASE_URL

console.log(URL)

const sql = neon(URL);
export const db = drizzle(sql, {schema});