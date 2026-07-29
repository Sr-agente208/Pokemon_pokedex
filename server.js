const express = require("express");
const cors = require("cors");
const pool = require("./db");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/recados", async (req, res) => {

    const resultado = await pool.query(
        "SELECT * FROM recados ORDER BY id DESC"
    );

    res.json(resultado.rows);

});

app.post("/recados", async (req, res) => {

    const { nome, mensagem } = req.body;

    await pool.query(

        "INSERT INTO recados(nome,mensagem) VALUES($1,$2)",

        [nome, mensagem]

    );

    res.json({
        sucesso: true
    });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("Servidor iniciado!");

});