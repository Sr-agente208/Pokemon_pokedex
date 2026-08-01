const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());


// =====================
// ARQUIVOS DO SITE
// =====================

// arquivos da raiz (index.html)
app.use(express.static(__dirname));

// arquivos da pasta public
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));
app.use(express.static("public"));


// =====================
// PÁGINA INICIAL
// =====================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// =====================
// TESTE BANCO
// =====================

app.get("/teste-banco", async (req,res)=>{

    try{

        const result = await pool.query(
            "SELECT NOW()"
        );

        res.json({

            conectado:true,
            banco:result.rows

        });


    }catch(err){

        console.log(err);

        res.status(500).json({

            erro:"Erro no banco",
            detalhe:err.message

        });

    }

});


// =====================
// RECADOS
// =====================

app.get("/recados", async(req,res)=>{

    try{

        const result = await pool.query(
            "SELECT * FROM recados ORDER BY id DESC"
        );

        res.json(result.rows);


    }catch(err){

        console.log(err);

        res.status(500).json({

            erro:"Erro no banco",
            detalhe:err.message

        });

    }

});



app.post("/recados", async(req,res)=>{

    try{

        const nome = req.body.nome || req.body.usuario || "Anônimo";
        const mensagem = req.body.mensagem || req.body.texto || "";


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

            erro:"Erro no banco",
            detalhe:err.message

        });

    }

});



// =====================
// CADASTRO
// =====================

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

        let msg = err.message;
        if (err.code === '23505') {
            msg = "Este email já está cadastrado!";
        }

        res.status(500).json({

            erro:"Erro no cadastro",
            detalhe:msg

        });

    }

});



// =====================
// LOGIN
// =====================

app.post("/login", async(req,res)=>{

    try{

        const {email,senha}=req.body;


        const result = await pool.query(

            `
            SELECT * FROM usuarios
            WHERE email=$1 AND senha=$2
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

            erro:"Erro login",
            detalhe:err.message

        });

    }

});



// =====================
// FAVORITOS
// =====================

app.post("/favoritos", async(req,res)=>{

    try{

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



    }catch(err){

        console.log(err);

        res.status(500).json({

            erro:"Erro favorito",
            detalhe:err.message

        });

    }

});

app.get("/favoritos/:usuario_id", async(req, res) => {
    try {
        const { usuario_id } = req.params;
        const result = await pool.query(
            "SELECT * FROM favoritos WHERE usuario_id = $1 ORDER BY id DESC",
            [usuario_id]
        );
        res.json(result.rows);
    } catch(err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao buscar favoritos", detalhe: err.message });
    }
});

app.delete("/favoritos/:usuario_id/:numero", async(req, res) => {
    try {
        const { usuario_id, numero } = req.params;
        await pool.query(
            "DELETE FROM favoritos WHERE usuario_id = $1 AND numero = $2",
            [usuario_id, numero]
        );
        res.json({ sucesso: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao deletar favorito", detalhe: err.message });
    }
});



// =====================
// INICIAR SERVIDOR
// =====================

const PORT = process.env.PORT || 3000;


app.listen(PORT,()=>{

    console.log(
        `Servidor rodando na porta ${PORT}`
    );

});