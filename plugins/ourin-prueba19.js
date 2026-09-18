import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba19",
  alias: ["doom", "doomstrike"],
  category: "games",
  description: "Enviar Doom Strike 3D (raycasting FPS) vía bot message",
  usage: ".prueba19",
  example: ".prueba19",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const GAME_HTML = `<style>
*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;box-sizing:border-box}body{margin:0;background:transparent;font-family:Arial,sans-serif;color:#e8edf0;touch-action:manipulation}.wrap{width:100%;max-width:620px;margin:auto;padding:16px}.card{background:rgba(25,31,34,.98);border:1px solid rgba(255,255,255,.13);border-radius:16px;overflow:hidden;box-shadow:0 8px 34px rgba(0,0,0,.42)}.head{padding:17px 20px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;align-items:center;gap:12px}.brand{font-size:10px;letter-spacing:1.7px;color:#a87662}.title{font-size:22px;font-weight:900;color:#fff;letter-spacing:.5px}.stats{display:flex;gap:15px;text-align:right}.value{font:700 18px monospace;color:#fff}.label{font-size:8px;color:rgba(255,255,255,.4);letter-spacing:1px}.main{padding:14px}.board{position:relative;background:#090c0d;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden}.board canvas{display:block;width:100%;height:auto}.overlay{position:absolute;inset:0;background:rgba(7,9,10,.84);display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:20px;z-index:5}.overlay.hidden{display:none}.overlay-title{font-size:27px;font-weight:900;letter-spacing:1.5px;color:#f1e8df}.overlay-sub{font-size:11px;line-height:1.7;color:rgba(255,255,255,.58);margin-top:8px}.controls{display:grid;grid-template-columns:1fr 1fr 1fr 1.15fr;gap:7px;margin-top:9px}.button{height:47px;border:1px solid rgba(255,255,255,.15);border-radius:9px;color:#fff;font-weight:bold;font-size:11px;background:rgba(255,255,255,.07);padding:0 8px}.button.active{background:rgba(151,77,52,.55);border-color:rgba(255,144,103,.7)}.fire{background:linear-gradient(135deg,rgba(181,65,39,.88),rgba(112,37,31,.9));border-color:rgba(255,126,87,.75);box-shadow:0 0 17px rgba(204,69,38,.22)}.mode-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.mode-row .button{height:40px}.status{text-align:center;font:10px monospace;color:rgba(255,255,255,.48);margin-top:10px;min-height:12px}.start{margin-top:16px;min-width:140px;background:linear-gradient(135deg,#a9472f,#642823);border-color:#d87555}
.control-deck{display:grid;grid-template-columns:2.4fr 1fr;gap:8px;margin-top:9px}.dpad{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,49px);gap:7px}.dpad .button{height:49px;font-size:20px;padding:0}.control-deck .fire{height:105px;font-size:16px}.button small{display:block;font-size:7px;color:rgba(255,255,255,.48);margin-top:2px;letter-spacing:.5px}.mission-ready{color:#80ffc1!important;border-color:rgba(83,216,148,.5)!important;background:rgba(36,111,73,.32)!important}
.button{touch-action:none;-webkit-touch-callout:none}.button.pressed{transform:translateY(1px);background:rgba(255,255,255,.2);border-color:rgba(255,211,164,.9);box-shadow:0 0 0 2px rgba(255,180,110,.16) inset}
</style>
<body><div class="wrap"><div class="card">
<div class="head"><div><div class="brand">MEGUMIN COMBAT</div><div class="title">DOOM STRIKE</div></div><div class="stats"><div><div class="label">BAJAS</div><div class="value" id="kills">000</div></div><div><div class="label">RÉCORD</div><div class="value" id="best">000</div></div><div><div class="label">VIDAS</div><div class="value" id="lives">3/3</div></div></div></div>
<div class="main"><div class="board" id="board"><canvas id="game" width="560" height="320"></canvas><div class="overlay" id="overlay"><div class="overlay-title" id="overTitle">DOOM STRIKE</div><div class="overlay-sub" id="overSub">LABERINTO ALEATORIO &bull; MONSTRUOS SIGUEN TU RUTA<br>TRES DESPLIEGUES &bull; MOVIMIENTO AUTOMÁTICO O MANUAL</div><button class="button start" id="start">INICIAR MISIÓN</button></div></div>
<div class="control-deck"><div class="dpad"><button class="button" data-hold="strafeLeft">&#9664;<small>STRAFE</small></button><button class="button" data-hold="forward">&#9650;<small>AVANZAR</small></button><button class="button" data-hold="strafeRight">&#9654;<small>STRAFE</small></button><button class="button" data-hold="turnLeft">&#8634;<small>GIRAR</small></button><button class="button" data-hold="back">&#9660;<small>RETROCEDER</small></button><button class="button" data-hold="turnRight">&#8635;<small>GIRAR</small></button></div><button class="button fire" id="fire">DISPARAR</button></div>
<div class="mode-row"><button class="button active" id="auto">AUTO-WALK: ACTIVADO</button><button class="button" id="mission" disabled>MISIÓN 1</button></div>
<div class="status" id="status">TOCA: MANTÉN PARA MOVER &bull; TOCA AUTO-WALK PARA ALTERNAR &bull; ESPACIO / F PARA DISPARAR</div></div></div></div>
<script>
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const board=document.getElementById('board');
const overlay=document.getElementById('overlay');
const overTitle=document.getElementById('overTitle');
const overSub=document.getElementById('overSub');
const startButton=document.getElementById('start');
const fireButton=document.getElementById('fire');
const autoButton=document.getElementById('auto');
const killsEl=document.getElementById('kills');
const bestEl=document.getElementById('best');
const livesEl=document.getElementById('lives');
const statusEl=document.getElementById('status');
const missionEl=document.getElementById('mission');

const keys={turnLeft:false,turnRight:false,strafeLeft:false,strafeRight:false,forward:false,back:false};
const monsterTypes=[
  {name:'IMP',body:'#a94d3c',glow:'#ff765b',eyes:'#ffd65a',hp:1},
  {name:'BRUTE',body:'#676f48',glow:'#b8c66d',eyes:'#ff674f',hp:2},
  {name:'SPECTER',body:'#5e5578',glow:'#aa93e8',eyes:'#85e7ff',hp:1}
];
const MAP_SIZE=15;
const FOV=Math.PI/3;
const RAY_STEP=4;

let maze=[];
let floorCells=[];
let wallDepth=[];
let player={x:1.5,y:1.5,angle:0};
let exitCell={x:13.5,y:13.5};
let enemies=[];
let pickups=[];
let particles=[];
let playing=false;
let autoWalk=true;
let kills=0;
let missionKills=0;
let missionGoal=6;
let mission=1;
let missionWon=false;
let best=0;
let lives=3;
let health=100;
let armor=0;
let pistolAmmo=36;
let minigunAmmo=0;
let weapon='PISTOLA';
let wave=1;
let aim=0;
let travel=0;
let spawnTimer=0;
let pickupTimer=0;
let respawnTimer=0;
let spawnLabel='DESPLIEGUE';
let autoPathTimer=0;
let autoNextCell=null;
let last=0;
let lastShot=0;
let muzzle=0;
let recoil=0;
let damageFlash=0;
let fireHeld=false;
let notice='AUTO-WALK: LENTO';

try{best=parseInt(localStorage.getItem('megumin_doom_best')||'0',10)||0}catch(error){best=0}

function pad(value,size){return String(Math.max(0,Math.floor(value))).padStart(size,'0')}

function updateUI(){
  killsEl.textContent=pad(missionKills,2)+'/'+pad(missionGoal,2);
  bestEl.textContent=pad(best,3);
  livesEl.textContent=lives+'/3';
  autoButton.textContent='AUTO-WALK: '+(autoWalk?'ACTIVADO':'DESACTIVADO');
  autoButton.classList.toggle('active',autoWalk);
  missionEl.textContent='MISIÓN '+mission+' • '+(missionKills>=missionGoal?'SALIDA ABIERTA':'CERRADA');
  missionEl.classList.toggle('mission-ready',missionKills>=missionGoal);
  fireButton.textContent=weapon==='MINIGUN'?'MINIGUN':'DISPARAR';
  const ammo=weapon==='MINIGUN'?minigunAmmo:pistolAmmo;
  statusEl.textContent=notice+' • '+weapon+' '+ammo+' • MISIÓN '+mission+' • '+enemies.length+' HOSTIL'+(enemies.length===1?'':'ES');
}

function generateMaze(){
  maze=Array.from({length:MAP_SIZE},function(){return Array(MAP_SIZE).fill(1)});
  const stack=[[1,1]];
  maze[1][1]=0;
  while(stack.length){
    const current=stack[stack.length-1];
    const directions=[[2,0],[-2,0],[0,2],[0,-2]].sort(function(){return Math.random()-.5});
    let carved=false;
    for(const direction of directions){
      const nx=current[0]+direction[0];
      const ny=current[1]+direction[1];
      if(nx>0&&ny>0&&nx<MAP_SIZE-1&&ny<MAP_SIZE-1&&maze[ny][nx]===1){
        maze[current[1]+direction[1]/2][current[0]+direction[0]/2]=0;
        maze[ny][nx]=0;
        stack.push([nx,ny]);
        carved=true;
        break;
      }
    }
    if(!carved)stack.pop();
  }
  floorCells=[];
  for(let y=1;y<MAP_SIZE-1;y++)for(let x=1;x<MAP_SIZE-1;x++)if(maze[y][x]===0)floorCells.push({x,y});
  const queue=[{x:1,y:1,distance:0}];
  const visited=new Set(['1,1']);
  let farthest=queue[0];
  for(let index=0;index<queue.length;index++){
    const current=queue[index];
    if(current.distance>farthest.distance)farthest=current;
    const neighbors=[[current.x+1,current.y],[current.x-1,current.y],[current.x,current.y+1],[current.x,current.y-1]];
    for(const next of neighbors){
      const key=next[0]+','+next[1];
      if(visited.has(key)||maze[next[1]]?.[next[0]]!==0)continue;
      visited.add(key);
      queue.push({x:next[0],y:next[1],distance:current.distance+1});
    }
  }
  exitCell={x:farthest.x+.5,y:farthest.y+.5};
}

function isWall(x,y){
  const cellX=Math.floor(x);
  const cellY=Math.floor(y);
  return cellX<0||cellY<0||cellX>=MAP_SIZE||cellY>=MAP_SIZE||!maze[cellY]||maze[cellY][cellX]===1;
}

function castRay(angle,maxDistance){
  const limit=maxDistance||18;
  const step=.035;
  const cos=Math.cos(angle);
  const sin=Math.sin(angle);
  let distance=0;
  while(distance<limit){
    distance+=step;
    if(isWall(player.x+cos*distance,player.y+sin*distance))return distance;
  }
  return limit;
}

function normalizeAngle(angle){
  while(angle>Math.PI)angle-=Math.PI*2;
  while(angle<-Math.PI)angle+=Math.PI*2;
  return angle;
}

function movePlayer(amount,angleOffset=0){
  const radius=.19;
  const movementAngle=player.angle+angleOffset;
  const dx=Math.cos(movementAngle)*amount;
  const dy=Math.sin(movementAngle)*amount;
  let moved=false;
  if(!isWall(player.x+dx+Math.sign(dx)*radius,player.y)){
    player.x+=dx;
    moved=true;
  }
  if(!isWall(player.x,player.y+dy+Math.sign(dy)*radius)){
    player.y+=dy;
    moved=true;
  }
  if(moved)travel+=Math.abs(amount)*18;
  return moved;
}

function randomFloorPosition(minimumDistance){
  const minimum=minimumDistance||0;
  const candidates=floorCells.filter(function(cell){
    return Math.hypot(cell.x+.5-player.x,cell.y+.5-player.y)>=minimum;
  });
  const selected=(candidates.length?candidates:floorCells)[Math.floor(Math.random()*(candidates.length||floorCells.length))];
  return {x:selected.x+.5,y:selected.y+.5};
}

function reset(){
  generateMaze();
  player={x:1.5,y:1.5,angle:0};
  enemies=[];
  pickups=[];
  particles=[];
  playing=true;
  autoWalk=true;
  kills=0;
  missionKills=0;
  missionGoal=6;
  mission=1;
  missionWon=false;
  lives=3;
  health=100;
  armor=0;
  pistolAmmo=36;
  minigunAmmo=0;
  weapon='PISTOLA';
  wave=1;
  aim=0;
  travel=0;
  spawnTimer=28;
  pickupTimer=220;
  respawnTimer=48;
  spawnLabel='DESPLIEGUE';
  autoPathTimer=0;
  autoNextCell=null;
  last=0;
  lastShot=0;
  muzzle=0;
  recoil=0;
  damageFlash=0;
  fireHeld=false;
  notice='DESPLIEGUE';
  overlay.classList.add('hidden');
  updateUI();
}

function startNextMission(){
  mission++;
  missionKills=0;
  missionGoal=Math.min(14,5+mission);
  missionWon=false;
  generateMaze();
  player={x:1.5,y:1.5,angle:0};
  enemies=[];
  pickups=[];
  particles=[];
  playing=true;
  health=Math.min(100,health+30);
  armor=Math.min(100,armor+25);
  lives=Math.min(3,lives+1);
  pistolAmmo=Math.min(120,pistolAmmo+24);
  spawnTimer=38;
  pickupTimer=190;
  respawnTimer=48;
  spawnLabel='DESPLIEGUE';
  autoPathTimer=0;
  autoNextCell=null;
  last=0;
  fireHeld=false;
  notice='MISIÓN '+mission+' DESPLIEGUE';
  overlay.classList.add('hidden');
  updateUI();
}

function spawnMonster(){
  const type=monsterTypes[Math.floor(Math.random()*monsterTypes.length)];
  const position=randomFloorPosition(5);
  const level=Math.min(3,Math.floor(kills/7));
  enemies.push({
    type,
    x:position.x,
    y:position.y,
    hp:type.hp+(type.name==='BRUTE'&&level>1?1:0),
    sway:Math.random()*6.28,
    speed:.007+Math.random()*.002+level*.0007,
    hit:0,
    pathTimer:0,
    nextCell:null
  });
}

function enemyScreen(enemy){
  const dx=enemy.x-player.x;
  const dy=enemy.y-player.y;
  const distance=Math.hypot(dx,dy);
  const relative=normalizeAngle(Math.atan2(dy,dx)-player.angle);
  const x=280+Math.tan(relative)*280/Math.tan(FOV/2);
  const scale=Math.max(.12,Math.min(2.15,.92/Math.max(.42,distance)));
  const y=166+scale*20;
  const column=Math.max(0,Math.min(wallDepth.length-1,Math.floor(x/RAY_STEP)));
  const visible=Math.abs(relative)<FOV*.62&&distance<=(wallDepth[column]||18)+.28;
  return {x,y,scale,distance,relative,visible};
}

function pickupScreen(pickup){
  const dx=pickup.x-player.x;
  const dy=pickup.y-player.y;
  const distance=Math.hypot(dx,dy);
  const relative=normalizeAngle(Math.atan2(dy,dx)-player.angle);
  const x=280+Math.tan(relative)*280/Math.tan(FOV/2);
  const scale=Math.max(.13,Math.min(1.45,.7/Math.max(.42,distance)));
  const y=209+scale*26;
  const column=Math.max(0,Math.min(wallDepth.length-1,Math.floor(x/RAY_STEP)));
  const visible=Math.abs(relative)<FOV*.62&&distance<=(wallDepth[column]||18)+.22;
  return {x,y,scale,distance,relative,visible};
}

function exitScreen(){
  const dx=exitCell.x-player.x;
  const dy=exitCell.y-player.y;
  const distance=Math.hypot(dx,dy);
  const relative=normalizeAngle(Math.atan2(dy,dx)-player.angle);
  const x=280+Math.tan(relative)*280/Math.tan(FOV/2);
  const scale=Math.max(.12,Math.min(2.2,1.05/Math.max(.42,distance)));
  const y=174+scale*17;
  const column=Math.max(0,Math.min(wallDepth.length-1,Math.floor(x/RAY_STEP)));
  const visible=Math.abs(relative)<FOV*.62&&distance<=(wallDepth[column]||18)+.3;
  return {x,y,scale,distance,visible};
}

function spawnPickup(kind,worldX,worldY){
  const types={
    VEST:{label:'CHALECO',color:'#5d9ec4'},
    AMMO:{label:'MUNICIÓN',color:'#d9a84d'},
    MEDKIT:{label:'BOTIQUÍN',color:'#cf574f'},
    MINIGUN:{label:'MINIGUN',color:'#9ca8ad'}
  };
  const selected=types[kind]||types.AMMO;
  const position=typeof worldX==='number'&&typeof worldY==='number'
    ? {x:worldX,y:worldY}
    : randomFloorPosition(3);
  pickups.push({
    kind:types[kind]?kind:'AMMO',
    label:selected.label,
    color:selected.color,
    x:position.x,
    y:position.y
  });
}

function collectPickup(pickup){
  const index=pickups.indexOf(pickup);
  if(index!==-1)pickups.splice(index,1);
  if(pickup.kind==='VEST'){
    armor=Math.min(100,armor+50);
    notice='CHALECO +50';
  }else if(pickup.kind==='MEDKIT'){
    health=Math.min(100,health+40);
    notice='SALUD +40';
  }else if(pickup.kind==='MINIGUN'){
    weapon='MINIGUN';
    minigunAmmo=Math.max(minigunAmmo,120);
    notice='MINIGUN OBTENIDA • 120 BALAS';
  }else if(weapon==='MINIGUN'){
    minigunAmmo=Math.min(240,minigunAmmo+60);
    notice='MUNICIONES MINIGUN +60';
  }else{
    pistolAmmo=Math.min(120,pistolAmmo+24);
    notice='MUNICIONES PISTOLA +24';
  }
  const screen=pickupScreen(pickup);
  burst(screen.x,screen.y,pickup.color,14);
  updateUI();
}

function dropPickup(enemy){
  let kind=null;
  if(kills===3||kills%8===0){
    kind='MINIGUN';
  }else if(Math.random()<.34){
    if(health<55)kind='MEDKIT';
    else if(armor<45)kind='VEST';
    else kind=Math.random()<.58?'AMMO':'VEST';
  }
  if(kind)spawnPickup(kind,enemy.x,enemy.y);
}

function burst(x,y,color,count){
  for(let i=0;i<count;i++)particles.push({
    x,
    y,
    vx:(Math.random()-.5)*5,
    vy:(Math.random()-.65)*4,
    life:1,
    size:1+Math.random()*3,
    color
  });
}

function fire(){
  if(!playing||respawnTimer>0)return;
  const now=performance.now();
  const cooldown=weapon==='MINIGUN'?72:230;
  if(now-lastShot<cooldown)return;
  const crosshairX=280+aim*190;
  let pickupTarget=null;
  let pickupDistance=Infinity;
  for(const pickup of pickups){
    const screen=pickupScreen(pickup);
    const distance=Math.abs(screen.x-crosshairX);
    if(screen.visible&&distance<22+screen.scale*25&&screen.distance<pickupDistance){
      pickupTarget=pickup;
      pickupDistance=screen.distance;
    }
  }
  if(pickupTarget){
    collectPickup(pickupTarget);
    return;
  }
  if(weapon==='MINIGUN'&&minigunAmmo<=0){
    weapon='PISTOLA';
    notice='MINIGUN SIN MUNICIÓN • PISTOLA LISTA';
    updateUI();
    return;
  }
  if(weapon==='PISTOLA'&&pistolAmmo<=0){
    notice='SIN MUNICIONES • BUSCA UN OBJETO';
    updateUI();
    return;
  }
  lastShot=now;
  muzzle=weapon==='MINIGUN'?3:5;
  recoil=weapon==='MINIGUN'?4:9;
  const damage=weapon==='MINIGUN'?3:1;
  if(weapon==='MINIGUN')minigunAmmo--;
  else pistolAmmo--;
  notice='DISPARO CON '+weapon;
  let target=null;
  let targetDistance=Infinity;
  for(const enemy of enemies){
    const screen=enemyScreen(enemy);
    const hitRadius=18+screen.scale*(weapon==='MINIGUN'?24:18);
    const distance=Math.abs(screen.x-crosshairX);
    if(screen.visible&&distance<hitRadius&&screen.distance<targetDistance){target=enemy;targetDistance=screen.distance}
  }
  if(target){
    target.hp-=damage;
    target.hit=7;
    const screen=enemyScreen(target);
    burst(screen.x,screen.y,target.type.glow,weapon==='MINIGUN'?15:10);
    if(target.hp<=0){
      const index=enemies.indexOf(target);
      if(index!==-1)enemies.splice(index,1);
      kills++;
      missionKills++;
      best=Math.max(best,kills);
      wave=1+Math.floor(kills/6);
      notice=missionKills>=missionGoal?'SALIDA ABIERTA • LLEGA A LA PUERTA VERDE':target.type.name+' ELIMINADO';
      dropPickup(target);
      try{localStorage.setItem('megumin_doom_best',String(best))}catch(error){}
    }else{
      notice='GOLPE EN ARMADURA • '+target.hp+' HP';
    }
  }else{
    notice='DISPARO FALLIDO';
  }
  updateUI();
}

function takeDamage(enemy){
  const screen=enemyScreen(enemy);
  burst(screen.x,screen.y,'#ff533d',18);
  const incoming=32+Math.floor(Math.random()*15);
  const blocked=Math.min(armor,Math.ceil(incoming*.65));
  armor-=blocked;
  health=Math.max(0,health-(incoming-blocked));
  damageFlash=12;
  notice='DAÑO '+(incoming-blocked)+(blocked?' • ARMADURA BLOQUEÓ '+blocked:'');
  if(health<=0)playerDeath();
  else updateUI();
}

function playerDeath(){
  lives--;
  fireHeld=false;
  if(lives<=0){
    gameOver();
    return;
  }
  health=100;
  armor=0;
  pistolAmmo=Math.max(24,pistolAmmo);
  minigunAmmo=0;
  weapon='PISTOLA';
  player={x:1.5,y:1.5,angle:0};
  autoPathTimer=0;
  autoNextCell=null;
  respawnTimer=105;
  spawnLabel='REAPARECIENDO';
  enemies=enemies.filter(function(enemy){return Math.hypot(enemy.x-player.x,enemy.y-player.y)>4});
  notice='REAPARECIENDO • '+lives+' VIDAS RESTANTES';
  updateUI();
}

function gameOver(){
  playing=false;
  missionWon=false;
  best=Math.max(best,kills);
  try{localStorage.setItem('megumin_doom_best',String(best))}catch(error){}
  overTitle.textContent='MISIÓN FALLIDA';
  overSub.textContent='BAJAS '+pad(kills,3)+' • MEJOR '+pad(best,3)+' • TRES VIDAS USADAS';
  startButton.textContent='INTENTAR DE NUEVO';
  overlay.classList.remove('hidden');
  updateUI();
}

function missionComplete(){
  if(missionWon)return;
  playing=false;
  missionWon=true;
  fireHeld=false;
  best=Math.max(best,kills);
  try{localStorage.setItem('megumin_doom_best',String(best))}catch(error){}
  overTitle.textContent='MISIÓN COMPLETADA';
  overSub.textContent='MISIÓN '+mission+' COMPLETADA • '+missionKills+'/'+missionGoal+' BAJAS • SALIDA ALCANZADA';
  startButton.textContent='SIGUIENTE MISIÓN';
  overlay.classList.remove('hidden');
  notice='MISIÓN COMPLETADA';
  updateUI();
}

function findNextMazeCell(fromX,fromY,toX,toY){
  const startX=Math.floor(fromX);
  const startY=Math.floor(fromY);
  const goalX=Math.floor(toX);
  const goalY=Math.floor(toY);
  const startKey=startX+','+startY;
  const goalKey=goalX+','+goalY;
  if(startKey===goalKey)return {x:toX,y:toY};
  const queue=[[startX,startY]];
  const parent=new Map([[startKey,null]]);
  let found=false;
  for(let index=0;index<queue.length&&!found;index++){
    const current=queue[index];
    const neighbors=[[current[0]+1,current[1]],[current[0]-1,current[1]],[current[0],current[1]+1],[current[0],current[1]-1]];
    for(const next of neighbors){
      const key=next[0]+','+next[1];
      if(next[0]<0||next[1]<0||next[0]>=MAP_SIZE||next[1]>=MAP_SIZE||maze[next[1]][next[0]]===1||parent.has(key))continue;
      parent.set(key,current[0]+','+current[1]);
      queue.push(next);
      if(key===goalKey){found=true;break}
    }
  }
  if(!found)return null;
  let stepKey=goalKey;
  while(parent.get(stepKey)&&parent.get(stepKey)!==startKey)stepKey=parent.get(stepKey);
  const parts=stepKey.split(',').map(Number);
  return {x:parts[0]+.5,y:parts[1]+.5};
}

function findNextPathCell(enemy){
  return findNextMazeCell(enemy.x,enemy.y,player.x,player.y);
}

function updateMonster(enemy,dt){
  enemy.pathTimer-=dt;
  if(enemy.pathTimer<=0||!enemy.nextCell){
    enemy.nextCell=findNextPathCell(enemy);
    enemy.pathTimer=18+Math.random()*12;
  }
  const target=enemy.nextCell||player;
  const dx=target.x-enemy.x;
  const dy=target.y-enemy.y;
  const distance=Math.hypot(dx,dy)||1;
  const step=Math.min(distance,enemy.speed*dt);
  enemy.x+=dx/distance*step;
  enemy.y+=dy/distance*step;
  if(distance<.08)enemy.nextCell=null;
  enemy.sway+=.08*dt;
  if(enemy.hit>0)enemy.hit-=dt;
}

function update(dt){
  muzzle=Math.max(0,muzzle-dt);
  recoil=Math.max(0,recoil-.8*dt);
  damageFlash=Math.max(0,damageFlash-dt);
  if(respawnTimer>0){
    respawnTimer=Math.max(0,respawnTimer-dt);
    notice=spawnLabel+' '+Math.max(1,Math.ceil(respawnTimer/60));
    if(respawnTimer===0)notice='ARMA LISTA';
    updateUI();
    return;
  }
  if(keys.turnLeft){player.angle=normalizeAngle(player.angle-.035*dt);aim=0}
  if(keys.turnRight){player.angle=normalizeAngle(player.angle+.035*dt);aim=0}
  if(autoWalk){
    if(missionKills>=missionGoal){
      autoPathTimer-=dt;
      if(autoPathTimer<=0||!autoNextCell){
        autoNextCell=findNextMazeCell(player.x,player.y,exitCell.x,exitCell.y);
        autoPathTimer=12;
      }
      const target=autoNextCell||exitCell;
      const desired=Math.atan2(target.y-player.y,target.x-player.x);
      const turn=normalizeAngle(desired-player.angle);
      player.angle=normalizeAngle(player.angle+Math.max(-.05*dt,Math.min(.05*dt,turn)));
      if(Math.abs(turn)<.7)movePlayer(.012*dt);
      if(Math.hypot(target.x-player.x,target.y-player.y)<.12)autoNextCell=null;
      notice='AUTO-WALK • SIGUIENDO SALIDA';
    }else if(castRay(player.angle)<.48){
      const choices=[-.5*Math.PI,.5*Math.PI,Math.PI].map(function(offset){
        const angle=normalizeAngle(player.angle+offset);
        return {angle,distance:castRay(angle)};
      }).sort(function(a,b){return b.distance-a.distance});
      player.angle=choices[0].angle;
      notice='GIRO AUTO • NUEVO PASILLO';
      movePlayer(.011*dt);
    }else{
      movePlayer(.011*dt);
    }
  }
  if(keys.forward)movePlayer(.027*dt);
  if(keys.back)movePlayer(-.019*dt);
  if(keys.strafeLeft)movePlayer(.022*dt,-Math.PI/2);
  if(keys.strafeRight)movePlayer(.022*dt,Math.PI/2);
  const exitDistance=Math.hypot(exitCell.x-player.x,exitCell.y-player.y);
  if(exitDistance<.5){
    if(missionKills>=missionGoal){missionComplete();return}
    notice='SALIDA BLOQUEADA • '+(missionGoal-missionKills)+' BAJAS RESTANTES';
  }
  if(fireHeld)fire();
  spawnTimer-=dt;
  if(spawnTimer<=0&&enemies.length<5){
    spawnMonster();
    const pressure=Math.min(36,kills*1.15);
    spawnTimer=Math.max(32,83-pressure)+Math.random()*35;
  }
  pickupTimer-=dt;
  if(pickupTimer<=0&&pickups.length<2){
    const kind=health<60?'MEDKIT':armor<45?'VEST':'AMMO';
    spawnPickup(kind);
    pickupTimer=370+Math.random()*150;
}
  for(let i=enemies.length-1;i>=0;i--){
    const enemy=enemies[i];
    updateMonster(enemy,dt);
    if(Math.hypot(enemy.x-player.x,enemy.y-player.y)<.48){
      enemies.splice(i,1);
      takeDamage(enemy);
      if(!playing)return;
    }
  }
  for(let i=pickups.length-1;i>=0;i--){
    const pickup=pickups[i];
    if(Math.hypot(pickup.x-player.x,pickup.y-player.y)<.46)collectPickup(pickup);
  }
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
    p.vy+=.12*dt;
    p.life-=.045*dt;
    if(p.life<=0)particles.splice(i,1);
  }
  updateUI();
}

function polygon(points,fill,stroke){
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
  ctx.fillStyle=fill;
  ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
}

function drawCorridor(){
  const ceiling=ctx.createLinearGradient(0,0,0,160);
  ceiling.addColorStop(0,'#090c0d');
  ceiling.addColorStop(1,'#202020');
  ctx.fillStyle=ceiling;
  ctx.fillRect(0,0,560,160);
  const floor=ctx.createLinearGradient(0,160,0,320);
  floor.addColorStop(0,'#211a16');
  floor.addColorStop(1,'#080909');
  ctx.fillStyle=floor;
  ctx.fillRect(0,160,560,160);
  wallDepth=[];
  let previous=18;
  for(let screenX=0;screenX<560;screenX+=RAY_STEP){
    const rayAngle=player.angle-FOV/2+(screenX/560)*FOV;
    const rawDistance=castRay(rayAngle);
    const distance=Math.max(.05,rawDistance*Math.cos(rayAngle-player.angle));
    wallDepth.push(distance);
    const height=Math.min(360,225/distance);
    const top=160-height/2;
    const shade=Math.max(.16,Math.min(1,1-distance/12));
    const red=Math.floor(93*shade);
    const green=Math.floor(76*shade);
    const blue=Math.floor(67*shade);
    ctx.fillStyle='rgb('+red+','+green+','+blue+')';
    ctx.fillRect(screenX,top,RAY_STEP+1,height);
    if(Math.abs(distance-previous)>.22){
      ctx.fillStyle='rgba(0,0,0,.28)';
      ctx.fillRect(screenX,top,2,height);
    }
    if((screenX/RAY_STEP)%5===0){
      ctx.fillStyle='rgba(255,180,125,'+(shade*.035)+')';
      ctx.fillRect(screenX,top+height*.5,RAY_STEP,height*.025);
    }
    previous=distance;
  }
}

function drawExit(){
  const screen=exitScreen();
  if(!screen.visible)return;
  const open=missionKills>=missionGoal;
  const s=screen.scale;
  ctx.save();
  ctx.translate(screen.x,screen.y);
  ctx.shadowColor=open?'#4dff9b':'#ff5145';
  ctx.shadowBlur=18*s;
  ctx.fillStyle=open?'rgba(28,101,67,.88)':'rgba(101,35,31,.88)';
  ctx.strokeStyle=open?'#65ffae':'#ff655a';
  ctx.lineWidth=3*s;
  ctx.fillRect(-27*s,-46*s,54*s,92*s);
  ctx.strokeRect(-27*s,-46*s,54*s,92*s);
  ctx.fillStyle=open?'#8dffc2':'#ff9a91';
  ctx.font='bold '+Math.max(7,Math.floor(10*s))+'px monospace';
  ctx.textAlign='center';
  ctx.fillText(open?'SALIDA':'CERRADA',0,4*s);
  ctx.shadowBlur=0;
  ctx.restore();
}

function drawMonster(enemy){
  const screen=enemyScreen(enemy);
  if(!screen.visible)return;
  const s=screen.scale;
  const x=screen.x;
  const y=screen.y;
  ctx.save();
  ctx.translate(x,y);
  if(enemy.hit>0){ctx.globalAlpha=.62;ctx.shadowColor='#fff'}else{ctx.shadowColor=enemy.type.glow}
  ctx.shadowBlur=10*s;
  ctx.fillStyle=enemy.hit>0?'#ffffff':enemy.type.body;
  ctx.beginPath();
  ctx.ellipse(0,0,21*s,31*s,0,0,Math.PI*2);
  ctx.fill();
  ctx.fillRect(-16*s,19*s,11*s,24*s);
  ctx.fillRect(5*s,19*s,11*s,24*s);
  polygon([[-18*s,-17*s],[-30*s,-35*s],[-8*s,-25*s]],enemy.type.body);
  polygon([[18*s,-17*s],[30*s,-35*s],[8*s,-25*s]],enemy.type.body);
  ctx.shadowBlur=8*s;
  ctx.fillStyle=enemy.type.eyes;
  ctx.fillRect(-12*s,-8*s,7*s,4*s);
  ctx.fillRect(5*s,-8*s,7*s,4*s);
  ctx.shadowBlur=0;
  ctx.fillStyle='#171313';
  ctx.fillRect(-9*s,5*s,18*s,5*s);
  if(enemy.hp>1){
    ctx.fillStyle='rgba(0,0,0,.58)';
    ctx.fillRect(-22*s,-47*s,44*s,5*s);
    ctx.fillStyle='#d16b4c';
    ctx.fillRect(-21*s,-46*s,Math.min(42,enemy.hp*14)*s,3*s);
  }
  ctx.restore();
}

function drawPickup(pickup){
  const screen=pickupScreen(pickup);
  if(!screen.visible)return;
  const s=screen.scale;
  ctx.save();
  ctx.translate(screen.x,screen.y);
  ctx.shadowColor=pickup.color;
  ctx.shadowBlur=14*s;
  ctx.fillStyle='rgba(12,16,17,.9)';
  ctx.strokeStyle=pickup.color;
  ctx.lineWidth=2*s;
  ctx.fillRect(-23*s,-17*s,46*s,34*s);
  ctx.strokeRect(-23*s,-17*s,46*s,34*s);
  ctx.fillStyle=pickup.color;
  if(pickup.kind==='VEST'){
    polygon([[-14*s,-9*s],[-5*s,-14*s],[0,-8*s],[5*s,-14*s],[14*s,-9*s],[10*s,13*s],[-10*s,13*s]],pickup.color);
  }else if(pickup.kind==='MEDKIT'){
    ctx.fillRect(-4*s,-12*s,8*s,24*s);
    ctx.fillRect(-12*s,-4*s,24*s,8*s);
  }else if(pickup.kind==='MINIGUN'){
    for(let i=-1;i<=1;i++)ctx.fillRect(-15*s,i*6*s,27*s,3*s);
    ctx.fillRect(8*s,-12*s,6*s,24*s);
  }else{
    ctx.fillRect(-13*s,-9*s,8*s,18*s);
    ctx.fillRect(-2*s,-9*s,8*s,18*s);
    ctx.fillRect(9*s,-9*s,8*s,18*s);
  }
  ctx.shadowBlur=0;
  ctx.fillStyle='#fff';
  ctx.font='bold '+Math.max(7,Math.floor(8*s))+'px monospace';
  ctx.textAlign='center';
  ctx.fillText(pickup.label,0,29*s);
  ctx.restore();
}

function drawWeapon(){
  const px=280+aim*46;
  const py=334+recoil;
  ctx.save();
  ctx.translate(px,py);
  ctx.fillStyle='#111416';
  ctx.strokeStyle='#5d6465';
  ctx.lineWidth=2;
  if(weapon==='MINIGUN'){
    polygon([[-55,-6],[-38,-50],[38,-50],[55,-6]],'#2a3032','#788184');
    ctx.fillStyle='#0e1112';
    for(let i=-2;i<=2;i++)ctx.fillRect(i*9-4,-84,7,48);
    ctx.fillStyle='#737d80';
    ctx.fillRect(-28,-42,56,14);
  }else{
    polygon([[-34,-8],[-21,-62],[21,-62],[34,-8]],'#252a2c','#60696b');
    ctx.fillStyle='#0e1112';
    ctx.fillRect(-13,-72,26,38);
    ctx.fillStyle='#747b78';
    ctx.fillRect(-9,-69,18,7);
  }
  if(muzzle>0){
    ctx.shadowColor='#ffb23f';
    ctx.shadowBlur=22;
    const top=weapon==='MINIGUN'?-84:-72;
    polygon([[0,top],[-18,top-29],[0,top-19],[15,top-34],[10,top-7],[26,top-11]],'#ffd15a');
  }
  ctx.restore();
}

function drawBar(x,y,width,value,color,label){
  ctx.fillStyle='rgba(0,0,0,.62)';
  ctx.fillRect(x,y,width,17);
  ctx.fillStyle=color;
  ctx.fillRect(x+2,y+2,(width-4)*Math.max(0,Math.min(100,value))/100,13);
  ctx.fillStyle='#fff';
  ctx.font='bold 9px monospace';
  ctx.textAlign='left';
  ctx.fillText(label+' '+Math.floor(value)+'%',x+5,y+12);
}

function drawHud(){
  drawBar(10,10,112,health,'#a93d35','SALUD');
  drawBar(10,31,112,armor,'#397da4','ARMADURA');
  const ammo=weapon==='MINIGUN'?minigunAmmo:pistolAmmo;
  ctx.fillStyle='rgba(0,0,0,.62)';
  ctx.fillRect(428,10,122,38);
  ctx.fillStyle=weapon==='MINIGUN'?'#ffd15a':'#e8edf0';
  ctx.font='bold 10px monospace';
  ctx.textAlign='right';
  ctx.fillText(weapon,541,25);
  ctx.font='bold 15px monospace';
  ctx.fillText('MUNICIÓN '+pad(ammo,3),541,42);
  ctx.textAlign='left';
}

function drawMiniMap(){
  const scale=3;
  const originX=258;
  const originY=6;
  ctx.fillStyle='rgba(0,0,0,.68)';
  ctx.fillRect(originX-3,originY-3,MAP_SIZE*scale+6,MAP_SIZE*scale+6);
  for(let y=0;y<MAP_SIZE;y++)for(let x=0;x<MAP_SIZE;x++){
    if(maze[y]&&maze[y][x]===1){
      ctx.fillStyle='rgba(125,104,91,.78)';
      ctx.fillRect(originX+x*scale,originY+y*scale,scale,scale);
    }
  }
  for(const pickup of pickups){
    ctx.fillStyle=pickup.color;
    ctx.fillRect(originX+pickup.x*scale-1,originY+pickup.y*scale-1,2,2);
  }
  for(const enemy of enemies){
    ctx.fillStyle='#ff5944';
    ctx.fillRect(originX+enemy.x*scale-1,originY+enemy.y*scale-1,3,3);
  }
  ctx.fillStyle=missionKills>=missionGoal?'#53ff9d':'#ff665c';
  ctx.fillRect(originX+exitCell.x*scale-2,originY+exitCell.y*scale-2,4,4);
  ctx.fillStyle='#7fffd4';
  ctx.beginPath();
  ctx.arc(originX+player.x*scale,originY+player.y*scale,2.4,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='#7fffd4';
  ctx.beginPath();
  ctx.moveTo(originX+player.x*scale,originY+player.y*scale);
  ctx.lineTo(originX+(player.x+Math.cos(player.angle)*2)*scale,originY+(player.y+Math.sin(player.angle)*2)*scale);
  ctx.stroke();
}

function drawCrosshair(){
  const x=280+aim*190;
  const y=153;
  ctx.strokeStyle='rgba(255,231,210,.74)';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(x-15,y);ctx.lineTo(x-5,y);
  ctx.moveTo(x+5,y);ctx.lineTo(x+15,y);
  ctx.moveTo(x,y-15);ctx.lineTo(x,y-5);
  ctx.moveTo(x,y+5);ctx.lineTo(x,y+15);
  ctx.stroke();
  ctx.fillStyle='rgba(255,91,57,.82)';
  ctx.fillRect(x-1,y-1,3,3);
}

function draw(){
  ctx.clearRect(0,0,560,320);
  drawCorridor();
  drawExit();
  const ordered=enemies.slice().sort(function(a,b){
    return Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y);
  });
  for(const enemy of ordered)drawMonster(enemy);
  const orderedPickups=pickups.slice().sort(function(a,b){
    return Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y);
  });
  for(const pickup of orderedPickups)drawPickup(pickup);
  for(const p of particles){
    ctx.globalAlpha=Math.max(0,p.life);
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,p.size,p.size);
  }
  ctx.globalAlpha=1;
  drawCrosshair();
  drawWeapon();
  drawHud();
  drawMiniMap();
  if(respawnTimer>0&&playing){
    ctx.fillStyle='rgba(0,0,0,.58)';
    ctx.fillRect(194,133,172,48);
    ctx.fillStyle='#fff';
    ctx.font='bold 15px monospace';
    ctx.textAlign='center';
    ctx.fillText(spawnLabel,280,154);
    ctx.font='10px monospace';
    ctx.fillText('VIDAS '+lives+'/3',280,171);
    ctx.textAlign='left';
  }
  if(damageFlash>0){
    ctx.fillStyle='rgba(201,35,24,'+(damageFlash/30)+')';
    ctx.fillRect(0,0,560,320);
  }
}

function loop(time){
  if(!last)last=time;
  const dt=Math.min((time-last)/16.67,2);
  last=time;
  if(playing)update(dt);
  draw();
  requestAnimationFrame(loop);
}

function manualOverride(){
  if(!autoWalk)return;
  autoWalk=false;
  autoPathTimer=0;
  autoNextCell=null;
  notice='MOVIMIENTO MANUAL';
  updateUI();
}

function setHold(name,value,button){
  keys[name]=value;
  if(button)button.classList.toggle('pressed',value);
}

document.querySelectorAll('[data-hold]').forEach(function(button){
  const name=button.dataset.hold;
  button.addEventListener('pointerdown',function(event){
    event.preventDefault();
    event.stopPropagation();
    manualOverride();
    if(button.setPointerCapture)button.setPointerCapture(event.pointerId);
    setHold(name,true,button);
  });
  const release=function(event){
    if(event){event.preventDefault();event.stopPropagation()}
    setHold(name,false,button);
  };
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('pointerleave',release);
  button.addEventListener('lostpointercapture',function(){release()});
});

document.addEventListener('contextmenu',function(event){
  if(event.target.closest?.('button,canvas'))event.preventDefault();
});

startButton.addEventListener('pointerdown',function(event){event.preventDefault();event.stopPropagation();missionWon?startNextMission():reset()});
fireButton.addEventListener('pointerdown',function(event){event.preventDefault();event.stopPropagation();if(fireButton.setPointerCapture)fireButton.setPointerCapture(event.pointerId);fireHeld=true;fireButton.classList.add('pressed');fire()});
fireButton.addEventListener('pointerup',function(event){event.preventDefault();event.stopPropagation();fireHeld=false;fireButton.classList.remove('pressed')});
fireButton.addEventListener('pointercancel',function(){fireHeld=false;fireButton.classList.remove('pressed')});
fireButton.addEventListener('pointerleave',function(){fireHeld=false;fireButton.classList.remove('pressed')});
fireButton.addEventListener('lostpointercapture',function(){fireHeld=false;fireButton.classList.remove('pressed')});
autoButton.addEventListener('pointerdown',function(event){
  event.preventDefault();
  event.stopPropagation();
  autoWalk=!autoWalk;
  autoPathTimer=0;
  autoNextCell=null;
  notice=autoWalk?'AUTO-WALK: LENTO':'MOVIMIENTO MANUAL';
  updateUI();
});

board.addEventListener('pointerdown',function(event){
  if(event.target===startButton)return;
  event.preventDefault();
  const rect=canvas.getBoundingClientRect();
  const localX=(event.clientX-rect.left)*(canvas.width/rect.width);
  aim=Math.max(-1,Math.min(1,(localX-280)/190));
  fire();
});

document.addEventListener('keydown',function(event){
  const map={KeyA:'strafeLeft',KeyD:'strafeRight',KeyQ:'turnLeft',ArrowLeft:'turnLeft',KeyE:'turnRight',ArrowRight:'turnRight',KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back'};
  if(map[event.code]){event.preventDefault();manualOverride();keys[map[event.code]]=true}
  if(event.code==='Space'||event.code==='KeyF'){event.preventDefault();fireHeld=true;fire()}
  if(event.code==='KeyR'){event.preventDefault();autoWalk=!autoWalk;autoPathTimer=0;autoNextCell=null;notice=autoWalk?'AUTO-WALK: LENTO':'MOVIMIENTO MANUAL';updateUI()}
});

document.addEventListener('keyup',function(event){
  const map={KeyA:'strafeLeft',KeyD:'strafeRight',KeyQ:'turnLeft',ArrowLeft:'turnLeft',KeyE:'turnRight',ArrowRight:'turnRight',KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back'};
  if(map[event.code])keys[map[event.code]]=false;
  if(event.code==='Space'||event.code==='KeyF')fireHeld=false;
});

document.addEventListener('pointerup',function(){fireHeld=false});

generateMaze();
player={x:1.5,y:1.5,angle:0};
updateUI();
draw();
requestAnimationFrame(loop);
</script></body>`;

function buildUnifiedResponseData() {
  return Buffer.from(
    JSON.stringify({
      response_id: "b2e40280-433c-45d8-9c1a-270bec558860",
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
        botResponseId: "b2e40280-433c-45d8-9c1a-270bec558860",
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,
              signature:
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",
              certificateChain: [
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg",
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ==",
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
              messageText: "@yosoyyo_ofc",
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
    console.error("[prueba19] Doom Strike bot message failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
