import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

export async function before(m, { conn }) {
  try {
    let nombreBot = global.botname || 'Bot'
    let bannerFinal = 'https://upload.yotsuba.giize.com/u/r2laVJy8.png'

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

    let bannerBuffer = null
    try {
      bannerBuffer = await (await fetch(bannerFinal)).buffer()
    } catch {
      bannerBuffer = null
    }

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
          body: '🌌 Shadow Bot',
          mediaType: 1,
          previewType: 0,
          renderLargerThumbnail: false,
          thumbnail: bannerBuffer,
          jpegThumbnail: bannerBuffer,
          sourceUrl: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O'
        },
        matchedText: ""
      }
    }

  } catch (e) {
    console.log('Error al generar rcanal:', e)
  }
}
