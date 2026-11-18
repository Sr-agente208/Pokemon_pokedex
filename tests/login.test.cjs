const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(auth, profile) {
  const store = {usuarios:JSON.stringify([{email:'a@b.com',senha:'password'}])};
  const context = {location:{hostname:'example.com'},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},document:{getElementById:id=>({value:id==='email'?'a@b.com':'password'})}};
  context.window=context;
  context.addEventListener=()=>{};
  context.supabaseClient={auth:{signInWithPassword:auth},from:()=>({select:()=>({eq:()=>({single:profile})})})};
  vm.runInNewContext(fs.readFileSync('script.js','utf8'),context);
  return {context,store};
}
test('returned network errors are explained',async()=>{
  const {context}=setup(async()=>({error:{message:'Failed to fetch'}}));
  let error;
  await context.api('POST','/login',{},()=>assert.fail(),e=>error=e.erro);
  assert.match(error,/conectar ao Supabase/);
});
test('profile rejection is caught by the login promise',async()=>{
  const {context}=setup(async()=>({data:{user:{id:'1'},session:{access_token:'token'}}}),async()=>{throw Error('Failed to fetch')});
  let error;
  await context.api('POST','/login',{},()=>assert.fail(),e=>error=e.erro);
  assert.match(error,/conectar ao Supabase/);
});
test('failed remote login cannot authenticate with a cached password',async()=>{
  const {context,store}=setup(async()=>({error:{message:'Failed to fetch'}}));
  context.alert=()=>{};
  context.login();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(store.logado,undefined);
});
