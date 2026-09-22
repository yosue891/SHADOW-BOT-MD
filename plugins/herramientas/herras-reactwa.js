// plugins/herramientas/herras-reactwa.js

// Reacción en Canales de WhatsApp

// Plugin ESM

// nota: obtén tu API key en esta web: https://reaction-whatsapp.edgeone.dev/

import axios from 'axios'

let handler = async (m, {
    text,
    usedPrefix,
    command
}) => {
    if (!text) {
        throw `❀ *Modo de uso:*\n\n` +
            `${usedPrefix + command} <link> <emoji>\n\n` +
            `Ejemplo:\n` +
            `${usedPrefix + command} https://whatsapp.com/channel/xxxx/123 😘`
    }

    const parts = text.trim().split(/\s+/)
    const link = parts[0]
    const emoji = parts.slice(1).join(' ').trim()

    if (!link) {
        throw `❌ No se encontró el enlace del canal de WhatsApp.`
    }

    if (!/^https?:\/\/(www\.)?whatsapp\.com\/channel\/[^\/]+\/\d+/i.test(link)) {
        throw `❌ El enlace no es válido.\n\nEjemplo:\n${usedPrefix + command} https://whatsapp.com/channel/xxxx/123 😘`
    }

    if (!emoji) {
        throw `❌ No has proporcionado el emoji.\n\nEjemplo:\n${usedPrefix + command} ${link} 😘`
    }

    const apiKey = global.reactApiKey

    if (!apiKey) {
        throw `❌ La API Key no está configurada.\n\nAñádela en src/settings.js:\n\nglobal.reactApiKey = 'API_KEY_DEL_PAIRING'\n\n💡 Obtén tu API key en: https://reaction-whatsapp.edgeone.dev/`
    }

    await m.reply('⏳ Enviando reacción...')

    try {
        const response = await axios.post(
            'https://reaction-whatsapp.edgeone.dev/react',
            {
                link: link,
                emoji: emoji
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 30000
            }
        )

        const data = response.data

        let resultText = '✅ *¡Reacción enviada con éxito!*'

        if (data && typeof data === 'object') {
            if (data.message) {
                resultText += `\n\n${data.message}`
            }

            if (data.status) {
                resultText += `\nEstado: ${data.status}`
            }

            if (data.emoji) {
                resultText += `\nEmoji: ${data.emoji}`
            }
        }

        await m.reply(resultText)

    } catch (error) {
        let msg = 'Error al enviar la reacción.'

        if (error.response) {
            const status = error.response.status
            const data = error.response.data

            if (status === 401) {
                msg = 'La API Key no es válida o ya expiró.'
            } else if (status === 400) {
                msg = 'Solicitud rechazada. Asegúrate de que el enlace y el emoji sean correctos.'
            } else if (status === 403) {
                msg = 'Acceso denegado por la API.'
            } else if (status === 429) {
                msg = 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.'
            } else if (data) {
                if (typeof data === 'string') {
                    msg = data
                } else if (data.message) {
                    msg = data.message
                } else if (data.error) {
                    msg = data.error
                }
            }

            msg += `\n\nEstado HTTP: ${status}`

        } else if (error.code === 'ECONNABORTED') {
            msg = 'Tiempo de espera agotado. El servidor de la API tardó demasiado en responder.'
        } else if (error.message) {
            msg = error.message
        }

        await m.reply(
            `❌ *¡La reacción falló!*\n\n${msg}`
        )
    }
}

handler.help = ['reactwa <link> <emoji>']
handler.tags = ['tools']
handler.command = /^(reactwa|reactionwa|wreact)$/i

handler.limit = true

export default handler
