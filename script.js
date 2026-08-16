/* Compatibilidade máxima: sem fetch, async/await ou sintaxe ES6. */
(function () {
  // GitHub Pages não possui API própria. Use o backend Railway quando o site estiver publicado lá.
  window.API_BASE = location.hostname.indexOf("github.io") >= 0 ? "https://pokemonpokedex-production-0fc5.up.railway.app" : "";
  function json(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  window.usuarioAtual = function () { return json("usuarioLogado", null); };
  window.api = function (method, url, body, ok, fail) {
    var xhr = new XMLHttpRequest(), atual=usuarioAtual(); xhr.open(method, window.API_BASE + url, true); xhr.timeout = 4500; xhr.setRequestHeader("Content-Type", "application/json"); if(atual && atual.token) xhr.setRequestHeader("Authorization", "Bearer "+atual.token);
    xhr.onreadystatechange = function () { if (xhr.readyState !== 4) return; var data={}; try { data=JSON.parse(xhr.responseText); } catch(e) {} if(xhr.status>=200 && xhr.status<300) { if(ok)ok(data); } else if(fail)fail(data); };
    xhr.ontimeout = xhr.onerror = function () { if(fail)fail({erro:"Sem conexão com o servidor."}); };
    xhr.send(body ? JSON.stringify(body) : null);
  };
  function localUsers(){ return json("usuarios", []); }
  function salvarUsuarioLocal(user) {
    var users=localUsers(), i, found=false;
    for(i=0;i<users.length;i++) { if(users[i].email===user.email) { users[i]=user; found=true; break; } }
    if(!found) users.push(user);
    localStorage.setItem("usuarios", JSON.stringify(users));
  }
  window.sincronizarContasLocais = function () { var users=localUsers(), i; for(i=0;i<users.length;i++) api("POST","/cadastro",users[i],function(){},function(){}); };
  window.criarConta = function (event) {
    if(event && event.preventDefault) event.preventDefault();
    var user={nome:document.getElementById("nome").value.replace(/^\s+|\s+$/g,""),email:document.getElementById("email").value.replace(/^\s+|\s+$/g,""),senha:document.getElementById("senha").value,cargo:document.getElementById("cargo").value,codigo_verificacao:(document.getElementById("codigo_verificacao")||{value:""}).value};
    if(!user.nome||!user.email||!user.senha){ alert("Preencha todos os campos!"); return false; }
    var existentes=localUsers(), i;
    for(i=0;i<existentes.length;i++) if(existentes[i].email===user.email){ alert("Este email já está cadastrado neste dispositivo!"); return false; }
    // Salva antes da rede: a conta continua disponível mesmo offline.
    user.id=Date.now(); salvarUsuarioLocal({id:user.id,nome:user.nome,email:user.email,senha:user.senha,cargo:"Usuário"});
    api("POST","/cadastro",user,function(data){ if(data.usuario) salvarUsuarioLocal({id:data.usuario.id,nome:user.nome,email:user.email,senha:user.senha,cargo:data.usuario.cargo}); alert("✅ Conta criada e sincronizada!"); window.location.href="login.html"; },function(data){
      if(data && data.erro && data.erro !== "Sem conexão com o servidor."){ alert(data.erro+" A conta ficou salva neste dispositivo."); return; }
      alert("💾 Sem conexão: conta salva neste aparelho."); window.location.href="login.html";
    }); return false;
  };
  window.login = function (event) {
    if(event && event.preventDefault) event.preventDefault(); sincronizarContasLocais();
    var email=document.getElementById("email").value.replace(/^\s+|\s+$/g,""), senha=document.getElementById("senha").value;
    api("POST","/login",{email:email,senha:senha},function(data){ if(data.sucesso){data.usuario.token=data.token||"";localStorage.setItem("logado","true");localStorage.setItem("usuarioLogado",JSON.stringify(data.usuario));window.location.href="index.html";}else alert(data.erro||"E-mail ou senha incorretos."); },function(){ var users=localUsers(),i;for(i=0;i<users.length;i++)if(users[i].email===email&&users[i].senha===senha){localStorage.setItem("logado","true");localStorage.setItem("usuarioLogado",JSON.stringify(users[i]));window.location.href="index.html";return;}alert("Não foi possível entrar. Confira a conexão e os dados."); }); return false;
  };
  window.sair=function(){localStorage.removeItem("logado");localStorage.removeItem("usuarioLogado");window.location.href="login.html";};
  window.limparDadosDispositivo=function(){
    if(!window.confirm("Isso vai apagar as contas, sessão, favoritos e recados salvos somente neste dispositivo. Deseja continuar?")) return;
    var keys=["usuarios","logado","usuarioLogado","recadosOffline","favoritos","favoritos_anonimo"], i, key;
    for(i=0;i<keys.length;i++) localStorage.removeItem(keys[i]);
    // Remove também favoritos associados a contas antigas deste aparelho.
    for(i=localStorage.length-1;i>=0;i--){ key=localStorage.key(i); if(key && key.indexOf("favoritos_")===0) localStorage.removeItem(key); }
    alert("✅ Dados deste dispositivo foram limpos. Agora crie uma conta ou faça login novamente.");
    window.location.href="cadastro.html";
  };
  window.chaveFavoritos=function(){var u=usuarioAtual();return "favoritos_"+(u ? (u.id||u.email) : "anonimo");};
  window.favoritarPokemon=function(p){var u=usuarioAtual(), list=json(chaveFavoritos(),[]), item={nome:p.name,numero:p.id,imagem:p.sprites.other["official-artwork"].front_default,tipo:p.types.map(function(t){return t.type.name;}).join(", ")},i;for(i=0;i<list.length;i++)if(String(list[i].numero)===String(item.numero)){alert("Esse Pokémon já está nos favoritos!");return;}list.push(item);localStorage.setItem(chaveFavoritos(),JSON.stringify(list));if(u&&u.id)api("POST","/favoritos",{usuario_id:u.id,nome:item.nome,numero:item.numero,imagem:item.imagem,tipo:item.tipo},function(){},function(){});alert("⭐ Pokémon favoritado!");};
  window.addEventListener("load",sincronizarContasLocais);
}());
