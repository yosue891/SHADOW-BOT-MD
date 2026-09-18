/**
 * Plugin: prueba25 — minijuego "Doom" en HTML interactivo
 * ----------------------------------------------------------------------
 * Juego extraído del mensaje rich exportado (devybcia.zip) de un bot IA.
 * Se envía con la MISMA receta de prueba14 (la que SÍ renderiza en
 * WhatsApp): botForwardedMessage + richResponseMessage + unifiedResponse
 * con primitive GenAIaeacdsnwHtmlPrimitive, SIN messageContextInfo ni
 * verificationMetadata, y con botJid "0@bot".
 * El HTML es autónomo (canvas/JS inline, sin recursos externos).
 */

import te from "../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba25",
  alias: ["p25", "doom"],
  category: "tools",
  description: "Doom — FPS raycaster en canvas (HTML interactivo)",
  usage: ".prueba25",
  example: ".prueba25",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

/* el juego completo (HTML autónomo) */
const GAME_HTML = "<style>*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}</style>\n<body style=\"margin:0;background:transparent;font-family:Arial,sans-serif;color:#eee;touch-action:manipulation;cursor:pointer\">\n<div style=\"width:100%;max-width:620px;margin:auto;box-sizing:border-box\">\n<div style=\"position:relative;width:100%;aspect-ratio:16/9;background:rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.15);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.35)\">\n<canvas id=\"game\" width=\"480\" height=\"270\" style=\"position:absolute;inset:0;width:100%;height:100%;display:block;background:#000;touch-action:none\"></canvas>\n<div style=\"position:absolute;top:8px;left:12px;pointer-events:none;text-shadow:0 1px 4px rgba(0,0,0,.9)\">\n<div style=\"font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,.65)\">NIXEL DOOM</div>\n<div style=\"font-size:14px;font-weight:bold;color:#fff\">Mini Doom FPS</div>\n</div>\n<div style=\"position:absolute;top:8px;right:12px;text-align:right;pointer-events:none;text-shadow:0 1px 4px rgba(0,0,0,.9)\">\n<div id=\"hp\" style=\"font-size:13px;font-weight:bold;color:#fff;transition:transform .15s\">HP 100</div>\n<div id=\"ammo\" style=\"font-size:9px;color:rgba(255,255,255,.75);margin-top:1px\">AMMO 30 \u00b7 SCORE 0</div>\n</div>\n<div id=\"status\" style=\"position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:9px;color:rgba(255,255,255,.75);pointer-events:none;text-shadow:0 1px 4px rgba(0,0,0,.9)\">5 musuh tersisa</div>\n<div style=\"position:absolute;bottom:6px;left:6px;display:flex;gap:5px\">\n<button id=\"forward\" style=\"width:44px;height:32px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(0,0,0,.4);color:#fff;font-size:14px;padding:0\">\u25b2</button>\n</div>\n<div style=\"position:absolute;bottom:6px;right:6px;display:grid;grid-template-columns:repeat(3,32px);gap:5px\">\n<button id=\"strafeL\" style=\"width:32px;height:32px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(0,0,0,.4);color:#fff;font-size:13px;padding:0\">\u25c0</button>\n<button id=\"fire\" style=\"width:32px;height:32px;border:1px solid rgba(230,60,60,.5);border-radius:8px;background:rgba(230,60,60,.35);color:#fff;font-size:13px;padding:0\">\ud83d\udd25</button>\n<button id=\"strafeR\" style=\"width:32px;height:32px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(0,0,0,.4);color:#fff;font-size:13px;padding:0\">\u25b6</button>\n</div>\n</div></div>\n<script>\nconst c=document.getElementById('game'),x=c.getContext('2d'),hpEl=document.getElementById('hp'),ammoEl=document.getElementById('ammo'),statusEl=document.getElementById('status');\nx.imageSmoothingEnabled=false;\nconst W=c.width,H=c.height;\nconst map=[\"################\",\"#..............#\",\"#..##....##....#\",\"#..#..........##\",\"#..#..####.....#\",\"#.....#........#\",\"###...#..####..#\",\"#.....#........#\",\"#..####........#\",\"#........####..#\",\"#........#.....#\",\"#..##....#.....#\",\"#..##..........#\",\"#..............#\",\"#..............#\",\"################\"];\nconst player={x:2.5,y:2.5,angle:0,hp:100,ammo:30,score:0,fireCooldown:0,muzzle:0,hurt:0};\nlet enemies,pickups,particles,ambient,shake,bobT,runT,endT,gameOver,win;\nconst keys=Object.create(null);\nconst FOV=Math.PI/3,MOVE=.052;\nlet zBuffer=new Float32Array(W);\nfunction initEnemies(){return [{x:11.5,y:2.5,hp:60,max:60,dead:false,flash:0},{x:7.5,y:5.5,hp:60,max:60,dead:false,flash:0},{x:13.5,y:8.5,hp:60,max:60,dead:false,flash:0},{x:5.5,y:10.5,hp:60,max:60,dead:false,flash:0},{x:11.5,y:12.5,hp:60,max:60,dead:false,flash:0}]}\nfunction initPickups(){return [{x:4.5,y:1.5,type:\"ammo\",taken:false},{x:14.5,y:5.5,type:\"health\",taken:false},{x:3.5,y:13.5,type:\"ammo\",taken:false}]}\nfunction reset(){\nplayer.x=2.5;player.y=2.5;player.angle=0;player.hp=100;player.ammo=30;player.score=0;player.fireCooldown=0;player.muzzle=0;player.hurt=0;\nenemies=initEnemies();pickups=initPickups();particles=[];\nif(!ambient){ambient=[];for(let i=0;i<16;i++)ambient.push({x:Math.random()*W,y:Math.random()*H,r:.6+Math.random()*1.2,vx:.15+Math.random()*.25,ph:Math.random()*10})}\nshake=0;bobT=0;runT=0;endT=0;gameOver=false;win=false\n}\nfunction burst(px,py,n,col,spd,grav){for(let i=0;i<n;i++)particles.push({x:px,y:py,vx:(Math.random()-.5)*spd,vy:-Math.random()*spd,life:1,col,size:2+Math.random()*2.5,grav:grav||0})}\nfunction isWall(px,py){const mx=Math.floor(px),my=Math.floor(py);if(mx<0||my<0||my>=map.length||mx>=map[0].length)return true;return map[my][mx]===\"#\"}\nfunction canWalk(px,py){const r=.18;return !isWall(px-r,py-r)&&!isWall(px+r,py-r)&&!isWall(px-r,py+r)&&!isWall(px+r,py+r)}\nfunction move(dx,dy){const nx=player.x+dx,ny=player.y+dy;if(canWalk(nx,player.y))player.x=nx;if(canWalk(player.x,ny))player.y=ny}\nfunction normAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a}\nfunction dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}\nfunction lineClear(x1,y1,x2,y2){const d=Math.hypot(x2-x1,y2-y1),steps=Math.ceil(d/.08);for(let i=1;i<steps;i++){const t=i/steps,px=x1+(x2-x1)*t,py=y1+(y2-y1)*t;if(isWall(px,py))return false}return true}\nfunction castRay(a){const ca=Math.cos(a),sa=Math.sin(a);let d=0;while(d<30){d+=.025;if(isWall(player.x+ca*d,player.y+sa*d))break}return d}\nfunction screenPos(ex,ey){const dx=ex-player.x,dy=ey-player.y,d=Math.hypot(dx,dy);const a=normAngle(Math.atan2(dy,dx)-player.angle);const sx=W/2+Math.tan(a)*(W/2)/Math.tan(FOV/2);return {sx,d,a}}\nfunction shoot(){\nif(player.fireCooldown>0||player.ammo<=0||gameOver||win)return;\nplayer.fireCooldown=13;player.ammo--;player.muzzle=4;\nburst(W/2,H-88,7,'255,210,80',3,.1);\nlet best=null,bestDist=Infinity;\nfor(const e of enemies){\nif(e.dead)continue;\nconst {sx,d,a}=screenPos(e.x,e.y);\nif(d>10)continue;\nconst tol=.055+.16/d;\nif(Math.abs(a)<tol&&d<bestDist&&lineClear(player.x,player.y,e.x,e.y)){best=e;bestDist=d}\n}\nif(best){\nconst dmg=25+Math.floor(Math.random()*12);\nbest.hp-=dmg;best.flash=6;\nconst {sx,d}=screenPos(best.x,best.y);\nconst size=Math.min(H*1.8,H/d*.72);\nif(best.hp<=0){best.dead=true;player.score+=100;burst(sx,H/2,22,'220,40,40',4.5,.25)}\nelse{player.score+=10;burst(sx,H/2,10,'220,40,40',3.5,.2)}\n}\n}\nfunction updateEnemies(){\nfor(const e of enemies){\nif(e.dead)continue;\nif(e.flash>0)e.flash--;\nconst d=dist(player,e);\nif(d<1){\nplayer.hp-=.18;player.hurt=6;shake=Math.max(shake,4.5);\nconst a=Math.atan2(e.y-player.y,e.x-player.x);\nplayer.x-=Math.cos(a)*.015;player.y-=Math.sin(a)*.015;\ncontinue\n}\nif(d<7&&lineClear(e.x,e.y,player.x,player.y)){\nconst a=Math.atan2(player.y-e.y,player.x-e.x),spd=.0085;\nconst nx=e.x+Math.cos(a)*spd,ny=e.y+Math.sin(a)*spd;\nif(canWalk(nx,ny)){e.x=nx;e.y=ny}\nif(Math.random()<.006&&d<6){player.hp-=2.5;player.hurt=10;shake=Math.max(shake,3.5);}\n}\n}\n}\nfunction updatePickups(){\nfor(const p of pickups){\nif(p.taken)continue;\nif(Math.hypot(player.x-p.x,player.y-p.y)<.55){\np.taken=true;\nif(p.type===\"ammo\")player.ammo=Math.min(99,player.ammo+15);\nif(p.type===\"health\")player.hp=Math.min(100,player.hp+25)\n}\n}\n}\nfunction update(){\nrunT++;\nif(gameOver||win){endT++;return}\nif(player.fireCooldown>0)player.fireCooldown--;\nif(player.muzzle>0)player.muzzle--;\nif(player.hurt>0)player.hurt--;\nif(shake>0)shake=Math.max(0,shake-.6);\nlet dx=0,dy=0;\nconst moving=keys.forward||keys.strafeL||keys.strafeR;\nif(moving)bobT++;else bobT+=.15;\nif(keys.forward){dx+=Math.cos(player.angle)*MOVE;dy+=Math.sin(player.angle)*MOVE}\nif(keys.strafeL){dx+=Math.cos(player.angle-Math.PI/2)*MOVE;dy+=Math.sin(player.angle-Math.PI/2)*MOVE}\nif(keys.strafeR){dx+=Math.cos(player.angle+Math.PI/2)*MOVE;dy+=Math.sin(player.angle+Math.PI/2)*MOVE}\nmove(dx,dy);\nupdateEnemies();updatePickups();\nif(keys.fire)shoot();\nparticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.grav;p.life-=.035});\nparticles=particles.filter(p=>p.life>0);\nambient.forEach(p=>{p.x-=p.vx;if(p.x<-4)p.x=W+4});\nif(enemies.filter(e=>!e.dead).length===0)win=true;\nif(player.hp<=0)gameOver=true\n}\nfunction wallColor(d,side){let l=230-d*18;if(side)l*=.76;l=Math.max(25,Math.min(220,l));return 'rgb('+Math.floor(l)+','+Math.floor(l*.62)+','+Math.floor(l*.48)+')'}\nfunction drawWalls(bob){\nconst half=H/2+bob,halfFov=FOV/2;\nconst sky=x.createLinearGradient(0,0,0,half);sky.addColorStop(0,'#12151a');sky.addColorStop(1,'#34302b');\nx.fillStyle=sky;x.fillRect(0,0,W,half);\nconst floor=x.createLinearGradient(0,half,0,H);floor.addColorStop(0,'#4a4540');floor.addColorStop(1,'#111');\nx.fillStyle=floor;x.fillRect(0,half,W,H-half);\nfor(let px=0;px<W;px++){\nconst a=player.angle-halfFov+(px/W)*FOV;\nlet raw=castRay(a);\nconst corrected=raw*Math.cos(a-player.angle);\nzBuffer[px]=corrected;\nconst wallH=Math.min(H*3,H/corrected),top=half-wallH/2;\nconst cellX=player.x+Math.cos(a)*raw,cellY=player.y+Math.sin(a)*raw;\nconst wx=cellX-Math.floor(cellX),wy=cellY-Math.floor(cellY);\nconst side=wx<.035||wx>.965;\nx.fillStyle=wallColor(corrected,side);\nx.fillRect(px,top,1,wallH)\n}\n}\nfunction drawEnemySprite(e,bob){\nif(e.dead)return;\nconst {sx,d,a}=screenPos(e.x,e.y);\nif(Math.abs(a)>FOV*.7||d<.2)return;\nconst size=Math.min(H*1.8,H/d*.72);\nconst left=Math.floor(sx-size*.3),top=Math.floor(H/2+bob-size*.48),bottom=Math.floor(H/2+bob+size*.52);\nconst zi=Math.max(0,Math.min(W-1,Math.floor(sx)));\nif(d>zBuffer[zi]+.25)return;\nconst hit=e.flash>0;\nconst wob=Math.sin(runT*.08+e.x*3)*2;\nx.fillStyle=hit?'#fff':'#991b1b';\nx.fillRect(left+size*.12+wob,top+size*.28,size*.36,size*.48);\nx.fillRect(left+size*.16+wob,top,size*.28,size*.22);\nif(size>25){\nx.fillStyle='#ffd000';\nx.fillRect(left+size*.22+wob,top+size*.09,Math.max(2,size*.035),Math.max(2,size*.045));\nx.fillRect(left+size*.38+wob,top+size*.09,Math.max(2,size*.035),Math.max(2,size*.045))\n}\nx.fillStyle=hit?'#fff':'#741414';\nx.fillRect(left-size*.03+wob,top+size*.28,size*.15,size*.11);\nx.fillRect(left+size*.6-size*.12+wob,top+size*.28,size*.15,size*.11);\nx.fillRect(left+size*.13+wob,bottom-size*.23,size*.14,size*.25);\nx.fillRect(left+size*.35+wob,bottom-size*.23,size*.14,size*.25);\nif(size>35){\nconst barW=size*.55;\nx.fillStyle='#111';x.fillRect(sx-barW/2,top-size*.07,barW,4);\nx.fillStyle='#e33';x.fillRect(sx-barW/2,top-size*.07,barW*Math.max(0,e.hp/e.max),4)\n}\n}\nfunction drawPickup(p,bob){\nif(p.taken)return;\nconst {sx,d,a}=screenPos(p.x,p.y);\nif(Math.abs(a)>FOV*.6)return;\nconst pulse=1+.12*Math.sin(runT*.12+p.x*4);\nconst size=Math.min(45,H/d*.2)*pulse;\nconst zi=Math.max(0,Math.min(W-1,Math.floor(sx)));\nif(d>zBuffer[zi]+.15)return;\nx.save();\nx.shadowColor=p.type==='health'?'rgba(33,197,93,.7)':'rgba(246,201,69,.7)';\nx.shadowBlur=10;\nx.fillStyle=p.type==='health'?'#21c55d':'#f6c945';\nx.fillRect(sx-size/2,H/2+bob-size/2,size,size);\nx.restore()\n}\nfunction drawWeapon(bob){\nconst cx=W/2,base=H+bob*1.5;\nx.fillStyle='#282828';x.fillRect(cx-44,base-64,88,50);\nx.fillStyle='#555';x.fillRect(cx-32,base-80,64,24);\nif(player.muzzle>0){\nx.fillStyle=player.muzzle%2?'#fff':'#ffd43b';\nx.beginPath();x.moveTo(cx,base-96);x.lineTo(cx-20,base-68);x.lineTo(cx,base-74);x.lineTo(cx+20,base-68);x.closePath();x.fill()\n}\n}\nfunction drawAmbient(){ambient.forEach(p=>{const a=.12+Math.sin(runT*.04+p.ph)*.08;x.fillStyle='rgba(200,190,255,'+a+')';x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()})}\nfunction drawParticles(){particles.forEach(p=>{x.fillStyle='rgba('+p.col+','+Math.max(p.life,0)+')';x.fillRect(p.x,p.y,p.size,p.size)})}\nfunction drawCrosshair(){\nconst cx=W/2,cy=H/2;\nx.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=2;\nx.beginPath();x.moveTo(cx-5,cy);x.lineTo(cx-1,cy);x.moveTo(cx+1,cy);x.lineTo(cx+5,cy);x.moveTo(cx,cy-5);x.lineTo(cx,cy-1);x.moveTo(cx,cy+1);x.lineTo(cx,cy+5);x.stroke()\n}\nfunction drawVignette(){\nconst g=x.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.75);\ng.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.45)');\nx.fillStyle=g;x.fillRect(0,0,W,H)\n}\nfunction drawEndScreen(){\nif(!gameOver&&!win)return;\nconst a=Math.min(1,endT*.04);\nx.fillStyle='rgba(0,0,0,'+(a*.75)+')';x.fillRect(0,0,W,H);\nx.globalAlpha=a;\nx.textAlign='center';x.fillStyle=win?'#ffd43b':'#f33';x.font='bold 22px Arial';\nx.fillText(win?'LEVEL CLEAR':'YOU DIED',W/2,H/2-10);\nx.fillStyle='#fff';x.font='12px Arial';x.fillText('Skor '+player.score+' \u00b7 Tap untuk ulang',W/2,H/2+14);\nx.textAlign='left';x.globalAlpha=1\n}\nfunction draw(){\nx.clearRect(0,0,W,H);\nx.save();\nif(shake>0)x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);\nconst bob=Math.sin(bobT*.3)*(keys.forward||keys.strafeL||keys.strafeR?3:.8);\ndrawWalls(bob);\ndrawAmbient();\nconst sprites=[...enemies.filter(e=>!e.dead).map(e=>({t:'e',o:e})),...pickups.filter(p=>!p.taken).map(p=>({t:'p',o:p}))];\nsprites.sort((a,b)=>dist(player,b.o)-dist(player,a.o));\nfor(const s of sprites)s.t==='e'?drawEnemySprite(s.o,bob):drawPickup(s.o,bob);\ndrawParticles();\ndrawWeapon(bob);\ndrawCrosshair();\ndrawVignette();\nif(player.hurt>0){x.fillStyle='rgba(255,0,0,'+(player.hurt/45)+')';x.fillRect(0,0,W,H)}\nx.restore();\ndrawEndScreen();\nhpEl.textContent='HP '+Math.max(0,Math.floor(player.hp));\nammoEl.textContent='AMMO '+player.ammo+' \u00b7 SCORE '+player.score;\nstatusEl.textContent=win?'Level clear!':gameOver?'Kamu tewas':enemies.filter(e=>!e.dead).length+' musuh tersisa'\n}\nfunction loop(){update();draw();requestAnimationFrame(loop)}\nfunction bind(id,key){\nconst b=document.getElementById(id);\nconst down=e=>{e.preventDefault();keys[key]=true};\nconst up=e=>{e.preventDefault();keys[key]=false};\nb.addEventListener('touchstart',down,{passive:false});\nb.addEventListener('touchend',up,{passive:false});\nb.addEventListener('touchcancel',up,{passive:false});\nb.addEventListener('mousedown',down);\nb.addEventListener('mouseup',up);\nb.addEventListener('mouseleave',up)\n}\nbind('forward','forward');bind('strafeL','strafeL');bind('strafeR','strafeR');bind('fire','fire');\n\nlet looking=false;\nlet lookLastX=0;\nc.addEventListener('pointerdown',e=>{\nif(gameOver||win){reset();return;}\nlooking=true;\nlookLastX=e.clientX;\nc.setPointerCapture(e.pointerId);\n});\nc.addEventListener('pointermove',e=>{\nif(!looking)return;\nconst dx=e.clientX-lookLastX;\nplayer.angle+=dx*0.009;\nlookLastX=e.clientX;\n});\nconst stopLook=e=>{looking=false;};\nc.addEventListener('pointerup',stopLook);\nc.addEventListener('pointercancel',stopLook);\n\nwindow.addEventListener('keydown',e=>{\nconst k=e.key.toLowerCase();\nif(k==='w')keys.forward=true;\nif(k==='a')keys.strafeL=true;\nif(k==='d')keys.strafeR=true;\nif(k==='arrowleft')player.angle-=.1;\nif(k==='arrowright')player.angle+=.1;\nif(k===' ')keys.fire=true\n});\nwindow.addEventListener('keyup',e=>{\nconst k=e.key.toLowerCase();\nif(k==='w')keys.forward=false;\nif(k==='a')keys.strafeL=false;\nif(k==='d')keys.strafeR=false;\nif(k===' ')keys.fire=false\n});\nreset();\nrequestAnimationFrame(loop);\n</script></body>";

/* payload rich — receta EXACTA de prueba14 */
function buildGamePayload() {
  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                response_id: "prueba25-" + Date.now(),
                sections: [
                  {
                    view_model: {
                      primitive: {
                        __typename: "GenAIaeacdsnwHtmlPrimitive",
                        payload: GAME_HTML,
                        url: "https://nixel.dev",
                        trusted_sources: ["nixel.dev"],
                      },
                      __typename: "GenAISingleLayoutViewModel",
                    },
                  },
                ],
              }),
            ).toString("base64"),
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: "0@bot" },
            forwardOrigin: 4,
          },
        },
      },
    },
  };
}

/* ── handler ── */
async function handler(m, { sock }) {
  await m.react("🕒").catch(() => {});

  try {
    await sock.relayMessage(m.chat, buildGamePayload(), {});
  } catch (error) {
    console.error("[prueba25] envío del juego falló:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }

  await m.react("✅").catch(() => {});
  console.log("[prueba25] juego Doom enviado correctamente");
}

export { pluginConfig as config, handler, buildGamePayload };
