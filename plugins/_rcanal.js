import fs from 'fs'
import path from 'path'

export async function before(m, { conn }) {
  try {

    let nombreBot = global.botname || 'Bot'
    let bannerFinal = 'https://files.catbox.moe/exo9ty.jpg'


    const botActual = conn.user?.jid?.split('@')[0].replace(/\D/g, '')
    const configPath = path.join('./Sessions/SubBot', botActual, 'config.json')

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath))
        if (config.name) nombreBot = config.name
        if (config.banner) bannerFinal = config.banner
      } catch (err) {
        console.log('⚠️ No se pudo leer config del subbot en rcanal:', err)
      }
    }


    const canales = [global.idcanal, global.idcanal2]
    const newsletterJidRandom = canales[Math.floor(Math.random() * canales.length)]


    global.rcanal = {
      contextInfo: {
        isForwarded: true,
        forwardingScore: 1,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelRD.id,
          serverMessageId: 100,
          newsletterName: channelRD.name,
        },
        externalAdReply: {
          title: nombreBot,
          body: "✎⍴᥆ᥕᥱrᥱძ ᑲᥡ 𝙮𝙤𝙨𝙪𝙚,𝙖𝙙𝙤",
          thumbnailUrl: bannerFinal,
          sourceUrl: "api-adonix.ultraplus.click",
          mediaType: 1,
          renderLargerThumbnail: false
        }
      }
    }
  } catch (e) {
    console.log('Error al generar rcanal:', e)
  }
}
