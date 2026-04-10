import axios from 'axios'
import fs from 'fs'
import { exec } from 'child_process'
import baileys from "@whiskeysockets/baileys"
const { generateWAMessageFromContent, proto } = baileys

var handler = async (m, { conn, usedPrefix, command, text }) => {
    // Si el usuario ya eligió un color (formato: texto|color)
    let [txt, color] = text.split('|')
    
    // Si no hay texto inicial, pedirlo
    if (!txt && !m.quoted) return conn.reply(m.chat, '🌑✦ *Shadow Garden* necesita un mensaje o texto para forjar el sticker.', m)
    
    let textoFinal = txt || m.quoted.text

    // Si no se ha especificado color, mostramos el catálogo estilo Shadow Garden
    if (!color) {
        const colores = [
            { title: "Blanco Clásico", id: `${textoFinal}|blanco`, description: "El brillo puro de las sombras." },
            { title: "Verde Esmeralda", id: `${textoFinal}|verde`, description: "Poder desbordante." },
            { title: "Rojo Carmesí", id: `${textoFinal}|rojo`, description: "Sangre de los culpables." },
            { title: "Azul Profundo", id: `${textoFinal}|azul`, description: "La calma antes de la ejecución." },
            { title: "Amarillo Rayo", id: `${textoFinal}|amarillo`, description: "Velocidad absoluta." },
            { title: "Rosa", id: `${textoFinal}|rosa`, description: "Elegancia en el campo de batalla." },
            { title: "Cian", id: `${textoFinal}|cian`, description: "Claridad mental." }
        ]

        const interactive = proto.Message.InteractiveMessage.fromObject({
            body: { text: `🌑✦ *Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ Cᴀᴛᴀʟᴏɢᴜᴇ*\n\nEsperando tu elección de color para:\n> *"${textoFinal}"*` },
            footer: { text: "Shadow Garden — The Eminence in Shadow" },
            header: { hasMediaAttachment: false },
            nativeFlowMessage: {
                buttons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "📜 Elegir Color",
                        sections: [{
                            title: "COLORES DISPONIBLES",
                            highlight_label: "✨",
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

    // Si ya tenemos el color, procedemos a crear el sticker quieto
    try {
        await m.react('🕒')
        conn.reply(m.chat, `🌑✦ Espera un momento, estoy forjando el color *${color}* que elegiste...`, m)

        const apiKey = "yosoyyo_sk_u8qjoidy"
        const apiUrl = `https://yosoyyo-api-ofc.onrender.com/api/brat?text=${encodeURIComponent(textoFinal)}&color=${color}&apiKey=${apiKey}`
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' })
        const buffer = Buffer.from(response.data, 'utf-8')

        let user = globalThis.db.data.users[m.sender] || {}
        let name = user.name || m.sender.split('@')[0]
        let pack = user.metadatos || `Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ⚜`
        let auth = user.metadatos2 || `@${name}`

        const img = `./tmp-${Date.now()}.png`
        const webp = `./tmp-${Date.now()}.webp`

        fs.writeFileSync(img, response.data)

        // Convertimos a webp estático (sin animar) usando ffmpeg
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
        console.log(e)
        await m.react('✖️')
        conn.reply(m.chat, `⚠️ El poder se descontroló:\n${e.message}`, m)
    }
}

handler.help = ['brat']
handler.tags = ['sticker']
handler.command = ['brat', 'bratcolor']

export default handler
