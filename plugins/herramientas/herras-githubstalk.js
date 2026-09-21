import fetch from 'node-fetch'

let handler = async (m, { conn, args }) => {
  const user = args[0]

  if (!user) {
    return m.reply('🍎 Ingresa el nombre de usuario de *GitHub* que deseas analizar.')
  }

  try {
    const apiUrl = `https://api-killua.vercel.app/api/tools/githubstalk?user=${encodeURIComponent(user)}`
    const res = await fetch(apiUrl)
    const json = await res.json()

    if (!json.success || !json.data) {
      return m.reply(`🥥 No se encontró información para el usuario: *${user}*`)
    }

    await m.reply('🌫️ Consultando en las sombras...')

    const d = json.data

    const caption =
`🌑 𖤐 𝙎𝙃𝘼𝘿𝙊𝙒 𝙂𝘼𝙍𝘿𝙀𝙉 — 𝙂𝙄𝙏𝙃𝙐𝘽 𝙎𝙏𝘼𝙇𝙆𝙀𝙍 𖤐

🍧 Usuario › ${d.username}
🌴 Nombre › ${d.nickname || 'Sin nombre'}
🍓 Bio › ${d.bio || 'Sin biografía'}
🍒 Repos Públicos › ${d.public_repo}
🍎 Seguidores › ${d.followers}
🍦 Siguiendo › ${d.following}
🍍 Ubicación › ${d.location || 'No disponible'}
🥥 Blog › ${d.blog || 'No disponible'}
🌳 Creado › ${new Date(d.created_at).toLocaleDateString()}

🔗 Perfil › ${d.url}`.trim()

    await conn.sendMessage(
      m.chat,
      {
        document: Buffer.alloc(1),
        fileName: 'Shadow-BOT-MD',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileLength: '0',
        pageCount: '1',

        caption,
        image: { url: d.profile_pic },

        contextInfo: {
          mentionedJid: [m.sender],

          forwardingScore: 0,
          isForwarded: true,

          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363403739366547@newsletter',
            serverMessageId: null,
            newsletterName: 'SHADOW-BOT'
          }
        }
      },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)
    await m.reply('🕷️ Las sombras no pudieron obtener la información de GitHub.')
  }
}

handler.help = ['githubstalk', 'ghstalk', 'github']
handler.tags = ['tools']
handler.command = ['githubstalk', 'ghstalk', 'github']
handler.group = false
handler.premium = false

export default handler
