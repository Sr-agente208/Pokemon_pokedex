const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup() {
  const nodes = {};
  for (const id of ['solicitarRecuperacao','redefinirSenha','estadoRecuperacao','emailRecuperacao','novaSenha','confirmarSenha']) {
    nodes[id] = {value:'',hidden:id==='redefinirSenha',button:{},addEventListener(event, fn){this.submit=fn;},querySelector(){return this.button;},reset(){}};
  }
  let listener, requested, updated;
  const context={URL,URLSearchParams,document:{getElementById:id=>nodes[id]},location:{href:'https://example.com/Pokemon_pokedex/recuperar-senha.html',hash:'',pathname:'/Pokemon_pokedex/recuperar-senha.html'},history:{replaceState(){}}};
  context.window=context;
  context.supabaseClient={auth:{onAuthStateChange:fn=>listener=fn,resetPasswordForEmail:async(email,options)=>{requested={email,options};return {};},updateUser:async data=>{updated=data;return {};},signOut:async()=>({})}};
  vm.runInNewContext(fs.readFileSync('recuperar-senha.js','utf8'),context);
  return {nodes,event:{preventDefault(){}},emit:event=>listener(event),request:()=>requested,update:()=>updated};
}
const flush = () => new Promise(resolve=>setImmediate(resolve));
test('recovery requests email with the deployed subpath',async()=>{
  const s=setup();s.nodes.emailRecuperacao.value=' a@b.com ';
  s.nodes.solicitarRecuperacao.submit(s.event);await flush();
  assert.equal(s.request().email,'a@b.com');
  assert.equal(s.request().options.redirectTo,'https://example.com/Pokemon_pokedex/recuperar-senha.html');
  assert.equal(s.nodes.solicitarRecuperacao.button.disabled,false);
});
test('only recovery event unlocks password form; mismatched passwords cannot update',async()=>{
  const s=setup();s.emit('SIGNED_IN');
  s.nodes.redefinirSenha.submit(s.event);assert.equal(s.update(),undefined);
  s.emit('PASSWORD_RECOVERY');assert.equal(s.nodes.redefinirSenha.hidden,false);
  s.nodes.novaSenha.value='longpassword';s.nodes.confirmarSenha.value='different';
  s.nodes.redefinirSenha.submit(s.event);assert.equal(s.update(),undefined);
  s.nodes.confirmarSenha.value='longpassword';s.nodes.redefinirSenha.submit(s.event);await flush();
  assert.equal(s.update().password,'longpassword');
  assert.equal(s.nodes.redefinirSenha.hidden,true);
});
