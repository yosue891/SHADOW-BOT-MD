/**
 * Plugin: prueba28 — Juego 2048 del bot (nombre dinámico)
 * ----------------------------------------------------------------------
 * Juego 2048 extraído del mensaje rich exportado (kcyowaan.zip). El texto
 * del mensaje usa el NOMBRE DEL BOT (config.bot.name) en vez del crédito.
 * Se envía con la MISMA receta probada (prueba14/25/26/27): botForwardedMessage
 * + richResponseMessage + unifiedResponse con primitive
 * GenAIaeacdsnwHtmlPrimitive, SIN messageContextInfo/botMetadata (el original
 * traía botResponseId, verificationMetadata y botJid 867051314767696@bot, que
 * hacían degradar el mensaje a texto) y con botJid "0@bot".
 * El HTML es autónomo (CSS + JS inline, sin recursos externos; swipe táctil).
 */

import te from "../src/lib/ourin-error.js";
import config from "../config.js";

const pluginConfig = {
  name: "prueba28",
  alias: ["p28", "2048", "alya2048", "game2048"],
  category: "tools",
  description: "Juego 2048 (desliza las fichas, suma hasta 2048)",
  usage: ".prueba28",
  example: ".prueba28",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const BOT_NAME = config.bot?.name || "Kana-Assistant";

/* el juego completo (HTML autónomo) */
const GAME_HTML = "<style>*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;box-sizing:border-box}body{margin:0;background:transparent;font-family:Arial,sans-serif;color:#fff;touch-action:manipulation}.wrap{width:100%;max-width:470px;margin:auto;padding:14px}.card{background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:15px;box-shadow:0 15px 45px rgba(0,0,0,.5);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px)}.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.title small{display:block;font-size:9px;letter-spacing:3px;color:#9b7cff;font-weight:bold}.title b{display:block;font-size:25px;margin-top:2px}.scores{display:flex;gap:6px}.score{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:6px 9px;text-align:center;min-width:65px}.score span{display:block;font-size:8px;color:#8c94a4}.score b{font-size:14px}.board{position:relative;background:#10131b;border:1px solid rgba(255,255,255,.12);border-radius:17px;padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px;aspect-ratio:1/1}.cell{border-radius:11px;background:rgba(255,255,255,.045);display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:900;transition:transform .12s,background .12s,opacity .12s}.v2{background:#242938}.v4{background:#30364a}.v8{background:#59416e}.v16{background:#70466f}.v32{background:#8b4567}.v64{background:#a3485e}.v128{background:#b84d55;font-size:22px}.v256{background:#c55a48;font-size:22px}.v512{background:#d56d43;font-size:21px}.v1024{background:#df8143;font-size:18px}.v2048{background:#e6a044;font-size:18px;box-shadow:0 0 20px rgba(230,160,68,.35)}.controls{margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.btn{height:49px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:linear-gradient(145deg,#252c3c,#171d29);color:#fff;font-size:21px;font-weight:bold;box-shadow:0 5px 14px rgba(0,0,0,.3)}.btn:active{transform:scale(.92)}.empty{visibility:hidden}.down{grid-column:2}.bottom{display:flex;gap:7px;margin-top:8px}.bottom button{flex:1}.restart{background:linear-gradient(135deg,#7c4dff,#536dfe)}.new{background:linear-gradient(135deg,#ec407a,#ab47bc)}.info{text-align:center;color:#70798a;font-size:9px;margin-top:10px;letter-spacing:.6px}.overlay{position:absolute;inset:8px;display:none;align-items:center;justify-content:center;background:rgba(7,9,14,.84);border-radius:10px;text-align:center;z-index:10}.overlay.show{display:flex}.overlay b{display:block;font-size:27px}.overlay span{display:block;margin-top:5px;color:#9da5b5;font-size:11px}</style>\n<body>\n<div class=\"wrap\">\n<div class=\"card\">\n<div class=\"head\">\n<div class=\"title\"><small>ALYA GAME CENTER</small><b>2048</b></div>\n<div class=\"scores\">\n<div class=\"score\"><span>SCORE</span><b id=\"score\">0</b></div>\n<div class=\"score\"><span>BEST</span><b id=\"best\">0</b></div>\n</div>\n</div>\n<div class=\"board\" id=\"board\">\n<div class=\"overlay\" id=\"overlay\"><div><b id=\"ot\">GAME OVER</b><span id=\"os\">Pulsa REINICIAR</span></div></div>\n</div>\n<div class=\"controls\">\n<button class=\"btn empty\"> </button>\n<button class=\"btn\" id=\"up\">\u2191</button>\n<button class=\"btn empty\"> </button>\n<button class=\"btn\" id=\"left\">\u2190</button>\n<button class=\"btn down\" id=\"down\">\u2193</button>\n<button class=\"btn\" id=\"right\">\u2192</button>\n</div>\n<div class=\"bottom\">\n<button class=\"btn restart\" id=\"restart\">\u21bb REINICIAR</button>\n<button class=\"btn new\" id=\"new\">+ NUEVO</button>\n</div>\n<div class=\"info\">DESLIZA O USA \u2190 \u2191 \u2193 \u2192 PARA MOVER LAS PIEZAS</div>\n</div>\n</div>\n<script>\nconst boardEl=document.getElementById('board');\nconst scoreEl=document.getElementById('score');\nconst bestEl=document.getElementById('best');\nconst overlay=document.getElementById('overlay');\nlet grid=[];\nlet score=0;\nlet best=0;\nlet won=false;\nlet gameOver=false;\n\nfunction getBest(){\ntry{return parseInt(localStorage.getItem('alya_2048_best')||'0',10)}catch(e){return 0}\n}\n\nfunction saveBest(){\ntry{localStorage.setItem('alya_2048_best',String(best))}catch(e){}\n}\n\nbest=getBest();\nbestEl.textContent=best;\n\nfunction emptyGrid(){\nreturn Array.from({length:4},()=>[0,0,0,0]);\n}\n\nfunction addTile(){\nlet empty=[];\nfor(let y=0;y<4;y++)for(let x=0;x<4;x++)if(grid[y][x]===0)empty.push({x:x,y:y});\nif(!empty.length)return;\nlet p=empty[Math.floor(Math.random()*empty.length)];\ngrid[p.y][p.x]=Math.random()<.9?2:4;\n}\n\nfunction start(){\ngrid=emptyGrid();\nscore=0;\nwon=false;\ngameOver=false;\nhideOverlay();\naddTile();\naddTile();\nrender();\n}\n\nfunction render(){\nlet old=boardEl.querySelectorAll('.cell');\nold.forEach(e=>e.remove());\nfor(let y=0;y<4;y++){\nfor(let x=0;x<4;x++){\nlet n=document.createElement('div');\nn.className='cell'+(grid[y][x]?' v'+grid[y][x]:'');\nn.textContent=grid[y][x]||'';\nboardEl.appendChild(n);\n}\n}\nboardEl.appendChild(overlay);\nscoreEl.textContent=score;\nif(score>best){best=score;saveBest()}\nbestEl.textContent=best;\n}\n\nfunction compress(row){\nreturn row.filter(v=>v!==0);\n}\n\nfunction merge(row){\nlet out=[];\nfor(let i=0;i<row.length;i++){\nif(i+1<row.length&&row[i]===row[i+1]){\nlet v=row[i]*2;\nout.push(v);\nscore+=v;\nif(v===2048&&!won){won=true;showOverlay('2048','Has llegado al m\u00e1ximo');}\ni++;\n}else out.push(row[i]);\n}\nwhile(out.length<4)out.push(0);\nreturn out;\n}\n\nfunction moveLeft(){\nlet changed=false;\nfor(let y=0;y<4;y++){\nlet old=grid[y].slice();\nlet row=compress(grid[y]);\ngrid[y]=merge(row);\nif(old.join(',')!==grid[y].join(','))changed=true;\n}\nreturn changed;\n}\n\nfunction moveRight(){\nlet changed=false;\nfor(let y=0;y<4;y++){\nlet old=grid[y].slice();\nlet row=compress(grid[y].slice().reverse());\nrow=merge(row).reverse();\ngrid[y]=row;\nif(old.join(',')!==grid[y].join(','))changed=true;\n}\nreturn changed;\n}\n\nfunction moveUp(){\nlet changed=false;\nfor(let x=0;x<4;x++){\nlet col=[];\nfor(let y=0;y<4;y++)col.push(grid[y][x]);\nlet old=col.slice();\ncol=merge(compress(col));\nfor(let y=0;y<4;y++)grid[y][x]=col[y];\nif(old.join(',')!==col.join(','))changed=true;\n}\nreturn changed;\n}\n\nfunction moveDown(){\nlet changed=false;\nfor(let x=0;x<4;x++){\nlet col=[];\nfor(let y=0;y<4;y++)col.push(grid[y][x]);\nlet old=col.slice();\ncol=merge(compress(col.reverse())).reverse();\nfor(let y=0;y<4;y++)grid[y][x]=col[y];\nif(old.join(',')!==col.join(','))changed=true;\n}\nreturn changed;\n}\n\nfunction possible(){\nfor(let y=0;y<4;y++)for(let x=0;x<4;x++){\nif(grid[y][x]===0)return true;\nif(x<3&&grid[y][x]===grid[y][x+1])return true;\nif(y<3&&grid[y][x]===grid[y+1][x])return true;\n}\nreturn false;\n}\n\nfunction doMove(fn){\nif(gameOver)return;\nlet changed=fn();\nif(changed){addTile();render();if(!possible()){gameOver=true;showOverlay('GAME OVER','Pulsa \u21bb para volver a jugar')}}\n}\n\nfunction show(t,s){\ndocument.getElementById('ot').textContent=t;\ndocument.getElementById('os').textContent=s;\noverlay.classList.add('show');\n}\n\nfunction hideOverlay(){overlay.classList.remove('show')}\n\ndocument.getElementById('left').onclick=()=>doMove(moveLeft);\ndocument.getElementById('right').onclick=()=>doMove(moveRight);\ndocument.getElementById('up').onclick=()=>doMove(moveUp);\ndocument.getElementById('down').onclick=()=>doMove(moveDown);\ndocument.getElementById('restart').onclick=start;\ndocument.getElementById('new').onclick=start;\n\ndocument.addEventListener('keydown',e=>{\nif(e.key==='ArrowLeft'){e.preventDefault();doMove(moveLeft)}\nelse if(e.key==='ArrowRight'){e.preventDefault();doMove(moveRight)}\nelse if(e.key==='ArrowUp'){e.preventDefault();doMove(moveUp)}\nelse if(e.key==='ArrowDown'){e.preventDefault();doMove(moveDown)}\n});\n\nlet sx=0,sy=0;\nboardEl.addEventListener('touchstart',e=>{\nlet t=e.touches[0];sx=t.clientX;sy=t.clientY;\n},{passive:true});\n\nboardEl.addEventListener('touchend',e=>{\nlet t=e.changedTouches[0];\nlet dx=t.clientX-sx;\nlet dy=t.clientY-sy;\nif(Math.max(Math.abs(dx),Math.abs(dy))<25)return;\nif(Math.abs(dx)>Math.abs(dy)){\nif(dx>0)doMove(moveRight);else doMove(moveLeft);\n}else{\nif(dy>0)doMove(moveDown);else doMove(moveUp);\n}\n},{passive:true});\n\nstart();\n</script></body>";

/* payload rich — receta probada (prueba14/25/26/27) */
function buildGamePayload() {
  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            { messageType: 2, messageText: BOT_NAME },
          ],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                response_id: "alya-2048-" + Date.now(),
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
    console.error("[prueba28] envío del juego falló:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }

  await m.react("✅").catch(() => {});
  console.log("[prueba28] juego 2048 enviado correctamente");
}

export { pluginConfig as config, handler, buildGamePayload };
