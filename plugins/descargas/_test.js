import fetch from "node-fetch";

const testYtmp3Full = async (m, { conn, text }) => {
  try {
    console.log('[INFO] Comando recibido:', text);

    if (!text?.trim()) {
      console.log('[WARN] No se envió URL o texto');
      return conn.reply(m.chat, '❀ Envía un link de YouTube o texto para probar.', m);
    }

    await m.react('🕒');
    console.log('[INFO] Emoji de espera enviado');

    const endpoint = `https://api-adonix.ultraplus.click/download/ytmp3?apikey=Adofreekey&url=${encodeURIComponent(text)}`;
    console.log('[INFO] Llamando API con GET:', endpoint);

    const res = await fetch(endpoint, { method: 'GET', redirect: 'follow' }).then(r => r.text());
    console.log('[INFO] Respuesta API completa recibida');
    console.log(res); 

    if (res.length > 4000) {
      console.log('[INFO] Contenido demasiado largo, enviando como archivo');
      await conn.sendMessage(m.chat, {
        document: Buffer.from(res, 'utf-8'),
        fileName: 'respuesta-completa.txt',
        mimetype: 'text/plain'
      }, { quoted: m });
    } else {
      console.log('[INFO] Enviando contenido completo como mensaje de texto');
      await conn.sendMessage(m.chat, { text: res }, { quoted: m });
    }

    await m.react('✔️');
    console.log('[SUCCESS] Contenido enviado correctamente');

  } catch (err) {
    console.error('[ERROR] testYtmp3Full:', err);
    await m.react('✖️');
    return conn.reply(m.chat, '⚠ Se produjo un error al obtener el contenido\n' + (err.message || err), m);
  }
};

testYtmp3Full.command = ['testytmp3full'];
testYtmp3Full.tags = ['descargas'];
testYtmp3Full.group = true;

export default testYtmp3Full;
