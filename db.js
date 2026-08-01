const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

// Auto-create tables on startup
async function initDb() {
    try {
        console.log("Database: Initializing tables...");
        
        // 1. usuarios
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                senha VARCHAR(100) NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 2. recados
        await pool.query(`
            CREATE TABLE IF NOT EXISTS recados (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100),
                mensagem TEXT NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. favoritos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS favoritos (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER,
                nome VARCHAR(100) NOT NULL,
                numero VARCHAR(50) NOT NULL,
                imagem TEXT NOT NULL,
                tipo VARCHAR(50) NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log("Database: Tables checked/created successfully! ✅");
    } catch (err) {
        console.error("Database initialization error ❌:", err.message);
    }
}

// Run the initialization
initDb();

module.exports = pool;
