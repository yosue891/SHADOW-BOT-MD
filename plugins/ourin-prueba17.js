import te from "../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba17",
  alias: ["tetris"],
  category: "games",
  description: "Enviar Tetris clásico jugable vía bot message",
  usage: ".prueba17",
  example: ".prueba17",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Opcional: canción de fondo en base64 (ej: "data:audio/mpeg;base64,AAAA...")
// Si se deja vacío, el audio no tendrá src y el botón de música no reproducirá nada.
const MENU_SONG_BASE64 = "";

const GAME_HTML = `<style>*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}</style>
<body style="margin:0;background:#0d0e15;font-family:'Courier New',Courier,monospace;color:#eee;touch-action:manipulation;cursor:pointer">
<div style="width:100%;max-width:440px;margin:auto;padding:12px;box-sizing:border-box">
<div style="background:rgba(255,255,255,.05);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:2px solid rgba(108,92,231,.4);border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.6)">

  <!-- Encabezado título arcade -->
  <div style="padding:14px 18px;background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:10px;letter-spacing:2px;color:#a29bfe;font-weight:bold">RETRO ARCADE CLASSIC</div>
      <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:1px;text-shadow:0 0 12px #6c5ce7">TETRIS</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:9px;color:rgba(255,255,255,.4)">RÉCORD</div>
      <div id="best" style="font-size:15px;font-weight:bold;color:#feca57">000000</div>
    </div>
  </div>

  <!-- Layout del juego: canvas de la cuadrícula + panel lateral de stats -->
  <div style="padding:14px;display:flex;gap:12px;align-items:flex-start;justify-content:center">

    <!-- Cuadrícula principal de Tetris (10x20) -->
    <div style="position:relative">
      <canvas id="tetris" width="200" height="400" style="width:200px;height:400px;background:#000;border:2px solid rgba(255,255,255,.2);border-radius:8px;display:block;box-shadow:0 0 20px rgba(0,0,0,.8)"></canvas>
    </div>

    <!-- Panel lateral: stats y vista previa de la pieza siguiente -->
    <div style="flex:1;display:flex;flex-direction:column;gap:10px">

      <!-- Caja de puntos en vivo -->
      <div style="background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#a1a1aa;font-weight:bold;letter-spacing:1px">PUNTOS</div>
        <div id="score" style="font-size:16px;font-weight:bold;color:#54a0ff;margin-top:2px;text-shadow:0 0 8px rgba(84,160,255,.6)">000000</div>
      </div>

      <!-- Caja de pieza siguiente -->
      <div style="background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#a1a1aa;font-weight:bold;letter-spacing:1px">SIGUIENTE</div>
        <canvas id="next" width="80" height="80" style="width:80px;height:80px;background:#0a0a10;border-radius:6px;display:block;margin:6px auto 0 auto;border:1px solid rgba(255,255,255,.1)"></canvas>
      </div>

      <!-- Caja de líneas -->
      <div style="background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#a1a1aa;font-weight:bold;letter-spacing:1px">LÍNEAS</div>
        <div id="lines" style="font-size:15px;font-weight:bold;color:#1dd1a1;margin-top:2px">000</div>
      </div>

      <!-- Caja de nivel -->
      <div style="background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#a1a1aa;font-weight:bold;letter-spacing:1px">NIVEL</div>
        <div id="level" style="font-size:15px;font-weight:bold;color:#ff9f43;margin-top:2px">01</div>
      </div>

    </div>
  </div>

  <!-- Audio: media/menu.mp3 -->
  <audio id="tetrisBgm"${MENU_SONG_BASE64 ? ` src="${MENU_SONG_BASE64}"` : ""} loop preload="auto"></audio>

  <!-- Panel de controles -->
  <div style="padding:0 14px 14px 14px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
    <button style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:11px 4px;border-radius:8px;font-size:11px;font-weight:bold;cursor:pointer;text-align:center" type="button" onclick="playerMove(-1)">⬅️ IZQ</button>
    <button style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:11px 4px;border-radius:8px;font-size:11px;font-weight:bold;cursor:pointer;text-align:center" type="button" onclick="playerRotate()">🔄 GIRAR</button>
    <button style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:11px 4px;border-radius:8px;font-size:11px;font-weight:bold;cursor:pointer;text-align:center" type="button" onclick="playerMove(1)">DER ➡️</button>
    <button style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:11px 4px;border-radius:8px;font-size:11px;font-weight:bold;cursor:pointer;text-align:center" type="button" onclick="playerDrop()">⬇️ CAER</button>

    <button id="bgmBtn" style="grid-column:span 2;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;margin-top:2px;padding:11px;font-size:10px;font-weight:bold;border-radius:8px;cursor:pointer" type="button">🎵 MÚSICA BGM: OFF</button>
    <button style="grid-column:span 2;background:#6c5ce7;border:none;color:#fff;margin-top:2px;padding:11px;font-size:11px;font-weight:bold;border-radius:8px;cursor:pointer;box-shadow:0 4px 14px rgba(108,92,231,.4)" type="button" onclick="restartGame()">REINICIAR JUEGO 🔄</button>
  </div>

</div>
</div>

<script>
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const bgmBtn = document.getElementById('bgmBtn');
const bgmAudio = document.getElementById('tetrisBgm');

bgmAudio.volume = 0.55;

const BLOCK_SIZE = 20;
let best = 0;
let gameOver = false;
let nextPieceMatrix = null;

// Sintetizador con Web Audio API para efectos de sonido
let audioCtx = null;
function getAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(audioCtx.state === 'suspended'){
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, duration = 0.15, type = 'square', vol = 0.15){
  try {
    const c = getAudio();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start();
    osc.stop(c.currentTime + duration + 0.02);
  } catch(e) {}
}

function toggleBGM() {
  getAudio();
  if (bgmAudio.paused) {
    bgmAudio.play().then(() => {
      bgmBtn.textContent = '🎵 MÚSICA BGM: ON';
    }).catch(err => {
      bgmAudio.load();
      bgmAudio.play().then(() => {
        bgmBtn.textContent = '🎵 MÚSICA BGM: ON';
      }).catch(e => {});
    });
  } else {
    bgmAudio.pause();
    bgmBtn.textContent = '🎵 MÚSICA BGM: OFF';
  }
}

if (bgmBtn) {
  bgmBtn.onclick = function() {
    toggleBGM();
  };
}

try { best = parseInt(localStorage.getItem('dino_tetris_best') || '0', 10); } catch(e) {}
bestEl.textContent = String(best).padStart(6, '0');

function saveBest(v) {
  if (v > best) {
    best = v;
    bestEl.textContent = String(best).padStart(6, '0');
    try { localStorage.setItem('dino_tetris_best', String(best)); } catch(e) {}
  }
}

function drawGridLines() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 10; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, 0);
    ctx.lineTo(x * BLOCK_SIZE, 400);
    ctx.stroke();
  }
  for (let y = 0; y <= 20; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK_SIZE);
    ctx.lineTo(200, y * BLOCK_SIZE);
    ctx.stroke();
  }
}

function getGhostPosition() {
  const ghost = {
    pos: { x: player.pos.x, y: player.pos.y },
    matrix: player.matrix
  };
  while (!collide(arena, ghost)) {
    ghost.pos.y++;
  }
  ghost.pos.y--;
  return ghost;
}

function drawGhostPiece() {
  if (!player.matrix || gameOver) return;
  const ghost = getGhostPosition();
  ghost.matrix.forEach((row, y) => {
    row.forEach((val, x) => {
      if (val !== 0) {
        const px = (x + ghost.pos.x) * BLOCK_SIZE;
        const py = (y + ghost.pos.y) * BLOCK_SIZE;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      }
    });
  });
}

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    rowCount++;
  }

  if (rowCount > 0) {
    // Sistema de puntuación arcade clásico de Tetris
    const lineScores = [0, 100, 300, 500, 800];
    player.score += (lineScores[rowCount] || rowCount * 200) * player.level;
    player.lines += rowCount;
    player.level = Math.floor(player.lines / 10) + 1;
    playTone(880, 0.25, 'triangle', 0.2);
    updateStats();
  }
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  if (type === 'T') return [[0, 1, 0],[1, 1, 1],[0, 0, 0]];
  if (type === 'O') return [[2, 2],[2, 2]];
  if (type === 'L') return [[0, 0, 3],[3, 3, 3],[0, 0, 0]];
  if (type === 'J') return [[4, 0, 0],[4, 4, 4],[0, 0, 0]];
  if (type === 'I') return [[0, 5, 0, 0],[0, 5, 0, 0],[0, 5, 0, 0],[0, 5, 0, 0]];
  if (type === 'S') return [[0, 6, 6],[6, 6, 0],[0, 0, 0]];
  if (type === 'Z') return [[7, 7, 0],[0, 7, 7],[0, 0, 0]];
}

// Colores arcade clásicos auténticos
const colors = [
  null,
  '#a000f0', // T - Morado
  '#f0f000', // O - Amarillo
  '#f0a000', // L - Naranja
  '#0000f0', // J - Azul
  '#00f0f0', // I - Cian
  '#00f000', // S - Verde
  '#f00000'  // Z - Rojo
];

function drawMatrix(matrix, offset, targetCtx = ctx, blockSize = BLOCK_SIZE) {
  matrix.forEach((row, y) => {
    row.forEach((val, x) => {
      if (val !== 0) {
        const px = (x + offset.x) * blockSize;
        const py = (y + offset.y) * blockSize;

        targetCtx.fillStyle = colors[val];
        targetCtx.fillRect(px + 1, py + 1, blockSize - 2, blockSize - 2);

        targetCtx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        targetCtx.fillRect(px + 2, py + 2, blockSize - 4, 3);

        targetCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        targetCtx.lineWidth = 1;
        targetCtx.strokeRect(px + 1, py + 1, blockSize - 2, blockSize - 2);
      }
    });
  });
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPieceMatrix) return;

  const size = 16;
  const offsetX = Math.floor((4 - nextPieceMatrix[0].length) / 2);
  const offsetY = Math.floor((4 - nextPieceMatrix.length) / 2);

  drawMatrix(nextPieceMatrix, { x: offsetX, y: offsetY }, nextCtx, size);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGridLines();
  drawGhostPiece();

  drawMatrix(arena, {x: 0, y: 0});
  if (player.matrix && !gameOver) {
    drawMatrix(player.matrix, player.pos);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff5252';
    ctx.textAlign = 'center';
    ctx.font = '900 20px "Courier New", monospace';
    ctx.fillText('GAME OVER', canvas.width / 2, 180);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px Arial';
    ctx.fillText('Toca REINICIAR para jugar', canvas.width / 2, 210);
    ctx.textAlign = 'left';
  }
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function getRandomPiece() {
  const pieces = 'ILJOTSZ';
  return createPiece(pieces[pieces.length * Math.random() | 0]);
}

function playerDrop() {
  if (gameOver) return;
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    player.score += 10; // Puntos extra por caída suave
    playTone(160, 0.08, 'square', 0.12);
    playerReset();
    arenaSweep();
    updateStats();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  if (gameOver) return;
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  } else {
    playTone(320, 0.05, 'square', 0.1);
  }
}

function playerReset() {
  if (!nextPieceMatrix) {
    nextPieceMatrix = getRandomPiece();
  }

  player.matrix = nextPieceMatrix;
  nextPieceMatrix = getRandomPiece();
  drawNextPiece();

  player.pos.y = 0;
  player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

  if (collide(arena, player)) {
    gameOver = true;
    bgmAudio.pause();
    if (bgmBtn) bgmBtn.textContent = '🎵 MÚSICA BGM: OFF';
    playTone(120, 0.4, 'sawtooth', 0.2);
  }
}

function playerRotate() {
  if (gameOver) return;
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -1);
      player.pos.x = pos;
      return;
    }
  }
  playTone(550, 0.06, 'square', 0.1);
}

function rotate(matrix, dir = 1) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

let dropCounter = 0;
let dropInterval = 800;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  if (!gameOver) {
    dropCounter += deltaTime;
    dropInterval = Math.max(80, 800 - (player.level - 1) * 75);

    if (dropCounter > dropInterval) {
      playerDrop();
    }
  }

  draw();
  requestAnimationFrame(update);
}

function updateStats() {
  scoreEl.textContent = String(Math.floor(player.score)).padStart(6, '0');
  linesEl.textContent = String(player.lines).padStart(3, '0');
  levelEl.textContent = String(player.level).padStart(2, '0');
  saveBest(player.score);
}

function restartGame() {
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  gameOver = false;
  nextPieceMatrix = null;
  playTone(440, 0.1, 'square');
  playerReset();
  updateStats();
}

const arena = createMatrix(10, 20);
const player = {
  pos: {x: 0, y: 0},
  matrix: null,
  score: 0,
  lines: 0,
  level: 1
};

window.addEventListener('resize', () => draw());

document.addEventListener('keydown', e => {
  if (gameOver) return;
  if (e.code === 'ArrowLeft') playerMove(-1);
  else if (e.code === 'ArrowRight') playerMove(1);
  else if (e.code === 'ArrowDown') playerDrop();
  else if (e.code === 'ArrowUp' || e.code === 'Space') playerRotate();
});

playerReset();
updateStats();
requestAnimationFrame(update);
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
    console.error("[prueba17] Tetris bot message failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
