let handler = async (m, { conn, usedPrefix, command }) => {
  const owners = global.owner.map(v => v[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  if (!owners.includes(m.sender)) {
    return conn.reply(m.chat, `❌ Este es un arte prohibido reservado solo para los Maestros de la Organización.`, m)
  }

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''
  
  if (!/video|ptv/.test(mime) && !q.isVideo) {
    return conn.reply(
      m.chat,
      `⚠️ *MODO DE USO*\n\n` +
      `> Responde a un *video* o a un *audio-video (PTV)* y escribe:\n` +
      `> \`${usedPrefix + command}\``,
      m
    )
  }

  await conn.reply(m.chat, `⏳ *Transmutando transmisión... Extrayendo video desde las sombras...*`, m)

  let video
  try {
    video = await conn.downloadMediaMessage(q)
  } catch (e) {
    return conn.reply(m.chat, `❌ Falló la descarga del archivo multimedia. Asegúrate de que el bot pueda ver el mensaje claramente.`, m)
  }

  const canalId = '120363403739366547@newsletter'

  try {
    await conn.sendMessage(canalId, {
      video: video,
      mimetype: 'video/mp4',
      gifPlayback: true,
      ptv: true
    })

    await m.react('🔥')
    return conn.reply(m.chat, `✅ *Misión completada.*\n\n> El video circular fue incrustado con éxito en los registros del canal.`, m)

  } catch (err) {
    return conn.reply(m.chat, `❌ *Fallo al enviar al canal*\n\n> Verifica si los permisos de admin del bot están activos. Error: ${err.message}`, m)
  }
}

handler.help = ['ptvch']
handler.tags = ['owner']
handler.command = ['ptvch', 'ptvchanel', 'ptvstory']
handler.register = true

export default handler
