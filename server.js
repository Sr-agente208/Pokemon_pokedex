const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// arquivos públicos
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "public")));


// =======================
// INDEX
// =======================

app.get("/", (req,res)=>{
    res.sendFile(path.join(__dirname,"index.html"));
});


// =======================
// RECADOS
// =======================

app.get("/recados", async(req,res)=>{

    try{

        const result = await pool.query(
            "SELECT * FROM recados ORDER BY id DESC"
        );

        res.json(result.rows);

    }catch(err){

        console.log(err);
        res.status(500).json({
            erro:"Erro no banco"
        });

    }

});



app.post("/recados", async(req,res)=>{

    try{

        const {nome,mensagem}=req.body;


        await pool.query(
            `
            INSERT INTO recados(nome,mensagem)
            VALUES($1,$2)
            `,
            [nome,mensagem]
        );


        res.json({
            sucesso:true
        });


    }catch(err){

        console.log(err);

        res.status(500).json({
            erro:"Erro ao salvar"
        });

    }

});



// =======================
// CADASTRO
// =======================

app.post("/cadastro", async(req,res)=>{


try{

const {nome,email,senha}=req.body;


await pool.query(
`
INSERT INTO usuarios(nome,email,senha)
VALUES($1,$2,$3)
`,
[nome,email,senha]
);


res.json({
sucesso:true
});


}catch(err){

console.log(err);

res.status(500).json({
erro:"Cadastro falhou"
});


}


});




// =======================
// LOGIN
// =======================

app.post("/login",async(req,res)=>{


try{


const {email,senha}=req.body;


const result = await pool.query(

`
SELECT * FROM usuarios
WHERE email=$1
AND senha=$2
`,
[email,senha]

);



if(result.rows.length){

res.json({

sucesso:true,

usuario:result.rows[0]

});


}else{


res.json({

sucesso:false

});


}


}catch(err){

console.log(err);

res.status(500).json({
erro:"Erro login"
});

}


});



// =======================
// FAVORITOS
// =======================

app.post("/favoritos",async(req,res)=>{


try{

const {
usuario_id,
nome,
numero,
imagem,
tipo
}=req.body;



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


}catch(err){

console.log(err);

res.status(500).json({
erro:"Erro favorito"
});


}


});




app.get("/favoritos/:usuario",async(req,res)=>{


const result =
await pool.query(

`
SELECT * FROM favoritos
WHERE usuario_id=$1
`,
[req.params.usuario]

);


res.json(result.rows);


});





// =======================
// START
// =======================


const PORT = process.env.PORT || 3000;


app.listen(PORT,()=>{

console.log(
`Servidor rodando na porta ${PORT}`
);

});