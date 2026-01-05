let handler = async (m, { conn, usedPrefix }) => {
  try {
    // Detectar usuario objetivo: mención > quoted > texto con @numero
    const getTargetJid = () => {
      if (m.mentionedJid && m.mentionedJid.length > 0) return m.mentionedJid[0]
      if (m.quoted && m.quoted.sender) return m.quoted.sender
      // Fallback: extraer @123456... del texto y convertir a JID
      const match = (m.text || '').match(/@(\d{5,})/)
      if (match) return `${match[1]}@s.whatsapp.net`
      return m.sender
    }

    const who = getTargetJid()

    // Nombres con fallback
    const safeName = async (jid) => {
      try {
        const n = await conn.getName(jid)
        return typeof n === 'string' && n.trim() ? n : jid.split('@')[0]
      } catch {
        return jid.split('@')[0]
      }
    }
    const name = await safeName(who)
    const name2 = await safeName(m.sender)

    // Reaccionar al mensaje (correcto en Baileys)
    await conn.sendMessage(m.chat, { react: { text: '👋', key: m.key } })

    // Texto del saludo
    let caption
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      caption = `\`${name2}\` *hola* \`${name}\` *¿cómo estás?*`
    } else if (m.quoted) {
      caption = `\`${name2}\` *hola* \`${name}\` *¿cómo te encuentras hoy?*`
    } else {
      caption = `\`${name2}\` *saluda a todos los integrantes del grupo, ¿cómo se encuentran?*`
    }

    // Lista de videos nuevos (autoplay tipo GIF)
    const videos = [
      'https://files.catbox.moe/2akfd1.mp4',
      'https://files.catbox.moe/95gidx.mp4',
      'https://files.catbox.moe/f31dxs.mp4',
      'https://files.catbox.moe/ia2xt1.mp4',
      'https://files.catbox.moe/5p0m2e.mp4',
      'https://files.catbox.moe/2akfd1.mp4', // si quieres, puedes eliminar duplicada
      'https://files.catbox.moe/u1ljt8.mp4',
      'https://files.catbox.moe/d9z71j.mp4',
      'https://files.catbox.moe/ng6lk2.mp4',
      'https://files.catbox.moe/s7fm8r.mp4'
    ]
    const video = videos[Math.floor(Math.random() * videos.length)]

    // Enviar mensaje con reproducción automática
    const mentions = who ? [who] : []
    await conn.sendMessage(
      m.chat,
      {
        video: { url: video },
        gifPlayback: true,
        caption,
        mentions,
        contextInfo: {
          externalAdReply: {
            title: 'Shadow Garden',
            body: 'Un saludo desde las sombras…',
            thumbnailUrl: 'https://files.catbox.moe/6fewjd.jpg',
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      },
      { quoted: m }
    )
  } catch (err) {
    // Mensaje de error visible para depurar
    await conn.sendMessage(m.chat, { text: `☽ Error en hola: ${err.message}` }, { quoted: m })
  }
}

handler.help = ['hello/hola @tag']
handler.tags = ['anime']
handler.command = ['hello', 'hola']
handler.group = true
export default handler
