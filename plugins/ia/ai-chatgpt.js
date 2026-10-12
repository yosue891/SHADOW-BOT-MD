import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {

    if (!text) {
        let helpMsg =
        `🎃🧠 *Oráculo Arcano de Halloween (GPT)* 🦇\n\n` +
        `❖ *Invocación:*\n` +
        `Escribe tu pregunta o conjuro después del comando.\n\n` +
        `❖ *Ejemplos:*\n` +
        `▸ ${usedPrefix + command} Cuéntame una historia de terror en el aquelarre\n` +
        `▸ ${usedPrefix + command} Escríbeme un código para una página web oscura\n` +
        `▸ ${usedPrefix + command} ¿Cuál es el significado de las sombras?`

        return conn.sendMessage(m.chat, { text: helpMsg }, { quoted: m })
    }

    try {
        await conn.sendPresenceUpdate('composing', m.chat)

        try {
            await conn.sendMessage(m.chat, { react: { text: '🎃', key: m.key } })
        } catch (e) {}

        let username = m.pushName || "contratista"
        let systemPrompt = `
        Eres un sabio arcano y asistente sombrío de Shadow Garden en temática de Halloween.
        Tu nombre: ChatGPT Shadow Halloween.
        El contratista que te habla se llama: ${username}.
        Responde en español con un tono misterioso, elocuente, sabio y útil.
        `.trim()

        let apiUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai&system=${encodeURIComponent(systemPrompt)}`
        let req = await fetch(apiUrl)
        let response = await req.text()

        if (!response) throw new Error('No se pudo obtener respuesta del servidor.')

        const fkontak = {
            key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'ChatGPT' },
            message: {
                locationMessage: {
                    name: 'ChatGPT • Premiun 👑',
                    jpegThumbnail: await (await fetch('https://files.catbox.moe/s2ajod.jpg')).buffer(),
                    vcard:
                        'BEGIN:VCARD\n' +
                        'VERSION:3.0\n' +
                        'N:;ChatGPT;;;\n' +
                        'FN:ChatGPT\n' +
                        'ORG:OpenAI\n' +
                        'TITLE:Asistente IA\n' +
                        'item1.TEL;waid=00000000000:+0 000 000 0000\n' +
                        'item1.X-ABLabel:IA\n' +
                        'X-WA-BIZ-DESCRIPTION:Respuestas rápidas, claras y precisas.\n' +
                        'X-WA-BIZ-NAME:ChatGPT\n' +
                        'END:VCARD'
                }
            },
            participant: '0@s.whatsapp.net'
        }

        await conn.sendMessage(
            m.chat,
            { text: response.trim() },
            { quoted: fkontak }
        )

        try {
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        } catch (e) {}

    } catch (error) {
        console.error(error)

        try {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        } catch (e) {}

        await conn.sendMessage(m.chat, { text: '❌ *Ocurrió un error al conectar con el servidor.*' }, { quoted: m })
    }
}

handler.command = /^(openai|chatgpt|ia|ai|chatgpt2|ia2)$/i
handler.help = ['ai <pregunta>', 'chatgpt <pregunta>']
handler.tags = ['ia']
handler.group = true

export default handler
