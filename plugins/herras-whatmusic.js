import acrcloud from 'acrcloud';

let acr = new acrcloud({
  host: 'identify-eu-west-1.acrcloud.com',
  access_key: 'c33c767d683f78bd17d4bd4991955d81',
  access_secret: 'bvgaIAEtADBTbLwiPGYlxupWqkNGIjT7J9Ag2vIu'
});

let handler = async (m, { conn, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || '';

  if (/video|audio/.test(mime)) {
    const buffer = await q.download();
    const { status, metadata } = await acr.identify(buffer);
    if (status.code !== 0) throw status.msg;

    const { title, artists, album, genres, release_date } = metadata.music[0];

    const txt = `「✦」Identificación musical

✐ Título » *${title || 'No disponible'}*
ⴵ Artista » *${artists?.map(v => v.name).join(', ') || 'Desconocido'}*
✰ Álbum » *${album?.name || 'No disponible'}*
❒ Género » *${genres?.map(v => v.name).join(', ') || 'No definido'}*
🜸 Lanzamiento » *${release_date || 'No registrado'}*`;

    conn.sendMessage(m.chat, { text: txt, ...rcanal }, { quoted: m });
  } else {
    conn.sendMessage(m.chat, {
      text: `❒ Etiqueta un *audio o video corto* con el comando *${usedPrefix + command}* para identificar la música.`,
      ...rcanal
    }, { quoted: m });
  }
};

handler.help = ['whatmusic'];
handler.tags = ['tools'];
handler.command = ['shazam', 'whatmusic'];
//handler.coin = 24;

export default handler;
