const handler = async (m, { args, conn, usedPrefix, command }) => {
  try {
  
    const mensajes = {
      instagram: '「✦」Por favor, proporciona un enlace válido de Instagram.',
      ig: '「✦」Por favor, proporciona un enlace válido de Instagram.',
      facebook: '「✦」Por favor, proporciona un enlace válido de Facebook.',
      fb: '「✦」Por favor, proporciona un enlace válido de Facebook.'
    };

    if (!args[0]) return conn.reply(m.chat, mensajes[command] || '「✦」Por favor, proporciona un enlace válido.', m);

    let data = [];
    await m.react('🕒');

    
    try {
      const api = `${global.APIs.vreden.url}/api/igdownload?url=${encodeURIComponent(args[0])}`;
      const res = await fetch(api);
      const json = await res.json();
      if (json.resultado?.respuesta?.datos?.length) {
        data = json.resultado.respuesta.datos.map(v => v.url);
      }
    } catch {}

  
    if (!data.length) {
      try {
        const api = `${global.APIs.delirius.url}/download/instagram?url=${encodeURIComponent(args[0])}`;
        const res = await fetch(api);
        const json = await res.json();
        if (json.status && json.data?.length) {
          data = json.data.map(v => v.url);
        }
      } catch {}
    }

    if (!data.length) return conn.reply(m.chat, `No se pudo obtener el contenido del enlace.`, m);

    for (let media of data) {
      await conn.sendFile(m.chat, media, 'video.mp4', `> ✩ Aqui tienes tu pedido.`, m);
      await m.react('✔️');
    }
  } catch (error) {
    await m.react('✖️');
    await m.reply(`Ocurrió un error inesperado.\nUsa *${usedPrefix}report* para informarlo.\n\nDetalles: ${error.message}`);
  }
};

handler.command = ['instagram', 'ig', 'facebook', 'fb'];
handler.tags = ['descargas'];
handler.help = ['instagram', 'ig', 'facebook', 'fb'];
//handler.coin = 22

export default handler;
        
