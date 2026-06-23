import translate from '@vitalets/google-translate-api'

let handler = async (m, { conn, usedPrefix, command, args }) => {
  try {
    let text = args.join(' ') || m.quoted?.text
    if (!text) return conn.reply(m.chat, '《✧》 Escribe o responde un texto para traducirlo.', m)

    const imagenUrl = "https://i.ibb.co/b50eeb86ca86.jpg"

    const fkontak = {
      key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
      },
      message: {
        conversation: `⌗ֶㅤ𝐓𝐫𝐚𝐝𝐮𝐜𝐭𝐨𝐫 𝐝𝐞 𝐥𝐚 𝐒𝐨𝐦𝐛𝐫𝐚 ⚜`
      }
    }

    if (args[0] && args[0].length === 2) {
      let lang = args[0]
      let content = args.slice(1).join(' ') || m.quoted?.text
      if (!content) return conn.reply(m.chat, '《✧》 Escribe el texto que deseas traducir al lado del código de idioma.', m)
      
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

    const enviado = await conn.sendMessage(
      m.chat,
      {
        text: menuTexto,
        contextInfo: {
          externalAdReply: {
            title: "Shadow Garden ┊ Traductor Arcano",
            body: "El conocimiento se somete a la Sombra.",
            mediaType: 1,
            thumbnailUrl: imagenUrl,
            renderLargerThumbnail: true,
            showAdAttribution: false,
            sourceUrl: "https://google.com"
          }
        }
      },
      { quoted: fkontak }
    )

    global.db = global.db || { data: {} }
    global.db.data = global.db.data || {}
    global.db.data.chats = global.db.data.chats || {}
    global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
    
    global.db.data.chats[m.chat].traductorMenuId = enviado.key.id
    global.db.data.chats[m.chat].traductorTexto = text

  } catch (e) {
    console.error('[TRANSLATE ERROR]', e)
    try { await m.react('✖️') } catch (err) {}
    return conn.reply(
      m.chat,
      `⚠︎ Ocurrió un error ejecutando *${usedPrefix + command}*.\n\n${e.message || e}`,
      m
    )
  }
}

const before = async function (m, { conn }) {
  if (!m.text || !m.quoted) return true
  
  const chatData = global.db?.data?.chats?.[m.chat]
  if (!chatData || !chatData.traductorMenuId || !chatData.traductorTexto) return true

  const quotedId = m.quoted.id || m.quoted.key?.id
  if (quotedId !== chatData.traductorMenuId) return true

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
      const result = await translate(chatData.traductorTexto, { to: lang, autoCorrect: true })
      await conn.reply(m.chat, `✦ Traducción (${lang}):\n\n${result.text}`, m)
      await m.react('✔️')
      
      chatData.traductorMenuId = null
      chatData.traductorTexto = null
    } catch (e) {
      try { await m.react('✖️') } catch (err) {}
      console.error(e)
    }
  }
  return true
}

handler.help = ['traducir']
handler.tags = ['utils']
handler.command = ['traducir']

handler.before = before

export default handler
