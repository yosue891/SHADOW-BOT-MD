import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Jimp } from 'jimp';
import profile from '../plugins/subbots/subs-perfil.js';
const png = await new Jimp({width:2,height:2,color:0xffffffff}).getBuffer('image/png');
test('profile images use the installed Jimp API',async()=>{
 global.owner=[];
 let updated=0;const replies=[];
 const conn={user:{jid:'bot@s.whatsapp.net'},updateProfilePicture:async(_jid,buffer)=>{assert.equal(buffer[0],255);updated++},reply:async()=>{}};
 const m={sender:conn.user.jid,chat:conn.user.jid,msg:{mimetype:'image/png'},download:async()=>png,reply:async text=>replies.push(text)};
 await profile(m,{conn,command:'setpfp',usedPrefix:'.',text:''});
 assert.equal(updated,1,replies.join('\n'));
});
test('menu thumbnails really resize and convert to JPEG',async()=>{
 const source=fs.readFileSync('plugins/menus/prin-menulist.js','utf8');
 const body=source.split('async function resizeImage(buffer, width, height) {')[1].split('\n    const more')[0];
 const resize=new Function('Jimp',`return async function(buffer,width,height){${body}`)(Jimp);
 const out=await resize(png,12,10);const image=await Jimp.read(out);
 assert.equal(image.bitmap.width,12);assert.equal(image.bitmap.height,10);assert.equal(out[0],255);
});
