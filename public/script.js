// ==============================
// LOGIN LOCAL (SEM RAILWAY)
// ==============================


// CADASTRO

function cadastro(){

let nome = prompt("Digite seu nome:");

let email = prompt("Digite seu email:");

let senha = prompt("Digite sua senha:");



if(!nome || !email || !senha){

alert("Preencha tudo!");

return;

}



localStorage.setItem(

"usuario",

JSON.stringify({

nome,
email,
senha

})

);



alert("Conta criada! Agora faça login.");

}




// LOGIN

function login(){


const email =
document.getElementById("email").value;


const senha =
document.getElementById("senha").value;



const usuario =

JSON.parse(

localStorage.getItem("usuario")

);



if(

usuario &&

email === usuario.email &&

senha === usuario.senha

){


localStorage.setItem(

"logado",

"true"

);



localStorage.setItem(

"usuarioLogado",

JSON.stringify(usuario)

);



alert("Login realizado!");



window.location.href="index.html";


}

else{


alert("Email ou senha incorretos");


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



let favoritos =


JSON.parse(

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




alert("⭐ Pokémon salvo!");



}





// ==============================
// CARREGAR FAVORITOS
// ==============================


function carregarFavoritos(){



const lista =

document.getElementById("listaFavoritos");



if(!lista) return;



let favoritos =


JSON.parse(

localStorage.getItem("favoritos")

) || [];



lista.innerHTML="";



favoritos.forEach(p=>{



lista.innerHTML += `


<div class="pokemon-card">


<h2>${p.nome}</h2>


<img src="${p.imagem}" width="150">


<p>Tipo: ${p.tipo}</p>


<p>Número: #${p.numero}</p>


</div>


`;



});


}