import { readdirSync, statSync, unlinkSync, existsSync, readFileSync, watch, rmSync, promises as fsPromises } from "fs";
const fs = { ...fsPromises, existsSync };
import path, { join } from 'path';
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

      if (!fs.existsSync(sessionPath)) {
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
        fs.rmdirSync(sessionPath, { recursive: true, force: true });
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
        return resultado;
      }

      const message = users.map((v, index) => `
┏━━━━━✦୨୧✦━━━━━┓
┃ ✨ Sub-Bot #${index + 1} ✨
┃ 📎 Link: wa.me/${v.user.jid.replace(/[^0-9]/g, '')}?text=${usedPrefix}estado
┃ 👤 Usuario: ${v.user.name || 'Sub-Bot'}
┃ 🕒 Conexión: ${v.uptime ? convertirMsADiasHorasMinutosSegundos(Date.now() - v.uptime) : 'Tiempo Desconocido 💀'}
┗━━━━━✦୨୧✦━━━━━┛
`).join('\n');

      const replyMessage = message.length === 0
        ? `🚫 Actualmente no hay Sub-Bots disponibles.\n⏳ Por favor, vuelva a intentarlo más tarde.`
        : message;

      const totalUsers = users.length;

      const responseMessage = `
╭❍👻 *SUBS ACTIVOS* 😈❍╮

⚠️ \`\`\`
Cada Sub-Bot utiliza sus funciones de manera independiente.
El número principal no se hace responsable del mal uso.
\`\`\`

😈 *Total de Sub-Bots Conectados:* ${totalUsers || '0'}

${replyMessage}

╰❍👻 *canal de shadow* 👻❍╯
🔗 https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O`.trim();

      await _envio.sendMessage(m.chat, {
        image: { url: 'https://files.catbox.moe/1iurgf.jpg' },
        caption: responseMessage,
        mentions: _envio.parseMention(responseMessage)
      }, { quoted: m });
      break;
  }
};

handler.tags = ['serbot'];
handler.help = ['sockets', 'deletesesion', 'pausarai'];
handler.command = ['deletesesion', 'deletebot', 'deletesession', 'stop', 'pausarai', 'pausarbot', 'bots', 'sockets', 'socket'];

export default handler;
