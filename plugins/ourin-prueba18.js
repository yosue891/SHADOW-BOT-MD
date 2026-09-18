import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba18",
  alias: ["ppt", "piedrapapeltijera"],
  category: "games",
  description: "Enviar Piedra Papel Tijera interactivo vía bot message",
  usage: ".prueba18",
  example: ".prueba18",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const GAME_HTML = `<style>
*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
body{margin:0;background:transparent;font-family:'Segoe UI',Arial,sans-serif;color:#eee;touch-action:manipulation;cursor:pointer}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes glow{0%,100%{box-shadow:0 0 15px rgba(108,92,231,.4)}50%{box-shadow:0 0 30px rgba(108,92,231,.8)}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes popIn{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
.card{width:100%;max-width:620px;margin:auto;padding:16px;box-sizing:border-box;animation:slideUp .4s ease}
.box{background:linear-gradient(135deg,rgba(25,25,45,.9),rgba(15,15,35,.95));backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.5)}
.hdr{padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center}
.hdr .sub{font-size:10px;letter-spacing:2px;color:rgba(108,92,231,.7);text-transform:uppercase}
.hdr .title{font-size:22px;font-weight:800;background:linear-gradient(135deg,#6c5ce7,#a29bfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hdr .pts .val{font-size:20px;font-weight:bold;color:#6c5ce7;text-shadow:0 0 15px rgba(108,92,231,.5)}
.hdr .pts .lbl{font-size:9px;color:rgba(255,255,255,.35);letter-spacing:1px}
.body{padding:20px;text-align:center}
.btn{padding:10px 24px;background:linear-gradient(135deg,rgba(108,92,231,.3),rgba(108,92,231,.15));border:1px solid rgba(108,92,231,.4);border-radius:12px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;display:inline-block;transition:all .2s;animation:fadeIn .3s}
.btn:active{transform:scale(.95);background:linear-gradient(135deg,rgba(108,92,231,.5),rgba(108,92,231,.3))}
.status{font-size:15px;margin:12px 0;min-height:24px;color:rgba(255,255,255,.7);animation:fadeIn .3s}
</style>
<script>
var _ac=window._ac||(window._ac=new(window.AudioContext||window.webkitAudioContext)());
function snd(f,d,t,v){try{if(_ac.state==='suspended')_ac.resume();var o=_ac.createOscillator(),g=_ac.createGain();o.connect(g);g.connect(_ac.destination);o.type=t||'sine';o.frequency.setValueAtTime(f,_ac.currentTime);g.gain.setValueAtTime(v||.15,_ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,_ac.currentTime+d);o.start();o.stop(_ac.currentTime+d)}catch(e){}}
function sWin(){snd(523,.1,'sine',.2);setTimeout(function(){snd(659,.1,'sine',.2)},100);setTimeout(function(){snd(784,.15,'sine',.25)},200)}
function sLose(){snd(330,.15,'sawtooth',.15);setTimeout(function(){snd(220,.2,'sawtooth',.12)},150)}
function sClick(){snd(800,.05,'sine',.1)}
function sPop(){snd(600,.06,'sine',.12)}
function sCoin(){snd(987,.08,'sine',.18);setTimeout(function(){snd(1319,.12,'sine',.15)},80)}
function sBump(){snd(150,.1,'square',.1)}
function sFlap(){snd(440,.04,'sine',.08)}
function sHit(){snd(200,.15,'sawtooth',.2);setTimeout(function(){snd(100,.2,'sawtooth',.15)},100)}
function sPlace(){snd(500,.06,'sine',.1)}
function sReveal(){snd(700,.04,'sine',.08)}
function sFlag(){snd(600,.05,'triangle',.1)}
function sExplosion(){for(var i=0;i<5;i++)setTimeout(function(){snd(100+Math.random()*200,.1,'sawtooth',.1)},i*50)}
function sSpin(){snd(200,.03,'square',.05)}
</script><div class="card"><div class="box"><div class="hdr"><div><div class="sub">@yosoyyo_ofc</div><div class="title">Piedra Papel Tijera</div></div><div class="pts"><div class="val" id="sc">0 - 0</div><div class="lbl">MEJORES <span id="sw">0</span></div></div></div><div class="body">
<div class="status" id="res">Elige tu jugada</div>
<div id="vs" style="font-size:44px;margin:16px 0;min-height:55px;animation:fadeIn .3s"></div>
<div style="display:flex;justify-content:center;gap:14px;margin-top:16px">
<div onclick="play('piedra')" style="width:85px;height:85px;background:linear-gradient(135deg,rgba(231,76,60,.2),rgba(192,57,43,.1));border:2px solid rgba(231,76,60,.4);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:38px;cursor:pointer;transition:all .2s" onpointerdown="this.style.transform='scale(.85)';sClick()" onpointerup="this.style.transform='scale(1)'" onpointerleave="this.style.transform='scale(1)'">&#x1FAA8;</div>
<div onclick="play('papel')" style="width:85px;height:85px;background:linear-gradient(135deg,rgba(46,204,113,.2),rgba(39,174,96,.1));border:2px solid rgba(46,204,113,.4);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:38px;cursor:pointer;transition:all .2s" onpointerdown="this.style.transform='scale(.85)';sClick()" onpointerup="this.style.transform='scale(1)'" onpointerleave="this.style.transform='scale(1)'">&#x1F4DD;</div>
<div onclick="play('tijera')" style="width:85px;height:85px;background:linear-gradient(135deg,rgba(52,152,219,.2),rgba(41,128,185,.1));border:2px solid rgba(52,152,219,.4);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:38px;cursor:pointer;transition:all .2s" onpointerdown="this.style.transform='scale(.85)';sClick()" onpointerup="this.style.transform='scale(1)'" onpointerleave="this.style.transform='scale(1)'">&#x2702;&#xFE0F;</div>
</div></div></div></div>
<script>
var E={piedra:'&#x1FAA8;',papel:'&#x1F4DD;',tijera:'&#x2702;&#xFE0F;'};var w=0,l=0,sw=0;
function play(u){var ops=['piedra','papel','tijera'];var c=ops[Math.floor(Math.random()*3)];var r='';
if(u===c){r='&#x1F91D; Empate!';sPop()}
else if((u==='piedra'&&c==='tijera')||(u==='papel'&&c==='piedra')||(u==='tijera'&&c==='papel')){r='&#x1F3C6; Ganaste!';w++;sw++;sWin()}
else{r='&#x1F614; Perdiste';l++;sLose()}
var vs=document.getElementById('vs');vs.innerHTML='<span style="animation:bounce .4s ease;display:inline-block">'+E[u]+'</span> <span style="font-size:18px;color:rgba(255,255,255,.3)">VS</span> <span style="animation:bounce .4s ease .1s;display:inline-block">'+E[c]+'</span>';
document.getElementById('res').innerHTML=r;document.getElementById('sc').textContent=w+' - '+l;document.getElementById('sw').textContent=sw}
</script>`;

function buildUnifiedResponseData() {
  return Buffer.from(
    JSON.stringify({
      response_id: "a1b2-ppt-2026",
      sections: [
        {
          view_model: {
            primitive: {
              __typename: "GenAIaeacdsnwHtmlPrimitive",
              payload: GAME_HTML,
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
    console.error("[prueba18] PPT bot message failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
