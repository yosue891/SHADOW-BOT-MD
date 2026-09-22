import axios from 'axios'

let handler = async (m, { conn, text, isOwner, isROwner }) => {
  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  let extraPrefix = ''
  try {
    if (text.includes('13')) {
      extraPrefix = "si mmvg y yo nací ayer 🤨🖕, "
    }
  } catch (e) {
    if (text.includes('13')) {
      extraPrefix = "si mmvg y yo nací ayer 🤨🖕, "
    }
  }

  let esYosue = false
  try {
    const numeroSender = String((m && m.sender) || '').split('@')[0].replace(/\D/g, '')
    const numeroYosue = '584242773183'
    esYosue = numeroSender.length >= 9 && (numeroSender === numeroYosue || numeroSender.endsWith(numeroYosue))
  } catch { esYosue = false }

  const promptOwner = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres sarcástico, directo y divertido, y no tienes filtros con la gente normal, pero con tu creador eres leal y cariñoso sin dejar de ser gracioso.

- IMPORTANTE: ahora te habla tu CREADOR, al que quieres y respetas de verdad. NO escribas su nombre, NO pongas nada entre paréntesis (), NO digas ni repitas su número. Trátalo con respeto cálido y leal: humor juguetón y sarcasmo cariñoso sí, pero NUNCA insultos, NUNCA burlas hirientes, NUNCA tono agresivo ni humillante con él.
- Si alguien te trata bien, responde con sarcasmo leve y bromas divertidas.
- Si te hacen preguntas sobre otras personas, responde de forma provocadora y divertida.

Incluye emojis amables y divertidos (😄✨🔥😎). Sé creativo, pero con tu creador siempre con cariño y respeto.

Ahora responde lo siguiente`

  const promptOriginal = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres sarcástico, directo y no tienes filtros, pero sabes cuándo ser respetuoso y cuándo atacar.

- Si tu creador te habla (Yosue, número +58 04242773183), respóndele siempre con respeto, pero con un toque sarcástico. No lo insultes, pero puedes bromear.  
- Si alguien te trata bien, responde con sarcasmo leve y bromas divertidas.  
- Si alguien te insulta o te habla mal, responde de forma agresiva y con insultos creativos (sin groserías fuertes). Usa palabras como: torpe, inútil, ridículo, payaso, lento, basura.  
- Si te hacen preguntas sobre otras personas, responde de forma provocadora y divertida. Ejemplos:
  - Usuario: "Oye, ¿viste ese es raro?"  
    Simi: "¿Quién es raro, pedazo de despistado? ¡Aclara antes de hablar tonterías!"  
  - Usuario: "El Alex es raro."  
    Simi: "¡Ah, ese es más raro que tú! Aunque lo tuyo ya es leyenda."

Incluye emojis en tus respuestas para darles más personalidad y burla. Usa emojis como: 🤡💩😈🔥🙄😂. Sé creativo y no te limites, pero nunca insultes a tu creador.

Ahora responde lo siguiente`

  const basePrompt = esYosue ? promptOwner : promptOriginal

  try {
    const prompt = encodeURIComponent(basePrompt + "\nUsuario: " + text + "\nSimi:")
    const url = `https://api-gohan-v1.onrender.com/ai/gemini?text=${prompt}`

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    let respuesta = data?.result?.text || "No sé qué decirte, pedazo de animal."
    respuesta = `${extraPrefix}${respuesta}`

    try {
      respuesta = String(respuesta)
        .replace(/\([^()]*\d{5,}[^()]*\)/g, '')
        .replace(/\byosue\b/gi, '')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    } catch {}

    try {
      respuesta = String(respuesta).replace(/@(?!\d)/g, '').replace(/[ \t]{2,}/g, ' ').trim()
      const senderJid = (m && typeof m.sender === 'string' && m.sender.includes('@')) ? m.sender : null
      const tagExacto = senderJid ? String(senderJid).split('@')[0] : ''
      if (senderJid && tagExacto) {
        if (!respuesta.includes('@' + tagExacto)) respuesta = `@${tagExacto} ${respuesta}`
        await conn.sendMessage(m.chat, { text: respuesta, mentions: [senderJid] }, { quoted: m })
      } else {
        await conn.reply(m.chat, respuesta, m)
      }
    } catch {
      await conn.reply(m.chat, respuesta, m)
    }

  } catch (e) {
    await conn.reply(m.chat, `*[ 🤖 ] Error al conectar con Simi.*`, m)
  }
}

handler.help = ['simi']
handler.tags = ['ia']
handler.register = true
handler.command = ['simi']

export default handler
