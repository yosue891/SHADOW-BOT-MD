const pluginConfig = {
  description: 'Envía un video como nota de video circular (PTV).',
  cooldown: 5,
  energi: 1,
  isEnabled: true
}

let handler = async (m, { conn, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg && q.msg.mimetype) || q.mimetype || ''

  if (!/video/.test(mime)) {
    return conn.reply(
      m.chat,
      `⚠️ *MODO DE USO*\n\n` +
      `> Envía un *video* o *responde a un video* y escribe:\n` +
      `> \`${usedPrefix + command}\``,
      m
    )
  }

  await conn.reply(m.chat, `⏳ *Invocando arte circular... Transmutando video a PTV...*`, m)

  let video
  try {
    video = await q.download?.() || await conn.downloadMediaMessage(q)
  } catch (e) {
    return conn.reply(m.chat, `❌ Falló la descarga del video. Error: ${e.message || e}`, m)
  }

  try {
    await conn.sendMessage(m.chat, {
      video: video,
      mimetype: 'video/mp4',
      ptv: true
    }, { quoted: m })

    await m.react('🔥')

  } catch (err) {
    return conn.reply(m.chat, `❌ *Fallo en la transmutación*\n\n> ${err.message}`, m)
  }
}

handler.help = ['ptv']
handler.tags = ['tools']
handler.command = ['ptv', 'pvideo', 'circlevideo']
handler.register = true

export default handler
