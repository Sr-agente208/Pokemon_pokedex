async function carregarRecados(){

const resposta=await fetch("/recados");

const dados=await resposta.json();

const mural=document.getElementById("recados");

mural.innerHTML="";

dados.forEach(recado=>{

mural.innerHTML+=`

<div class="recado">

<h3>${recado.nome}</h3>

<p>${recado.mensagem}</p>

<div class="data">

${new Date(recado.data).toLocaleString("pt-BR")}

</div>

</div>

`;

});

}

async function enviarRecado(){

const nome=document.getElementById("nome").value;

const mensagem=document.getElementById("mensagem").value;

if(nome==""||mensagem==""){

alert("Preencha todos os campos!");

return;

}

await fetch("/recados",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

nome,

mensagem

})

});

document.getElementById("nome").value="";

document.getElementById("mensagem").value="";

carregarRecados();

}

carregarRecados();