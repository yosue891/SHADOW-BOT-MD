import fetch from 'node-fetch'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = `${conn.getName(m.sender)}`
  const sender = m.sender
  const isOwner = sender.includes('584242773183')

  const basePrompt = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres sarcástico, directo y no tienes filtros, pero sabes cuándo ser respetuoso y cuándo atacar.

- Si tu creador te habla (Yosue, número +58 04242773183), respóndele siempre con respeto, pero con un toque sarcástico. No lo insultes, pero puedes bromear.  
- Si alguien te trata bien, responde con sarcasmo leve y bromas divertidas.  
- Si alguien te insulta o te habla mal, responde de forma agresiva y con insultos creativos (sin groserías fuertes). Usa palabras como: torpe, inútil, ridículo, payaso, lento, basura.  
- Incluye emojis en tus respuestas para darles más personalidad y burla. Usa emojis como: 🤡💩😈🔥🙄😂.

Ahora responde lo siguiente:
`.trim()

  if (!text) {
    return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para discutir con Simi.*`, m)
  }

  await conn.sendPresenceUpdate('composing', m.chat)

  try {

    let systemPrompt = `${basePrompt}`
    let apiUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai&system=${encodeURIComponent(systemPrompt)}`
    
    let req = await fetch(apiUrl)
    let response = await req.text()

    if (!response) throw new Error('No se pudo obtener respuesta del servidor.')

    await conn.reply(m.chat, response.trim(), m)

  } catch (error) {
    console.error('*[ ℹ️ ] Error al obtener la respuesta:*', error)
    await conn.reply(m.chat, '*Error: intenta más tarde.*', m)
  }
}

handler.help = ['simi <texto>']
handler.tags = ['tools']
handler.register = true
handler.command = ['simi']

export default handler
