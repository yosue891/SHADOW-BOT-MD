import axios from 'axios'
import fs from 'fs'
import { exec } from 'child_process'
import baileys from "@whiskeysockets/baileys"
const { generateWAMessageFromContent, proto } = baileys

var handler = async (m, { conn, usedPrefix, command, text }) => {
    let [txt, color] = text.split('|')
    
    if (!txt && !m.quoted) return conn.reply(m.chat, '🌑✦ *Shadow Garden* necesita un mensaje o texto.', m)
    
    let textoFinal = txt || m.quoted.text

    if (!color) {
        const colores = [
            { title: "Blanco", id: `${usedPrefix + command} ${textoFinal}|blanco` },
            { title: "Verde", id: `${usedPrefix + command} ${textoFinal}|verde` },
            { title: "Rojo", id: `${usedPrefix + command} ${textoFinal}|rojo` },
            { title: "Azul", id: `${usedPrefix + command} ${textoFinal}|azul` },
            { title: "Amarillo", id: `${usedPrefix + command} ${textoFinal}|amarillo` },
            { title: "Rosa", id: `${usedPrefix + command} ${textoFinal}|rosa` },
            { title: "Cian", id: `${usedPrefix + command} ${textoFinal}|cian` },
            { title: "Naranja", id: `${usedPrefix + command} ${textoFinal}|naranja` },
            { title: "Morado", id: `${usedPrefix + command} ${textoFinal}|morado` }
        ]

        const interactive = proto.Message.InteractiveMessage.fromObject({
            body: { text: `🌑✦ *Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ Cᴀᴛᴀʟᴏɢᴜᴇ*\n\nEsperando tu elección de color para:\n> *"${textoFinal}"*` },
            footer: { text: "Shadow Garden — The Eminence in Shadow" },
            nativeFlowMessage: {
                buttons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "📜 Elegir Color",
                        sections: [{
                            title: "COLORES DISPONIBLES",
                            rows: colores
                        }]
                    })
                }]
            }
        })

        const msg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: { message: { interactiveMessage: interactive } }
        }, { quoted: m })

        return await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }

    try {
        await m.react('🕒')
        
        const apiKey = "yosoyyo_sk_u8qjoidy"
        const apiUrl = `https://yosoyyo-api-ofc.onrender.com/api/brat?text=${encodeURIComponent(textoFinal)}&color=${color.toLowerCase()}&apiKey=${apiKey}`
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' })

        let user = globalThis.db.data.users[m.sender] || {}
        let name = user.name || m.sender.split('@')[0]
        let pack = user.metadatos || `Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ⚜`
        let auth = user.metadatos2 || `@${name}`

        const img = `./tmp-${Date.now()}.png`
        const webp = `./tmp-${Date.now()}.webp`

        fs.writeFileSync(img, response.data)

        await new Promise((resolve, reject) => {
            exec(`ffmpeg -i ${img} -vcodec libwebp -filter:v "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" ${webp}`, (err) => {
                if (err) reject(err)
                else resolve()
            })
        })

        await conn.sendMessage(m.chat, { 
            sticker: fs.readFileSync(webp), 
            packname: pack, 
            author: auth 
        }, { quoted: m })

        fs.unlinkSync(img)
        fs.unlinkSync(webp)
        await m.react('✔️')

    } catch (e) {
        await m.react('✖️')
        conn.reply(m.chat, `⚠️ Error: ${e.message}`, m)
    }
}

handler.help = ['brat']
handler.tags = ['sticker']
handler.command = ['brat', 'bratcolor']

export default handler
