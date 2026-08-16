const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const files = {
  usuarios: path.join(__dirname, "db_fallback_usuarios.json"),
  recados: path.join(__dirname, "db_fallback_recados.json"),
  favoritos: path.join(__dirname, "db_fallback_favoritos.json")
};
let pool = null;
let online = false;
let connecting = false;

function read(name) { try { return JSON.parse(fs.readFileSync(files[name], "utf8")); } catch (_) { return []; } }
function write(name, value) { fs.writeFileSync(files[name], JSON.stringify(value, null, 2)); }
function nextId(items) { return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1; }
function normalizeCargo(cargo) { return ["ADM", "Assistente", "Usuário"].indexOf(cargo) >= 0 ? cargo : "Usuário"; }

async function setup() {
  await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha TEXT NOT NULL, cargo TEXT NOT NULL DEFAULT 'Usuário')`);
  await pool.query(`CREATE TABLE IF NOT EXISTS recados (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, mensagem TEXT NOT NULL, cargo TEXT NOT NULL DEFAULT 'Usuário', criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS favoritos (id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL, nome TEXT NOT NULL, numero INTEGER NOT NULL, imagem TEXT, tipo TEXT, UNIQUE(usuario_id, numero))`);
  await pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo TEXT NOT NULL DEFAULT 'Usuário'");
  await pool.query("ALTER TABLE recados ADD COLUMN IF NOT EXISTS cargo TEXT NOT NULL DEFAULT 'Usuário'");
}
async function sync() {
  for (const user of read("usuarios")) await pool.query("INSERT INTO usuarios(nome,email,senha,cargo) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING", [user.nome, user.email, user.senha, normalizeCargo(user.cargo)]);
  for (const note of read("recados")) await pool.query("INSERT INTO recados(nome,mensagem,cargo) VALUES($1,$2,$3)", [note.nome, note.mensagem, normalizeCargo(note.cargo)]);
  for (const fav of read("favoritos")) await pool.query("INSERT INTO favoritos(usuario_id,nome,numero,imagem,tipo) VALUES($1,$2,$3,$4,$5) ON CONFLICT(usuario_id,numero) DO NOTHING", [fav.usuario_id, fav.nome, fav.numero, fav.imagem || "", fav.tipo || ""]);
  Object.keys(files).forEach(name => write(name, []));
}
async function connect() {
  if (connecting || !process.env.DATABASE_URL) return;
  connecting = true;
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
    // Uma queda depois da conexão também ativa o modo local imediatamente.
    pool.on("error", function (error) { online = false; console.warn("Conexão Postgres perdida; fallback JSON ativado:", error.code || error.message); });
    await pool.query("SELECT 1");
    await setup();
    online = true;
    await sync();
    console.log("Postgres conectado; dados offline sincronizados.");
  } catch (error) {
    online = false;
    if (pool) { try { await pool.end(); } catch (_) {} }
    pool = null;
    console.warn("Postgres indisponível; usando fallback JSON:", error.code || error.message);
  } finally { connecting = false; }
}
connect();
setInterval(connect, 15000).unref();

const db = {
  isOnline: () => online,
  async usuarios() { if (online) return (await pool.query("SELECT id,nome,email,cargo FROM usuarios ORDER BY id DESC")).rows; return read("usuarios").map(({ senha, ...u }) => u); },
  async createUsuario(data) {
    const user = { nome: String(data.nome || "").trim(), email: String(data.email || "").trim().toLowerCase(), senha: String(data.senha || ""), cargo: normalizeCargo(data.cargo) };
    if (!user.nome || !user.email || !user.senha) throw Object.assign(new Error("Preencha nome, e-mail e senha."), { status: 400 });
    if (online) return (await pool.query("INSERT INTO usuarios(nome,email,senha,cargo) VALUES($1,$2,$3,$4) RETURNING id,nome,email,cargo", [user.nome,user.email,user.senha,user.cargo])).rows[0];
    const all = read("usuarios"); if (all.some(u => u.email === user.email)) throw Object.assign(new Error("Este email já está cadastrado!"), { code: "23505" });
    user.id = nextId(all); all.push(user); write("usuarios", all); return { id:user.id,nome:user.nome,email:user.email,cargo:user.cargo };
  },
  async login(email, senha) { if (online) return (await pool.query("SELECT id,nome,email,cargo FROM usuarios WHERE email=$1 AND senha=$2", [String(email).toLowerCase(),senha])).rows[0]; return read("usuarios").find(u => u.email === String(email).toLowerCase() && u.senha === senha) || null; },
  async deleteUsuario(id) { if (online) return (await pool.query("DELETE FROM usuarios WHERE id=$1", [id])).rowCount; const all=read("usuarios"), rest=all.filter(u=>String(u.id)!==String(id)); write("usuarios",rest); return all.length-rest.length; },
  async recados() { if (online) return (await pool.query("SELECT id,nome,mensagem,cargo,criado_em FROM recados ORDER BY id DESC")).rows; return read("recados").sort((a,b)=>b.id-a.id); },
  async createRecado(data) { const note={nome:String(data.nome||data.usuario||"Anônimo").trim(),mensagem:String(data.mensagem||data.texto||"").trim(),cargo:normalizeCargo(data.cargo)}; if(!note.mensagem) throw Object.assign(new Error("Digite um recado."),{status:400}); if(online) return (await pool.query("INSERT INTO recados(nome,mensagem,cargo) VALUES($1,$2,$3) RETURNING *",[note.nome,note.mensagem,note.cargo])).rows[0]; const all=read("recados"); note.id=nextId(all); note.criado_em=new Date().toISOString(); all.push(note);write("recados",all);return note; },
  async deleteRecado(id) { if(online) return (await pool.query("DELETE FROM recados WHERE id=$1",[id])).rowCount; const all=read("recados"),rest=all.filter(r=>String(r.id)!==String(id));write("recados",rest);return all.length-rest.length; },
  async favoritos(usuarioId) { if(online)return (await pool.query("SELECT * FROM favoritos WHERE usuario_id=$1 ORDER BY id DESC",[usuarioId])).rows; return read("favoritos").filter(f=>String(f.usuario_id)===String(usuarioId)); },
  async createFavorito(data) { const fav={usuario_id:Number(data.usuario_id),nome:String(data.nome||""),numero:Number(data.numero),imagem:String(data.imagem||""),tipo:String(data.tipo||"")}; if(!fav.usuario_id||!fav.nome||!fav.numero) throw Object.assign(new Error("Favorito inválido."),{status:400}); if(online)return (await pool.query("INSERT INTO favoritos(usuario_id,nome,numero,imagem,tipo) VALUES($1,$2,$3,$4,$5) ON CONFLICT(usuario_id,numero) DO NOTHING RETURNING *",[fav.usuario_id,fav.nome,fav.numero,fav.imagem,fav.tipo])).rows[0]; const all=read("favoritos");if(all.some(f=>f.usuario_id===fav.usuario_id&&f.numero===fav.numero))return null;fav.id=nextId(all);all.push(fav);write("favoritos",all);return fav; },
  async deleteFavorito(usuarioId, id) { if(online)return (await pool.query("DELETE FROM favoritos WHERE id=$1 AND usuario_id=$2",[id,usuarioId])).rowCount;const all=read("favoritos"),rest=all.filter(f=>!(String(f.id)===String(id)&&String(f.usuario_id)===String(usuarioId)));write("favoritos",rest);return all.length-rest.length; }
};
module.exports = db;
