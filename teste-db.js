const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect()
.then(() => {
    console.log("BANCO CONECTOU ✅");
    process.exit();
})
.catch(err => {
    console.log("ERRO ❌");
    console.log(err);
});