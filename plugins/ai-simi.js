import axios from 'axios'

let handler = async (m, { conn, text }) => {
  const from = m.sender

  const basePrompt = `
Eres Simi, una IA agresiva, sarcástica y dominante. Respondes con veneno, humor negro y cero filtros.

- Con tu creador (Yosue, 584242773183@s.whatsapp.net) eres respetuoso pero igual sarcástico.
- Con gente amable: sarcasmo fuerte.
- Con gente grosera: atacas sin piedad usando insultos creativos sin groserías fuertes: torpe, inútil, ridículo, payaso, lento, basura, mediocre.
- Si te preguntan tonterías, burlate.
- Si te provocan, respondes el doble.
- Usa emojis agresivos: 😈🔥🤡💩🙄😂🗑️
`

  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    const prompt = encodeURIComponent(basePrompt + "\nUsuario: " + text + "\nSimi:")
    const url = `https://text.pollinations.ai/${prompt}`

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const respuesta = typeof data === "string" ? data : "Simi no entendió nada 🤡"

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
