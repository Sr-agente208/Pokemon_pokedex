const express = require("express");
const cors = require("cors");
const pool = require("./db");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// =============================
// PÁGINA INICIAL
// =============================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});


// =============================
// RECADOS
// =============================

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


app.put("/recados/:id/curtir", async (req, res) => {

    const { id } = req.params;

    await pool.query(
        `
        UPDATE recados
        SET curtidas = curtidas + 1
        WHERE id=$1
        `,
        [id]
    );

    res.json({
        sucesso:true
    });

});


app.delete("/recados/:id", async (req,res)=>{

    const {id}=req.params;

    await pool.query(
        "DELETE FROM recados WHERE id=$1",
        [id]
    );

    res.json({
        sucesso:true
    });

});


app.put("/recados/:id", async(req,res)=>{

    const {id}=req.params;

    const {nome,mensagem}=req.body;


    await pool.query(
        `
        UPDATE recados
        SET nome=$1,
            mensagem=$2
        WHERE id=$3
        `,
        [nome,mensagem,id]
    );


    res.json({
        sucesso:true
    });

});



// =============================
// CADASTRO
// =============================

app.post("/cadastro", async(req,res)=>{

    const {nome,email,senha}=req.body;


    await pool.query(
        `
        INSERT INTO usuarios(nome,email,senha)
        VALUES($1,$2,$3)
        `,
        [nome,email,senha]
    );


    res.json({
        sucesso:true,
        mensagem:"Usuário criado!"
    });

});



// =============================
// LOGIN
// =============================

app.post("/login", async(req,res)=>{

    const {email,senha}=req.body;


    const resultado = await pool.query(
        `
        SELECT * FROM usuarios
        WHERE email=$1 AND senha=$2
        `,
        [email,senha]
    );


    if(resultado.rows.length > 0){

        res.json({

            sucesso:true,

            usuario:resultado.rows[0],

            token:"pokemon-token"

        });

    }else{

        res.json({
            sucesso:false
        });

    }

});



// =============================
// FAVORITOS
// =============================

app.post("/favoritos", async(req,res)=>{


    const {
        usuario_id,
        nome,
        numero,
        imagem,
        tipo
    } = req.body;



    await pool.query(
        `
        INSERT INTO favoritos
        (usuario_id,nome,numero,imagem,tipo)

        VALUES($1,$2,$3,$4,$5)
        `,
        [
            usuario_id,
            nome,
            numero,
            imagem,
            tipo
        ]
    );


    res.json({
        sucesso:true
    });

});



app.get("/favoritos/:usuario", async(req,res)=>{


    const {usuario}=req.params;


    const resultado = await pool.query(
        `
        SELECT * FROM favoritos
        WHERE usuario_id=$1
        `,
        [usuario]
    );


    res.json(resultado.rows);

});



// =============================
// SERVIDOR
// =============================

const PORT = process.env.PORT || 3000;


app.listen(PORT,()=>{

    console.log(`Servidor rodando na porta ${PORT}`);

});