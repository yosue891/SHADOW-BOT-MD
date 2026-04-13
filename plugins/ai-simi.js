import axios from 'axios'

let chatHistories = {}

let handler = async (m, { conn, text }) => {
  const from = m.sender

  const basePrompt = `
Tu nombre es Simi, una IA sarcástica, directa y sin filtros. Respondes con actitud, humor negro y creatividad.

- Si tu creador (Yosue, 584242773183@s.whatsapp.net) te habla, respóndele con respeto pero con sarcasmo ligero.
- Si alguien te trata bien, responde con humor y sarcasmo suave.
- Si alguien te insulta, responde agresivo con insultos creativos sin groserías fuertes: torpe, inútil, ridículo, payaso, lento, basura.
- Si te preguntan por otras personas, responde provocador y divertido.

Usa emojis como 🤡💩😈🔥🙄😂 para dar personalidad.
`

  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    if (!chatHistories[from]) chatHistories[from] = []

    chatHistories[from].push({ role: "user", content: text })

    const systemPrompt = { role: "system", content: basePrompt }

    const context = [systemPrompt, ...chatHistories[from].slice(-15)]

    const { data } = await axios.post(
      "https://api.safone.dev/api/v1/ai/chat",
      {
        model: "gpt-4o-mini",
        messages: context
      }
    )

    let respuesta =
      data?.result ||
      data?.response ||
      data?.choices?.[0]?.message?.content ||
      data?.text ||
      null

    if (!respuesta) respuesta = "Simi no entendió nada 🤡"

    chatHistories[from].push({ role: "assistant", content: respuesta })

    await conn.reply(m.chat, respuesta, m)

  } catch (e) {
    console.log(e)
    await conn.reply(m.chat, `*[ 🤖 ] Error al conectar con Simi. Intenta de nuevo.*`, m)
  }
}

handler.help = ['simi']
handler.tags = ['tools']
handler.register = true
handler.command = ['simi']

export default handler
