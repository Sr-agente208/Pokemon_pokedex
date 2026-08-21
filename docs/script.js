/* Compatibilidade máxima: sem fetch, async/await ou sintaxe ES6. */
(function () {
  // GitHub Pages não possui API própria. Use o backend Railway quando o site estiver publicado lá.
  window.API_BASE = location.hostname.indexOf("github.io") >= 0 ? "https://pokemonpokedex-production-0fc5.up.railway.app" : "";
  function json(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  window.usuarioAtual = function () { return json("usuarioLogado", null); };
  /* Alertas próprios: alertas do navegador sempre mostram o domínio e não podem ser renomeados. */
  window.mostrarMensagem=function(texto){var caixa=document.getElementById('avisoPokedex');if(!caixa){caixa=document.createElement('div');caixa.id='avisoPokedex';caixa.style.cssText='position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,.68);display:flex;align-items:center;justify-content:center;padding:20px';caixa.innerHTML='<div style="background:#172033;color:#fff;width:min(420px,100%);padding:25px;border-radius:22px;box-shadow:0 10px 35px #000;text-align:center;border:2px solid #8b00b9"><h2 style="color:#fff;margin:0 0 18px">⚡ Pokédex</h2><p id="avisoPokedexTexto" style="font-size:18px;line-height:1.5"></p><button onclick="document.getElementById(\'avisoPokedex\').style.display=\'none\'" style="background:#6d008e;color:#fff;padding:11px 34px;border:1px solid #fff;border-radius:9px;font-size:16px">OK</button></div>';document.body.appendChild(caixa);}document.getElementById('avisoPokedexTexto').textContent=texto;caixa.style.display='flex';};
  window.alert=window.mostrarMensagem;
  window.api = function (method, url, body, ok, fail) {
    /* Supabase: autenticação e banco sem Railway. */
    if (window.supabaseClient) {
      var sb=window.supabaseClient, done=function(result){ if(result.error){if(fail)fail({erro:result.error.message});}else if(ok)ok(result.data); };
      var p = null;
      if(method==='POST' && url==='/cadastro') p = sb.auth.signUp({email:body.email,password:body.senha,options:{data:{nome:body.nome,cargo:body.cargo,codigo_verificacao:body.codigo_verificacao}}}).then(function(r){if(r.error){return done(r);}done({data:{sucesso:true,usuario:{id:r.data.user.id,nome:body.nome,email:body.email,cargo:'Usuário'}}});});
      else if(method==='POST' && url==='/login') p = sb.auth.signInWithPassword({email:body.email,password:body.senha}).then(function(r){if(r.error)return done(r);sb.from('profiles').select('*').eq('id',r.data.user.id).single().then(function(p){if(p.error)return done(p);done({data:{sucesso:true,usuario:{id:p.data.id,nome:p.data.nome,email:p.data.email,cargo:p.data.cargo,token:r.data.session.access_token}}});}).catch(function(e){if(fail)fail({erro:e.message});});});
      else if(method==='GET' && url==='/recados') p = sb.from('recados').select('*').order('id',{ascending:false}).then(done);
      else if(method==='POST' && url==='/recados') p = sb.functions.invoke('moderate-recado',{body:{mensagem:body.mensagem||body.texto}}).then(function(r){if(r.error){if(fail)fail({erro:r.error.message||'Não foi possível analisar o recado.'});return;}if(r.data&&r.data.status!=='APPROVED'){if(fail)fail({erro:'Treinador Nébula: '+(r.data.reason||'recado precisa de revisão.')});return;}if(ok)ok(r.data);});
      else if(method==='DELETE' && url.indexOf('/recados/')===0) p = sb.rpc('delete_recado_as_staff',{target_id:Number(url.split('/').pop())}).then(function(r){if(r.error||!r.data){if(fail)fail({erro:r.error?r.error.message:'Não foi possível excluir este recado.'});return;}if(ok)ok({sucesso:true});});
      else if(method==='GET' && url==='/usuarios') p = sb.from('profiles').select('id,nome,email,cargo').eq('ativo',true).order('created_at',{ascending:false}).then(done);
      else if(method==='DELETE' && url.indexOf('/usuarios/')===0) p = sb.from('profiles').update({ativo:false}).eq('id',url.split('/').pop()).then(function(r){done({data:{sucesso:!r.error},error:r.error});});
      else if(method==='GET' && url.indexOf('/favoritos/')===0) p = sb.from('favoritos').select('*').eq('usuario_id',url.split('/').pop()).order('id',{ascending:false}).then(done);
      else if(method==='POST' && url==='/favoritos') p = sb.from('favoritos').insert({usuario_id:body.usuario_id,nome:body.nome,numero:body.numero,imagem:body.imagem,tipo:body.tipo}).select().single().then(done);
      else if(method==='DELETE' && url.indexOf('/favoritos/')===0){var bits=url.split('/');p = sb.from('favoritos').delete().eq('id',bits[3]).eq('usuario_id',bits[2]).then(function(r){done({data:{sucesso:!r.error},error:r.error});});}
      else if(method==='POST' && url==='/verificacao/gerar') p = sb.auth.getUser().then(function(u){if(u.error)return done(u);sb.auth.signInWithPassword({email:u.data.user.email,password:body.senha}).then(function(a){if(a.error)return done(a);sb.rpc('generate_verification_code',{requested_cargo:body.cargo}).then(done);});});
      
      if (p && p.catch) {
        return p.catch(function(err) {
          if (fail) {
            var msg = err && err.message ? err.message : String(err);
            if (msg.indexOf("fetch") >= 0 || msg.indexOf("Failed to fetch") >= 0) {
              msg = "⚠️ Conexão com o Supabase indisponível (projeto pausado ou sem internet).";
            }
            fail({erro: msg});
          }
        });
      }
      return fail && fail({erro:'Operação não disponível.'});
    }
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
  window.sincronizarContasLocais = function () { if(window.supabaseClient) return; var users=localUsers(), i; for(i=0;i<users.length;i++) api("POST","/cadastro",users[i],function(){},function(){}); };
  window.criarConta = function (event) {
    if(event && event.preventDefault) event.preventDefault();
    var user={nome:document.getElementById("nome").value.replace(/^\s+|\s+$/g,""),email:document.getElementById("email").value.replace(/^\s+|\s+$/g,""),senha:document.getElementById("senha").value,cargo:document.getElementById("cargo").value,codigo_verificacao:(document.getElementById("codigo_verificacao")||{value:""}).value};
    if(!user.nome||!user.email||!user.senha){ alert("Preencha todos os campos!"); return false; }
    var existentes=localUsers(), i;
    for(i=0;i<existentes.length;i++) if(existentes[i].email===user.email){ alert("Este email já está cadastrado neste dispositivo!"); return false; }
    
    // Validar código local se for cargo especial
    var realCargo = "Usuário";
    if (user.cargo !== 'Usuário') {
      var localCodes = JSON.parse(localStorage.getItem("local_codes")) || [];
      for (i = 0; i < localCodes.length; i++) {
        if (localCodes[i].code === user.codigo_verificacao && localCodes[i].cargo === user.cargo && localCodes[i].expires > Date.now()) {
          realCargo = user.cargo;
          break;
        }
      }
    }
    
    // Salva antes da rede: a conta continua disponível mesmo offline.
    user.id=Date.now(); salvarUsuarioLocal({id:user.id,nome:user.nome,email:user.email,senha:user.senha,cargo:realCargo});
    api("POST","/cadastro",user,function(data){ if(data.usuario) salvarUsuarioLocal({id:data.usuario.id,nome:user.nome,email:user.email,senha:user.senha,cargo:data.usuario.cargo || realCargo}); alert("✅ Conta criada e sincronizada!"); window.location.href="login.html"; },function(data){
      if(data && data.erro && data.erro !== "Sem conexão com o servidor."){ alert(data.erro+" A conta ficou salva neste dispositivo."); return; }
      alert("💾 Sem conexão: conta salva neste aparelho."); window.location.href="login.html";
    }); return false;
  };
  window.login = function (event) {
    if(event && event.preventDefault) event.preventDefault(); sincronizarContasLocais();
    var email=document.getElementById("email").value.replace(/^\s+|\s+$/g,""), senha=document.getElementById("senha").value;
    api("POST","/login",{email:email,senha:senha},function(data){ if(data.sucesso){data.usuario.token=data.token||"";localStorage.setItem("logado","true");localStorage.setItem("usuarioLogado",JSON.stringify(data.usuario));window.location.href="index.html";}else alert(data.erro||"E-mail ou senha incorretos."); },function(data){ var users=localUsers(),i;for(i=0;i<users.length;i++)if(users[i].email===email&&users[i].senha===senha){localStorage.setItem("logado","true");localStorage.setItem("usuarioLogado",JSON.stringify(users[i]));window.location.href="index.html";return;}alert((data&&data.erro?data.erro:"Não foi possível entrar. Confira a conexão e os dados.")); }); return false;
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
  window.atualizarCampoCodigo=function(){var select=document.getElementById('cargo'),area=document.getElementById('areaCodigo'),aviso=document.getElementById('avisoCargo');if(!select||!area)return;var precisa=select.value!=='Usuário';area.style.display=precisa?'block':'none';if(aviso)aviso.style.display=precisa?'none':'block';};
  window.addEventListener("load",function(){sincronizarContasLocais();atualizarCampoCodigo();});
}());
