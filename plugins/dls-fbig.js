const handler = async (m, { args, conn, usedPrefix, command }) => {
  try {

    const mensajes = {
      instagram: '「✦」Por favor, proporciona un enlace válido de Instagram.',
      ig: '「✦」Por favor, proporciona un enlace válido de Instagram.',
      facebook: '「✦」Por favor, proporciona un enlace válido de Facebook.',
      fb: '「✦」Por favor, proporciona un enlace válido de Facebook.'
    };

    if (!args[0]) {
      return conn.reply(
        m.chat,
        mensajes[command] || '「✦」Por favor, proporciona un enlace válido.',
        m
      )
    }

    let data = [];

    if (m.react) await m.react('🕒');

    try {
      const api = `${global.APIs.vreden.url}/api/igdownload?url=${encodeURIComponent(args[0])}`;
      const res = await fetch(api);
      const json = await res.json();

      if (Array.isArray(json?.resultado?.respuesta?.datos)) {
        data = json.resultado.respuesta.datos.map(v => v.url);
      }

    } catch (e) {
      console.log('Vreden API error:', e.message);
    }

    if (!data.length) {
      try {
        const api = `${global.APIs.delirius.url}/download/instagram?url=${encodeURIComponent(args[0])}`;
        const res = await fetch(api);
        const json = await res.json();

        if (Array.isArray(json?.data)) {
          data = json.data.map(v => v.url);
        }

      } catch (e) {
        console.log('Delirius API error:', e.message);
      }
    }

    if (!data.length) {
      return conn.reply(
        m.chat,
        'No se pudo obtener el contenido del enlace.',
        m
      );
    }

    for (let media of data) {
      await conn.sendFile(
        m.chat,
        media,
        'media.mp4',
        '> ✩ Aqui tienes tu pedido.',
        m
      );

      if (m.react) await m.react('✔️');
    }

  } catch (error) {
    if (m.react) await m.react('✖️');

    await m.reply(
      `Ocurrió un error inesperado.\nUsa *${usedPrefix}report* para informarlo.\n\nDetalles: ${error.message}`
    );
  }
};

handler.command = ['instagram', 'ig', 'facebook', 'fb'];
handler.tags = ['descargas'];
handler.help = ['instagram', 'ig', 'facebook', 'fb'];

export default handler;