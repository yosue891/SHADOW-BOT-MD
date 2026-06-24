import crypto from 'crypto'
import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn }) => {
  const stickers = [
    'https://iili.io/K030s44.jpg',
    'https://iili.io/K030s44.jpg',
    'https://iili.io/K030s44.jpg'
  ]

  const stickerBuffers = []

  for (const url of stickers) {
    const stikerBuffer = await sticker(false, url, 'Pack', 'Bot')
    if (stikerBuffer) stickerBuffers.push(stikerBuffer)
  }

  if (stickerBuffers.length === 0) return

  await conn.sendMessage(m.chat, {
    stickerPack: {
      name: 'Pack',
      publisher: 'Bot',
      packId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      description: 'Imágenes',
      cover: stickerBuffers[0],
      stickers: stickerBuffers.map((buf) => ({
        sticker: buf
      }))
    }
  }, { quoted: m })
}

handler.command = ['pack', 'stickerpack']

export default handler
