/**
 * Plugin: prueba29 — Easy Basketball (juego HTML interactivo)
 * ----------------------------------------------------------------------
 * Juego extraído del mensaje rich exportado (vyfescou.zip, "Yuta Easy
 * Basketball"). Se envía con la MISMA receta probada (prueba14/25/26/27/28):
 * botForwardedMessage + richResponseMessage + unifiedResponse con primitive
 * GenAIaeacdsnwHtmlPrimitive, SIN messageContextInfo/botMetadata (el original
 * traía botResponseId, verificationMetadata y botJid 867051314767696@bot, que
 * hacían degradar el mensaje a texto) y con botJid "0@bot".
 * El texto del mensaje usa el NOMBRE DEL BOT (config.bot.name).
 * El HTML es autónomo (CSS + JS inline, sin recursos externos).
 */

import te from "../../src/lib/ourin-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "prueba29",
  alias: ["p29", "basket", "basketball", "easybasket"],
  category: "tools",
  description: "Easy Basketball — encesta con el ángulo perfecto (HTML jugable)",
  usage: ".prueba29",
  example: ".prueba29",
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
const GAME_HTML = "<style>*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}body{margin:0;background:#0d1117;font-family:system-ui,-apple-system,sans-serif;color:#fff;touch-action:manipulation}.btn-shoot{background:linear-gradient(135deg,#ff7b00,#ffae00);border:none;color:#0d1117;border-radius:16px;font-weight:900;font-size:18px;box-shadow:0 6px 20px rgba(255,123,0,0.35);transition:transform .05s}.btn-shoot:active{transform:scale(0.96)}</style><body style=\"margin:0\"><div style=\"width:100%;max-width:420px;margin:auto;padding:12px;box-sizing:border-box\"><div style=\"background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,0.6)\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:0 4px\"><div><div style=\"font-size:9px;color:#ff7b00;letter-spacing:2px;font-weight:800\">MODO LIBRE</div><div style=\"font-size:18px;font-weight:800;color:#f0f6fc\">EASY BASKET \ud83c\udfc0</div></div><div style=\"background:rgba(255,255,255,0.06);padding:6px 14px;border-radius:14px\"><span style=\"font-size:10px;color:#8b949e\">CANASTAS </span><b id=\"score\" style=\"font-size:18px;color:#ffae00;font-weight:800\">0</b></div></div><div style=\"position:relative;width:100%;aspect-ratio:4/3;background:#06090e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.05)\"><canvas id=\"game\" width=\"500\" height=\"375\" style=\"width:100%;height:100%;display:block\"></canvas></div><div style=\"margin-top:12px\"><button id=\"shoot\" class=\"btn-shoot\" style=\"width:100%;height:54px\">LANZAR BAL\u00d3N \ud83c\udfaf</button></div></div></div><script>const c=document.getElementById('game'),x=c.getContext('2d'),scoreEl=document.getElementById('score');let audioCtx=null;function playSound(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(300,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(600,audioCtx.currentTime+0.15);g.gain.setValueAtTime(0.12,audioCtx.currentTime);g.gain.linearRampToValueAtTime(0.01,audioCtx.currentTime+0.2);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.2)}let ball={x:80,y:290,r:14,vx:0,vy:0,moving:false},hoop={x:380,y:140,w:50,h:8},score=0,angle=45,angleDir=1;function resetBall(){ball.x=80;ball.y=290;ball.vx=0;ball.vy=0;ball.moving=false}function shoot(){if(ball.moving)return;let rad=(angle*Math.PI)/180;let speed=11.5;ball.vx=Math.cos(rad)*speed;ball.vy=-Math.sin(rad)*speed;ball.moving=true}function update(){if(!ball.moving){angle+=1.2*angleDir;if(angle>65||angle<25)angleDir*=-1}else{ball.x+=ball.vx;ball.y+=ball.vy;ball.vy+=0.35;if(ball.x+ball.r>=hoop.x&&ball.x-ball.r<=hoop.x+hoop.w&&ball.y+ball.r>=hoop.y&&ball.y-ball.r<=hoop.y+hoop.h&&ball.vy>0){score++;scoreEl.textContent=score;playSound();resetBall()}if(ball.y>c.height+30||ball.x>c.width+30)resetBall()}}function draw(){x.clearRect(0,0,c.width,c.height);x.fillStyle='#30363d';x.fillRect(hoop.x+hoop.w,hoop.y-40,8,120);x.fillStyle='#ff3e3e';x.fillRect(hoop.x,hoop.y,hoop.w,hoop.h);x.strokeStyle='rgba(255,255,255,0.2)';x.lineWidth=2;x.beginPath();x.moveTo(hoop.x,hoop.y+hoop.h);x.lineTo(hoop.x+8,hoop.y+35);x.lineTo(hoop.x+hoop.w-8,hoop.y+35);x.lineTo(hoop.x+hoop.w,hoop.y+hoop.h);x.stroke();if(!ball.moving){x.strokeStyle='rgba(255,174,0,0.3)';x.lineWidth=3;x.setLineDash([4,4]);let rad=(angle*Math.PI)/180,speed=11.5,bx=ball.x,by=ball.y,bvx=Math.cos(rad)*speed,bvy=-Math.sin(rad)*speed;x.beginPath();x.moveTo(bx,by);for(let i=0;i<25;i++){bx+=bvx;by+=bvy;bvy+=0.35;x.lineTo(bx,by)}x.stroke();x.setLineDash([])}x.fillStyle='#ff7b00';x.shadowColor='#ff7b00';x.shadowBlur=8;x.beginPath();x.arc(ball.x,ball.y,ball.r,0,Math.PI*2);x.fill();x.shadowBlur=0;x.strokeStyle='#0d1117';x.lineWidth=2;x.beginPath();x.arc(ball.x,ball.y,ball.r,0,Math.PI*2);x.stroke()}function loop(){update();draw();requestAnimationFrame(loop)}document.getElementById('shoot').onclick=shoot;c.onclick=shoot;loop();</script></body>";

/* payload rich — receta probada (prueba14/25/26/27/28) */
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
                response_id: "basket-" + Date.now(),
                sections: [
                  {
                    view_model: {
                      primitive: {
                        __typename: "GenAIaeacdsnwHtmlPrimitive",
                        payload: GAME_HTML,
                        url: "https://yuta.dev",
                        trusted_sources: ["yuta.dev"],
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
    console.error("[prueba29] envío del juego falló:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }

  await m.react("✅").catch(() => {});
  console.log("[prueba29] Easy Basketball enviado correctamente");
}

export { pluginConfig as config, handler, buildGamePayload };
