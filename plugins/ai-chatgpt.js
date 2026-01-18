import fetch from 'node-fetch'

let handler = async (m, { command, text, conn }) => {
  if (!text) return m.reply(`🌑 Ejemplo:\n.${command} ¿Qué es Node.js?`)

  await m.react('🧠')

  try {
    const endpoint = `https://mayapi.ooguy.com/ai-chatgpt?apikey=may-de618680Y&q=${encodeURIComponent(text)}`
    const res = await fetch(endpoint)
    const json = await res.json()

    if (!json.result) throw new Error('No se recibió respuesta válida.')

    const fkontak = {
      key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'ShadowGPT' },
      message: {
        locationMessage: {
          name: '🧠 Shadow-GPT',
          jpegThumbnail: await (await fetch('https://files.catbox.moe/dfcy2b.jpg')).buffer(),
          vcard:
            'BEGIN:VCARD\nVERSION:3.0\nN:;ShadowGPT;;;\nFN:ShadowGPT\nORG:Shadow Garden\nTITLE:\nitem1.TEL;waid=19709001746:+1 (970) 900-1746\nitem1.X-ABLabel:IA\nX-WA-BIZ-DESCRIPTION:Respuestas refinadas desde las sombras\nX-WA-BIZ-NAME:ShadowGPT\nEND:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    }

    await conn.sendMessage(m.chat, {
      text: json.result.trim()
    }, { quoted: fkontak })

    await m.react('✅')
  } catch (e) {
    await m.react('❌')
    m.reply(`🕷️ Error:\n${e.message}`)
  }
}

handler.help = ['shadowgpt']
handler.tags = ['ia']
handler.command = ['shadowgpt']

export default handler
