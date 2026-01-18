import fetch from 'node-fetch'

let handler = async (m, { command, text, conn }) => {
  if (!text) return m.reply(`🌑 Ejemplo:\n.${command} ¿Qué es Node.js?`)

  await m.react('🕒')

  try {
    const endpoint = `https://mayapi.ooguy.com/ai-chatgpt?apikey=may-de618680&q=${encodeURIComponent(text)}`
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 ShadowBot',
        'Accept': 'application/json'
      }
    })

    const json = await res.json()
    const replyText = json.result || json.answer || json.response || json.text || json.message || null

    if (!replyText || typeof replyText !== 'string') {
      throw new Error(`Respuesta inesperada de la API: ${JSON.stringify(json)}`)
    }

    await conn.sendMessage(m.chat, { text: replyText.trim() }, { quoted: m })
    await m.react('✅')
  } catch (e) {
    await m.react('❌')
    m.reply(`🕷️ Error:\n${e.message}`)
  }
}

handler.help = ['chatgpt']
handler.tags = ['ia']
handler.command = ['chatgpt']

export default handler
