import { renderWelcomeCard } from '../lib/welcome-card.js'

const DEFAULT_AVATAR = 'https://i.ibb.co/3NfYh9k/default-avatar.png'
const DEFAULT_BG = 'https://u.pone.rs/glqjtzaj.jpg'

function parseArgs(text) {
  const args = {}
  const regex = /--(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const key = match[1]
    const value = match[2] ?? match[3] ?? match[4]
    args[key] = value
  }
  return args
}

let handler = async (m, { conn, text }) => {
  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const mentioned = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null
    const quoted = m.quoted ? m.quoted.sender : null
    const targetJid = mentioned || quoted || m.sender
    const targetNumber = targetJid.split('@')[0]

    let profileUrl
    try {
      profileUrl = await conn.profilePictureUrl(targetJid, 'image')
    } catch (e) {
      profileUrl = DEFAULT_AVATAR
    }

    const groupMetadata = m.isGroup ? await conn.groupMetadata(m.chat).catch(() => ({})) : {}
    const groupName = groupMetadata.subject || 'Shadow Garden'
    const groupSize = groupMetadata.participants ? `#${groupMetadata.participants.length}` : '—'

    const opts = parseArgs(text || '')

    const imageBuffer = await renderWelcomeCard({
      backgroundUrl: opts.bg || DEFAULT_BG,
      avatarUrl: profileUrl,
      title: opts.texto1 || 'Bienvenido',
      eyebrow: opts.marca || 'S H A D O W  G A R D E N',
      username: `@${targetNumber}`,
      groupName: opts.texto2 || groupName,
      footerLine: opts.texto3 || groupSize
    })

    const desc = groupMetadata.desc?.toString() || 'Sin descripción'
    const chat = global.db?.data?.chats?.[m.chat]
    const mensaje = (chat?.sWelcome || 'Edita con el comando "setwelcome"').replace(/{usuario}/g, `@${targetNumber}`).replace(/{grupo}/g, `*${groupName}*`).replace(/{desc}/g, `${desc}`)
    const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })

    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption: `❀ Bienvenido a *"_${groupName}_"*\n✰ _Usuario_ » @${targetNumber}\n● ${mensaje}\n◆ _Ahora somos ${groupSize.replace('#', '')} Miembros._\nꕥ Fecha » ${fecha}\n૮꒰ ˶• ᴗ •˶꒱a Disfruta tu estadía en el grupo!\n> *➮ Puedes usar _#help_ para ver la lista de comandos.*`,
      mentions: [targetJid]
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (error) {
    console.error('[welcome-banner] Error:', error)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await conn.sendMessage(m.chat, {
      text: `❌ Ocurrió un error generando el banner de bienvenida.\n\n${error?.message || error}`
    }, { quoted: m })
  }
}

handler.help = ['welcome', 'welcome @usuario']
handler.tags = ['grupos']
handler.command = ['welcome', 'bienvenida', 'banner']

export default handler
