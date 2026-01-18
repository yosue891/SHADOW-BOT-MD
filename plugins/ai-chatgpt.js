import axios from "axios";

let handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text) {
    return conn.sendMessage(
      m.chat,
      { text: `❌ ¿Qué quieres preguntar?\n\nEjemplo: ${usedPrefix + command} Qué es Node.js` },
      { quoted: m }
    )
  }

  try {
    await m.react('💬')

    const systemPrompt = `
Eres un asistente claro, directo y objetivo.
No inventas información.
Si no sabes algo, lo dices.
Explicas con ejemplos cuando es útil.
Mantienes un tono neutro y profesional.
    `.trim()

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.5
      },
      {
        headers: {
          "Authorization": "Bearer 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",
          "Content-Type": "application/json"
        }
      }
    )

    const reply = response.data.choices?.[0]?.message?.content || "No pude generar respuesta."

    const fkontak = {
      key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "0@s.whatsapp.net" },
      message: {
        contactMessage: {
          displayName: "🧠 IA Estable",
          vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:IA Estable\nTEL;type=CELL;type=VOICE;waid=0:0\nEND:VCARD"
        }
      }
    }

    await conn.sendMessage(
      m.chat,
      { text: `\`🌤️ IA Estable\`\n\n${reply}` },
      { quoted: fkontak }
    )

    await m.react('🔥')

  } catch (e) {
    console.error(e)
    await m.react('❎')
    conn.reply(m.chat, "❌ Error al conectar con la IA estable.", m)
  }
}

handler.help = ["chatgpt"]
handler.tags = ["ia"]
handler.command = /^(chatgpt)$/i

export default handler
