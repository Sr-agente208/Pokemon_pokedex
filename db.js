const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000, // 5 seconds timeout to quickly switch to fallback
    idleTimeoutMillis: 30000
});

let useFallback = false;

// Helper to get fallback file paths in the project root
function getFallbackPath(filename) {
    return path.join(process.cwd(), filename);
}

// Helper to read JSON file safely
function readFallbackFile(filename) {
    const filePath = getFallbackPath(filename);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const content = fs.readFileSync(filePath, "utf8");
        return JSON.parse(content || "[]");
    } catch (e) {
        return [];
    }
}

// Helper to write JSON file safely
function writeFallbackFile(filename, data) {
    const filePath = getFallbackPath(filename);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
        console.error(`Error writing fallback file ${filename}:`, e);
    }
}

// Fallback query execution
function executeFallbackQuery(sql, params) {
    const sqlClean = sql.replace(/\s+/g, " ").trim().toUpperCase();
    
    if (sqlClean.includes("SELECT NOW()")) {
        return { rows: [{ now: new Date() }] };
    }
    
    if (sqlClean.includes("SELECT * FROM RECADOS")) {
        const recados = readFallbackFile("db_fallback_recados.json");
        recados.sort((a, b) => b.id - a.id);
        return { rows: recados };
    }
    
    if (sqlClean.includes("INSERT INTO RECADOS")) {
        const recados = readFallbackFile("db_fallback_recados.json");
        const nome = params[0] || "Anônimo";
        const mensagem = params[1] || "";
        recados.push({
            id: Date.now(),
            nome: nome,
            mensagem: mensagem,
            criado_em: new Date().toISOString()
        });
        writeFallbackFile("db_fallback_recados.json", recados);
        return { rows: [] };
    }
    
    if (sqlClean.includes("INSERT INTO USUARIOS")) {
        const usuarios = readFallbackFile("db_fallback_usuarios.json");
        const nome = params[0];
        const email = params[1];
        const senha = params[2];
        
        const existing = usuarios.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            const err = new Error("Unique violation duplicate key");
            err.code = "23505";
            throw err;
        }
        
        usuarios.push({
            id: Date.now(),
            nome,
            email,
            senha,
            criado_em: new Date().toISOString()
        });
        writeFallbackFile("db_fallback_usuarios.json", usuarios);
        return { rows: [] };
    }
    
    if (sqlClean.includes("SELECT * FROM USUARIOS")) {
        const usuarios = readFallbackFile("db_fallback_usuarios.json");
        const email = params[0];
        const senha = params[1];
        
        const matches = usuarios.filter(u => u.email && u.email.toLowerCase() === email.toLowerCase() && u.senha === senha);
        return { rows: matches };
    }
    
    if (sqlClean.includes("INSERT INTO FAVORITOS")) {
        const favoritos = readFallbackFile("db_fallback_favoritos.json");
        favoritos.push({
            id: Date.now(),
            usuario_id: params[0],
            nome: params[1],
            numero: params[2],
            imagem: params[3],
            tipo: params[4],
            criado_em: new Date().toISOString()
        });
        writeFallbackFile("db_fallback_favoritos.json", favoritos);
        return { rows: [] };
    }

    if (sqlClean.includes("SELECT * FROM FAVORITOS")) {
        const favoritos = readFallbackFile("db_fallback_favoritos.json");
        const usuario_id = params[0];
        const matches = favoritos.filter(f => f.usuario_id == usuario_id);
        matches.sort((a, b) => b.id - a.id);
        return { rows: matches };
    }

    if (sqlClean.includes("DELETE FROM FAVORITOS")) {
        let favoritos = readFallbackFile("db_fallback_favoritos.json");
        const usuario_id = params[0];
        const numero = params[1];
        favoritos = favoritos.filter(f => !(f.usuario_id == usuario_id && f.numero == numero));
        writeFallbackFile("db_fallback_favoritos.json", favoritos);
        return { rows: [] };
    }
    
    return { rows: [] };
}

// Wrapper for pool query
const queryWrapper = async (sql, params) => {
    if (useFallback) {
        return executeFallbackQuery(sql, params);
    }
    
    try {
        return await pool.query(sql, params);
    } catch (err) {
        if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.message.includes("terminated unexpectedly") || err.message.includes("read ECONNRESET") || err.message.includes("timeout")) {
            console.warn("⚠️ PostgreSQL connection failed. Falling back to local JSON database.");
            useFallback = true;
            return executeFallbackQuery(sql, params);
        }
        throw err;
    }
};

// Auto-create tables on startup
async function initDb() {
    try {
        console.log("Database: Connecting to PostgreSQL...");
        await pool.query("SELECT NOW()");
        
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
        
        console.log("Database: PostgreSQL tables checked/created successfully! ✅");
    } catch (err) {
        console.warn("⚠️ Database initialization on PostgreSQL failed. Switching to local JSON database fallback.");
        useFallback = true;
    }
}

// Run the initialization
initDb();

module.exports = {
    query: queryWrapper,
    originalPool: pool
};
