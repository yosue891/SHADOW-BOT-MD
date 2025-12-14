import { existsSync, rmdirSync } from "fs";
import ws from 'ws';

let handler = async (m, { conn: _envio, command, usedPrefix, args, text, isOwner }) => {
  const isCommand1 = /^(deletesesion|deletebot|deletesession|deletesesaion)$/i.test(command);
  const isCommand2 = /^(stop|pausarai|pausarbot)$/i.test(command);
  const isCommand3 = /^(bots|sockets|socket)$/i.test(command);

  async function reportError(e) {
    await m.reply('⚠️ Ocurrió un error.');
    console.log(e);
  }

  switch (true) {
    case isCommand1:
      let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;
      let uniqid = `${who.split('@')[0]}`;
      const sessionPath = `./${jadi}/${uniqid}`; 

      if (!existsSync(sessionPath)) {
        await conn.sendMessage(m.chat, {
          text: `🚫 Usted no tiene una sesión activa.\n\nPuede crear una usando:\n${usedPrefix + command}\n\nSi tiene una ID, puede usar:\n${usedPrefix + command} (ID)`,
          quoted: m
        });
        return;
      }

      if (global.conn.user.jid !== conn.user.jid) {
        return conn.sendMessage(m.chat, {
          text: `⚠️ Use este comando desde el *Bot Principal*.\n\nhttps://api.whatsapp.com/send/?phone=522483649647&text=${usedPrefix + command}&type=phone_number&app_absent=0`,
          quoted: m
        });
      } else {
        await conn.sendMessage(m.chat, { text: `✅ Tu sesión como *Sub-Bot* ha sido eliminada.`, quoted: m });
      }

      try {
        rmdirSync(sessionPath, { recursive: true, force: true });
        await conn.sendMessage(m.chat, { text: `🧹 Sesión cerrada y rastro eliminado.`, quoted: m });
      } catch (e) {
        reportError(e);
      }
      break;

    case isCommand2:
      if (global.conn.user.jid === conn.user.jid) {
        conn.reply(m.chat, `⚠️ Este comando solo funciona si eres *Sub-Bot*.\n\n📞 Comunícate con el número principal para activarte:\nhttps://wa.me/573136379995?text=${usedPrefix}code`, m);
      } else {
        await conn.reply(m.chat, `🛑 ${botname} desactivada.`, m); 
        conn.ws.close();
      }
      break;

    case isCommand3:
      const users = [...new Set([...global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED)])];

      function convertirMsADiasHorasMinutosSegundos(ms) {
        let segundos = Math.floor(ms / 1000);
        let minutos = Math.floor(segundos / 60);
        let horas = Math.floor(minutos / 60);
        let días = Math.floor(horas / 24);
        segundos %= 60;
        minutos %= 60;
        horas %= 24;
        let resultado = "";
        if (días) resultado += `${días} días, `;
        if (horas) resultado += `${horas} horas, `;
        if (minutos) resultado += `${minutos} minutos, `;
        if (segundos) resultado += `${segundos} segundos`;
        if (resultado.endsWith(', ')) {
          resultado = resultado.slice(0, -2);
        }
        return resultado || 'Menos de 1 segundo';
      }
      
      const message = users.map((v, index) => {
          const mention = v.user.jid.split('@')[0];
          const botNumber = v.user.jid.replace(/[^0-9]/g, '');
          const botName = v.user.name || 'Sub-Bot';
          const uptime = v.uptime ? convertirMsADiasHorasMinutosSegundos(Date.now() - v.uptime) : 'Tiempo Desconocido 💀';
          
          return `
Shadow | Sub-bots [ ${index + 1} ]
 
🌿 Tag:: @${mention}
🌴 ID:: wa.me/${botNumber}?text=.menu
🌱 Bot:: ${botName}
🍄 Uptime:: ${uptime}
 
────────────────`.trim();
      }).join('\n\n'); 

      const replyMessage = message.length === 0
        ? `🚫 Actualmente no hay Sub-Bots disponibles.\n⏳ Por favor, vuelva a intentarlo más tarde.`
        : message;

      const responseMessage = replyMessage;

      const buttons = [
          {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                  display_text: "Canal Oficial ",
                  url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
              })
          }
      ];

      await _envio.sendMessage(m.chat, {
        image: { url: 'https://files.catbox.moe/1iurgf.jpg' },
        caption: responseMessage,
        mentions: _envio.parseMention(responseMessage),
        buttons: buttons, 
        footer: 'Presiona el botón para ir al canal oficial.', 
      }, { quoted: m });
      
      break;
  }
};

handler.tags = ['serbot'];
handler.help = ['sockets', 'deletesesion', 'pausarai'];
handler.command = ['deletesesion', 'deletebot', 'deletesession', 'stop', 'pausarai', 'pausarbot', 'bots', 'sockets', 'socket'];

export default handler;
