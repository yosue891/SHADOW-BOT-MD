import os from 'os';
const {
  generateWAMessageFromContent,
  proto
} = (await import("@whiskeysockets/baileys"))["default"];

let handler = async (m, { conn}) => {
  try {
    const botname = 'Shadow-BOT-MD';
    const botname2 = 'shadow';
    const monedas = 'Pesos';
    const banner = 'https://files.catbox.moe/7mpqeg.jpg';
    const prefijos = './#!';
    const canalId = '120363403739366547@newsletter';
    const canalName = 'SHADOW-BOT';
    const link = 'https://github.com/yosue891/SHADOW-BOT-MD.git';

    const platform = os.type();
    const now = new Date();
    const colombianTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota'}));
    const nodeVersion = process.version;
    const sistemaUptime = rTime(os.uptime());

    const uptime = process.uptime();
    const uptimeDate = new Date(colombianTime.getTime() - uptime * 1000);
    const formattedUptimeDate = uptimeDate.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
}).replace(/^./, m => m.toUpperCase());

    const botType = 'Principal/Owner';
    const duenos = 'yosue, ado y Fede';

    const message = `💜 *Información del bot ${botname2}*

> *Nombre Corto:* ${botname2}
> *Nombre Largo:* ${botname}
> *Moneda:* ${monedas}
> *Prefijos:* ${prefijos}

> *Tipo:* ${botType}
> *Plataforma:* ${platform}
> *NodeJS:* ${nodeVersion}
> *Activo desde:* ${formattedUptimeDate}
> *Sistema Activo:* ${sistemaUptime}
> *Dueño(a):* ${duenos}

> *Repositorio:* ${link}`.trim();

    await conn.sendMessage(m.chat, {
      document: Buffer.alloc(1),
      fileName: 'Shadow-BOT-MD',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileLength: '0',
      pageCount: '1',
      caption: message,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 0,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: canalId,
          serverMessageId: null,
          newsletterName: canalName
},
        externalAdReply: {
          title: 'shadow-bot',
          body: `${botname2}. 𝘞𝘪𝘵𝘩 𝘓𝘰𝘷𝘦 𝘉𝘺 yosue`,
          thumbnailUrl: banner,
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: link
}
}
}, { quoted: m});

} catch (e) {
    console.error(e);
    return conn.reply(m.chat, `⛔ *Error al invocar la información del bot...*`, m);
}
};

function rTime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d> 0? d + (d === 1? " día, ": " días, "): "";
  const hDisplay = h> 0? h + (h === 1? " hora, ": " horas, "): "";
  const mDisplay = m> 0? m + (m === 1? " minuto, ": " minutos, "): "";
  const sDisplay = s> 0? s + (s === 1? " segundo": " segundos"): "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
}

handler.help = ["info", "infobot", "infosocket"];
handler.tags = ["info"];
handler.command = ["info", "infobot", "infosocket"];

export default handler;
