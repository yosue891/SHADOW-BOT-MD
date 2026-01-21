import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {

    if (!text) {
        let helpMsg =
        `🧠 *Comando de Inteligencia Artificial (GPT)*\n\n` +
        `❖ *Uso:*\n` +
        `Escribe tu pregunta después del comando.\n\n` +
        `❖ *Ejemplos:*\n` +
        `▸ ${usedPrefix + command} Dame un plan para aprender inglés en 1 mes\n` +
        `▸ ${usedPrefix + command} Escríbeme un código para una página web simple\n` +
        `▸ ${usedPrefix + command} Cuéntame un chiste`

        return conn.sendMessage(m.chat, { text: helpMsg }, { quoted: m })
    }

    try {
        await conn.sendPresenceUpdate('composing', m.chat)

        try {
            await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })
        } catch (e) {}

        let username = m.pushName || "amigo"
        let systemPrompt = `
        Eres un asistente inteligente y útil en WhatsApp.
        Tu nombre: ChatGPT.
        El usuario que te habla se llama: ${username}.
        Responde en español, de forma clara, amable y directa.
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
handler.tags = ['ai']
handler.group = true

export default handler
