// ======================================
// SISTEMA DE USUÁRIOS
// ======================================

console.log("SCRIPT DA POKEDEX CARREGADO");

// CRIAR CONTA
function criarConta(){

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();


    if(!nome || !email || !senha){

        alert("Preencha todos os campos!");
        return;

    }


    let usuarios = JSON.parse(
        localStorage.getItem("usuarios")
    ) || [];


    let existe = usuarios.find(
        usuario => usuario.email === email
    );


    if(existe){

        alert("Esse email já está cadastrado!");
        return;

    }


    usuarios.push({

        nome,
        email,
        senha

    });


    localStorage.setItem(
        "usuarios",
        JSON.stringify(usuarios)
    );


    alert("✅ Conta criada com sucesso!");


    window.location.href="login.html";

}




// LOGIN

function login(){

    const email =
    document.getElementById("email").value.trim();


    const senha =
    document.getElementById("senha").value.trim();



    if(!email || !senha){

        alert("Preencha todos os campos!");
        return;

    }



    let usuarios = JSON.parse(
        localStorage.getItem("usuarios")
    ) || [];



    let usuario = usuarios.find(

        u => 
        u.email === email &&
        u.senha === senha

    );



    if(!usuario){

        alert("❌ Email ou senha incorretos!");
        return;

    }



    localStorage.setItem(
        "logado",
        "true"
    );


    localStorage.setItem(

        "usuarioLogado",

        JSON.stringify(usuario)

    );



    alert("✅ Login realizado!");

    window.location.href="index.html";


}





// SAIR

function sair(){

    localStorage.removeItem(
        "logado"
    );


    localStorage.removeItem(
        "usuarioLogado"
    );


    window.location.href="login.html";

}





// ======================================
// PROTEGER PÁGINAS
// ======================================


function verificarLogin(){


    if(
    !localStorage.getItem("logado")
    ){

        window.location.href="login.html";

    }


}





// ======================================
// FAVORITOS
// ======================================



function chaveFavoritos(){


    let usuario =
    JSON.parse(
        localStorage.getItem("usuarioLogado")
    );


    if(!usuario){

        return "favoritos";

    }


    return "favoritos_" + usuario.email;


}





function favoritarPokemon(pokemon){



    if(!pokemon){

        alert("Nenhum Pokémon selecionado!");
        return;

    }



    let favoritos = JSON.parse(

        localStorage.getItem(
            chaveFavoritos()
        )

    ) || [];



    let existe = favoritos.find(

        p => p.numero === pokemon.id

    );



    if(existe){

        alert("Esse Pokémon já está nos favoritos!");

        return;

    }




    favoritos.push({

        nome:pokemon.name,

        numero:pokemon.id,

        imagem:
        pokemon.sprites.other["official-artwork"].front_default,


        tipo:
        pokemon.types
        .map(t=>t.type.name)
        .join(", ")


    });



    localStorage.setItem(

        chaveFavoritos(),

        JSON.stringify(favoritos)

    );



    alert("⭐ Pokémon favoritado!");



}






function carregarFavoritos(){


    let lista =
    document.getElementById(
        "listaFavoritos"
    );


    if(!lista)return;



    let favoritos =
    JSON.parse(

        localStorage.getItem(
            chaveFavoritos()
        )

    ) || [];



    lista.innerHTML="";



    if(favoritos.length===0){


        lista.innerHTML=
        "<h2>😢 Nenhum favorito salvo</h2>";

        return;

    }




    favoritos.forEach(
    (pokemon,index)=>{


        lista.innerHTML += `


        <div class="pokemon-card">


        <h2>
        ${pokemon.nome}
        </h2>


        <img src="${pokemon.imagem}">


        <p>
        🔢 Número: #${pokemon.numero}
        </p>


        <p>
        🌈 Tipo: ${pokemon.tipo}
        </p>


        <button 
        onclick="removerFavorito(${index})">

        🗑 Remover

        </button>


        </div>


        `;


    });



}





function removerFavorito(index){


    let favoritos =
    JSON.parse(

        localStorage.getItem(
            chaveFavoritos()
        )

    ) || [];



    favoritos.splice(index,1);



    localStorage.setItem(

        chaveFavoritos(),

        JSON.stringify(favoritos)

    );



    carregarFavoritos();


}






// ======================================
// WORD
// ======================================


function baixarWord(){


    if(!window.pokemonAtual){

        alert("Pesquise um Pokémon primeiro!");
        return;

    }



    let p = window.pokemonAtual;



    let texto = `

POKÉDEX

Nome: ${p.name}

Número: ${p.id}

Tipos:
${p.types.map(t=>t.type.name).join(", ")}

Altura:
${p.height/10} metros

Peso:
${p.weight/10} kg

    `;



    let blob = new Blob(

        [texto],

        {
            type:
            "application/msword"
        }

    );



    let link =
    document.createElement("a");



    link.href =
    URL.createObjectURL(blob);



    link.download =
    p.name + ".doc";



    link.click();


}