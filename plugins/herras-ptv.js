import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const pluginConfig = {
    name: 'ptv',
    alias: ['pvideo', 'circlevideo'],
    category: 'tools',
    description: 'Envía un video como nota de video circular (PTV).',
    usage: '.ptv (responde a un video)',
    example: '.ptv',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

let handler = async (m, { sock }) => {
    let video = null
    
    if (m.quoted && m.quoted.isVideo) {
        try {
            video = await m.quoted.download()
        } catch (e) {
            return m.reply(`❌ Falló la descarga del video respondido desde las sombras.`)
        }
    } else if (m.isVideo) {
        try {
            video = await m.download()
        } catch (e) {
            return m.reply(`❌ Falló la descarga del video principal.`)
        }
    }
    
    if (!video) {
        return m.reply(
            `⚠️ *MODO DE USO*\n\n` +
            `> Envía un *video* o *responde a un video* y escribe:\n` +
            `> \`${m.prefix}ptv\``
        )
    }
    
    await m.reply(`⏳ *Invocando arte circular... Transmutando video a PTV...*`)
    
    try {
        await sock.sendMessage(m.chat, {
            video: video,
            mimetype: 'video/mp4',
            ptv: true
        }, { quoted: m })
        
        m.react('🔥')
        
    } catch (err) {
        return m.reply(`❌ *Fallo en la transmutación*\n\n> ${err.message}`)
    }
}

handler.config = pluginConfig

export default handler
