import fs from 'fs'
import path from 'path'
import { prepareWAMessageMedia } from '@whiskeysockets/baileys'

const LINK = 'https://anubissuport.netlify.app'
const BANNER_PATH = path.join(process.cwd(), 'db', 'fotos', 'banner.jpg')

/**
 * Prueba de vista previa enriquecida para enlaces.
 *
 * Se adapta al formato de plugins de SHADOW-BOT-MD: el primer argumento es
 * el mensaje y `conn` es el socket de Baileys.
 */
const handler = async (m, { conn }) => {
  try {
    const jid = m.chat || m.key?.remoteJid
    if (!jid) throw new Error('No se encontró el chat de destino')

    if (!fs.existsSync(BANNER_PATH)) {
      throw new Error(`No encontré el banner en: ${BANNER_PATH}`)
    }

    const thumb = fs.readFileSync(BANNER_PATH)
    const { imageMessage } = await prepareWAMessageMedia(
      { image: thumb },
      {
        upload: conn.waUploadToServer,
        mediaTypeOverride: 'thumbnail-link'
      }
    )

    await conn.sendMessage(
      jid,
      {
        text: `${LINK}\n\n🎟️ *Anubis Support*\n> Soporte oficial de Anubis Bot`,
        linkPreview: {
          'canonical-url': LINK,
          'matched-text': LINK,
          title: 'Anubis Support',
          description: 'Soporte oficial de Anubis Bot',
          jpegThumbnail: imageMessage?.jpegThumbnail
            ? Buffer.from(imageMessage.jpegThumbnail)
            : thumb,
          highQualityThumbnail: imageMessage
        }
      },
      { quoted: m }
    )
  } catch (e) {
    console.error('[TEST ERROR]', e)

    try {
      await conn.sendMessage(
        m.chat || m.key?.remoteJid,
        { text: `❌ Error test: ${e.message}` },
        { quoted: m }
      )
    } catch (sendError) {
      console.error('[TEST ERROR REPLY]', sendError)
    }
  }
}

handler.help = ['test']
handler.tags = ['test']
handler.command = ['test']

export default handler
