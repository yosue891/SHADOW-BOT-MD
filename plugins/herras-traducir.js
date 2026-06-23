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
        priceAmount1000: '0',
        retailId: "traductor"
      },
      businessOwnerJid: "584242773183@s.whatsapp.net"
    }
  }
}

if (args[0] && args[0].length === 2) {
  let lang = args[0]
  let content = args.slice(1).join(' ') || m.quoted?.text
  await m.react('🕒')
  const result = await translate(content, { to: lang, autoCorrect: true })
  await conn.reply(m.chat, `✦ Traducción (${lang}):\n\n${result.text}`, m)
  return await m.react('✔️')
}

const sections = [
  {
    title: 'Idiomas Disponibles',
    rows: [
      { title: '🇺🇸 Inglés', rowId: `${usedPrefix + command} en ${text}`, description: 'Traducir texto a Inglés' },
      { title: '🇪🇸 Español', rowId: `${usedPrefix + command} es ${text}`, description: 'Traducir texto a Español' },
      { title: '🇧🇷 Portugués', rowId: `${usedPrefix + command} pt ${text}`, description: 'Traducir texto a Portugués' },
      { title: '🇫🇷 Francés', rowId: `${usedPrefix + command} fr ${text}`, description: 'Traducir texto a Francés' },
      { title: '🇮🇹 Italiano', rowId: `${usedPrefix + command} it ${text}`, description: 'Traducir texto a Italiano' },
      { title: '🇩🇪 Alemán', rowId: `${usedPrefix + command} de ${text}`, description: 'Traducir texto a Alemán' }
    ]
  }
]

const listMessage = {
  text: '✦ Selecciona el idioma al que deseas traducir:',
  footer: 'Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ⚜',
  title: '✦ Traductor Arcano',
  buttonText: 'Seleccionar Idioma ⚔',
  sections,
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
}

await conn.sendMessage(m.chat, listMessage, { quoted: fkontak })

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
