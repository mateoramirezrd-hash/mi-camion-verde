const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST,
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  port: Number(process.env.MYSQL_ADDON_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 8000,
  timezone: '-05:00',
  dateStrings: true,
  multipleStatements: true,
});

module.exports = { pool };
