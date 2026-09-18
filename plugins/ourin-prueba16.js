import crypto from "crypto";
import te from "../src/lib/ourin-error.js";
import { generateWAMessageFromContent } from "ourin";

const pluginConfig = {
  name: "prueba16",
  alias: ["kuroslash", "kuro", "خخخخخخخ"],
  category: "tools",
  description: "Enviar Kuro Slash (endless runner de Shanks) vía bot message",
  usage: ".prueba16",
  example: ".prueba16",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const GAME_HTML = `<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
html,body{width:100%}
body{background:linear-gradient(165deg,#070810,#0d101a 60%,#070810);padding:8px;color:#c8cede;overflow-y:auto}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:2px 2px 7px;gap:8px}
.tt{font:900 19px 'Arial Black';color:#eef1f8;text-shadow:0 0 10px #c1121f88,0 2px #000;letter-spacing:2px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:3px;color:#8a92a6;text-shadow:none}
.hrs{display:flex;gap:6px;align-items:center}
.hr{background:rgba(0,0,0,.5);border:1px solid rgba(193,18,31,.35);border-radius:9px;padding:3px 9px;text-align:center;min-width:54px}
.hr i{display:block;font:700 7px Arial;font-style:normal;letter-spacing:1px;color:#8a92a6}
.hr b{font:900 13px 'Arial Black';color:#eef1f8;font-variant-numeric:tabular-nums}
.mbtn{width:34px;height:34px;border:2px solid rgba(193,18,31,.35);border-radius:9px;background:rgba(0,0,0,.5);color:#eef1f8;font-size:15px;cursor:pointer;touch-action:none}
.mbtn:active{filter:brightness(1.6)}
.gw{position:relative;border:2px solid rgba(193,18,31,.4);border-radius:14px;overflow:hidden;background:#020308;box-shadow:0 0 18px rgba(193,18,31,.15)}
canvas{width:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:1fr 1.6fr 1fr;gap:8px;margin-top:8px}
.pd{height:52px;border:2px solid rgba(255,255,255,.16);border-radius:14px;font:900 13px 'Arial Black';color:#fff;cursor:pointer;touch-action:none;box-shadow:0 4px 0 rgba(0,0,0,.6);background:linear-gradient(#2a3145,#171c2a 60%,#0c0f18)}
.pd:active{transform:translateY(3px);box-shadow:none;filter:brightness(1.5)}
#atkB{background:linear-gradient(#8f1622,#4a0a12 60%,#280509);color:#ffe9e9;text-shadow:0 1px #000}
.ub{margin-top:8px;width:100%;height:40px;border:2px solid rgba(193,18,31,.5);border-radius:12px;font:900 13px 'Arial Black';color:#6a1520;background:#0c0f18;cursor:pointer;touch-action:none;letter-spacing:2px}
.ub.rdy{color:#fff;background:linear-gradient(90deg,#c1121f,#ff3040);box-shadow:0 0 14px #c1121f99;animation:up 1s infinite}
.ub:active{transform:translateY(2px)}
@keyframes up{50%{filter:brightness(1.4)}}
.hint{text-align:center;font:600 9px Arial;color:#8a92a6;margin-top:6px}
</style>
<div id="app">
<div class="hdr"><div class="tt">KURO SLASH<small>CÓDIGO SHANKS · RUTA ROBOT</small></div><div class="hrs"><div class="hr"><i>PUNTOS</i><b id="sc">0</b></div><div class="hr"><i>RÉCORD</i><b id="bs">0</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw"><canvas id="cv" width="404" height="380"></canvas></div>
<div class="pads"><button class="pd" id="leftB">◀</button><button class="pd" id="atkB">⚔ CORTE</button><button class="pd" id="rightB">▶</button></div>
<button class="ub" id="ultB">🌊 ULTI — 0%</button>
<div class="hint">⚔ corte + onda · corta a tiempo el proyectil rojo = PARRY · kill = cura +5 HP</div>
</div>
<script>
window.onerror=function(m,s,l){var e=document.getElementById('hint');if(e){e.textContent='⚠ '+m+' @'+l;e.style.color='#ff7a8a'}};
(function(){
var cv=document.getElementById('cv'),x=cv.getContext('2d'),W=404,H=380;
var DPR=2;cv.width=W*DPR;cv.height=H*DPR;
var scEl=document.getElementById('sc'),bsEl=document.getElementById('bs'),ub=document.getElementById('ultB');
var BEST=0;try{BEST=parseInt(localStorage.getItem('shanks_best')||'0',10)||0}catch(e){}
bsEl.textContent=BEST;
function saveBest(){try{localStorage.setItem('shanks_best',String(BEST))}catch(e){}}
var horizonY=70,playerY=336,MAXZ=760,laneW=64,EDGE=1.62;
function psc(z){return 1-(z/MAXZ)*.62}
function py(z){return playerY-(z/MAXZ)*(playerY-horizonY)}
function pX(l,z){return W/2+l*laneW*psc(z)}
var AC=null,MUTED=false;
try{MUTED=localStorage.getItem('shanks_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(AC&&AC.state==='suspended'){try{AC.resume()}catch(e){}}return AC}
function tone(f,d,t,v,at,sl){var a=AC;if(!a||MUTED)return;try{var n=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain();o.type=t||'square';o.frequency.setValueAtTime(f,n);if(sl)o.frequency.exponentialRampToValueAtTime(sl,n+d);g.gain.setValueAtTime(v||.1,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(a.destination);o.start(n);o.stop(n+d+.03)}catch(e){}}
function noiz(d,v,at,fc){var a=AC;if(!a||MUTED)return;try{var n=a.currentTime+(at||0),len=Math.floor(a.sampleRate*d),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0),i;for(i=0;i<len;i++)c[i]=Math.random()*2-1;var s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();s.buffer=b;f.type='lowpass';f.frequency.value=fc||1200;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);s.connect(f);f.connect(g);g.connect(a.destination);s.start(n);s.stop(n+d+.03)}catch(e){}}
function sSlash(){noiz(.09,.2,0,4200);tone(1900,.07,'sine',.1,0,480)}
function sWave(){noiz(.14,.13,0,3000);tone(900,.14,'sine',.09,0,1500)}
function sHit(){noiz(.1,.2,0,900);tone(110,.09,'sine',.24,0,50)}
function sZap(){noiz(.16,.22,0,2000);[900,620,380].forEach(function(f,i){tone(f,.08,'square',.09,i*.03,f*.5)})}
function sCrate(){noiz(.12,.2,0,800);tone(180,.08,'triangle',.14,0,60)}
function sHurt(){tone(300,.2,'sawtooth',.16,0,70);noiz(.22,.14,.04,700)}
function sDie(){[330,262,196,147,98].forEach(function(f,i){tone(f,.28,'triangle',.13,i*.17)})}
function sWarn(){tone(1500,.06,'square',.12);tone(1500,.06,'square',.12,.09)}
function sRdy(){[880,1175,1568].forEach(function(f,i){tone(f,.1,'sine',.11,i*.07)})}
function sMile(){[440,523,659,880].forEach(function(f,i){tone(f,.09,'square',.1,i*.06)})}
function sUltR(){tone(180,.55,'sawtooth',.14,0,2100);noiz(.55,.1,0,2400)}
function sUltG(){[98,147,196,294].forEach(function(f,i){tone(f,1.5,'sine',.11,i*.02);tone(f*1.005,1.4,'triangle',.07,i*.02)});noiz(.5,.26,0,700)}
function sLunge(){tone(600,.1,'sawtooth',.12,0,140)}
function sShot(){tone(300,.12,'sawtooth',.12,0,900);tone(1500,.06,'square',.07)}
function sParry(){tone(2400,.06,'square',.15,0,1800);tone(720,.14,'triangle',.12);noiz(.08,.12,0,5000)}
function sAuraOn(){[110,220,440,880,1760].forEach(function(f,i){tone(f,.5,'sawtooth',.1,i*.05,f*1.5)});noiz(.7,.14,0,3000)}
function sSmash(){noiz(.14,.24,0,1200);tone(90,.12,'sine',.22,0,40)}
function sHeal(){tone(660,.07,'sine',.07);tone(990,.09,'sine',.06,.05)}
var dr=null;
function drOn(){var a=ac();if(!a||MUTED||dr)return;try{var o=a.createOscillator(),o2=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter();o.type='sawtooth';o.frequency.value=55;o2.type='sawtooth';o2.frequency.value=55.6;f.type='lowpass';f.frequency.value=210;g.gain.value=0;g.gain.setTargetAtTime(.05,a.currentTime,.4);o.connect(f);o2.connect(f);f.connect(g);g.connect(a.destination);o.start();o2.start();dr={o:o,o2:o2,g:g}}catch(e){}}
function drOff(){if(!dr)return;try{var a=AC,t=a.currentTime;dr.g.gain.setTargetAtTime(0,t,.3);dr.o.stop(t+1);dr.o2.stop(t+1)}catch(e){}dr=null}
var mStep=0,mNext=0,PL=[220,262,294,330,392,440];
function mTick(){var a=AC;if(!a)return;var inten=(ulti>=100||hp<=30||auraT>0);var SPB=60/(inten?150:118)/2;while(mNext<a.currentTime+.15){var s=mStep%16,at=Math.max(0,mNext-a.currentTime);if(s===0||s===8||(inten&&s===10))tone(70,.16,'sine',.4,at,34);if(s===4||s===12){noiz(.04,.09,at,2000);tone(190,.03,'triangle',.07,at)}if(inten&&s%2)noiz(.012,.02,at,6000);if((s===2||s===13)&&Math.random()<.6){var f=PL[Math.floor(Math.random()*6)];tone(f,.22,'triangle',.09,at);tone(f*2,.1,'sine',.03,at)}mStep++;mNext+=SPB;}}
setInterval(function(){var a=AC;if(!a)return;if(state!=='play'){mNext=a.currentTime+.06;return}mTick()},40);
var state='ready',frame=0,score=0,best=BEST,hp=100,iframe=0,camZ=0,scroll=5.2,milestone=1,shake=0,flashR=0,wflash=0,hitstop=0,slowT=0,ts=1,lane=0,px=0,pv=0,playerX=W/2,atkT=-1,atkCd=0,whip=0,overT=0,bestNew=false,banner=null,ulti=0,ultT=0,ultPing=false,combo=0,comboT=0,parry=0,auraT=0,stridePh=0,wid=1,ents=[],props=[],parts=[],pops=[],rings=[],waves=[],projs=[],ghosts=[];
function mkChain(n,L){var a=[],i;for(i=0;i<n;i++)a.push({x:W/2,y:playerY-12});return{segs:a,L:L,amp:2}}
var hairC=mkChain(10,7),ribL=mkChain(4,5),ribR=mkChain(4,5);
var capA=function(arr,n){if(arr.length>n)arr.splice(0,arr.length-n)};
function reset(){score=0;hp=100;iframe=0;camZ=0;scroll=5.2;milestone=1;shake=0;flashR=0;wflash=0;hitstop=0;slowT=0;lane=0;px=0;pv=0;playerX=W/2;atkT=-1;atkCd=0;whip=0;ulti=0;ultT=0;ultPing=false;combo=0;comboT=0;parry=0;auraT=0;stridePh=0;ents=[];props=[];parts=[];pops=[];rings=[];waves=[];projs=[];ghosts=[];banner=null;bestNew=false;drOff();obsAt=camZ+340;gruntAt=camZ+420;bruteAt=camZ+2000;rushAt=camZ+700;propAt=camZ+120;shootAt=camZ+1000;scEl.textContent='0';ub.classList.remove('rdy');ub.textContent='🌊 ULTI — 0%';}
var obsAt=340,gruntAt=420,bruteAt=2000,rushAt=700,propAt=120,shootAt=1000;
function mv(d){ac();if(state!=='play')return;var nl=Math.max(-1,Math.min(1,lane+d));if(nl!==lane){lane=nl;tone(420,.04,'square',.06);ghosts.push({x:playerX,y:playerY,t:1});for(var i=0;i<4;i++)parts.push({x:playerX+(Math.random()-.5)*14,y:playerY+12,vx:(d<0?1:-1)*Math.random()*1.5,vy:-Math.random()*.8,life:.35,c:'#3a4a6a',s:2+Math.random()*1.5});}}
function atk(){ac();if(state!=='play'||atkCd>0)return;atkT=0;atkCd=auraT>0?7:20;whip=1;sSlash()}
function tryUlt(){ac();if(state!=='play')return;if(ulti>=100&&ultT===0){ultT=1;ulti=0;ub.classList.remove('rdy');ub.textContent='🌊 ULTI — 0%';sUltR()}else if(ulti<100){popup(playerX,playerY-60,'AÚN NO ESTÁ LLENA','#8a92a6');tone(200,.08,'square',.08)}}
document.getElementById('leftB').addEventListener('pointerdown',function(e){e.preventDefault();mv(-1)});
document.getElementById('rightB').addEventListener('pointerdown',function(e){e.preventDefault();mv(1)});
document.getElementById('atkB').addEventListener('pointerdown',function(e){e.preventDefault();atk()});
ub.addEventListener('pointerdown',function(e){e.preventDefault();tryUlt()});
document.addEventListener('pointerdown',function(e){if(e.target.closest('.pads,.ub,.mbtn'))return;var rx=e.clientX-innerWidth/2;if(rx<-90)mv(-1);else if(rx>90)mv(1);else atk()});
document.addEventListener('keydown',function(e){if((e.code==='ArrowLeft'||e.code==='KeyA')&&!e.repeat)mv(-1);if((e.code==='ArrowRight'||e.code==='KeyD')&&!e.repeat)mv(1);if((e.code==='Space'||e.code==='KeyJ')&&!e.repeat){e.preventDefault();atk()}if((e.code==='KeyU'||e.code==='KeyK')&&!e.repeat)tryUlt();});
var mb=document.getElementById('muteB');mb.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();MUTED=!MUTED;mb.textContent=MUTED?'🔇':'🔊';try{localStorage.setItem('shanks_mute',MUTED?'1':'0')}catch(e2){};if(MUTED)drOff();else{ac();if(state==='play')drOn()}});if(MUTED)mb.textContent='🔇';
function spawn(){if(camZ>obsAt){var r=Math.random();if(r<.3){var l=Math.floor(Math.random()*3)-1;ents.push({t:'rock',z:MAXZ,lane:l,lanes:[l],done:false})}else if(r<.55){var l2=Math.floor(Math.random()*3)-1;ents.push({t:'spike',z:MAXZ,lane:l2,lanes:[l2],done:false})}else if(r<.78){var l3=Math.floor(Math.random()*2)-1;ents.push({t:'log',z:MAXZ,lane:l3,lanes:[l3,l3+1],done:false})}else{var l4=Math.floor(Math.random()*3)-1;ents.push({t:'crate',z:MAXZ,lane:l4,lanes:[l4],done:false})};obsAt=camZ+300+Math.random()*300};if(camZ>gruntAt){ents.push({t:'grunt',z:MAXZ,lane:Math.floor(Math.random()*3)-1,hp:1,state:'walk',wt:0,ph:Math.random()*6,flash:0,lastW:0});gruntAt=camZ+220+Math.random()*260};if(camZ>bruteAt){ents.push({t:'brute',z:MAXZ,lane:Math.floor(Math.random()*3)-1,hp:2,state:'walk',wt:0,ph:Math.random()*6,flash:0,lastW:0});bruteAt=camZ+1700+Math.random()*900};if(camZ>rushAt){ents.push({t:'rusher',z:-120,lane:Math.floor(Math.random()*3)-1,hp:1,vz:scroll*1.35+4.5,state:'rush',ph:Math.random()*6,flash:0,hitDone:false,lastW:0});rushAt=camZ+560+Math.random()*480;sWarn()};if(camZ>shootAt&&score>400){ents.push({t:'shooter',z:MAXZ,lane:Math.floor(Math.random()*3)-1,hp:1,state:'advance',wt:0,shots:2,ph:Math.random()*6,flash:0,lastW:0});shootAt=camZ+1100+Math.random()*800};if(camZ>propAt){var side=Math.random()<.5?-1:1;props.push({z:MAXZ,side:side,off:.25+Math.random()*.55,kind:Math.random()<.5?'torii':'tree',r:Math.random()});propAt=camZ+200+Math.random()*160};ents=ents.filter(function(e){return e.z>-170&&e.hp>0&&!e.rm});props=props.filter(function(p){return p.z>-170});}
function burst(wx,wy,n,cols){for(var i=0;i<n;i++)parts.push({x:wx,y:wy,vx:(Math.random()-.5)*7.5,vy:-Math.random()*5.5,life:1,c:cols[i%cols.length],s:2+Math.random()*3})}
function ring(wx,wy,r0){rings.push({x:wx,y:wy,t:1,r0:r0||8})}
function popup(sx,y,txt,c){pops.push({sx:sx,y:y,t:1,txt:txt,c:c});capA(pops,7)}
function dmg(n){if(iframe>0||ultT>0||auraT>0||state!=='play')return;hp=Math.max(0,hp-n);iframe=80;shake=Math.max(shake,9);flashR=.7;combo=0;ulti=Math.max(0,ulti-15);sHurt();popup(playerX,playerY-56,'-'+n,'#ff3040');burst(playerX,playerY-12,14,['#ff3040','#8f1622']);if(hp<=0)die();}
function heal(n){if(hp<=0||hp>=100)return;hp=Math.min(100,hp+n);popup(playerX+30,playerY-40,'+'+n,'#7ddc8a');sHeal();}
function die(){state='dead';overT=performance.now();drOff();sDie();if(score>best){best=score;bsEl.textContent=best;saveBest();bestNew=true}}
function killEnt(e,sx,sy,base){e.rm=true;hitstop=4;shake=Math.max(shake,7);combo++;comboT=130;var gain=base+combo*10;score+=gain;popup(sx,sy-16,'+'+gain+(combo>=3?' x'+combo:''),'#ffd75e');burst(sx,sy,18,['#ffd75e','#ff3040','#eef1f8','#4a90e8']);ring(sx,sy,10);sZap();heal(5);var u=e.t==='brute'?22:e.t==='rusher'?16:12;ulti=Math.min(100,ulti+u);if(ulti>=100&&!ultPing){ultPing=true;sRdy();popup(W/2,140,'¡ULTI LISTA!','#ff3040');ub.classList.add('rdy')};ub.textContent='🌊 ULTI — '+Math.floor(ulti)+'%';}
function hitEnt(e){var z=Math.max(-40,Math.min(MAXZ,e.z)),sx=pX(e.lane,z),sy=py(z);if(e.t==='crate'){e.rm=true;score+=40;popup(sx,sy-12,'+40','#c8cede');burst(sx,sy,10,['#5a4630','#8a6a48']);sCrate();return};e.hp--;if(e.hp>0){e.flash=10;e.z+=40;sHit();burst(sx,sy,7,['#eef1f8','#ffd75e']);popup(sx,sy-14,'CRACK','#eef1f8')}else killEnt(e,sx,sy,e.t==='brute'?200:e.t==='rusher'?150:100);}
function slashResolve(){for(var i=ents.length-1;i>=0;i--){var e=ents[i];if(e.rm)continue;var slashable=(e.t==='grunt'||e.t==='brute'||e.t==='rusher'||e.t==='shooter'||e.t==='crate');if(!slashable)continue;var z=Math.max(-40,Math.min(MAXZ,e.z));if(e.z>-60&&e.z<125&&Math.abs(pX(e.lane,z)-playerX)<44){hitEnt(e);wflash=Math.max(wflash,.3)}}}
function emitWave(){var el=Math.round(px/laneW);waves.push({id:wid++,lane:el,z:12,vz:scroll+15,pierce:auraT>0?99:2,t:0});capA(waves,4);ring(playerX,playerY-10,6);sWave();}
function doParry(p){p.deflected=true;p.vz=scroll+15;parry+=25;slowT=9;wflash=.55;popup(pX(p.lane,20),py(20)-36,'PARRY!','#ffd75e');burst(pX(p.lane,20),py(20),12,['#ffd75e','#eef1f8']);ring(pX(p.lane,20),py(20),8);sParry();if(parry>=100)startAura();}
function startAura(){parry=0;auraT=340;popup(W/2,150,'⚡ OVERDRIVE! ⚡','#ffd75e');banner={t:0,txt:'OVERDRIVE'};ring(playerX,playerY-10,20);shake=12;sAuraOn();}
function ultBlast(){wflash=1;shake=17;sUltG();var n=0;for(var i=ents.length-1;i>=0;i--){var e=ents[i];if(e.rm)continue;var z=Math.max(-40,Math.min(MAXZ,e.z));burst(pX(e.lane,z),py(z),12,['#eef1f8','#ff3040']);e.rm=true;n++};ents=ents.filter(function(e){return !e.rm});if(n>0){score+=n*40;popup(W/2,130,'+'+n*40+'  IAI!','#eef1f8')};ultPing=false;}
function updChain(c,ax,ay,grav){var s=c.segs;s[0].x=ax;s[0].y=ay;for(var i=1;i<s.length;i++){s[i].y+=grav;var dx=s[i].x-s[i-1].x,dy=s[i].y-s[i-1].y,d=Math.sqrt(dx*dx+dy*dy)||1;var k=(d-c.L)/d;s[i].x-=dx*k;s[i].y-=dy*k;}}
function update(){frame++;if(hitstop>0){hitstop--;return};ts=1;if(ultT>0){ultT++;if(ultT>6&&ultT<38)ts=.35;if(ultT===8)ultBlast();if(ultT>50)ultT=0};if(slowT>0){slowT--;if(ts>.3)ts=.3};shake=Math.max(0,shake-.5);flashR=Math.max(0,flashR-.03);wflash=Math.max(0,wflash-.05);if(iframe>0)iframe--;if(whip>0)whip-=.05;if(atkCd>0)atkCd--;if(atkT>=0){atkT++;if(atkT===6){slashResolve();emitWave()};if(atkT>16)atkT=-1};if(banner){banner.t+=.016;if(banner.t>1)banner=null};if(comboT>0){comboT--;if(comboT===0)combo=0};var i;for(i=ghosts.length-1;i>=0;i--){if((ghosts[i].t-=.09)<=0)ghosts.splice(i,1)};for(i=parts.length-1;i>=0;i--){var q=parts[i];q.x+=q.vx;q.y+=q.vy;q.vy+=.24;if((q.life-=.032)<=0)parts.splice(i,1)};for(i=pops.length-1;i>=0;i--){if((pops[i].t-=.045)<=0)pops.splice(i,1)};for(i=rings.length-1;i>=0;i--){if((rings[i].t-=.07)<=0)rings.splice(i,1)};capA(parts,120);if(state!=='play'){drOff();return};if(!dr)drOn();if(auraT>0){auraT--;if(auraT===0){popup(playerX,playerY-56,'AURA TERMINADA','#8a92a6');tone(300,.2,'sine',.1,0,150)};if(auraT%9===0){atkT=0;atkCd=0;whip=.7;emitWave()};if(frame%3===0)parts.push({x:playerX+(Math.random()-.5)*26,y:playerY+4,vx:(Math.random()-.5)*1.4,vy:-1.8-Math.random(),life:.55,c:Math.random()<.5?'#ffd75e':'#ff9a3c',s:2+Math.random()*2});};camZ+=ts*(scroll+(auraT>0?2.2:0));score+=Math.round(ts*scroll*.1);if(frame%6===0)scEl.textContent=score;stridePh+=ts*(.2+scroll*.022);var tgt=lane*laneW;pv+=(tgt-px)*.55;pv*=.42;px+=pv;playerX=W/2+px;if(Math.abs(pv)>2.2&&frame%2===0)ghosts.push({x:playerX,y:playerY,t:.8});var el=Math.round(px/laneW);var lean=pv*.01;var hairGrav=auraT>0?-.5:.5;var hAmp=1.4+scroll*.24+whip*4.5+(auraT>0?2.5:0);updChain(hairC,playerX+lean*10,playerY-15,hairGrav);hairC.amp=hAmp;updChain(ribL,playerX-6+lean*8,playerY-17,auraT>0?-.3:.28);updChain(ribR,playerX+6+lean*8,playerY-17,auraT>0?-.3:.28);if(frame%11===0)parts.push({x:playerX-6+(Math.random()-.5)*10,y:playerY+13,vx:-.8-Math.random(),vy:-.3-Math.random()*.4,life:.4,c:'#3a4a6a',s:2+Math.random()*2});if(score>=milestone*500){milestone++;scroll=Math.min(9,scroll+.32);banner={t:0,txt:'MÁS RÁPIDO'};sMile()};spawn();for(i=waves.length-1;i>=0;i--){var w2=waves[i];w2.z+=ts*w2.vz;w2.t++;var hitW=false;for(var j=ents.length-1;j>=0;j--){var e2=ents[j];if(e2.rm||e2.lastW===w2.id)continue;var slashable=(e2.t==='grunt'||e2.t==='brute'||e2.t==='rusher'||e2.t==='shooter'||e2.t==='crate');if(slashable&&e2.lane===w2.lane&&Math.abs(e2.z-w2.z)<34){e2.lastW=w2.id;hitEnt(e2);hitW=true;wflash=Math.max(wflash,.25)}};if(hitW)w2.pierce--;if(w2.pierce<=0||w2.z>MAXZ+50)waves.splice(i,1)};for(i=projs.length-1;i>=0;i--){var p=projs[i];if(!p.deflected){p.z-=ts*(scroll+9);if(frame%4===0)parts.push({x:pX(p.lane,Math.min(MAXZ,p.z+10)),y:py(Math.min(MAXZ,p.z+10)),vx:0,vy:0,life:.22,c:'#ff3040',s:2});if(atkT>=4&&atkT<=10&&p.lane===el&&p.z>-40&&p.z<42){doParry(p);continue};if(p.z<-46){if(p.lane===el){if(auraT>0){burst(playerX,playerY-12,8,['#ffd75e','#eef1f8']);sSmash()}else dmg(12)};projs.splice(i,1);continue}}else{p.z+=ts*p.vz;var hit2=false;for(j=ents.length-1;j>=0;j--){var e3=ents[j];if(e3.rm)continue;var canHit=(e3.t==='grunt'||e3.t==='brute'||e3.t==='rusher'||e3.t==='shooter');if(canHit&&e3.lane===p.lane&&Math.abs(e3.z-p.z)<38){var zz=Math.max(-40,Math.min(MAXZ,e3.z)),ssx=pX(e3.lane,zz);e3.hp-=2;if(e3.hp>0){e3.flash=10;burst(ssx,py(zz),8,['#ffd75e','#eef1f8'])}else killEnt(e3,ssx,py(zz),180);hit2=true;break}};if(hit2||p.z>MAXZ+40){projs.splice(i,1);continue}}};capA(projs,8);for(i=ents.length-1;i>=0;i--){var e=ents[i];if(e.rm)continue;if(e.flash>0)e.flash--;if(e.t==='grunt'||e.t==='brute'){var close=e.t==='brute'?scroll*.35+.5:scroll*.5+.8;if(e.state==='walk'){e.z-=ts*close;if(e.z<110){e.state='windup';e.wt=0}}else if(e.state==='windup'){e.wt+=ts;e.z-=ts*scroll*.25;if(e.wt===(e.t==='brute'?26:20))sLunge();if(e.wt>(e.t==='brute'?72:48)){e.state='lunge';e.lt=0;e.struck=false}}else{e.lt++;e.z-=ts*(scroll+12);if(!e.struck&&e.z<26){e.struck=true;if(auraT>0)killEnt(e,pX(e.lane,0),py(0),100);else if(e.lane===el)dmg(e.t==='brute'?22:16);else popup(pX(e.lane,0),py(0)-30,'FALLO','#8a92a6')};if(e.lt>12||e.z<-60)e.rm=true}}else if(e.t==='rusher'){if(e.state==='rush'){e.z+=ts*e.vz;if(!e.hitDone&&Math.abs(e.z)<26&&e.lane===el){e.hitDone=true;if(auraT>0)killEnt(e,pX(e.lane,0),py(0),150);else dmg(14)};if(e.z>70){e.vz*=.8;if(e.vz<.6){e.state='windup';e.wt=0}};if(e.z>MAXZ)e.rm=true}else if(e.state==='windup'){e.wt+=ts;e.z-=ts*scroll*.25;if(e.wt>44){e.state='lunge';e.lt=0;e.struck=false}}else{e.lt++;e.z-=ts*(scroll+12);if(!e.struck&&e.z<26){e.struck=true;if(auraT>0)killEnt(e,pX(e.lane,0),py(0),150);else if(e.lane===el)dmg(14)};if(e.lt>12||e.z<-60)e.rm=true}}else if(e.t==='shooter'){if(e.state==='advance'){e.z-=ts*scroll*.5;if(e.z<=300){e.state='aim';e.wt=0}}else if(e.state==='aim'){e.z+=ts*scroll;e.wt++;if(e.wt===62){projs.push({lane:el,z:e.z-24,deflected:false,vz:0});sShot();burst(pX(e.lane,e.z-24),py(e.z-24),5,['#ff3040','#ffd75e'])};if(e.wt>86){e.shots--;if(e.shots>0){e.state='aim';e.wt=-46}else e.state='leave'}}else{e.z+=ts*(scroll+3);if(e.z>MAXZ+60)e.rm=true}}else{e.z-=ts*scroll;if(!e.done&&e.z<14&&e.z>-8&&e.lanes.indexOf(el)>=0){e.done=true;if(auraT>0){e.rm=true;score+=50;burst(pX(e.lane,0),py(0),12,['#ffd75e','#ff3040']);ring(pX(e.lane,0),py(0),10);sSmash();popup(pX(e.lane,0),py(0)-24,'¡SMASH!','#ffd75e')}else dmg(e.t==='log'?22:e.t==='crate'?12:18)};if(e.z<-70)e.rm=true}};props.forEach(function(p){p.z-=ts*scroll});}
function ell(px,py,rx,ry){x.beginPath();x.ellipse(px,py,rx,ry,0,0,7);x.fill()}
function rr2(px,py,w2,h2,r2){x.beginPath();x.moveTo(px+r2,py);x.lineTo(px+w2-r2,py);x.quadraticCurveTo(px+w2,py,px+w2,py+r2);x.lineTo(px+w2,py+h2-r2);x.quadraticCurveTo(px+w2,py+h2,px+w2-r2,py+h2);x.lineTo(px+r2,py+h2);x.quadraticCurveTo(px,py+h2,px,py+h2-r2);x.lineTo(px,py+r2);x.quadraticCurveTo(px,py,px+r2,py);x.closePath()}
function chainPath(c,amp,spd){var s=c.segs,pts=[{x:s[0].x,y:s[0].y}],i;for(i=1;i<s.length;i++){var dx=s[i].x-s[i-1].x,dy=s[i].y-s[i-1].y,d=Math.sqrt(dx*dx+dy*dy)||1;var nx=-dy/d,ny=dx/d;var wv=Math.sin(frame*spd+i*.62)*amp*(i/s.length);pts.push({x:s[i].x+nx*wv,y:s[i].y+ny*wv})};return pts}
function drawChain(pts,w0,w1,col,hi){var i;for(i=1;i<pts.length;i++){var f=i/(pts.length-1);x.strokeStyle=col;x.lineWidth=w0+(w1-w0)*f;x.lineCap='round';x.beginPath();x.moveTo(pts[i-1].x,pts[i-1].y);x.lineTo(pts[i].x,pts[i].y);x.stroke()};for(i=2;i<pts.length;i+=3){var f2=i/(pts.length-1);x.strokeStyle=hi;x.lineWidth=(w0+(w1-w0)*f2)*.35;x.beginPath();x.moveTo(pts[i-1].x,pts[i-1].y-1);x.lineTo(pts[i].x,pts[i].y-1);x.stroke()}}
function drawSword(ang,glow,al){x.save();x.globalAlpha=al===undefined?1:al;x.translate(playerX+13,playerY+2);x.rotate(ang);x.fillStyle='#2a0509';x.fillRect(-2,-9,4,10);x.fillStyle='#c9a24a';x.fillRect(-5,-10,10,2.5);x.fillStyle=glow?'#ffe9c9':'#dfe5ef';x.beginPath();x.moveTo(-2.4,-10);x.lineTo(-3.2,-36);x.lineTo(0,-42);x.lineTo(3.2,-36);x.lineTo(2.4,-10);x.closePath();x.fill();x.strokeStyle='rgba(120,130,150,.6)';x.lineWidth=.8;x.beginPath();x.moveTo(-1.4,-11);x.lineTo(-1.8,-35);x.stroke();if(glow){x.strokeStyle='rgba(255,200,120,.95)';x.lineWidth=1.6;x.beginPath();x.moveTo(0,-11);x.lineTo(0,-40);x.stroke()};x.restore();x.globalAlpha=1}
function drawPlayer(){if(state==='dead')return;if(iframe>0&&Math.floor(frame/4)%2===0&&auraT===0)return;var pyy=playerY,bobY=Math.sin(stridePh*2)*1.6;var lean=pv*.008;ghosts.forEach(function(g){x.globalAlpha=g.t*.3;x.fillStyle='#2a3555';ell(g.x,pyy+2,13,9.5);ell(g.x,pyy-12,8,7.5);x.strokeStyle='#2a3555';x.lineWidth=4;x.lineCap='round';x.beginPath();x.moveTo(g.x-3,pyy-18);x.quadraticCurveTo(g.x-14,pyy-6,g.x-20,pyy+4);x.stroke();x.globalAlpha=1});x.fillStyle='rgba(0,0,0,.5)';ell(playerX,pyy+8,15,6);if(auraT>0&&!(auraT<60&&Math.floor(frame/3)%2===0)){var ag=x.createRadialGradient(playerX,pyy-8,6,playerX,pyy-8,50);ag.addColorStop(0,'rgba(255,215,94,.5)');ag.addColorStop(1,'rgba(255,120,40,0)');x.fillStyle=ag;x.beginPath();x.arc(playerX,pyy-8,50,0,7);x.fill();for(var fl=0;fl<3;fl++){var jx=(Math.random()-.5)*6,jh=26+Math.random()*18;x.globalAlpha=.35+Math.random()*.25;x.fillStyle='#ff9a3c';x.beginPath();x.moveTo(playerX-14,pyy+10);x.quadraticCurveTo(playerX-8+jx,pyy-jh*.5,playerX+jx,pyy-jh);x.quadraticCurveTo(playerX+8+jx,pyy-jh*.5,playerX+14,pyy+10);x.closePath();x.fill()};x.globalAlpha=1;x.strokeStyle='rgba(255,255,255,'+(.4+Math.random()*.3)+')';x.lineWidth=1.5;for(var lt=0;lt<2;lt++){x.beginPath();var ax2=playerX+(Math.random()-.5)*32,ay2=pyy-28-Math.random()*14;x.moveTo(ax2,ay2);for(var zz=0;zz<3;zz++){ax2+=(Math.random()-.5)*12;ay2+=8+Math.random()*7;x.lineTo(ax2,ay2)};x.stroke()}};var hpts=chainPath(hairC,hairC.amp,.28+scroll*.02);drawChain(hpts,6,1.4,'#1a2238','#3a4a78');var ti=hpts[4];x.fillStyle='#c1121f';x.save();x.translate(ti.x,ti.y);x.rotate(.5);x.fillRect(-4,-2,8,4);x.restore();var st=Math.sin(stridePh),ct=Math.cos(stridePh);x.fillStyle='#10141f';ell(playerX-7+st*5,pyy+13+Math.abs(st)*1.5,4.2,3);ell(playerX+7-ct*5,pyy+13+Math.abs(ct)*1.5,4.2,3);x.save();x.translate(playerX,pyy+2+bobY*.4);x.rotate(lean);x.fillStyle='#1d2540';ell(0,0,13,9.5);x.strokeStyle='rgba(143,180,255,.55)';x.lineWidth=1.8;x.beginPath();x.ellipse(0,0,12.8,9.3,0,-2.7,-1.1);x.stroke();if(auraT>0){x.strokeStyle='rgba(255,220,140,'+(.6+.4*Math.sin(frame*.6))+')';x.lineWidth=2;x.beginPath();x.ellipse(0,0,13.8,10,0,0,7);x.stroke()};var bob=Math.sin(stridePh)*2.2;x.fillStyle='#242e4a';ell(-12,2+bob*.3,4.5,4);ell(12,2-bob*.3,4.5,4);x.fillStyle='#141928';ell(0,-14,8.5,8);x.fillStyle='#eef1f8';x.fillRect(-8,-19,16,3);x.restore();drawChain(chainPath(ribL,1.6,.32),2.6,.8,'#eef1f8','#fff');drawChain(chainPath(ribR,1.6,.34),2.6,.8,'#eef1f8','#fff');var ang=-.5+Math.sin(frame*.22)*.06,glow=auraT>0;if(ultT>0&&ultT<46){ang=-1.95+Math.sin(frame*.4)*.1;glow=true};if(atkT>=0){var k=Math.min(1,atkT/16);k=1-Math.pow(1-k,3);ang=-2.7+k*3.4;x.save();x.translate(playerX,pyy+bobY*.4-2);var a0=-2.7+k*3.4-1,a1=ang;var grd=x.createRadialGradient(0,0,16,0,0,54);grd.addColorStop(0,'rgba(238,241,248,0)');grd.addColorStop(.7,auraT>0?'rgba(255,215,94,'+(.5*(1-k))+')':'rgba(238,241,248,'+(.45*(1-k))+')');grd.addColorStop(1,'rgba(255,48,64,'+(.4*(1-k))+')');x.fillStyle=grd;x.beginPath();x.moveTo(0,0);x.arc(0,0,54,a0,a1);x.closePath();x.fill();x.strokeStyle='rgba(255,255,255,'+(.65*(1-k))+')';x.lineWidth=2.5;x.beginPath();x.arc(0,0,50,a0+.1,a1);x.stroke();x.restore();drawSword(ang-.42,glow,.1);drawSword(ang-.24,glow,.22)};drawSword(ang,glow)}
function glowDot(px,py,r,c1,c2){x.fillStyle=c2;ell(px,py,r*1.9,r*1.9);x.fillStyle=c1;ell(px,py,r,r)}
function drawEnt(e){var z=Math.max(-40,Math.min(MAXZ,e.z)),sc=psc(z),sy=py(z);if(sy<-30||sy>H+40)return;var sx=pX(e.lane,z);x.fillStyle='rgba(0,0,0,.4)';ell(sx,sy+5*sc,13*sc,5*sc);if(e.t==='rock'){x.fillStyle='#20242f';x.beginPath();x.moveTo(sx-14*sc,sy+4*sc);x.lineTo(sx-9*sc,sy-11*sc);x.lineTo(sx+2*sc,sy-15*sc);x.lineTo(sx+12*sc,sy-7*sc);x.lineTo(sx+13*sc,sy+4*sc);x.closePath();x.fill();x.strokeStyle='rgba(150,170,220,.25)';x.lineWidth=1.5*sc;x.stroke()}else if(e.t==='spike'){x.fillStyle='#161a26';rr2(sx-15*sc,sy-6*sc,30*sc,10*sc,2*sc);x.fill();for(var k=-1;k<=1;k++){x.fillStyle='#d8dce6';x.beginPath();x.moveTo(sx+k*9*sc-4*sc,sy-5*sc);x.lineTo(sx+k*9*sc+4*sc,sy-5*sc);x.lineTo(sx+k*9*sc,sy-18*sc);x.closePath();x.fill()};x.fillStyle='#e03040';x.fillRect(sx-15*sc,sy-2*sc,30*sc,2*sc)}else if(e.t==='log'){x.fillStyle='#2a2014';x.beginPath();x.moveTo(pX(-1.62,z),sy+5*sc);x.lineTo(pX(1.62,z),sy+5*sc);x.lineTo(pX(1.62,z),sy-8*sc);x.lineTo(pX(-1.62,z),sy-8*sc);x.closePath();x.fill();x.strokeStyle='#120d07';x.lineWidth=2;for(k=-1;k<=1;k++){var cx2=pX(k,z);x.beginPath();x.moveTo(cx2,sy-8*sc);x.lineTo(cx2,sy+5*sc);x.stroke()};x.fillStyle='rgba(224,48,64,.7)';x.fillRect(pX(-1.55,z),sy-8*sc,pX(1.55,z)-pX(-1.55,z),1.5)}else if(e.t==='crate'){x.fillStyle='#332a1a';rr2(sx-12*sc,sy-18*sc,24*sc,22*sc,2*sc);x.fill();x.strokeStyle='#6a5636';x.lineWidth=1.5*sc;x.strokeRect(sx-12*sc,sy-18*sc,24*sc,22*sc);x.strokeStyle='rgba(238,241,248,'+(.25+.15*Math.sin(frame*.12+e.ph))+')';x.lineWidth=1;rr2(sx-13.5*sc,sy-19.5*sc,27*sc,25*sc,3*sc);x.stroke()}else if(e.t==='grunt'||e.t==='brute'){var isB=e.t==='brute';var r=(isB?18:13)*sc;var bo=Math.sin(frame*.18+e.ph)*2*sc;if(e.state==='windup'){var pl=.5+.5*Math.sin(frame*.4);x.strokeStyle='rgba(255,48,64,'+(.35+.45*pl)+')';x.lineWidth=2.5*sc;x.beginPath();x.arc(sx,sy-8*sc,r+6*sc,0,7);x.stroke();x.fillStyle='rgba(255,90,100,.95)';x.font='900 '+(13*sc)+'px Arial';x.textAlign='center';x.fillText('!',sx,sy-r-12*sc);x.textAlign='left'};x.save();x.translate(sx,sy-8*sc+bo*.3);if(e.state==='lunge')x.scale(1,1.25);x.fillStyle='#0e1119';ell(-r*.55,r*.75,r*.3,r*.22+Math.abs(Math.sin(frame*.3+e.ph))*2*sc);ell(r*.55,r*.75,r*.3,r*.22+Math.abs(Math.cos(frame*.3+e.ph))*2*sc);var bg=x.createLinearGradient(0,-r,0,r);bg.addColorStop(0,isB?'#48566f':'#3a4560');bg.addColorStop(1,isB?'#161c2c':'#111626');x.fillStyle=bg;rr2(-r,-r*.7,2*r,r*1.3,4*sc);x.fill();x.strokeStyle='rgba(160,180,230,.4)';x.lineWidth=1.5*sc;rr2(-r,-r*.7,2*r,r*1.3,4*sc);x.stroke();x.fillStyle='#42506a';ell(-r*.85,0,r*.3,r*.34);ell(r*.85,0,r*.3,r*.34);glowDot(0,-r*.24,r*.5,'rgba(255,70,90,.35)','rgba(255,48,64,0)');x.fillStyle='#ff4a5c';rr2(-r*.6,-r*.34,r*1.2,r*.22,2*sc);x.fill();x.fillStyle='#ffd0d6';x.fillRect(-r*.5,-r*.3,r*.9,r*.06);if(isB){var core=e.hp>=2?'#ff3040':'#ff8040';glowDot(0,r*.28,r*.26,'rgba(255,120,90,.3)','rgba(255,48,64,0)');x.fillStyle=core;ell(0,r*.28,r*.2,r*.2);if(e.hp===1){x.strokeStyle='rgba(255,200,150,.7)';x.lineWidth=1.2*sc;x.beginPath();x.moveTo(-r*.5,-r*.2);x.lineTo(-r*.2,0);x.lineTo(-r*.4,r*.3);x.stroke()}};x.strokeStyle='#6a7690';x.lineWidth=1.5*sc;x.beginPath();x.moveTo(0,-r*.7);x.lineTo(0,-r*1.05);x.stroke();x.fillStyle=Math.sin(frame*.3+e.ph)>0?'#ffd75e':'#6a5a10';ell(0,-r*1.1,2.4*sc,2.4*sc);x.fillStyle='#a8b4cc';x.beginPath();x.moveTo(r*.7,r*.1);x.lineTo(r*1.25,r*.28);x.lineTo(r*.7,r*.5);x.closePath();x.fill();if(e.flash>0){x.globalAlpha=e.flash/10*.85;x.fillStyle='#fff';rr2(-r,-r*.7,2*r,r*1.3,4*sc);x.fill();x.globalAlpha=1};x.restore()}else if(e.t==='rusher'){var rd=12*sc;if(e.state==='rush'){x.globalAlpha=.3;x.fillStyle='#c1121f';ell(sx,sy+16*sc,rd*.8,rd*.5);ell(sx,sy+30*sc,rd*.6,rd*.4);x.globalAlpha=1};var bo2=Math.sin(frame*.18+e.ph)*3*sc;x.save();x.translate(sx,sy-14*sc+bo2);if(e.state==='windup'){var pl2=.5+.5*Math.sin(frame*.4);x.strokeStyle='rgba(255,48,64,'+(.35+.45*pl2)+')';x.lineWidth=2.5*sc;x.beginPath();x.arc(0,0,rd+6*sc,0,7);x.stroke();x.fillStyle='rgba(255,90,100,.95)';x.font='900 '+(13*sc)+'px Arial';x.textAlign='center';x.fillText('!',0,-rd-10*sc);x.textAlign='left'};x.fillStyle='rgba(200,220,255,'+(.4+.3*Math.sin(frame*1.2))+')';ell(0,-rd*.9,rd*1.1,2.6*sc);var dgr=x.createLinearGradient(0,-rd,0,rd);dgr.addColorStop(0,'#4a5470');dgr.addColorStop(1,'#141826');x.fillStyle=dgr;x.beginPath();x.moveTo(0,rd);x.lineTo(-rd*.8,-rd*.2);x.lineTo(0,-rd*.6);x.lineTo(rd*.8,-rd*.2);x.closePath();x.fill();x.strokeStyle='rgba(160,180,230,.4)';x.lineWidth=1.2*sc;x.stroke();glowDot(0,rd*.15,3.4*sc,'rgba(255,70,90,.3)','rgba(255,48,64,0)');x.fillStyle='#ff3040';ell(0,rd*.15,3*sc,3*sc);if(e.flash>0){x.globalAlpha=e.flash/10*.85;x.fillStyle='#fff';x.beginPath();x.moveTo(0,rd);x.lineTo(-rd*.8,-rd*.2);x.lineTo(0,-rd*.6);x.lineTo(rd*.8,-rd*.2);x.closePath();x.fill();x.globalAlpha=1};x.restore()}else if(e.t==='shooter'){var tr=15*sc;x.save();x.translate(sx,sy-10*sc);x.strokeStyle='#161a26';x.lineWidth=2.5*sc;x.beginPath();x.moveTo(-tr*.5,tr*.4);x.lineTo(-tr*.8,tr*1.1);x.moveTo(tr*.5,tr*.4);x.lineTo(tr*.8,tr*1.1);x.moveTo(0,tr*.4);x.lineTo(0,tr*1.1);x.stroke();var tgr=x.createLinearGradient(0,-tr,0,tr*.5);tgr.addColorStop(0,'#4a5470');tgr.addColorStop(1,'#131726');x.fillStyle=tgr;ell(0,0,tr,tr*.72);x.strokeStyle='rgba(160,180,230,.4)';x.lineWidth=1.5*sc;x.beginPath();x.ellipse(0,0,tr,tr*.72,0,0,7);x.stroke();var aimA=Math.atan2((playerY-20)-(sy-10*sc),playerX-sx);if(e.state==='leave')aimA=-1.2;x.save();x.rotate(aimA);x.fillStyle='#242e46';x.fillRect(tr*.3,-3*sc,tr*.8,6*sc);x.fillStyle='#42506a';ell(tr*.3,0,4.5*sc,4.5*sc);if(e.state==='aim'&&e.wt>20){var ch=Math.min(1,(e.wt-20)/42);glowDot(tr*.3+tr*.8+(2+ch*5)*sc,0,(2+ch*5)*sc,'rgba(255,48,64,'+(.25+.3*ch)+')','rgba(255,48,64,0)')};x.restore();glowDot(0,-tr*.3,3*sc,Math.sin(frame*.25+e.ph)>0?'rgba(255,215,94,.35)':'rgba(255,215,94,0)','rgba(255,215,94,0)');x.fillStyle=Math.sin(frame*.25+e.ph)>0?'#ffd75e':'#7a6a20';ell(0,-tr*.3,2.4*sc,2.4*sc);if(e.flash>0){x.globalAlpha=e.flash/10*.85;x.fillStyle='#fff';ell(0,0,tr,tr*.72);x.globalAlpha=1};x.restore();if(e.state==='aim'&&e.wt>18){var pr=Math.min(1,(e.wt-18)/44);x.strokeStyle='rgba(255,48,64,'+(.3+.45*pr)+')';x.lineWidth=1.5;x.setLineDash([8,7]);x.lineDashOffset=-frame*2;x.beginPath();x.moveTo(sx,sy-10*sc);x.lineTo(playerX,playerY-16);x.stroke();x.setLineDash([])}}}
function drawWave(w2){var z=Math.max(0,Math.min(MAXZ,w2.z)),sc=psc(z),sy2=py(z),sx=pX(w2.lane,z);var fade=w2.z>MAXZ-60?Math.max(0,(MAXZ-w2.z)/60):1;var aua=auraT>0;x.save();x.translate(sx,sy2);x.scale(sc,sc);x.globalAlpha=fade;var cw=24,chh=13;x.strokeStyle=aua?'rgba(255,180,60,.9)':'rgba(255,48,64,.85)';x.lineWidth=4;x.beginPath();x.moveTo(-cw,2);x.quadraticCurveTo(0,-chh*1.6,cw,2);x.stroke();x.fillStyle=aua?'rgba(255,240,190,.95)':'rgba(240,244,255,.95)';x.beginPath();x.moveTo(-cw,2);x.quadraticCurveTo(0,-chh*1.6,cw,2);x.quadraticCurveTo(0,-chh*.5,-cw,2);x.closePath();x.fill();x.fillStyle='#fff';ell(0,-chh*.5,3.5,2);x.restore();x.globalAlpha=1}
function drawProj(p){var z=Math.max(-40,Math.min(MAXZ,p.z)),sc=psc(z),sy2=py(z),sx=pX(p.lane,z);if(p.deflected){glowDot(sx,sy2,8*sc,'rgba(255,215,94,.4)','rgba(255,215,94,0)');x.fillStyle='#ffd75e';ell(sx,sy2,4*sc,4*sc);x.fillStyle='#fff';ell(sx,sy2,1.8*sc,1.8*sc)}else{glowDot(sx,sy2,6.5*sc,'rgba(255,48,64,.4)','rgba(255,48,64,0)');x.fillStyle='#ff3040';ell(sx,sy2,3.2*sc,3.2*sc);x.fillStyle='#fff';ell(sx,sy2,1.4*sc,1.4*sc)}}
function drawProp(p){var sc=psc(p.z),sy=py(p.z),bx=W/2+p.side*(EDGE+.22+p.off)*laneW*sc;if(bx<-40||bx>W+40||sy<-30)return;if(p.kind==='torii'){x.fillStyle='#0a0d18';x.fillRect(bx-16*sc,sy-52*sc,7*sc,52*sc);x.fillRect(bx+9*sc,sy-52*sc,7*sc,52*sc);x.fillRect(bx-24*sc,sy-50*sc,48*sc,6*sc);x.fillRect(bx-19*sc,sy-38*sc,38*sc,4*sc);x.strokeStyle='rgba(140,160,220,.22)';x.lineWidth=1;x.strokeRect(bx-24*sc,sy-50*sc,48*sc,6*sc);if(p.r<.5){x.fillStyle='#c1121f';ell(bx,sy-44*sc,3.2*sc,4.2*sc);x.fillStyle='rgba(255,60,70,.28)';ell(bx,sy-44*sc,5.5*sc,6.5*sc)}}else{var h2=(32+p.r*26)*sc;x.fillStyle='#0a0d18';x.fillRect(bx-2.5*sc,sy-h2,5*sc,h2);x.beginPath();x.moveTo(bx,sy-h2-(20+p.r*12)*sc);x.lineTo(bx-(11+p.r*6)*sc,sy-h2);x.lineTo(bx+(11+p.r*6)*sc,sy-h2);x.closePath();x.fill();x.strokeStyle='rgba(140,160,220,.15)';x.lineWidth=1;x.beginPath();x.moveTo(bx-(10+p.r*6)*sc,sy-h2);x.lineTo(bx,sy-h2-(18+p.r*11)*sc);x.stroke()}}
function drawRoad(){var sc0=psc(-130),sc1=psc(MAXZ),y0=py(-130),y1=py(MAXZ);x.fillStyle='#1b2030';x.beginPath();x.moveTo(W/2-EDGE*laneW*sc0,y0);x.lineTo(W/2+EDGE*laneW*sc0,y0);x.lineTo(W/2+EDGE*laneW*sc1,y1);x.lineTo(W/2-EDGE*laneW*sc1,y1);x.closePath();x.fill();[-EDGE,EDGE].forEach(function(o){x.strokeStyle='#e03040';x.lineWidth=3;x.beginPath();x.moveTo(W/2+o*laneW*sc0,y0);x.lineTo(W/2+o*laneW*sc1,y1);x.stroke();x.strokeStyle='rgba(224,48,64,.35)';x.lineWidth=1;x.beginPath();x.moveTo(W/2+(o+Math.sign(o)*.09)*laneW*sc0,y0);x.lineTo(W/2+(o+Math.sign(o)*.09)*laneW*sc1,y1);x.stroke()});[-.5,.5].forEach(function(o){x.fillStyle='rgba(150,170,220,.55)';for(var k=0;k<10;k++){var z=k*90-(camZ%90);if(z<-30)continue;if(z>MAXZ)break;var za=Math.max(0,z),zb=Math.min(MAXZ,z+16);var xa=W/2+o*laneW*psc(za),ya=py(za),xb=W/2+o*laneW*psc(zb),yb=py(zb);var w2=3.6*psc(z);x.beginPath();x.moveTo(xa-w2,ya);x.lineTo(xa+w2,ya);x.lineTo(xb+w2*.9,yb);x.lineTo(xb-w2*.9,yb);x.closePath();x.fill()}})}
function drawUlt(){if(ultT<=0)return;if(ultT<8){var k=ultT/8;for(var i=0;i<3;i++){x.strokeStyle='rgba(255,48,64,'+(.6-.4*i)*k+')';x.lineWidth=2;x.beginPath();x.arc(playerX,playerY-8,(60-i*16)*(1-k)+8,0,7);x.stroke()};return};var wt=Math.min(1,(ultT-8)/34);var zF=wt*MAXZ,zB=Math.max(0,zF-130);var scF=psc(zF),scB=psc(zB);var al=(1-wt)*.9;x.save();var grd=x.createLinearGradient(0,py(zF),0,py(zB));grd.addColorStop(0,'rgba(248,251,255,'+al+')');grd.addColorStop(.5,'rgba(255,48,64,'+al*.7+')');grd.addColorStop(1,'rgba(193,18,31,0)');x.fillStyle=grd;x.beginPath();x.moveTo(W/2-EDGE*laneW*scB,py(zB));x.lineTo(W/2+EDGE*laneW*scB,py(zB));x.lineTo(W/2+EDGE*laneW*scF,py(zF));x.lineTo(W/2-EDGE*laneW*scF,py(zF));x.closePath();x.fill();x.strokeStyle='rgba(248,251,255,'+al+')';x.lineWidth=5*scF+2;x.beginPath();x.moveTo(W/2-EDGE*laneW*scF,py(zF));x.quadraticCurveTo(W/2,py(zF)-24*scF-10,W/2+EDGE*laneW*scF,py(zF));x.stroke();x.restore()}
var skyG=null,vigG=null,moonG=null;
function mkStatics(){skyG=x.createLinearGradient(0,0,0,130);skyG.addColorStop(0,'#0d1220');skyG.addColorStop(.7,'#1a2238');skyG.addColorStop(1,'#28324e');moonG=x.createRadialGradient(320,60,14,320,60,46);moonG.addColorStop(0,'rgba(216,221,232,.25)');moonG.addColorStop(1,'rgba(216,221,232,0)');vigG=x.createRadialGradient(W/2,H/2,150,W/2,H/2,330);vigG.addColorStop(0,'rgba(0,0,0,0)');vigG.addColorStop(1,'rgba(0,0,8,.42)')}
mkStatics();
function draw(){x.setTransform(DPR,0,0,DPR,0,0);x.fillStyle=skyG;x.fillRect(-10,-10,W+20,90);x.fillStyle='#e8ecf4';x.beginPath();x.arc(320,60,15,0,7);x.fill();x.fillStyle='#1a2238';x.beginPath();x.arc(325,56,13,0,7);x.fill();x.fillStyle=moonG;x.beginPath();x.arc(320,60,46,0,7);x.fill();x.fillStyle='#131a2c';x.beginPath();x.moveTo(-10,80);var mofs=-camZ*.004;for(var mx=0;mx<=W+10;mx+=30){x.lineTo(mx,72-Math.sin((mx+mofs)*.02)*16-Math.sin((mx+mofs)*.005)*8)};x.lineTo(W+10,80);x.closePath();x.fill();x.fillStyle='rgba(90,110,180,.1)';x.fillRect(-10,74,W+20,10);x.save();var camBob=Math.sin(stridePh*2)*1.3;var camShift=-pv*.06-pv*.06;if(shake>0)x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake*.7);x.translate(-px*.14+camShift*.5,camBob);drawRoad();props.forEach(drawProp);var drawList=ents.slice().sort(function(a,b){return b.z-a.z});drawList.forEach(drawEnt);waves.forEach(drawWave);projs.forEach(drawProj);ents.forEach(function(e){if(e.t==='rusher'&&e.state==='rush'&&e.z<-30){var wx=pX(e.lane,0);var pl=.5+.5*Math.sin(frame*.5);x.fillStyle='rgba(255,48,64,'+(.5+.5*pl)+')';x.beginPath();x.moveTo(wx-9,H-30);x.lineTo(wx+9,H-30);x.lineTo(wx,H-14);x.closePath();x.fill();x.font='900 11px Arial';x.textAlign='center';x.fillStyle='rgba(255,120,130,'+(.6+.4*pl)+')';x.fillText('!',wx,H-34);x.textAlign='left'}});drawPlayer();rings.forEach(function(r2){x.globalAlpha=r2.t*.8;x.strokeStyle='rgba(255,215,94,.9)';x.lineWidth=2.5;x.beginPath();x.arc(r2.x,r2.y,r2.r0+(1-r2.t)*46,0,7);x.stroke();x.globalAlpha=1});parts.forEach(function(p){x.globalAlpha=Math.max(p.life,0);x.fillStyle=p.c;x.fillRect(p.x,p.y,p.s,p.s)});x.globalAlpha=1;pops.forEach(function(p){x.globalAlpha=Math.max(0,p.t);x.font='900 12px Arial';x.textAlign='center';var p2=p.y-(1-p.t)*16;x.lineWidth=3;x.strokeStyle='rgba(5,5,12,.85)';x.strokeText(p.txt,p.sx,p2);x.fillStyle=p.c;x.fillText(p.txt,p.sx,p2)});x.globalAlpha=1;x.textAlign='left';x.restore();drawUlt();if(ultT>0&&ultT<50){var bh=Math.min(ultT,50-ultT)/8*20;if(bh>0){x.fillStyle='#000';x.fillRect(0,0,W,bh);x.fillRect(0,H-bh,W,bh)}};x.fillStyle=vigG;x.fillRect(0,0,W,H);if(auraT>0){x.fillStyle='rgba(255,150,40,'+(.05+.03*Math.sin(frame*.3))+')';x.fillRect(0,0,W,H)};if(hp<=30&&state==='play'&&auraT<=0){x.fillStyle='rgba(193,18,31,'+(.06+.05*Math.sin(frame*.2))+')';x.fillRect(0,0,W,H)};if(flashR>0){x.fillStyle='rgba(255,30,40,'+(flashR*.26)+')';x.fillRect(0,0,W,H)};if(wflash>0){x.fillStyle='rgba(255,255,255,'+(wflash*.28)+')';x.fillRect(0,0,W,H)};var hw=170,hx=W/2-hw/2,hy=12;rr2(hx-2,hy-2,hw+4,18,6);x.fillStyle='rgba(5,7,14,.75)';x.fill();x.strokeStyle='rgba(200,210,235,.35)';x.lineWidth=1.5;x.stroke();var hpc=hp/100;if(hpc>.3){var hg=x.createLinearGradient(hx,0,hx+hw,0);hg.addColorStop(0,'#ff9aa2');hg.addColorStop(1,'#e8ecf4');x.fillStyle=hg}else{x.fillStyle=hp>0?'#ff3040':'#500a10';if(hp>0&&hp<=30){x.fillStyle='rgba(255,48,64,'+(.7+.3*Math.sin(frame*.3))+')'}};rr2(hx,hy,hw*hpc,14,4);x.fill();x.strokeStyle='rgba(5,7,14,.5)';x.lineWidth=1;for(var tk=1;tk<10;tk++){x.beginPath();x.moveTo(hx+hw*tk/10,hy+1);x.lineTo(hx+hw*tk/10,hy+13);x.stroke()};x.font='900 10px Arial';x.textAlign='center';x.fillStyle='#eef1f8';x.fillText(Math.max(0,Math.round(hp))+' / 100',W/2,hy+25);x.textAlign='left';var bx=10,by=40;rr2(bx-2,by-2,96,13,5);x.fillStyle='rgba(5,7,14,.75)';x.fill();x.strokeStyle='rgba(193,18,31,.5)';x.lineWidth=1;x.stroke();for(var s2=0;s2<10;s2++){if(s2<ulti/10){var g2=x.createLinearGradient(0,by,0,by+9);g2.addColorStop(0,'#ff8a94');g2.addColorStop(1,'#c1121f');x.fillStyle=g2}else x.fillStyle='rgba(110,40,48,.25)';x.fillRect(bx+1+s2*9.2,by+1,7.4,7)};x.font='bold 8px monospace';if(ulti>=100){x.fillStyle='rgba(255,120,130,'+(.6+.4*Math.sin(frame*.25))+')';x.fillText('ULTI LISTA — U',bx,by+22)}else{x.fillStyle='rgba(200,206,222,.6)';x.fillText('ULTI '+Math.floor(ulti)+'%',bx,by+22)};var ax3=W-106,ay3=40;rr2(ax3-2,ay3-2,96,13,5);x.fillStyle='rgba(5,7,14,.75)';x.fill();x.strokeStyle='rgba(255,180,60,.5)';x.lineWidth=1;x.stroke();var afill=auraT>0?auraT/340:parry/100;for(s2=0;s2<10;s2++){if(s2<afill*10){var ag2=x.createLinearGradient(0,ay3,0,ay3+9);ag2.addColorStop(0,'#ffe89a');ag2.addColorStop(1,'#ff9a3c');x.fillStyle=ag2}else x.fillStyle='rgba(110,80,30,.25)';x.fillRect(ax3+1+s2*9.2,ay3+1,7.4,7)};if(auraT>0){x.fillStyle='rgba(255,215,94,'+(.6+.4*Math.sin(frame*.3))+')';x.fillText('OVERDRIVE '+(auraT/60).toFixed(1)+'s',ax3,ay3+22)}else if(parry>0){x.fillStyle='rgba(255,200,120,.75)';x.fillText('AURA '+Math.floor(parry)+'%',ax3,ay3+22)}else{x.fillStyle='rgba(200,206,222,.5)';x.fillText('PARRY→AURA',ax3,ay3+22)};x.fillStyle='rgba(200,206,222,.6)';x.textAlign='right';x.fillText('VEL '+(scroll+(auraT>0?2.2:0)).toFixed(1),W-12,H-10);x.textAlign='left';if(banner){var bt=banner.t,k=Math.min(bt*3,1),al=bt>.8?(1-bt)/.2:1,sc2=1+(1-k)*.7;x.save();x.translate(W/2,120);x.scale(sc2,sc2);x.globalAlpha=al*k;x.font='900 24px Arial';x.textAlign='center';x.lineWidth=5;x.strokeStyle='rgba(5,5,12,.85)';x.strokeText(banner.txt,0,0);x.fillStyle=auraT>0?'#ffd75e':'#eef1f8';x.fillText(banner.txt,0,0);x.restore();x.globalAlpha=1;x.textAlign='left'};if(combo>=3&&comboT>0){x.save();x.translate(W-58,80);x.rotate(.08);var cs=1+Math.max(0,(comboT-120)/10*.15);x.scale(cs,cs);x.font='900 20px Arial';x.textAlign='center';x.lineWidth=4;x.strokeStyle='rgba(5,5,12,.8)';x.strokeText(combo+' GOLPES',0,0);x.fillStyle=combo>=8?'#ffd75e':'#eef1f8';x.fillText(combo+' GOLPES',0,0);x.restore();x.textAlign='left'};if(state==='ready'){x.fillStyle='rgba(5,7,14,.55)';x.fillRect(0,0,W,H);x.textAlign='center';x.font='900 30px Arial';x.lineWidth=7;x.strokeStyle='#000';x.strokeText('KURO SLASH',W/2,158);x.fillStyle='#eef1f8';x.fillText('KURO SLASH',W/2,158);x.strokeStyle='#c1121f';x.lineWidth=3;x.beginPath();x.moveTo(W/2-92,154);x.lineTo(W/2+92,162);x.stroke();x.font='700 9px Arial';x.fillStyle='#9aa2b8';x.fillText('CÓDIGO SHANKS · PARRY · OVERDRIVE',W/2,178);if(BEST>0){x.font='bold 11px monospace';x.fillStyle='#c8cede';x.fillText('RÉCORD: '+BEST,W/2,198)};x.font='900 15px Arial';x.fillStyle='rgba(238,241,248,'+(.5+.5*Math.sin(frame*.09))+')';x.fillText('TOCA PARA EMPEZAR',W/2,226);x.font='600 8.5px Arial';x.fillStyle='#7a8296';x.fillText('corta el proyectil rojo = PARRY · kill = +5 HP',W/2,246);x.textAlign='left'};if(state==='dead'){var dk=Math.min(1,(performance.now()-overT)/900);x.fillStyle='rgba(2,3,6,'+(.6*dk)+')';x.fillRect(0,0,W,H);x.textAlign='center';x.globalAlpha=dk;x.font='900 28px "Times New Roman",serif';var dg=x.createLinearGradient(0,178,0,206);dg.addColorStop(0,'#a01020');dg.addColorStop(1,'#e03040');x.fillStyle=dg;x.fillText('HAS MUERTO',W/2,200);x.font='bold 12px monospace';x.fillStyle='#c8cede';x.fillText('PUNTOS '+score,W/2,226);if(bestNew){x.fillStyle='rgba(255,215,94,'+(.6+.4*Math.sin(frame*.2))+')';x.font='900 12px Arial';x.fillText('★ NUEVO RÉCORD: '+best+' ★',W/2,244)}else{x.fillStyle='#8a92a6';x.fillText('RÉCORD: '+best,W/2,244)};x.font='700 10px Arial';x.fillStyle='rgba(200,206,222,'+(.5+.5*Math.sin(frame*.1))*dk+')';x.fillText('toca para revivir',W/2,266);x.globalAlpha=1;x.textAlign='left'}}
document.addEventListener('pointerdown',function(){if(state==='ready'){ac();drOn();state='play';reset()}else if(state==='dead'&&performance.now()-overT>900){ac();drOn();state='play';reset()}},{capture:true});
var perfA=0,perfN=0,perfDone=false,lastT=0;
function loop(t){if(!perfDone&&perfN>60&&perfN<160)perfA+=(t-lastT);if(!perfDone&&perfN===160){perfA/=100;if(perfA>22){DPR=1;cv.width=W;cv.height=H};perfDone=true};perfN++;lastT=t;update();draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
})();
</script>`;

function buildUnifiedResponseData() {
  return Buffer.from(
    JSON.stringify({
      __typename: "GenAIUnifiedResponse",
      response_id: "b20b66d0-3732-4e7c-bbde-83ab300907bd",
      sections: [
        {
          __typename: "GenAIUnifiedResponseSection",
          view_model: {
            __typename: "GenAISingleLayoutViewModel",
            primitive: {
              __typename: "GenAIaeacdsnwHtmlPrimitive",
              payload: GAME_HTML,
              trusted_sources: [],
            },
          },
        },
      ],
    }),
  ).toString("base64");
}

function buildPayload() {
  return {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: "",
        botResponseId: "1fddbd07-5465-4bc8-8d75-7442e8ac15c2",
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,
              signature:
                "U0hBTktTLk1lc3NhZ2VCdWlsZGVyVjQuNy1WZXJpZmljYXRpb25TaWduYXR1cmUuTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzw==",
              certificateChain: [
                "U0hBTktTLk1lc3NhZ2VCdWlsZGVyVjQuNy1DZXJ0aWZpY2F0ZUNoYWluLk1ldGFkYXRh==",
              ],
            },
          ],
        },
      },
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            {
              messageType: 2,
              messageText: "🌑 KURO SLASH v3",
            },
          ],
          unifiedResponse: {
            data: buildUnifiedResponseData(),
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: "867051314767696@bot",
            },
            forwardOrigin: 4,
          },
        },
      },
    },
  };
}

function buildAdditionalNodes() {
  return [
    {
      tag: "biz",
      attrs: {
        actual_actors: "2",
        host_storage: "2",
        privacy_mode_ts: String(Math.floor(Date.now() / 1000)),
      },
      content: [
        {
          tag: "interactive",
          attrs: { type: "native_flow", v: "1" },
          content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
        },
        {
          tag: "quality_control",
          attrs: {
            decision_id: crypto.randomBytes(20).toString("hex"),
            source_type: "third_party",
          },
          content: [{ tag: "decision_source", attrs: { value: "df" } }],
        },
      ],
    },
  ];
}

async function handler(m, { sock }) {
  await m.react("🕒").catch(() => {});

  try {
    const msg = generateWAMessageFromContent(m.chat, buildPayload(), {
      userJid: sock.user.id,
    });

    await sock.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id,
      additionalNodes: buildAdditionalNodes(),
    });

    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba16] Kuro Slash bot message failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler }; 
