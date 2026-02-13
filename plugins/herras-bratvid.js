import axios from 'axios'
import fs from 'fs'

const fetchStickerVideo = async (text) => {
  const response = await axios.get(`https://skyzxu-brat.hf.space/brat-animated`, { params: { text }, responseType: 'arraybuffer' })
  if (!response.data) throw new Error('Error al obtener el video de la API.')
  return response.data
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
const tmp = `./tmp-${Date.now()}.mp4`
fs.writeFileSync(tmp, videoBuffer)

await conn.sendVideoAsSticker(m.chat, tmp, m, {
  packname: texto1,
  author: texto2
})

fs.unlinkSync(tmp)
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
