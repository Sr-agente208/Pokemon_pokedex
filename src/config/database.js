const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000, // 5 seconds timeout
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
        // Try background sync if any offline data exists
        await syncOfflineData();
    } catch (err) {
        console.warn("⚠️ Database initialization on PostgreSQL failed. Switching to local JSON database fallback.");
        useFallback = true;
    }
}

// Synchronization engine to sync offline JSON fallback data to PostgreSQL
async function syncOfflineData() {
    try {
        console.log("Database: Starting synchronization of offline data to PostgreSQL...");
        
        // 1. Sync Users
        const offlineUsers = readFallbackFile("db_fallback_usuarios.json");
        const userIdMap = {}; // Maps old offline ID to real PostgreSQL ID
        
        if (offlineUsers.length > 0) {
            console.log(`Database: Syncing ${offlineUsers.length} offline users...`);
            for (const user of offlineUsers) {
                const checkRes = await pool.query("SELECT id FROM usuarios WHERE email = $1", [user.email]);
                let realId;
                if (checkRes.rows.length > 0) {
                    realId = checkRes.rows[0].id;
                } else {
                    const insertRes = await pool.query(
                        "INSERT INTO usuarios (nome, email, senha, criado_em) VALUES ($1, $2, $3, $4) RETURNING id",
                        [user.nome, user.email, user.senha, user.criado_em || new Date()]
                    );
                    realId = insertRes.rows[0].id;
                }
                userIdMap[user.id] = realId;
            }
        }
        
        // 2. Sync Recados
        const offlineRecados = readFallbackFile("db_fallback_recados.json");
        if (offlineRecados.length > 0) {
            console.log(`Database: Syncing ${offlineRecados.length} offline recados...`);
            for (const recado of offlineRecados) {
                await pool.query(
                    "INSERT INTO recados (nome, mensagem, criado_em) VALUES ($1, $2, $3)",
                    [recado.nome, recado.mensagem, recado.criado_em || new Date()]
                );
            }
        }
        
        // 3. Sync Favorites
        const offlineFavorites = readFallbackFile("db_fallback_favoritos.json");
        if (offlineFavorites.length > 0) {
            console.log(`Database: Syncing ${offlineFavorites.length} offline favorites...`);
            for (const fav of offlineFavorites) {
                const realUserId = userIdMap[fav.usuario_id] || null;
                await pool.query(
                    "INSERT INTO favoritos (usuario_id, nome, numero, imagem, tipo, criado_em) VALUES ($1, $2, $3, $4, $5, $6)",
                    [realUserId, fav.nome, fav.numero, fav.imagem, fav.tipo, fav.criado_em || new Date()]
                );
            }
        }
        
        // Clear files upon successful synchronization
        if (offlineUsers.length > 0) writeFallbackFile("db_fallback_usuarios.json", []);
        if (offlineRecados.length > 0) writeFallbackFile("db_fallback_recados.json", []);
        if (offlineFavorites.length > 0) writeFallbackFile("db_fallback_favoritos.json", []);
        
        console.log("Database: Offline data successfully synchronized to PostgreSQL! 🎉");
    } catch (err) {
        console.error("Database: Error during offline synchronization:", err.message);
    }
}

// Background heartbeat to detect when PostgreSQL comes online
setInterval(async () => {
    if (useFallback) {
        try {
            await pool.query("SELECT NOW()");
            console.log("⚡ PostgreSQL is back online! Switching from fallback mode to database mode...");
            useFallback = false;
            await syncOfflineData();
        } catch (err) {
            // Still offline
        }
    } else {
        try {
            const hasUsers = fs.existsSync(getFallbackPath("db_fallback_usuarios.json")) && readFallbackFile("db_fallback_usuarios.json").length > 0;
            const hasRecados = fs.existsSync(getFallbackPath("db_fallback_recados.json")) && readFallbackFile("db_fallback_recados.json").length > 0;
            const hasFavorites = fs.existsSync(getFallbackPath("db_fallback_favoritos.json")) && readFallbackFile("db_fallback_favoritos.json").length > 0;
            
            if (hasUsers || hasRecados || hasFavorites) {
                await syncOfflineData();
            }
        } catch(e) {}
    }
}, 15000); // Check every 15 seconds

// Run the initialization
initDb();

module.exports = {
    query: queryWrapper,
    originalPool: pool
};
