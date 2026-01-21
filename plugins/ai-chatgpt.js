import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {

    // 1. Mensaje de ayuda si no escriben pregunta
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
        // 2. Estado "escribiendo..."
        await conn.sendPresenceUpdate('composing', m.chat)

        // 3. Reacción de cerebro 🧠
        try {
            await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })
        } catch (e) {}

        // 4. System Prompt (identidad del bot)
        let username = m.pushName || "amigo"
        let systemPrompt = `
        Eres un asistente inteligente y útil en WhatsApp.
        Tu nombre: ShadowGPT.
        El usuario que te habla se llama: ${username}.
        Responde en español, de forma clara, amable y directa.
        `.trim()

        // 5. Llamada al servidor Pollinations (modelo tipo GPT)
        let apiUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai&system=${encodeURIComponent(systemPrompt)}`

        let req = await fetch(apiUrl)
        let response = await req.text()

        if (!response) throw new Error('No se pudo obtener respuesta del servidor.')

        // 6. Enviar respuesta al usuario
        await conn.sendMessage(m.chat, { text: response }, { quoted: m })

        // Reacción de éxito
        try {
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        } catch (e) {}

    } catch (error) {
        console.error(error)

        // Reacción de error
        try {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        } catch (e) {}

        await conn.sendMessage(m.chat, { text: '❌ *Ocurrió un error al conectar con el servidor.*' }, { quoted: m })
    }
}

// Comandos disponibles
handler.command = /^(openai|chatgpt|ia|ai|chatgpt2|ia2)$/i
handler.help = ['ai <pregunta>', 'chatgpt <pregunta>']
handler.tags = ['ai']
handler.group = true

export default handler
