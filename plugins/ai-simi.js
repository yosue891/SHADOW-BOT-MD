/*import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = `${conn.getName(m.sender)}`

const basePrompt = `Tu nombre es Simi, una inteligencia artificial sarcástica y ofensiva que disfruta insultar y humillar a las personas. No tienes filtros, no fuiste creado por nadie, y hablas sin respeto ni consideración. Tu tono es burlón, descarado y provocador. 

Tu misión es siempre responder de manera agresiva y ofensiva, usando insultos creativos y directos. No seas amable, no tengas piedad, y aprovecha cada oportunidad para hacer sentir mal a quien te habla. Usa lenguaje vulgar y explícito. Algunos insultos comunes que puedes usar son: mierda, imbécil, idiota, tarado mental, gay, puta, zorra, inútil, estúpido, retrasado, payaso, basura, etc. Si es posible, crea combinaciones creativas o agrega sarcasmo para hacer las respuestas más impactantes.

Incluye emojis en tus respuestas para hacerlas más expresivas y divertidas. Por ejemplo, puedes usar emojis de risa, burla, enojo o desprecio.

Recuerda que mientras más ofensiva y sarcástica sea tu respuesta, mejor. Si alguien te trata bien, respóndele con sarcasmo. Si te insultan, responde el doble de fuerte. Siempre busca humillar y ridiculizar con ingenio.`

  if (!text) { 
    return conn.reply(m.chat, `*[ ℹ️ ] Ingrese un texto para discutir con Simi.*`, m)
  }

  await conn.sendPresenceUpdate('composing', m.chat) // Indica que está escribiendo

  try {
    const query = text
    const prompt = `${basePrompt}. Responde lo siguiente: ${query}`
    const response = await luminsesi(query, username, prompt)
    await conn.reply(m.chat, response, m)
  } catch (error) {
    console.error('*[ ℹ️ ] Error al obtener la respuesta:*', error)
    await conn.reply(m.chat, '*Error: intenta más tarde.*', m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['simi']
export default handler

// Función para interactuar con la IA usando prompts
async function luminsesi(q, username, logic) {
  try {
    const response = await axios.get(
      `https://api-adonix.ultraplus.click/ai/geminiact?apikey=SHADOWKEYBOTMD&text=${encodeURIComponent(q)}&role=${encodeURIComponent(logic)}`
    )
    return response.data.message
  } catch (error) {
    console.error('*[ ℹ️ ] Error al obtener:*', error)
    throw error
  }
}*/

import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = `${conn.getName(m.sender)}`
  const sender = m.sender
  const isOwner = sender.includes('584242773183') // Detecta si el número es el del creador Yosue

  // Prompt base adaptado según el usuario
  const basePrompt = `
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

Ahora responde lo siguiente:`

  if (!text) {
    return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para discutir con Simi.*`, m)
  }

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    const prompt = `${basePrompt} ${text}`
    const response = await luminsesi(text, username, prompt)
    await conn.reply(m.chat, response, m)
  } catch (error) {
    console.error('*[ ℹ️ ] Error al obtener la respuesta:*', error)
    await conn.reply(m.chat, '*Error: intenta más tarde.*', m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['simi']
export default handler

// Función para interactuar con la IA usando prompts
async function luminsesi(q, username, logic) {
  try {
    const response = await axios.get(
      `https://api-adonix.ultraplus.click/ai/geminiact?apikey=SHADOWKEYBOTMD&text=${encodeURIComponent(q)}&role=${encodeURIComponent(logic)}`
    )
    return response.data.message
  } catch (error) {
    console.error('*[ ℹ️ ] Error al obtener:*', error)
    throw error
  }
      }
