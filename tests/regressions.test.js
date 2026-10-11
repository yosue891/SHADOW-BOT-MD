import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const simple = fs.readFileSync('lib/simple.js', 'utf8');
const index = fs.readFileSync('src/index.js', 'utf8');
function replyHarness(dispatchVariant) {
  const body = simple.split('reply: {')[1].split('async value(jid, text = "", quoted, options) {')[1].split('\n            },')[0];
  const context = vm.createContext({ global: {}, conn: {}, dispatchVariant, Promise, setTimeout: fn => setTimeout(fn, 0) });
  return vm.runInContext(`(async function(jid, text = "", quoted, options) {${body}})`, context);
}
test('a failed send must not block later replies', async () => {
  const sent = [];
  const reply = replyHarness(async (_jid, text) => { if (text === 'fail') throw Error('offline'); sent.push(text); });
  await assert.rejects(reply('a', 'fail'), /offline/);
  await reply('a', 'ok');
  assert.deepEqual(sent, ['ok']);
});
test('a slow account must not block replies from another account', async () => {
  // Each reply harness represents a socket; both share the process globals.
  const body = simple.split('reply: {')[1].split('async value(jid, text = "", quoted, options) {')[1].split('\n            },')[0];
  let release;
  const shared = {};
  const build = (send) => vm.runInNewContext(`(async function(jid,text,quoted,options){${body}})`, {global:shared,conn:{},dispatchVariant:send,Promise,setTimeout:fn=>setTimeout(fn,0)});
  const first = build(() => new Promise(r => release=r));
  const second = build(async () => 'ok');
  const pending=first('a','slow');
  await new Promise(r=>setImmediate(r));
  const result=await Promise.race([second('b','ok'),new Promise(r=>setTimeout(()=>r('blocked'),30))]);
  release(); await pending;
  assert.equal(result,'ok');
});
test('concurrent database reads share a single read and leave no polling timers', async () => {
  const body=index.split('global.loadDatabase = async function loadDatabase() {')[1].split(/\n(?:await )?loadDatabase\(\)/)[0];
  let release; let reads=0; const intervals=[];
  const db={data:null,read:async()=>{reads++;await new Promise(r=>release=r);db.data={users:{saved:true}}}};
  const ctx=vm.createContext({global:{db},chain:x=>x,console,setInterval:(...args)=>{intervals.push(args);return 1},clearInterval:()=>{}});
  vm.runInContext(`global.loadDatabase = async function loadDatabase() {${body}`,ctx);
  const a=ctx.global.loadDatabase(); const b=ctx.global.loadDatabase();
  release(); await a;
  assert.equal(intervals.length,0,'database wait leaks a polling interval');
  await b; assert.equal(reads,1); assert.equal(db.data.users.saved,true);
});
function handlerHarness(plugins={}) {
  let src=fs.readFileSync('src/handler.js','utf8').replace(/^import .*;\n/gm,'').replace(/const printModule = .*;\n/,'const printModule = null;\n').replace('export async function handler','async function handler');
  src=src.split('let file = global.__filename')[0];
  const db={data:{users:{},chats:{},settings:{}}};
  const ctx=vm.createContext({global:{db,plugins,prefix:/^[!.]/,owner:[],mods:[],prems:[]},opts:{restrict:true,noprint:true},smsg:(_c,m)=>m,console,path,join:path.join,fileURLToPath,fs,ws:{CLOSED:3},setTimeout,URL});
  // import.meta is not available in a script context.
  src=src.replaceAll('import.meta.url',JSON.stringify(new URL('../src/handler.js',import.meta.url).href));
  vm.runInContext("global.prefix = /^[!.]/;",ctx);
  vm.runInContext(src,ctx);
  const conn={user:{id:'bot@s.whatsapp.net',jid:'bot@s.whatsapp.net'},chats:{},pushMessage:async()=>{},getName:async()=> 'User',decodeJid:x=>x};
  return {run:update=>ctx.handler.call(conn,update),conn,db};
}
const message=(text='!ping')=>({key:{id:'1',remoteJid:'user@s.whatsapp.net'},id:'1',chat:'user@s.whatsapp.net',sender:'user@s.whatsapp.net',text,pushName:'User',message:{conversation:text}});
test('one command executes only one matching plugin',async()=>{
  let calls=0;const a=async()=>{calls++};a.command=['ping'];const b=async()=>{calls++};b.command=['ping'];
  const h=handlerHarness({a,b});await h.run({messages:[message()],type:'notify'});assert.equal(calls,1);
});
test('history sync must not execute old commands',async()=>{
  let calls=0;const p=async()=>{calls++};p.command=['ping'];const h=handlerHarness({p});
  await h.run({messages:[message()],type:'append'});assert.equal(calls,0);
});
test('empty presence events must not throw',async()=>{
  const source=fs.readFileSync('lib/store.js','utf8').replace(/^import .*\n/gm,'').split('const KEY_MAP')[0];
  const callbacks={}; const conn={chats:{},ev:{on:(name,fn)=>callbacks[name]=fn},decodeJid:x=>x};
  const errors=[]; vm.runInNewContext(`${source}\nbind(conn)`,{conn,console:{error:e=>errors.push(e)}});
  await callbacks['presence.update']({id:'user@s.whatsapp.net',presences:{}});assert.equal(errors.length,0);
});
test('ten-minute maintenance preserves the database',async()=>{
 const tail=index.slice(index.indexOf('setInterval(async () => {\n  const baseDir'));
 const maintenance=tail.split('_quickTest().catch')[0];
 const timers=[];const deleted=[];
 vm.runInNewContext(maintenance,{setInterval:(fn,ms)=>timers.push({fn,ms}),global:{conns:[],conn:null},jadi:'Sessions/SubBot',__dirname:'/project/src',process:{cwd:()=>'/project'},join:path.join,existsSync:()=>true,fs:{promises:{readdir:async()=>[],unlink:async file=>deleted.push(file)}},console,chalk:{bold:{yellowBright:x=>x}}});
 for(const timer of timers.filter(t=>t.ms===600000))await timer.fn();
 assert.equal(deleted.includes('database.json'),false);
});
test('store handles chat upserts delivered as arrays',()=>{
 const source=fs.readFileSync('lib/store.js','utf8').replace(/^import .*\n/gm,'').split('const KEY_MAP')[0];
 const callbacks={};const conn={chats:{},ev:{on:(n,f)=>callbacks[n]=f},decodeJid:x=>x};
 vm.runInNewContext(`${source}\nbind(conn)`,{conn,console});
 callbacks['chats.upsert']([{id:'a@s.whatsapp.net',name:'A'},{id:'b@g.us',name:'B'}]);
 assert.equal(conn.chats['a@s.whatsapp.net']?.name,'A');assert.equal(conn.chats['b@g.us']?.name,'B');
});
test('synthetic button commands still execute',async()=>{
 let calls=0;const p=async()=>{calls++};p.command=['ping'];const h=handlerHarness({p});
 await h.run({messages:[message()],type:'append',isSynthetic:true});assert.equal(calls,1);
});
test('all and before hooks receive the plugin directory',async()=>{
 const seen=[];const p=async()=>{};p.all=async(_m,ctx)=>seen.push(ctx.__dirname);p.before=async(_m,ctx)=>seen.push(ctx.__dirname);
 const h=handlerHarness({p});await h.run({messages:[message('hello')],type:'notify'});
 assert.equal(seen.length,2);assert.ok(seen.every(x=>x.endsWith('/plugins')));
});
test('historical ciphertext notifications never delete authentication keys',async()=>{
 let src=fs.readFileSync('plugins/sistema/_infomessage.js','utf8').replace(/^import .*\n/gm,'').replace('export default handler','');
 let deleted=0;
 const conn={user:{jid:'bot@s.whatsapp.net'},profilePictureUrl:async()=>null,decodeJid:x=>x};
 const ctx=vm.createContext({WAMessageStubType:{CIPHERTEXT:2},global:{sessions:'Sessions/Principal',db:{data:{chats:{'g@g.us':{detect:true}}}}},fs:{promises:{readdir:async()=>['sender-key-g.json'],unlink:async()=>deleted++}},path,chalk:{yellow:{bold:x=>x},greenBright:x=>x,redBright:x=>x},console,Map,setTimeout});
 vm.runInContext(`${src}\nglobal.plugin=handler`,ctx);
 await ctx.global.plugin.before.call(conn,{messageStubType:2,isGroup:true,chat:'g@g.us',sender:'user@s.whatsapp.net',messageStubParameters:[]},{conn,participants:[],groupMetadata:{participants:[]}});
 assert.equal(deleted,0);
});
test('ordinary messages must not download the AFK decoration',async()=>{
 let requests=0;const src=fs.readFileSync('plugins/fun/fun-afk.js','utf8').replace('export async function before','async function before');
 const ctx=vm.createContext({global:{db:{data:{chats:{},users:{'u@s.whatsapp.net':{afk:-1}}}},catalogo:Buffer.from('local')},Buffer,fetch:async()=>{requests++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}}});
 vm.runInContext(src,ctx);await ctx.before({chat:'c',sender:'u@s.whatsapp.net',mentionedJid:[]},{conn:{user:{jid:'bot'}}});assert.equal(requests,0);
});
test('premium expiry does not scan all users on every message',async()=>{
 let scans=0;const users=new Proxy({a:{premium:false}},{ownKeys:target=>{scans++;return Reflect.ownKeys(target)}});
 const src=fs.readFileSync('plugins/sistema/_userPrem.js','utf8').replace('export async function all','async function all');
 const ctx=vm.createContext({global:{db:{data:{users}}},Date});vm.runInContext(src,ctx);
 await ctx.all({});await ctx.all({});assert.equal(scans,1);
});
