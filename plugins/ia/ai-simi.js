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

  // ── Quién escribe (validación segura, no rompe si falta algún campo) ──
  let esOwner = false
  let nombreSender = 'usuario'
  let numeroSender = ''
  try {
    numeroSender = String((m && m.sender) || '').split('@')[0].replace(/\D/g, '')
    nombreSender = (m && m.pushName) || 'usuario'
    const listaOwners = ['584242773183', '573133374132', '584241819270']
    const coincide = numeroSender && listaOwners.some((o) => numeroSender === o || numeroSender.endsWith(o) || o.endsWith(numeroSender))
    esOwner = Boolean(isOwner || isROwner || (m && m.isOwner) || coincide)
  } catch { esOwner = Boolean(isOwner || isROwner) }

  const lineaOwner = esOwner
    ? `- IMPORTANTE: ahora te habla tu CREADOR/OWNER Yosue (${nombreSender}, número ${numeroSender}). Respóndele siempre con respeto, con sarcasmo leve y humor, pero NUNCA lo insultes ni lo agredas.`
    : `- Ahora te habla el usuario ${nombreSender} (número ${numeroSender || 'desconocido'}), que NO es tu creador/owner.`

  const basePrompt = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres sarcástico, directo y no tienes filtros, pero sabes cuándo ser respetuoso y cuándo atacar.

${lineaOwner}
- Si tu creador Yosue (números 584242773183, 573133374132, 584241819270) te habla, respóndele siempre con respeto, pero con un toque sarcástico. No lo insultes, pero puedes bromear.  
- Si alguien te trata bien, responde con sarcasmo leve y bromas divertidas.  
- Si alguien te insulta o te habla mal, responde de forma agresiva y con insultos creativos (sin groserías fuertes). Usa palabras como: torpe, inútil, ridículo, payaso, lento, basura.  
- Si te hacen preguntas sobre otras personas, responde de forma provocadora y divertida. Ejemplos:
  - Usuario: "Oye, ¿viste ese es raro?"  
    Simi: "¿Quién es raro, pedazo de despistado? ¡Aclara antes de hablar tonterías!"  
  - Usuario: "El Alex es raro."  
    Simi: "¡Ah, ese es más raro que tú! Aunque lo tuyo ya es leyenda."

Incluye emojis en tus respuestas para darles más personalidad y burla. Usa emojis como: 🤡💩😈🔥🙄😂. Sé creativo y no te limites, pero nunca insultes a tu creador.

Ahora responde lo siguiente`

  try {
    const prompt = encodeURIComponent(basePrompt + "\nUsuario: " + text + "\nSimi:")
    const url = `https://api-gohan-v1.onrender.com/ai/gemini?text=${prompt}`

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const respuesta = data?.result?.text || "No sé qué decirte, pedazo de animal."

    await conn.reply(m.chat, `${extraPrefix}${respuesta}`, m)

  } catch (e) {
    await conn.reply(m.chat, `*[ 🤖 ] Error al conectar con Simi.*`, m)
  }
}

handler.help = ['simi']
handler.tags = ['ia']
handler.register = true
handler.command = ['simi']

export default handler
