import os from 'os';
import fetch from 'node-fetch';

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

export default {
  command: ['info', 'infobot', 'infosocket'],
  category: 'info',
  run: async ({ client, m}) => {
    try {
      const botId = client.user.id.split(':')[0] + "@s.whatsapp.net";
      const botSettings = global.db.data.settings[botId] || {};

      const botname = botSettings.namebot || 'Ai Surus';
      const botname2 = botSettings.namebot2 || 'Surus';
      const monedas = botSettings.currency || 'BitCoins';
      const banner = botSettings.banner;
      const prefijo = botSettings.prefijo;
      const owner = botSettings.owner;
      const canalId = botSettings.id;
      const canalName = botSettings.nameid;
      const link = botSettings.link;

      let desar = 'Oculto';
      if (owner &&!isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))) {
        const userData = global.db.data.users[owner];
        desar = userData?.genre || 'Oculto';
}

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

      const isOficialBot = botId === client.user.id.split(':')[0] + "@s.whatsapp.net";
      const botType = isOficialBot? 'Principal/Owner': 'Sub Bot';

      const message = `💜 Información del bot ${botname2}!

> Nombre Corto › ${botname2}
> Nombre Largo › ${botname}
> Moneda › ${monedas}
> Prefijo › ${prefijo}

> Tipo › ${botType}
> Plataforma › ${platform}
> NodeJS › ${nodeVersion}
> Activo desde › ${formattedUptimeDate}
> Sistema Activo › ${sistemaUptime}
> ${desar === 'Hombre'? 'Dueño': desar === 'Mujer'? 'Dueña': 'Dueño(a)'} › ${owner? (!isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))? '@' + owner.split('@')[0]: owner): "Oculto por privacidad"}

> Enlace › ${link}`.trim();

      await client.sendMessage(m.chat, {
        document: await (await fetch(banner)).buffer(),
        fileName: '^5.0.0 | Latest ☪️',
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileLength: '0',
        pageCount: '1',
        caption: message,
        contextInfo: {
          mentionedJid: [owner, m.sender],
          forwardingScore: 0,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: canalId,
            serverMessageId: null,
            newsletterName: canalName
},
          externalAdReply: {
            title: botname,
            body: `${botname2}. 𝘞𝘪𝘵𝘩 𝘓𝘰𝘷𝘦 𝘉𝘺 shadow`,
            showAdAttribution: false,
            thumbnailUrl: banner,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: link
}
}
}, { quoted: m});

} catch (e) {
      console.error(e);
      await m.reply(`[!] Error al obtener info: ${e.message}`);
}
}
};
