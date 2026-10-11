const { registerHooks } = require('node:module');
const { EventEmitter } = require('node:events');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const root=path.resolve(__dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'shadow-test-'));
for(const name of ['src','lib','plugins','node_modules','package.json']) fs.symlinkSync(path.join(root,name),path.join(temporary,name));
process.chdir(temporary);
process.argv=['node',path.join(root,'src/index.js'),'--qr','--test','--noprint'];
const sockets=[];let metadataCalls=0;
global.__testSocket = options => {
  const ev=new EventEmitter();
  const sock={testOptions:options,ev,ws:{readyState:1,close(){this.readyState=3}},user:{id:'123456789@s.whatsapp.net',name:'Test'},logger:{info(){},warn(){},error(){}},sendMessage:async()=>({key:{id:'out'}}),end(){this.ended=true;this.ws.close()},groupMetadata:async jid=>{metadataCalls++;await new Promise(r=>setImmediate(r));return {id:jid,subject:'Test',participants:[]}},groupFetchAllParticipating:async()=>({}),authState:options.auth};
  sockets.push(sock);return sock;
};
registerHooks({load(url,context,nextLoad){
  const result=nextLoad(url,context);if(result.format!=='module')return result;
  let source=String(result.source);
  if(url.endsWith('/lib/simple.js')) source=source.replace(/\(global\.opts\["legacy"\] \? makeWALegacySocket : _makeWaSocket\)/,'global.__testSocket');
  if(url.endsWith('/src/index.js')) source=source.replace('await fetchLatestBaileysVersion()','({version:[2,3000,1]})').replace('const delay = ms => new Promise(resolve => setTimeout(resolve, ms))','const delay = async () => {}');
  if(url.endsWith('/plugins/subbots/subs-conexion.js')) source=source.replace('await fetchLatestBaileysVersion()','({version:[2,3000,1]})').replace('const delay = ms => new Promise(resolve => setTimeout(resolve, ms))','const delay = async () => {}');
  return {...result,source};
}});
(async()=>{
 try{
  await import(require('node:url').pathToFileURL(path.join(root,'src/index.js')).href);
  assert.equal(Object.keys(global.plugins).length,269);
  assert.equal(global.conn.ev.listenerCount('connection.update'),1);
  assert.equal(global.conn.ev.listenerCount('creds.update'),1);
  assert.equal(global.conn.ev.listenerCount('messages.upsert'),1);
  const loadedPlugins=global.plugins;
  let executions=0;
  const plugin=async()=>{executions++};plugin.command=['probe'];global.plugins={probe:plugin};
  for(let i=0;i<20;i++){
    const old=global.conn;
    await global.reloadHandler(true);
    assert.equal(old.ev.eventNames().length,0);
    assert.equal(global.conn.ev.listenerCount('messages.upsert'),1);
    assert.equal(global.conn.ev.listenerCount('connection.update'),1);
    assert.equal(global.conn.ev.listenerCount('creds.update'),1);
    await global.conn.handler({type:'notify',messages:[{key:{id:'test'+i,remoteJid:'987654321@s.whatsapp.net',fromMe:false},message:{conversation:'.probe'},pushName:'Tester',messageTimestamp:Math.floor(Date.now()/1000)}]});
  }
  assert.equal(executions,20);
  assert.equal(sockets.length,21);
  await Promise.all(Array.from({length:30},()=>global.conn.groupMetadata('g@g.us')));
  assert.equal(metadataCalls,1,'parallel messages repeat the same metadata query');
  const {MichiJadiBot}=await import(require('node:url').pathToFileURL(path.join(root,'plugins/subbots/subs-conexion.js')).href);
  await MichiJadiBot({pathMichiJadiBot:path.join(temporary,'Sessions/SubBot/test'),m:null,conn:global.conn,args:[],command:'qr',usedPrefix:'.'});
  const child=sockets.at(-1);global.conns.push(child);
  await Promise.all([child.connectionUpdate({connection:'close',lastDisconnect:{error:{output:{statusCode:428}}}}),child.connectionUpdate({connection:'close',lastDisconnect:{error:{output:{statusCode:428}}}})]);
  const replacement=sockets.at(-1);assert.notEqual(replacement,child);
  assert.equal(global.conns[0],replacement);assert.equal(replacement._reconnectCount,1);assert.equal(child.ev.eventNames().length,0);
  const socketsAfter=sockets.length;
  await child.connectionUpdate({connection:'close',lastDisconnect:{error:{output:{statusCode:428}}}});
  assert.equal(sockets.length,socketsAfter);
  assert.equal(replacement.ev.listenerCount('messages.upsert'),1);
  const ownMessage={key:{id:'sent-retry',remoteJid:'987654321@s.whatsapp.net',fromMe:true},message:{conversation:'delivery retry'}};
  await global.conn.pushMessage([ownMessage]);
  assert.equal((await global.conn.testOptions.getMessage(ownMessage.key))?.conversation,'delivery retry');
  global.plugins=loadedPlugins;
  const errors=[];const originalError=console.error;console.error=(...args)=>errors.push(args.map(String).join(' '));
  global.gc?.();const initialHeap=process.memoryUsage().heapUsed;
  const started=performance.now();
  for(let i=0;i<5000;i++){
    await global.conn.handler({type:'notify',messages:[{key:{id:'load'+i,remoteJid:'987654321@s.whatsapp.net',fromMe:false},message:{conversation:'regression load message'},pushName:'Tester',messageTimestamp:Math.floor(Date.now()/1000)}]});
    if(i%100===0)await new Promise(r=>setImmediate(r));
  }
  console.error=originalError;assert.deepEqual(errors,[]);
  assert.ok(Object.keys(global.conn.chats['987654321@s.whatsapp.net'].messages).length<=40);
  global.gc?.();const finalHeap=process.memoryUsage().heapUsed;
  console.log(JSON.stringify({messages:5000,elapsedMs:Math.round(performance.now()-started),initialHeapMiB:+(initialHeap/1048576).toFixed(2),finalHeapMiB:+(finalHeap/1048576).toFixed(2),errors:errors.length}));
  console.log('SMOKE OK: 269 plugins; 20 reconnections; 20 real serialized commands; child reconnection; no duplicate listeners.');
  process.exitCode=0;
 }catch(e){console.error(e);process.exitCode=1}
 finally{fs.rmSync(temporary,{recursive:true,force:true});process.exit(process.exitCode)}
})();
