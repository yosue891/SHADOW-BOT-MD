import { promises as fs } from 'fs';

const handler = async (m, { conn, participants, groupMetadata }) => {
  const chat = global.db.data.chats[m.chat];
  const pp = await conn.profilePictureUrl(m.chat, 'image').catch(() => 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg');

  const {
    antiLink, detect, welcome, sWelcome, sBye,
    modoadmin, nsfw, isBanned, economy, gacha, primaryBot
  } = chat;

  const groupAdmins = participants.filter(p => p.admin);
  const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || m.chat.split`-`[0] + '@s.whatsapp.net';
  const creador = (!owner || owner.startsWith('1203') || owner.length < 15) ? 'No encontrado' : `@${owner.split('@')[0]}`;
  const rawPrimary = typeof primaryBot === 'string' ? primaryBot : '';
  const botprimary = rawPrimary.endsWith('@s.whatsapp.net') ? `@${rawPrimary.split('@')[0]}` : 'Aleatorio';
  const totalreg = Object.keys(global.db.data.users).length;

  const text = `🎃🦇 Información del Aquelarre 🦇🎃
⌦ Aquelarre: *${groupMetadata.subject}*
⌦ Líder Supremo: *${creador}*
⌦ Almas reunidas: *${participants.length}*
⌦ Guardianes (Admins): *${groupAdmins.length}*
⌦ Contratistas globales: *${totalreg.toLocaleString()}*
⌦ Sombra principal: *${botprimary}*

🕯️ Sellos y Opciones activas:
» *${botname}*: ${isBanned ? 'En la cripta ✗' : 'Despierto ✓'}
» Welcome: ${welcome ? 'Sellado ✓' : 'Roto ✗'}
» Alertas: ${detect ? 'Sellado ✓' : 'Roto ✗'}
» Anti-Link: ${antiLink ? 'Sellado ✓' : 'Roto ✗'}
» Solo Admins: ${modoadmin ? 'Sellado ✓' : 'Roto ✗'}
» NSFW: ${nsfw ? 'Sellado ✓' : 'Roto ✗'}

🕸️ Pergaminos de Bienvenida:
» Welcome: ${(sWelcome || 'Sin mensaje').replace(/{usuario}/g, `@${m.sender.split('@')[0]}`).replace(/{grupo}/g, `*${groupMetadata.subject}*`).replace(/{desc}/g, `*${groupMetadata.desc || 'Sin descripción'}*`)}
» Bye: ${(sBye || 'Sin mensaje').replace(/{usuario}/g, `@${m.sender.split('@')[0]}`).replace(/{grupo}/g, `*${groupMetadata.subject}*`).replace(/{desc}/g, `*${groupMetadata.desc || 'Sin descripción'}*`)}`;

  conn.sendFile(m.chat, pp, 'img.jpg', text, m, false, {
    mentions: [owner, rawPrimary, m.sender]
  });
};

handler.help = ['infogrupo'];
handler.tags = ['grupos'];
handler.command = ['infogrupo', 'gp'];
handler.group = true;

export default handler;
