import { sticker } from '../lib/sticker.js'
import uploadFile from '../lib/uploadFile.js'
import uploadImage from '../lib/uploadImage.js'
import { webp2png } from '../lib/webp2mp4.js'

let handler = async (m, { conn, args }) => {
    let stiker = false
    let userId = m.sender
    let packstickers = global.db.data.users[userId] || {}
    let texto2 = packstickers.text2 || '🌌❄️ Shadow Garden Navidad'
    let texto1 = ''

    if (args.length > 0) {
        texto1 = args.join(' ').trim() || '🎄 Sombras Festivas'
    } else {
        texto1 = '🎄 Sombras Festivas'
    }

    try {
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || q.mediaType || ''

        if (/webp|image|video/g.test(mime) && q.download) {
            if (/video/.test(mime) && (q.msg || q).seconds > 16)
                return conn.reply(m.chat, '🌌✧ *Las sombras no aceptan videos mayores a 15 segundos...*', m)

            let buffer = await q.download()
            await m.react('🕓')
            let marca = [texto1, texto2]
            stiker = await sticker(buffer, false, marca[0], marca[1])
        } else if (args[0] && isUrl(args[0])) {
            let buffer = await sticker(false, args[0], texto1, texto2)
            stiker = buffer
        } else {
            return conn.reply(m.chat, '🎄《✧》 *Invoca un arte sombrío respondiendo a una imagen o video.*', m)
        }
    } catch (e) {
        await conn.reply(m.chat, '⚠︎🌌 *Las sombras detectaron un error:* ' + e.message, m)
        await m.react('✖️')
    } finally {
        if (stiker) {
            conn.sendFile(m.chat, stiker, 'sticker.webp', '🎅✨ *Sticker invocado por el Shadow Garden en esta navidad...*', m)
            await m.react('✅')
        }
    }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = ['s', 'sticker']

export default handler

const isUrl = (text) => {
    return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)(jpe?g|gif|png)/, 'gi'))
        }
