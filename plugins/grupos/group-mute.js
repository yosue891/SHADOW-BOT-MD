import fetch from 'node-fetch';

const handler = async (m, { conn, command, text, isAdmin }) => {
  if (!isAdmin) {
    return conn.reply(
      m.chat,
      `🎄🗡️ *SOMBRAS SIN PERMISOS SUFICIENTES*\n\n> Solo un administrador puede invocar este poder.\n🔒 Estado actual: *no admin en el Reino*`,
      m
    );
  }

  let user = m.mentionedJid?.[0] || m.quoted?.sender || text;
  if (!user) {
    return conn.reply(
      m.chat,
      command === 'mute'
        ? '🕯️ *Menciona al discípulo que deseas silenciar en las sombras*'
        : '🕯️ *Menciona al discípulo que deseas liberar del silencio*',
      m
    );
  }

  if (!/@s\.whatsapp\.net$/.test(user)) {
    user = user.replace(/[^\d]/g, '');
    if (user.length > 5) user = `${user}@s.whatsapp.net`;
  }

  if (user === conn.user.jid) return conn.reply(m.chat, '🚩 *No puedes silenciar o liberar al bot sombrío*', m);

  const ownerNumber = global.owner[0][0] + '@s.whatsapp.net';
  if (user === ownerNumber) return conn.reply(m.chat, '🚩 *No puedes silenciar al creador del Reino*', m);

  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupOwner = groupMetadata.owner || m.chat.split`-`[0] + '@s.whatsapp.net';
  if (user === groupOwner) return conn.reply(m.chat, '🚩 *No puedes silenciar al soberano del grupo*', m);

  if (!global.db.data.users[user]) global.db.data.users[user] = {};
  const userData = global.db.data.users[user];

  const fkontak = {
    key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'Halo' },
    message: {
      locationMessage: {
        name: command === 'mute' ? 'Discípulo silenciado por las Sombras 🎄' : '✨ Discípulo liberado del silencio 🎁',
        jpegThumbnail: await (await fetch(
          command === 'mute'
            ? 'https://telegra.ph/file/f8324d9798fa2ed2317bc.png'
            : 'https://telegra.ph/file/aea704d0b242b8c41bf15.png'
        )).buffer(),
        vcard:
          'BEGIN:VCARD\nVERSION:3.0\nN:;Shadow;;;\nFN:Shadow\nORG:Eminence in Shadow\nTITLE:\nitem1.TEL;waid=19709001746:+1 (970) 900-1746\nitem1.X-ABLabel:Shadow\nX-WA-BIZ-DESCRIPTION:Reino de las Sombras\nX-WA-BIZ-NAME:Shadow\nEND:VCARD'
      }
    },
    participant: '0@s.whatsapp.net'
  };

  if (command === 'mute') {
    if (userData.mute === true) return conn.reply(m.chat, '🚩 *Este discípulo ya ha sido silenciado por las Sombras*', m);
    global.db.data.users[user].mute = true; // 🔑 Guardar como booleano exacto
    return conn.reply(m.chat, '❄️ *Tus mensajes serán consumidos por la oscuridad* 🕯️', fkontak, null, { mentions: [user] });
  }

  if (command === 'unmute') {
    if (userData.mute !== true) return conn.reply(m.chat, '🚩 *Este discípulo no está bajo el silencio sombrío*', m);
    if (user === m.sender) return conn.reply(m.chat, '🚩 *Sólo otro administrador puede liberarte del silencio sombrío*', m);

    global.db.data.users[user].mute = false; // uwu
    return conn.reply(m.chat, '🎁 *Tus mensajes volverán a brillar bajo las luces navideñas* ✨', fkontak, null, { mentions: [user] });
  }
};

// uwu
handler.before = async function (m, { conn }) {
  if (!m.isGroup) return;
  const sender = m.sender;
  const userData = global.db.data.users[sender];

  if (userData && userData.mute === true) {
    try {
      await conn.sendMessage(m.chat, { delete: m.key });
    } catch (e) {
      console.error("Error al eliminar mensaje de usuario muteado:", e);
    }
  }
};

handler.command = ['mute', 'unmute'];
handler.group = true;
handler.admin = true;

export default handler;
