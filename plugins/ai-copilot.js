import WebSocket from 'ws';
import fetch from 'node-fetch';

async function copilotChat(message, model = 'default') {
    const models = {
        default: 'chat',
        'think-deeper': 'reasoning',
        'gpt-5': 'smart'
    };

    if (!models[model]) throw new Error(`Modelos disponibles: ${Object.keys(models).join(', ')}`);

    const res = await fetch('https://copilot.microsoft.com/c/api/conversations', {
        method: 'POST',
        headers: {
            origin: 'https://copilot.microsoft.com',
            'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
        }
    });

    const { id: conversationId } = await res.json();

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(
            'wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1',
            {
                headers: {
                    origin: 'https://copilot.microsoft.com',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
                }
            }
        );

        const response = { text: '', citations: [] };

        ws.on('open', () => {
            ws.send(JSON.stringify({
                event: 'setOptions',
                supportedFeatures: ['partial-generated-images'],
                supportedCards: ['weather', 'local', 'image', 'sports', 'video', 'ads', 'safetyHelpline', 'quiz', 'finance', 'recipe'],
                ads: { supportedTypes: ['text', 'product', 'multimedia', 'tourActivity', 'propertyPromotion'] }
            }));

            ws.send(JSON.stringify({
                event: 'send',
                mode: models[model],
                conversationId,
                content: [{ type: 'text', text: message }],
                context: {}
            }));
        });

        ws.on('message', (chunk) => {
            try {
                const parsed = JSON.parse(chunk.toString());

                switch (parsed.event) {
                    case 'appendText':
                        response.text += parsed.text || '';
                        break;
                    case 'citation':
                        response.citations.push({
                            title: parsed.title,
                            icon: parsed.iconUrl,
                            url: parsed.url
                        });
                        break;
                    case 'done':
                        resolve(response);
                        ws.close();
                        break;
                    case 'error':
                        reject(new Error(parsed.message));
                        ws.close();
                        break;
                }
            } catch (error) {
                reject(error);
            }
        });

        ws.on('error', reject);
    });
}

async function handler(m, { text, conn }) {
    if (!text) {
        return m.reply("Por favor, ingresa una petición para Copilot.\n> *Ejemplo:* .copilot ¿quién eres?");
    }

    const fkontak = {
        key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'Halo' },
        message: {
            locationMessage: {
                name: 'Copilot AI - Inteligencia Arcana 🌌',
                jpegThumbnail: await (await fetch('https://i.ibb.co/fdjQ3zng/dec97605db05.jpg')).buffer(),
                vcard: 'BEGIN:VCARD\nVERSION:3.0\nN:;Shadow;;;\nFN:Shadow\nORG:Eminence in Shadow\nTITLE:\nitem1.TEL;waid=19709001746:+1 (970) 900-1746\nitem1.X-ABLabel:Shadow\nX-WA-BIZ-DESCRIPTION:Reino de las Sombras\nX-WA-BIZ-NAME:Shadow\nEND:VCARD'
            }
        },
        participant: '0@s.whatsapp.net'
    };

    const processingMsg = await conn.sendMessage(
        m.chat,
        { text: '> *Copilot está procesando tu petición...*' },
        { quoted: fkontak }
    );

    try {
        const result = await copilotChat(text);
        const responseText = result.text || '❌ Sin respuesta';

        await conn.sendMessage(
            m.chat,
            {
                text: responseText,
                edit: processingMsg.key
            }
        );

    } catch (error) {
        console.error(error);
        await conn.sendMessage(
            m.chat,
            {
                text: '❌ Error al conectar con Copilot',
                edit: processingMsg.key
            }
        );
    }
}

handler.help = ['copilot'];
handler.tags = ['ai'];
handler.command = ['copilot'];
handler.limit = true;
handler.group = true;

export default handler;
