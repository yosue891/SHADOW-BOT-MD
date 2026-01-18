import fetch from 'node-fetch'

let handler = async (m, { command, text, conn }) => {
  if (!text) return m.reply(`🌑 Ejemplo:\n.${command} ¿Qué es Node.js?`)

  await m.react('🕒')

  try {
    const endpoint = `https://mayapi.ooguy.com/ai-chatgpt?apikey=may-de618680Y&q=${encodeURIComponent(text)}`
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 ShadowBot',
        'Accept': 'application/json'
      }
    })

    const json = await res.json()

    // Captura flexible de la respuesta
    const replyText = json.result || json.answer || json.response || json.text || json.message || null

    if (!replyText || typeof replyText !== 'string') {
      throw new Error(`Respuesta inesperada de la API: ${JSON.stringify(json)}`)
    }

    const fkontak = {
      key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'ChatGPT' },
      message: {
        locationMessage: {
          name: '🧠 ChatGPT',
          jpegThumbnail: await (await fetch('https://files.catbox.moe/dfcy2b.jpg')).buffer(),
          vcard:
            'BEGIN:VCARD\nVERSION:3.0\nN:;ChatGPT;;;\nFN:ChatGPT\nORG:OpenAI\nTITLE:\nitem1.TEL;waid=19709001746:+1 (970) 900-1746\nitem1.X-ABLabel:IA\nX-WA-BIZ-DESCRIPTION:Respuestas refinadas desde las sombras\nX-WA-BIZ-NAME:ChatGPT\nEND:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    }

    await conn.sendMessage(m.chat, {
      text: replyText.trim()
    }, { quoted: fkontak })

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
