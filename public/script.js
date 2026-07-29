// ==============================
// CRIAR CONTA
// ==============================

function criarConta(){


let nome = document.getElementById("nome").value.trim();

let email = document.getElementById("email").value.trim();

let senha = document.getElementById("senha").value.trim();



if(!nome || !email || !senha){

alert("⚠️ Preencha todos os campos!");

return;

}



let usuario = {

nome:nome,

email:email,

senha:senha

};



localStorage.setItem(

"usuario",

JSON.stringify(usuario)

);



alert("✅ Conta criada com sucesso!");



window.location.href="login.html";


}





// ==============================
// LOGIN
// ==============================


function login(){


let email = document.getElementById("email").value.trim();

let senha = document.getElementById("senha").value.trim();



let usuario = JSON.parse(

localStorage.getItem("usuario")

);



if(

usuario &&

usuario.email === email &&

usuario.senha === senha

){



localStorage.setItem(

"logado",

"true"

);



localStorage.setItem(

"usuarioLogado",

usuario.nome

);



alert("🔓 Login realizado!");



window.location.href="index.html";



}

else{


alert("❌ Email ou senha incorretos!");


}


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
