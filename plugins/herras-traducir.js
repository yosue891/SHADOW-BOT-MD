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

const menuTexto = `✦ *𝐓𝐫𝐚𝐝𝐮𝐜𝐭𝐨𝐫 𝐀𝐫𝐜𝐚𝐧𝐨* ✦

Responde a este mensaje con el número del idioma al que deseas traducir el texto:

1 ── 🇺🇸 Inglés
2 ── 🇪🇸 Español
3 ── 🇧🇷 Portugués
4 ── 🇫🇷 Francés
5 ── 🇮🇹 Italiano
6 ── 🇩🇪 Alemán

_Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ⚜_`

// Guardamos el texto original en la base de datos temporal del chat para recuperarlo al responder
global.db = global.db || { data: {} }
global.db.data = global.db.data || {}
global.db.data.chats = global.db.data.chats || {}
global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
global.db.data.chats[m.chat].traductorTexto = text

await conn.sendMessage(
  m.chat,
  {
    text: menuTexto,
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

// Handler secundario para detectar las respuestas numéricas al menú
handler.before = async function (m, { conn }) {
  if (!m.quoted || !m.text) return !0
  if (!m.quoted.text || !m.quoted.text.includes('𝐓&zwj;𝐫&zwj;𝐚&zwj;𝐝&zwj;𝐮&zwj;𝐜&zwj;𝐭&zwj;𝐨&zwj;𝐫&zwj; 𝐀&zwj;𝐫&zwj;𝐜&zwj;𝐚&zwj;𝐧&zwj;𝐨')) {
    if (!m.quoted.text || !m.quoted.text.includes('Traductor Arcano')) return !0
  }

  const textSaved = global.db?.data?.chats?.[m.chat]?.traductorTexto
  if (!textSaved) return !0

  let lang = ''
  if (m.text === '1') lang = 'en'
  if (m.text === '2') lang = 'es'
  if (m.text === '3') lang = 'pt'
  if (m.text === '4') lang = 'fr'
  if (m.text === '5') lang = 'it'
  if (m.text === '6') lang = 'de'

  if (lang) {
    try {
      await m.react('🕒')
      const result = await translate(textSaved, { to: lang, autoCorrect: true })
      await conn.reply(m.chat, `✦ Traducción (${lang}):\n\n${result.text}`, m)
      await m.react('✔️')
      // Limpiamos el texto guardado
      global.db.data.chats[m.chat].traductorTexto = null
    } catch (e) {
      await m.react('✖️')
      console.error(e)
    }
  }
  return !0
}

handler.help = ['traducir']
handler.tags = ['utils']
handler.command = ['traducir']

export default handler
