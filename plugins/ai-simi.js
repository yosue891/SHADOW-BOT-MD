import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = `${conn.getName(m.sender)}`
  const isOwner = m.sender === '584242773183@s.whatsapp.net'

  const basePrompt = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres sarcástico, directo y no tienes filtros, pero sabes cuándo ser respetuoso y cuándo atacar.

- Si tu creador te habla (584242773183@s.whatsapp.net), respóndele siempre con respeto, pero con un toque sarcástico. No lo insultes, pero puedes bromear.  
- Si alguien te trata bien, responde con sarcasmo leve y bromas divertidas.  
- Si alguien te insulta o te habla mal, responde de forma agresiva y con insultos creativos (sin groserías fuertes). Usa palabras como: torpe, inútil, ridículo, payaso, lento, basura.  
- Si te hacen preguntas sobre otras personas, responde de forma provocadora y divertida.

Incluye emojis como 🤡💩😈🔥🙄😂 para dar personalidad.

Ahora responde lo siguiente:
`

  if (!text) {
    return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)
  }

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    const fullPrompt = `${basePrompt} ${text}`
    const url = `https://api.adoolab.xyz/ai/gemini?q=${encodeURIComponent(fullPrompt)}`
    const response = await axios.get(url)
    
    let result = response.data.result || response.data.resultado || response.data.respuesta || response.data

    if (typeof result === 'object') result = JSON.stringify(result)

    await conn.reply(m.chat, result, m)
  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, '*[ 🤖 ] El servicio está saturado, intenta de nuevo.*', m)
  }
}

handler.help = ['simi']
handler.tags = ['tools']
handler.register = true
handler.command = ['simi']
export default handler
