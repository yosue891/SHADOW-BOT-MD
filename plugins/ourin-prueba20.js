import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba20",
  alias: ["pacman", "pac", "pacmaze"],
  category: "games",
  description: "Enviar Pac-Maze retro jugable con sonido arcade vía bot message",
  usage: ".prueba20",
  example: ".prueba20",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const GAME_HTML = `<style>
*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;box-sizing:border-box}body{margin:0;background:transparent;font-family:'Courier New',monospace;color:#fff;touch-action:manipulation}.wrap{width:100%;max-width:520px;margin:auto;padding:10px}.cab{background:#05050c;border:3px solid #1a37ff;border-radius:14px;box-shadow:0 0 18px #1a37ff66,inset 0 0 28px #000;overflow:hidden}.top{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:2px solid #111a8a;background:linear-gradient(#101016,#05050c)}.brand{font-size:9px;letter-spacing:2px;color:#ffcc00}.title{font:900 25px Arial,sans-serif;color:#ffed4a;text-shadow:2px 0 #ff8c00,-2px 0 #00d8ff,0 0 12px #ffcc00;letter-spacing:1px}.stats{display:flex;gap:10px;text-align:right}.stat i{display:block;font-size:8px;color:#89a0ff;font-style:normal;letter-spacing:1px}.stat b{font-size:15px;color:#fff}.screen{position:relative;margin:10px auto 8px;width:380px;max-width:100%;background:#000;border:3px solid #1428d4;border-radius:10px;overflow:hidden;box-shadow:inset 0 0 20px #06105a}canvas{display:block;width:100%;height:auto;background:#000}.overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;background:rgba(0,0,0,.78);z-index:5;padding:18px}.overlay.hidden{display:none}.ot{font:900 30px Arial,sans-serif;color:#ffe600;text-shadow:0 0 10px #ffe600,3px 0 #ff7a00,-3px 0 #00a2ff;letter-spacing:2px}.os{font-size:11px;line-height:1.55;color:#d6d6ff;margin:10px 0 14px}.start{min-width:190px;height:34px;border:2px solid #ffe600;border-radius:18px;background:#111;color:#ffe600;font-weight:900;box-shadow:0 0 12px #ffe60066;cursor:pointer}.controls{padding:0 12px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.dpad{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,42px);gap:6px}.btn{border:2px solid #2537d8;border-radius:10px;background:linear-gradient(#11173a,#050719);color:#fff;font:900 18px Arial;box-shadow:0 3px 0 #01020a;cursor:pointer;touch-action:none}.btn:active,.btn.pressed{transform:translateY(2px);box-shadow:none;background:#1f2cff}.btn small{display:block;font:700 7px Arial;color:#9fb0ff;letter-spacing:1px}.act{display:grid;grid-template-rows:1fr 1fr;gap:6px}.act .btn{font-size:13px;color:#ffed4a;border-color:#ffcc00}.music.on{background:linear-gradient(#5a4300,#181000);color:#ffed4a}.status{text-align:center;font-size:10px;color:#9aa6ff;padding:0 10px 12px;min-height:14px}.blink{animation:blink .8s steps(2) infinite}@keyframes blink{50%{opacity:.3}}@media(max-width:420px){.wrap{padding:6px}.screen{width:360px}.dpad{grid-template-rows:repeat(3,39px)}.title{font-size:22px}.stats{gap:6px}.stat b{font-size:13px}}
</style>
<body><div class="wrap"><div class="cab"><div class="top"><div><div class="brand">RETRO ARCADE 8-BIT</div><div class="title">PAC-MAZE</div></div><div class="stats"><div class="stat"><i>SCORE</i><b id="score">00000</b></div><div class="stat"><i>BEST</i><b id="best">00000</b></div><div class="stat"><i>LIVES</i><b id="lives">3</b></div></div></div><div class="screen" id="screen"><canvas id="game" width="380" height="440"></canvas><div class="overlay" id="overlay"><div class="ot" id="overTitle">PAC-MAZE</div><div class="os" id="overSub">COME TODOS LOS PUNTOS • EVITA LOS FANTASMAS<br>POWER PELLET = CAZA FANTASMAS<br><span class="blink">MÚSICA CHIPTUNE ARCADE</span></div><button class="start" id="start">INICIAR PARTIDA</button></div></div><div class="controls"><div class="dpad"><div></div><button class="btn" data-dir="up">▲<small>UP</small></button><div></div><button class="btn" data-dir="left">◀<small>LEFT</small></button><button class="btn" id="pause">Ⅱ<small>PAUSA</small></button><button class="btn" data-dir="right">▶<small>RIGHT</small></button><div></div><button class="btn" data-dir="down">▼<small>DOWN</small></button><div></div></div><div class="act"><button class="btn music" id="music">♫ MÚSICA</button><button class="btn" id="boost">⚡ TURBO</button></div></div><div class="status" id="status">TOCA INICIAR • USA EL PAD • SONIDO AL TOCAR</div></div></div>
<script>
(function(){
var cv=document.getElementById('game'),ctx=cv.getContext('2d'),overlay=document.getElementById('overlay'),overTitle=document.getElementById('overTitle'),overSub=document.getElementById('overSub'),startBtn=document.getElementById('start'),scoreEl=document.getElementById('score'),bestEl=document.getElementById('best'),livesEl=document.getElementById('lives'),statusEl=document.getElementById('status'),musicBtn=document.getElementById('music'),pauseBtn=document.getElementById('pause'),boostBtn=document.getElementById('boost');
var raw=['###################','#........#........#','#.##.###.#.###.##.#','#o##.###.#.###.##o#','#.................#','#.##.#.#####.#.##.#','#....#...#...#....#','####.### # ###.####','   #.#       #.#   ','####.# ## ## #.####','    .  #   #  .    ','####.# ##### #.####','   #.#       #.#   ','####.# ##### #.####','#........#........#','#.##.###.#.###.##.#','#o.#..... .....#.o#','##.#.#.#####.#.#.##','#....#...#...#....#','#.######.#.######.#','#.................#','###################'];
var ROWS=raw.length,COLS=raw[0].length,T=18,OX=Math.floor((380-COLS*T)/2),OY=20;
var map=[],pellets=0,score=0,best=0,lives=3,level=1,playing=false,paused=false,win=false,last=0,power=0,combo=0,waka=0,boost=false,inv=0;
var dirs={left:{x:-1,y:0,a:Math.PI},right:{x:1,y:0,a:0},up:{x:0,y:-1,a:-Math.PI/2},down:{x:0,y:1,a:Math.PI/2},none:{x:0,y:0,a:0}};
var pac={x:9,y:16,dir:dirs.left,next:dirs.left,mouth:0};
var ghosts=[];
var AC=null,musicTimer=null,musicOn=false,step=0;
try{best=parseInt(localStorage.getItem('pacmaze_best')||'0',10)||0}catch(e){best=0}bestEl.textContent=pad(best,5);
function pad(n,l){return String(Math.max(0,Math.floor(n))).padStart(l,'0')}
function initAudio(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(AC&&AC.state==='suspended')AC.resume().catch(function(){});return AC}
function tone(f,d,type,gain,delay){var a=initAudio();if(!a||!musicOn&&type==='bg')return;try{var o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(delay||0);o.type=type==='noise'?'sawtooth':(type||'square');o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(gain||.08,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}
function intro(){var n=[523,659,784,1046,784,659,523,392,523,659,784,988,784,659];for(var i=0;i<n.length;i++)tone(n[i],.08,'square',.09,i*.095)}
function wakaSound(){waka=!waka;tone(waka?330:420,.035,'square',.045,0)}
function powerSound(){[330,415,523,659].forEach(function(f,i){tone(f,.09,'square',.09,i*.06)})}
function eatGhostSound(){[660,880,1175].forEach(function(f,i){tone(f,.07,'triangle',.1,i*.06)})}
function dieSound(){[440,370,311,247,196,146].forEach(function(f,i){tone(f,.18,'sawtooth',.1,i*.12)})}
function winSound(){[523,659,784,1046,1318].forEach(function(f,i){tone(f,.12,'square',.1,i*.09)})}
function startMusic(){if(musicTimer)return;musicOn=true;musicBtn.classList.add('on');musicBtn.textContent='♫ ON';var bass=[98,123,146,123,98,164,146,123];musicTimer=setInterval(function(){if(!playing||paused)return;var f=bass[step++%bass.length];tone(f,.09,'bg',.045,0);tone(f*2,.055,'bg',.025,.04)},165)}
function stopMusic(){musicOn=false;musicBtn.classList.remove('on');musicBtn.textContent='♫ MÚSICA';if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function resetMap(){map=raw.map(function(r){return r.split('')});pellets=0;for(var y=0;y<ROWS;y++)for(var x=0;x<COLS;x++)if(map[y][x]==='.'||map[y][x]==='o')pellets++}
function cell(x,y){x=(x+COLS)%COLS;if(y<0||y>=ROWS)return '#';return map[y][x]||'#'}
function pass(x,y){return cell(x,y)!=='#'}
function near(v){return Math.abs(v-Math.round(v))<.10}
function canAt(e,d){var cx=Math.round(e.x),cy=Math.round(e.y);return pass(cx+d.x,cy+d.y)}
function chooseDir(g){var opts=['left','right','up','down'].map(function(k){return dirs[k]}).filter(function(d){return pass(Math.round(g.x)+d.x,Math.round(g.y)+d.y)&&!(d.x===-g.dir.x&&d.y===-g.dir.y)});if(!opts.length)opts=[{x:-g.dir.x,y:-g.dir.y,a:g.dir.a}];if(power>0)return opts[Math.floor(Math.random()*opts.length)];opts.sort(function(a,b){var ax=Math.round(g.x)+a.x-pac.x,ay=Math.round(g.y)+a.y-pac.y,bx=Math.round(g.x)+b.x-pac.x,by=Math.round(g.y)+b.y-pac.y;return ax*ax+ay*ay-(bx*bx+by*by)});return Math.random()<.18?opts[Math.floor(Math.random()*opts.length)]:opts[0]}
function resetPositions(){pac={x:9,y:16,dir:dirs.left,next:dirs.left,mouth:0};ghosts=[{x:9,y:9,home:{x:9,y:9},dir:dirs.left,c:'#ff3333',eye:'#fff',name:'BLINKY'},{x:8,y:10,home:{x:8,y:10},dir:dirs.up,c:'#ff9ad5',eye:'#fff',name:'PINKY'},{x:10,y:10,home:{x:10,y:10},dir:dirs.up,c:'#00e5ff',eye:'#fff',name:'INKY'},{x:9,y:11,home:{x:9,y:11},dir:dirs.right,c:'#ffb347',eye:'#fff',name:'CLYDE'}];inv=80;power=0;combo=0}
function start(){resetMap();score=0;lives=3;level=1;playing=true;paused=false;win=false;resetPositions();overlay.classList.add('hidden');statusEl.textContent='READY! COME LOS PUNTOS';intro();startMusic();updateUI()}
function nextLevel(){level++;resetMap();resetPositions();playing=true;win=false;overlay.classList.add('hidden');statusEl.textContent='NIVEL '+level;winSound();updateUI()}
function gameOver(){playing=false;paused=false;overTitle.textContent='GAME OVER';overSub.innerHTML='PUNTOS: '+pad(score,5)+'<br>TOCA START PARA REINTENTAR';startBtn.textContent='REINTENTAR';overlay.classList.remove('hidden');dieSound();if(score>best){best=score;try{localStorage.setItem('pacmaze_best',String(best))}catch(e){}}updateUI()}
function updateUI(){scoreEl.textContent=pad(score,5);bestEl.textContent=pad(Math.max(best,score),5);livesEl.textContent=lives;pauseBtn.textContent=paused?'▶':'Ⅱ'}
function setDir(k){if(dirs[k]){pac.next=dirs[k];if(!playing)start()}}
function eatAt(){var cx=Math.round(pac.x),cy=Math.round(pac.y),v=cell(cx,cy);if(v==='.'||v==='o'){map[cy][(cx+COLS)%COLS]=' ';pellets--;score+=v==='o'?50:10;wakaSound();if(v==='o'){power=520;combo=0;powerSound()}if(pellets<=0){playing=false;win=true;overTitle.textContent='NIVEL COMPLETO';overSub.innerHTML='HAS LIMPIADO EL LABERINTO<br>PREPARA LA SIGUIENTE RONDA';startBtn.textContent='SIGUIENTE NIVEL';overlay.classList.remove('hidden');winSound()}updateUI()}}
function updatePac(dt){if(near(pac.x)&&near(pac.y)){pac.x=Math.round(pac.x);pac.y=Math.round(pac.y);if(canAt(pac,pac.next))pac.dir=pac.next;if(!canAt(pac,pac.dir))pac.dir=dirs.none}var sp=(boost?7.2:5.2)+(level-1)*.15;pac.x+=pac.dir.x*sp*dt;pac.y+=pac.dir.y*sp*dt;if(pac.x<-.5)pac.x=COLS-.5;if(pac.x>COLS-.5)pac.x=-.5;pac.mouth+=dt*10;eatAt()}
function updateGhost(g,dt){if(near(g.x)&&near(g.y)){g.x=Math.round(g.x);g.y=Math.round(g.y);g.dir=chooseDir(g)}var sp=(power>0?2.4:3.35)+(level-1)*.08;g.x+=g.dir.x*sp*dt;g.y+=g.dir.y*sp*dt;if(g.x<-.5)g.x=COLS-.5;if(g.x>COLS-.5)g.x=-.5;var d=Math.hypot(g.x-pac.x,g.y-pac.y);if(d<.55&&inv<=0){if(power>0){score+=200*(++combo);eatGhostSound();g.x=g.home.x;g.y=g.home.y;g.dir=dirs.left;updateUI()}else{lives--;resetPositions();dieSound();statusEl.textContent='¡TE ATRAPARON!';if(lives<=0)gameOver();updateUI()}}}
function update(t){if(!last)last=t;var dt=Math.min((t-last)/1000,.05);last=t;if(playing&&!paused&&!win){if(power>0)power-=dt*60;if(inv>0)inv-=dt*60;updatePac(dt);ghosts.forEach(function(g){updateGhost(g,dt)})}draw();requestAnimationFrame(update)}
function drawWalls(){ctx.strokeStyle='#1a37ff';ctx.lineWidth=2;ctx.shadowBlur=10;ctx.shadowColor='#2547ff';for(var y=0;y<ROWS;y++)for(var x=0;x<COLS;x++){if(map[y][x]==='#'){var px=OX+x*T,py=OY+y*T;ctx.fillStyle='#02055c';ctx.fillRect(px,py,T,T);ctx.strokeRect(px+2,py+2,T-4,T-4)}}ctx.shadowBlur=0}
function drawPellets(){for(var y=0;y<ROWS;y++)for(var x=0;x<COLS;x++){var v=map[y][x];if(v==='.'||v==='o'){var px=OX+x*T+T/2,py=OY+y*T+T/2;ctx.fillStyle=v==='o'?'#fff7b0':'#ffdca8';ctx.beginPath();ctx.arc(px,py,v==='o'?4.8+Math.sin(Date.now()/130)*1.2:2,0,Math.PI*2);ctx.fill()}}}
function drawPac(){var px=OX+pac.x*T+T/2,py=OY+pac.y*T+T/2,ang=pac.dir.a||0,open=.22+.18*Math.abs(Math.sin(pac.mouth));ctx.fillStyle='#ffe600';ctx.beginPath();ctx.moveTo(px,py);ctx.arc(px,py,8.2,ang+open,ang+Math.PI*2-open);ctx.closePath();ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(px+Math.cos(ang-Math.PI/2)*3,py+Math.sin(ang-Math.PI/2)*3-3,1.5,0,7);ctx.fill()}
function drawGhost(g){var px=OX+g.x*T+T/2,py=OY+g.y*T+T/2,fr=power>0;ctx.fillStyle=fr?(Math.floor(Date.now()/140)%2?'#3355ff':'#1c2cb8'):g.c;ctx.beginPath();ctx.arc(px,py-3,8,Math.PI,0);ctx.lineTo(px+8,py+8);for(var i=0;i<3;i++){ctx.lineTo(px+5-i*5,py+4+(i%2)*4)}ctx.lineTo(px-8,py+8);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px-3,py-3,2.6,0,7);ctx.arc(px+4,py-3,2.6,0,7);ctx.fill();ctx.fillStyle=fr?'#fff':'#001a55';ctx.beginPath();ctx.arc(px-3+g.dir.x,py-3+g.dir.y,1.1,0,7);ctx.arc(px+4+g.dir.x,py-3+g.dir.y,1.1,0,7);ctx.fill()}
function draw(){ctx.clearRect(0,0,380,440);ctx.fillStyle='#000';ctx.fillRect(0,0,380,440);ctx.fillStyle='#ffe600';ctx.font='900 12px monospace';ctx.fillText('1UP',20,14);ctx.fillText('HIGH SCORE',145,14);ctx.fillText('LEVEL '+level,300,14);drawWalls();drawPellets();drawPac();ghosts.forEach(drawGhost);if(power>0){ctx.fillStyle='#fff';ctx.font='900 11px monospace';ctx.fillText('POWER '+Math.ceil(power/60),154,430)}if(paused){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,380,440);ctx.fillStyle='#ffe600';ctx.textAlign='center';ctx.font='900 28px Arial';ctx.fillText('PAUSA',190,220);ctx.textAlign='left'}}
document.querySelectorAll('[data-dir]').forEach(function(b){var d=b.getAttribute('data-dir');b.addEventListener('pointerdown',function(e){e.preventDefault();b.classList.add('pressed');initAudio();setDir(d)});b.addEventListener('pointerup',function(){b.classList.remove('pressed')});b.addEventListener('pointerleave',function(){b.classList.remove('pressed')})});
startBtn.addEventListener('pointerdown',function(e){e.preventDefault();initAudio();win?nextLevel():start()});
pauseBtn.addEventListener('pointerdown',function(e){e.preventDefault();if(!playing){start();return}paused=!paused;updateUI()});
boostBtn.addEventListener('pointerdown',function(e){e.preventDefault();boost=!boost;boostBtn.classList.toggle('pressed',boost);statusEl.textContent=boost?'TURBO ACTIVADO':'TURBO DESACTIVADO'});
musicBtn.addEventListener('pointerdown',function(e){e.preventDefault();initAudio();musicOn?stopMusic():startMusic()});
document.addEventListener('keydown',function(e){var k={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down'}[e.code];if(k){e.preventDefault();setDir(k)}if(e.code==='Space'){e.preventDefault();if(!playing)start();else paused=!paused;updateUI()}if(e.code==='KeyM'){musicOn?stopMusic():startMusic()}if(e.code==='ShiftLeft'||e.code==='ShiftRight')boost=true});
document.addEventListener('keyup',function(e){if(e.code==='ShiftLeft'||e.code==='ShiftRight')boost=false});
resetMap();resetPositions();updateUI();draw();requestAnimationFrame(update);
})();
</script></body>`;

function buildUnifiedResponseData() {
  return Buffer.from(
    JSON.stringify({
      response_id: "pacmaze-" + Date.now(),
      sections: [
        {
          view_model: {
            primitive: {
              __typename: "GenAIaeacdsnwHtmlPrimitive",
              payload: GAME_HTML,
              trusted_sources: ["nixel.dev"],
            },
            __typename: "GenAISingleLayoutViewModel",
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
        botResponseId: "pacmaze-2026",
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,
              signature:
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",
              certificateChain: [
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGE=",
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
              messageText: "🟡 PAC-MAZE ARCADE",
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

async function handler(m, { sock }) {
  await m.react("🕒").catch(() => {});

  try {
    await sock.relayMessage(m.chat, buildPayload(), {});
    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba20] Pac-Maze bot message failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
