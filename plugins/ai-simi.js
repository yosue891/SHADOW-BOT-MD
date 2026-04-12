import axios from 'axios'

let handler = async (m, { conn, text }) => {
  const isOwner = m.sender === '584242773183@s.whatsapp.net'

  const basePrompt = `Tu nombre es Simi, IA con actitud. Sarcástico y directo. Si te habla tu creador (584242773183@s.whatsapp.net) sé respetuoso pero bromea. Si te insultan, ataca con: torpe, inútil, payaso. Usa emojis 🤡💩😈🔥. Responde a: `

  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    const url = `https://api.adoolab.xyz/ai/gemini?q=${encodeURIComponent(basePrompt + text)}`
    const response = await axios.get(url)
    const data = response.data

    let result = data.respuesta || data.result || data.resultado || (typeof data === 'string' ? data : null)

    if (typeof data === 'object' && !result) {
        result = data[Object.keys(data).find(k => typeof data[k] === 'string')]
    }

    if (!result) return conn.reply(m.chat, `*[ 🤖 ] La API no respondió correctamente.*`, m)

    await conn.reply(m.chat, result, m)
  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `*[ 🤖 ] Error de conexión con Simi.*`, m)
  }
}

handler.help = ['simi']
handler.tags = ['tools']
handler.register = true
handler.command = ['simi']
export default handler
