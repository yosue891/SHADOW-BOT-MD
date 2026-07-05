import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'
import crypto from 'crypto'
import webp from 'node-webpmux'
import baileys from 'baileys'
import config from '../config.js'

const execAsync = util.promisify(exec)
const downloadContentFromMessage = baileys.downloadContentFromMessage
const generateWAMessageFromContent = baileys.generateWAMessageFromContent

async function addExif(webpBuffer, packname, author) {
  const img = new webp.Image()
  const stickerPackId = crypto.randomBytes(32).toString('hex')
  const json = {
    'sticker-pack-id': stickerPackId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': ['\u{1F916}']
  }
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ])
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)
  await img.load(webpBuffer)
  img.exif = exif
  return await img.save(null)
}

const styles = {
  circle: 'Circulo (recorte redondo)',
  crop: 'Recorte centrado 512x512',
  bw: 'Blanco y negro',
  invert: 'Invertir colores',
  blur: 'Desenfoque',
  pixel: 'Pixelado',
  sepia: 'Sepia',
  neon: 'Bordes tipo neon'
}

const listText =
  '\u25AE\u25AE _Lista de estilos_ (*s* <estilo>)\n\n' +
  Object.keys(styles).map(k => `\u2022 *s ${k}* \u2014 ${styles[k]}`).join('\n') +
  '\n\n\u2022 *s list*'

let handler = async (m, { conn, args }) => {
  const from = m.chat
  if (!from) return

  const opt = (args[0] || '').toLowerCase()

  if (opt === 'list') {
    return conn.sendMessage(from, { text: listText }, { quoted: m })
  }

  if (opt === 'details') {
    try {
      const content = {
        viewOnceMessage: {
          message: {
            interactiveMessage: baileys.proto.Message.InteractiveMessage.fromObject({
              header: { hasMediaAttachment: false, title: config.bot_name || 'Shadow Bot' },
              body: { text: 'Estos son todos los estilos disponibles para crear tu sticker personalizado:\n\n' +
                Object.keys(styles).map(k => `\u2022 *s ${k}* \u2014 ${styles[k]}`).join('\n') },
              nativeFlowMessage: {
                buttons: [{
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({ display_text: 'Ver estilos', url: 'https://github.com/yosue891/SHADOW-BOT-MD' })
                }]
              }
            })
          }
        }
      }
      const msg = generateWAMessageFromContent(from, content, {
        userJid: conn.user?.jid,
        quoted: m
      })
      await conn.relayMessage(from, msg.message, { messageId: msg.key.id })
    } catch (e) {
      await conn.sendMessage(from, { text: listText + '\n\n[DEBUG Error: ' + (e?.message || e) + ']' }, { quoted: m })
    }
    return
  }

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!/image|video/.test(mime)) {
    const helpText =
      `Hola ${m.pushName || 'usuario'}, responde a una *imagen* o *video* para crear tu sticker.\n\n` +
      `\u2022 *s circle* \u2014 circulo\n` +
      `\u2022 *s crop* \u2014 recorte 512x512\n` +
      `\u2022 *s bw* \u2014 blanco y negro\n` +
      `\u2022 *s blur* \u2014 desenfoque\n` +
      `\u2022 *s pixel* \u2014 pixelado\n` +
      `\u2022 *s neon* \u2014 bordes neon\n` +
      `\u2022 *s list* \u2014 ver todos los estilos`

    try {
      const content = {
        viewOnceMessage: {
          message: {
            interactiveMessage: baileys.proto.Message.InteractiveMessage.fromObject({
              header: { hasMediaAttachment: false, title: config.bot_name || 'Shadow Bot' },
              body: { text: helpText },
              nativeFlowMessage: {
                buttons: [{
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({ display_text: 'Ver detalles', id: '.s details' })
                }]
              }
            })
          }
        }
      }
      const msg = generateWAMessageFromContent(from, content, {
        userJid: conn.user?.jid,
        quoted: m
      })
      await conn.relayMessage(from, msg.message, { messageId: msg.key.id })
    } catch (e) {
      await conn.sendMessage(from, { text: helpText + '\n\n[DEBUG Error: ' + (e?.message || e) + ']' }, { quoted: m })
    }
    return
  }

  const isVideo = /video/.test(mime)

  let buffer
  try {
    const msgMedia = q.msg || q
    const dlType = isVideo ? 'video' : 'image'
    const stream = await downloadContentFromMessage(msgMedia, dlType)
    buffer = Buffer.from([])
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
  } catch (e) {
