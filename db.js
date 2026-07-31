const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    keepAlive: true
});

pool.on("connect", () => {
    console.log("✅ PostgreSQL conectado");
});

pool.on("error", (err) => {
    console.log("❌ Erro PostgreSQL:", err.message);
});

module.exports = pool;