import translate from '@vitalets/google-translate-api'
import fetch from 'node-fetch'

var handler = async (m, { conn, usedPrefix, command, args }) => {
try {
let text = args.join(' ') || m.quoted?.text
if (!text) return conn.reply(m.chat, '《✧》 Escribe o responde un texto para traducirlo.', m)

const iconUrl = "https://i.ibb.co/JWjZXhNX/b50eeb86ca86.jpg"
const bigUrl = "https://i.ibb.co/JWjZXhNX/b50eeb86ca86.jpg"

const iconBuffer = await (await fetch(iconUrl)).buffer()
const bigBuffer = await (await fetch(bigUrl)).buffer()

const fkontak = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast"
  },
  message: {
    productMessage: {
      product: {
        productImage: {
          mimetype: "image/jpeg",
          jpegThumbnail: iconBuffer
        },
        title: `⌗ֶㅤ𝐓𝐫𝐚𝐝𝐮𝐜𝐭𝐨𝐫 𝐝𝐞 𝐥𝐚 𝐒𝐨𝐦𝐛𝐫𝐚 ⚜`,
        description: "« Las lenguas del mundo se inclinan ante la Sombra. »",
        currencyCode: "USD",
        priceAmount1000: 0,
        retailerId: "traductor"
      },
      businessOwnerJid: "584242773183@s.whatsapp.net"
    }
  }
}

const buttons = [
  { buttonId: `${usedPrefix + command} en ${text}`, buttonText: { displayText: '🇺🇸 Inglés' }, type: 1 },
  { buttonId: `${usedPrefix + command} es ${text}`, buttonText: { displayText: '🇪🇸 Español' }, type: 1 },
  { buttonId: `${usedPrefix + command} pt ${text}`, buttonText: { displayText: '🇧🇷 Portugués' }, type: 1 },
  { buttonId: `${usedPrefix + command} fr ${text}`, buttonText: { displayText: '🇫🇷 Francés' }, type: 1 },
  { buttonId: `${usedPrefix + command} it ${text}`, buttonText: { displayText: '🇮🇹 Italiano' }, type: 1 },
  { buttonId: `${usedPrefix + command} de ${text}`, buttonText: { displayText: '🇩🇪 Alemán' }, type: 1 }
]

if (args[0] && args[0].length === 2) {
  let lang = args[0]
  let content = args.slice(1).join(' ') || m.quoted?.text
  await m.react('🕒')
  const result = await translate(content, { to: lang, autoCorrect: true })
  await conn.reply(m.chat, `✦ Traducción (${lang}):\n\n${result.text}`, m)
  return await m.react('✔️')
}

await conn.sendMessage(
  m.chat,
  {
    text: '✦ Selecciona el idioma al que deseas traducir:',
    footer: 'Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ⚜',
    buttons,
    headerType: 1,
    contextInfo: {
      externalAdReply: {
        title: "Shadow Garden ┊ Traductor Arcano",
        body: "El conocimiento se somete a la Sombra.",
        mediaType: 1,
        thumbnail: bigBuffer,
        renderLargerThumbnail: true,
        showAdAttribution: false,
        sourceUrl: "https://google.com"
      }
    }
  },
  { quoted: fkontak }
)

} catch (e) {
await m.react('✖️')
conn.reply(
  m.chat,
  `⚠︎ Ocurrió un error ejecutando *${usedPrefix + command}*.\n\n${e.message}`,
  m
)
}}

handler.help = ['traducir']
handler.tags = ['utils']
handler.command = ['traducir']

export default handler
