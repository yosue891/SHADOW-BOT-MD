import axios from 'axios'
import fs from 'fs'
import { exec } from 'child_process'

const fetchStickerVideo = async (text) => {
  const response = await axios.get(`https://skyzxu-brat.hf.space/brat-animated`, { params: { text }, responseType: 'arraybuffer' })
  if (!response.data) throw new Error('Error al obtener el video de la API.')
  return response.data
}

const convertToWebp = (input, output) => {
  return new Promise((resolve, reject) => {
    exec(
      `ffmpeg -i ${input} -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15" -loop 0 -an -vsync 0 -s 512x512 ${output}`,
      (err) => {
        if (err) reject(err)
        else resolve()
      }
    )
  })
}

var handler = async (m, { conn, usedPrefix, command, text }) => {
try {
text = m.quoted?.text || text
if (!text) return conn.reply(m.chat, '《✧》 Debes responder un mensaje o escribir un texto para generar el sticker.', m)

await m.react('🕒')

let user = globalThis.db.data.users[m.sender] || {}
let name = user.name || m.sender.split('@')[0]
let texto1 = user.metadatos || `Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ⚜`
let texto2 = user.metadatos2 || `@${name}`

const videoBuffer = await fetchStickerVideo(text)
const mp4 = `./tmp-${Date.now()}.mp4`
const webp = `./tmp-${Date.now()}.webp`

fs.writeFileSync(mp4, videoBuffer)

await convertToWebp(mp4, webp)

await conn.sendMessage(
  m.chat,
  { sticker: fs.readFileSync(webp), packname: texto1, author: texto2 },
  { quoted: m }
)

fs.unlinkSync(mp4)
fs.unlinkSync(webp)
await m.react('✔️')

} catch (e) {
await m.react('✖️')
conn.reply(
  m.chat,
  `⚠︎ Se produjo un error ejecutando *${usedPrefix + command}*.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`,
  m
)
}}

handler.help = ['bratvid']
handler.tags = ['sticker']
handler.command = ['bratvid']

export default handler
