import WebSocket from 'ws'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import FormData from 'form-data'
import fetch from 'node-fetch'

class Copilot {
    constructor() {
        this.conversationId = null
        this.models = {
            default: 'chat',
            'think-deeper': 'reasoning',
            'gpt-5': 'smart'
        }
        this.headers = {
            origin: 'https://copilot.microsoft.com',
            'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
        }
    }

    async createConversation() {
        let { data } = await axios.post('https://copilot.microsoft.com/c/api/conversations', null, { headers: this.headers })
        this.conversationId = data.id
        return this.conversationId
    }

    async chat(message, { model = 'default' } = {}) {
        if (!this.conversationId) await this.createConversation()
        if (!this.models[model]) throw new Error(`Available models: ${Object.keys(this.models).join(', ')}`)
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1`, { headers: this.headers })
            const response = { text: '', citations: [] }
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    event: 'setOptions',
                    supportedFeatures: ['partial-generated-images'],
                    supportedCards: ['weather', 'local', 'image', 'sports', 'video', 'ads', 'safetyHelpline', 'quiz', 'finance', 'recipe'],
                    ads: { supportedTypes: ['text', 'product', 'multimedia', 'tourActivity', 'propertyPromotion'] }
                }))
                ws.send(JSON.stringify({
                    event: 'send',
                    mode: this.models[model],
                    conversationId: this.conversationId,
                    content: [{ type: 'text', text: message }],
                    context: {}
                }))
            })
            ws.on('message', (chunk) => {
                try {
                    const parsed = JSON.parse(chunk.toString())
                    switch (parsed.event) {
                        case 'appendText':
                            response.text += parsed.text || ''
                        break
                        case 'citation':
                            response.citations.push({ title: parsed.title, icon: parsed.iconUrl, url: parsed.url })
                        break
                        case 'done':
                            resolve(response)
                            ws.close()
                        break
                        case 'error':
                            reject(new Error(parsed.message))
                            ws.close()
                        break
                    }
                } catch (error) {
                    reject(error.message)
                }
            })
            ws.on('error', reject)
        })
    }
}

let handler = async (m, { command, text, conn }) => {
    try {
        if (!text) return m.reply(`*Ejemplo :* .${command} ¿Qué es Nodejs?`)
        let copilot = new Copilot()
        let model
        switch (command) {
            case 'copilot':
                model = 'default'
            break
            case 'copilot-think':
                model = 'think-deeper'
            break
            case 'gpt-5':
                model = 'gpt-5'
            break
            default:
                model = 'default'
            break
        }
        let res = await copilot.chat(text, { model })

        // Mensaje con efecto WhatsApp Business
        const fkontak = {
            key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'Halo' },
            message: {
                locationMessage: {
                    name: '🧠 Copilot *pro*',
                    jpegThumbnail: await (await fetch('https://files.catbox.moe/dfcy2b.jpg')).buffer(),
                    vcard:
                        'BEGIN:VCARD\nVERSION:3.0\nN:;Copilot;;;\nFN:Copilot\nORG:Microsoft\nTITLE:\nitem1.TEL;waid=19709001746:+1 (970) 900-1746\nitem1.X-ABLabel:IA\nX-WA-BIZ-DESCRIPTION:Respuestas sombrías con estilo navideño\nX-WA-BIZ-NAME:Copilot\nEND:VCARD'
                }
            },
            participant: '0@s.whatsapp.net'
        }

        await conn.sendMessage(m.chat, {
            text: res.text.trim()
        }, { quoted: fkontak })

    } catch (e) {
        m.reply(e.message)
    }
}

handler.help = ['copilot', 'copilot-think', 'gpt-5']
handler.command = ['copilot', 'copilot-think', 'gpt-5']
handler.tags = ['ia']

export default handler
            
