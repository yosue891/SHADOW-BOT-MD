import fetch from 'node-fetch';

export async function before(m, { conn, participants, groupMetadata}) {
  if (!m.messageStubType ||!m.isGroup) return true;

  let vn = 'https://files.catbox.moe/9fyuwb.m4a';
  let vn2 = 'https://files.catbox.moe/w6td9c.m4a';
  let chat = global.db.data.chats[m.chat];
  const getMentionedJid = () => {
    return m.messageStubParameters.map(param => `${param}@s.whatsapp.net`);
};

  let who = m.messageStubParameters[0] + '@s.whatsapp.net';
  let user = global.db.data.users[who];
  let userName = user? user.name: await conn.getName(who);

  const thumbnail = await (await fetch('https://files.catbox.moe/zcj6zf.jpg')).buffer();
  const canalOficial = 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O';

  if (chat.welcome && m.messageStubType === 27) {
    this.sendMessage(m.chat, {
      audio: { url: vn},
      mimetype: 'audio/mpeg',
      ptt: false, // ← cambiado a false
      fileName: `bienvenida.mp3`,
      contextInfo: {
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363403739366547@newsletter",
          serverMessageId: '',
          newsletterName: 'shadow'
},
        forwardingScore: 9999999,
        isForwarded: true,
        mentionedJid: getMentionedJid(),
        externalAdReply: {
          title: `👻 Bienvenido/a ${userName} ✨`,
          body: `¡Nos alegra tenerte aquí en *${groupMetadata.subject}*!`,
          previewType: "PHOTO",
          thumbnail,
          sourceUrl: canalOficial,
          showAdAttribution: true
}
},
      seconds: '5278263792'
}, { quoted: fkontak, ephemeralExpiration: 24 * 60 * 100, disappearingMessagesInChat: 24 * 60 * 100});
}

  if (chat.welcome && (m.messageStubType === 28 || m.messageStubType === 32)) {
    this.sendMessage(m.chat, {
      audio: { url: vn2},
      mimetype: 'audio/mpeg',
      ptt: false, // ← cambiado a false
      fileName: `despedida.mp3`,
      contextInfo: {
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363403739366547@newsletter",
          serverMessageId: '',
          newsletterName: 'shadow'
},
        forwardingScore: 9999999,
        isForwarded: true,
        mentionedJid: getMentionedJid(),
        externalAdReply: {
          title: `👋 Adiós ${userName} 🌌`,
          body: `Esperamos verte de nuevo por *${groupMetadata.subject}*`,
          previewType: "PHOTO",
          thumbnail,
          sourceUrl: canalOficial,
          showAdAttribution: true
}
},
      seconds: '5278263792'
}, { quoted: fkontak, ephemeralExpiration: 24 * 60 * 100, disappearingMessagesInChat: 24 * 60 * 100});
}
          }
