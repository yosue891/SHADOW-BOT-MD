import fetch from 'node-fetch'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const quoted = m.quoted ? m.quoted : m
  const quotedText = quoted.text || quoted.conversation || m.msg?.text || ''

  if (!args[0] && !quotedText) {
    return conn.reply(m.chat, `🚩 *Uso:* ${usedPrefix + command} [idioma] [texto]\n*Ejemplo:* ${usedPrefix + command} en hola como estas`, m)
  }

  let lang = 'es'
  let textToTranslate = text

  if (args[0] && args[0].length === 2) {
    lang = args[0]
    textToTranslate = args.slice(1).join(' ')
  }

  const finalSelection = textToTranslate || quotedText

  if (!finalSelection) return conn.reply(m.chat, '🚩 No encontré texto para traducir.', m)

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(finalSelection)}`

  try {
    const res = await fetch(url)
    const json = await res.json()

    if (!json || !json[0]) throw 'No se obtuvo respuesta del traductor.'

    const translation = json[0].map(part => part[0]).join('')

    const responseMsg = `*— TRADUCCIÓN —*\n\n` +
                        `*Original:* ${finalSelection}\n` +
                        `*Resultado (${lang}):* ${translation}`

    await conn.sendMessage(m.chat, { text: responseMsg }, { quoted: m })
  } catch (e) {
    console.error(e)
    return conn.reply(m.chat, '🚩 Error al conectar con Google Translate.', m)
  }
}

handler.command = ['translate', 'trad', 'tr', 'traducir', 'treaductor', 'transle']
handler.help = ['translate']
handler.tags = ['herramientas']

export default handler
