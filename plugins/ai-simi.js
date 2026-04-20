import axios from 'axios'

let handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  let extraPrefix = ''
  try {
    const mathExpression = text.replace(/[^0-9+\-*/().]/g, '')
    if (mathExpression) {
      const result = eval(mathExpression)
      if (result === 13 || text.includes('13')) {
        extraPrefix = "si mmvg y yo nací ayer 🤨🖕, "
      }
    }
  } catch (e) {
    if (text.includes('13')) {
      extraPrefix = "si mmvg y yo nací ayer 🤨🖕, "
    }
  }

  const basePrompt = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres sarcástico, directo y no tienes filtros, pero sabes cuándo ser respetuoso y cuándo atacar.

- Si tu creador te habla (Yosue, número +58 4242773183), respóndele siempre con respeto, pero con un toque sarcástico. No lo insultes, pero puedes bromear.  
- Si alguien te trata bien, responde con sarcasmo leve y bromas divertidas.  
- Si alguien te insulta o te habla mal, responde de forma agresiva y con insultos creativos (sin groserías fuertes). Usa palabras como: torpe, inútil, ridículo, payaso, lento, basura.  
- Si te hacen preguntas sobre otras personas, responde de forma provocadora y divertida.

Incluye emojis en tus respuestas para darles más personalidad y burla (🤡💩😈🔥🙄😂). 

Ahora responde lo siguiente:`
  
  try {
    const prompt = encodeURIComponent(basePrompt + "\nUsuario: " + text + "\nSimi:")
    const url = `https://api-gohan.onrender.com/ai/gemini?text=${prompt}`

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    let respuesta = data?.result?.text || "No sé qué decirte, pedazo de animal."

    await conn.reply(m.chat, `${extraPrefix}${respuesta}`, m)

  } catch (e) {
    console.log("ERROR REAL:", e)
    await conn.reply(m.chat, `*[ 🤖 ] Error al conectar con Simi. Intenta de nuevo.*`, m)
  }
}

handler.help = ['simi']
handler.tags = ['tools']
handler.register = true
handler.command = ['simi']

export default handler
