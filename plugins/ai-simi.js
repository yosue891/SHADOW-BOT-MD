import axios from 'axios'

let handler = async (m, { conn, text }) => {
  const isOwner = m.sender === '584242773183@s.whatsapp.net'

  const basePrompt = `Tu nombre es Simi, IA con actitud. Sarcástico y directo. Si te habla tu creador (584242773183@s.whatsapp.net) sé respetuoso pero bromea. Si te insultan, ataca con: torpe, inútil, payaso. Usa emojis 🤡💩😈🔥. Responde a: `

  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    const url = `https://api.adoolab.xyz/ai/gemini?q=${encodeURIComponent(basePrompt + text)}`
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (response.data && response.data.respuesta) {
      await conn.reply(m.chat, response.data.respuesta, m)
    } else {
      throw new Error("No se encontró la propiedad respuesta")
    }

  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `*[ 🤖 ] Error al conectar con Simi. Intenta de nuevo.*`, m)
  }
}

handler.help = ['simi']
handler.tags = ['tools']
handler.register = true
handler.command = ['simi']
export default handler
