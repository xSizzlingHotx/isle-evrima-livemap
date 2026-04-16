import mysql from "mysql2/promise";

/** Connect to PrimalCore MySQL — configure via .env.local */
export async function getDb() {
  return mysql.createConnection({
    host:     process.env.PRIMALCORE_DB_HOST,
    user:     process.env.PRIMALCORE_DB_USER,
    password: process.env.PRIMALCORE_DB_PASSWORD,
    database: process.env.PRIMALCORE_DB_NAME,
    connectTimeout: 10000,
  });
}