import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  usersTable,
  foundItemsTable,
  claimsTable,
  lostReportsTable,
} from "./models/index.js";

const db = drizzle(process.env.DATABASE_URL);

export { db, usersTable, foundItemsTable, claimsTable, lostReportsTable };
