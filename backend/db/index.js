const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: `${process.env.DB_PASSWORD}`, // ← Force convert to string
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),      // ← Convert to number
  database: process.env.DB_NAME,
});

module.exports = pool;
