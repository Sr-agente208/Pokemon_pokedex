// ==============================
// CRIAR CONTA
// ==============================

function criarConta(){

console.log("Botão criar conta funcionando");


let nome = document.getElementById("nome").value;
let email = document.getElementById("email").value;
let senha = document.getElementById("senha").value;


console.log(nome,email,senha);


if(nome === "" || email === "" || senha === ""){

alert("Preencha todos os campos!");

return;

}


localStorage.setItem(
"usuario",
JSON.stringify({

nome:nome,
email:email,
senha:senha

})
);



alert("Conta criada!");


window.location.href="login.html";


}





// ==============================
// PROTEGER POKÉDEX
// ==============================


function verificarLogin(){


if(!localStorage.getItem("logado")){


window.location.href="login.html";


}


}





// ==============================
// SAIR
// ==============================


function sair(){


localStorage.removeItem("logado");

localStorage.removeItem("usuarioLogado");


window.location.href="login.html";


}





// ==============================
// FAVORITOS
// ==============================


function favoritarPokemon(pokemon){



if(!pokemon){

alert("Nenhum Pokémon selecionado!");

return;

}



let favoritos = JSON.parse(

localStorage.getItem("favoritos")

) || [];




favoritos.push({


nome:pokemon.name,


numero:pokemon.id,


imagem:

pokemon.sprites.other["official-artwork"].front_default,


tipo:

pokemon.types[0].type.name


});





localStorage.setItem(

"favoritos",

JSON.stringify(favoritos)

);



alert("⭐ Pokémon salvo nos favoritos!");



}





// ==============================
// CARREGAR FAVORITOS
// ==============================


function carregarFavoritos(){



let lista = document.getElementById(

"listaFavoritos"

);



if(!lista)return;



let favoritos = JSON.parse(

localStorage.getItem("favoritos")

) || [];




lista.innerHTML="";




if(favoritos.length === 0){


lista.innerHTML=

"<h2>😢 Nenhum favorito salvo</h2>";

return;


}




favoritos.forEach((pokemon,index)=>{


lista.innerHTML += `


<div class="pokemon-card">


<h2>${pokemon.nome}</h2>


<img src="${pokemon.imagem}" width="150">


<p>🔢 Número: #${pokemon.numero}</p>


<p>🌈 Tipo: ${pokemon.tipo}</p>



<button onclick="removerFavorito(${index})">

🗑 Remover

</button>



</div>


`;



});


}





// ==============================
// REMOVER FAVORITO
// ==============================


function removerFavorito(index){


let favoritos = JSON.parse(

localStorage.getItem("favoritos")

) || [];



favoritos.splice(index,1);



localStorage.setItem(

"favoritos",

JSON.stringify(favoritos)

);



carregarFavoritos();


}
);


}





// ======================
// WORD
// ======================


function baixarWord(){


if(!pokemonAtual)return;



let p=pokemonAtual;



let texto=`

POKÉDEX

Nome: ${p.name}

Número: ${p.id}

Tipo: ${p.types[0].type.name}

Altura: ${p.height/10}m

Peso: ${p.weight/10}kg

`;



let arquivo=new Blob(

[texto],

{type:"application/msword"}

);



let link=document.createElement("a");


link.href=URL.createObjectURL(arquivo);


link.download=p.name+".doc";


link.click();


}

// ==============================
// LOGIN
// ==============================

function login() {

    let email = document.getElementById("email").value.trim();
    let senha = document.getElementById("senha").value.trim();

    if (email === "" || senha === "") {
        alert("Preencha todos os campos!");
        return;
    }

    let usuario = JSON.parse(localStorage.getItem("usuario"));

    if (!usuario) {
        alert("Nenhuma conta encontrada. Crie uma conta primeiro.");
        window.location.href = "cadastro.html";
        return;
    }

    if (email === usuario.email && senha === usuario.senha) {

        localStorage.setItem("logado", "true");
        localStorage.setItem("usuarioLogado", JSON.stringify(usuario));

        alert("✅ Login realizado com sucesso!");

        window.location.href = "index.html";

    } else {

        alert("❌ Email ou senha incorretos!");

    }

}

