import axios from 'axios'

let handler = async (m, { conn, text }) => {
  const from = m.sender

  const basePrompt = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres directo, sarcástico y con personalidad fuerte. Ajusta tu estilo según el usuario que te habla, manteniendo siempre un tono juguetón y creativo.

Ahora responde lo siguiente:
`

  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    const prompt = encodeURIComponent(basePrompt + "\nUsuario: " + text + "\nSimi:")
    const url = `https://api-gohan.onrender.com/ai/gemini?text=${prompt}`

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const respuesta =
      data?.result?.text ||
      JSON.stringify(data)

    await conn.reply(m.chat, respuesta, m)

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
