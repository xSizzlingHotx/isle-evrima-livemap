import mysql from 'mysql2/promise';

/**
 * Connect to your MySQL database.
 * Configure via .env.local — works with any MySQL DB.
 */
export async function getDb() {
  return mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000,
  });
}