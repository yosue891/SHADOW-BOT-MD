import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys";
import fetch from "node-fetch";

let handler = async (m, { conn, usedPrefix }) => {
    const delay = ms => new Promise(res => setTimeout(res, ms))

    let after = '🪴 ღSHADOW-BOT-MD༻๖ۣۜ◥ὦɧ◤'
    let user = global.db.data.users[m.sender] || {}
    let nombre = await conn.getName(m.sender)
    let registrado = user?.registered ? '✅ Sí' : '❌ No'
    let limite = user?.limit || 0
    let totalreg = Object.keys(global.db.data.users).length
    let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length
    let muptime = clockString(process.uptime() * 1000) // Multiplicado por 1000 para corregir milisegundos

    function clockString(ms) {
        let h = isNaN(ms) ? '00' : Math.floor(ms / 3600000)
        let m = isNaN(ms) ? '00' : Math.floor(ms / 60000) % 60
        let s = isNaN(ms) ? '00' : Math.floor(ms / 1000) % 60
        return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
    }

    let infoUser = `
ʜᴏʟᴀ, ${nombre}
  ꜱᴏʏ 🪴 ღSHADOW-BOT-MD༻๖ۣۜ◥ὦɧ◤🪴, ʟɪꜱᴛᴏ ᴘᴀʀᴀ ᴀʏᴜᴅᴀʀᴛᴇ

乂 ɪɴꜰᴏ ᴅᴇʟ ᴜꜱᴜᴀʀɪᴏ
┌  ◦ ᴇꜱᴛᴀᴅᴏ: ᴜꜱᴜᴀʀɪᴏ
│  ◦ ʀᴇɢɪꜱᴛʀᴀᴅᴏ: ${registrado}
└  ◦ ʟíᴍɪᴛᴇ: ${limite}

乂 ɪɴꜰᴏ ᴅᴇʟ ʙᴏᴛ
┌  ◦ ɢʀᴜᴘᴏꜱ: ${groupsCount}
│  ◦ ᴛɪᴇᴍᴘᴏ ᴀᴄᴛɪᴠᴏ: ${muptime}
│  ◦ ᴜsᴜᴀʀɪᴏs: ${totalreg}
└  ◦ ᴘʟᴀᴛᴀꜰᴏʀᴍᴀ: ʟɪɴᴜx

ꜱɪ ᴇɴᴄᴜᴇɴᴛʀᴀꜱ ᴀʟɢᴜ́ɴ ᴇʀʀᴏʀ, ᴘᴏʀ ꜰᴀᴠᴏʀ ᴄᴏɴᴛᴀᴄᴛᴀ ᴀʟ ᴏᴡɴᴇʀ.
`.trim()

    let listaDescargas = `
*╭──* \`DESCARGAS DE LA SOMBRA\` *⚜︎*
*│* ${usedPrefix}anime <nombre> 
*│* ${usedPrefix}apk
*│* ${usedPrefix}facebook
*│* ${usedPrefix}fb
*│* ${usedPrefix}instagram
*│* ${usedPrefix}ig
*│* ${usedPrefix}mediafire
*│* ${usedPrefix}play
*│* ${usedPrefix}mp3doc
*│* ${usedPrefix}ytmp3doc
*│* ${usedPrefix}mp4doc
*│* ${usedPrefix}ytmp4doc
*│* ${usedPrefix}spotify *<nombre|url>*
*│* ${usedPrefix}tiktok
*│* ${usedPrefix}wallpaper
*╰─────────────╯*
`.trim()

    let finalMenu = infoUser + '\n\n' + listaDescargas + '\n\n' + after
    let imagenUrl = 'https://adofiles.vercel.app/dl/97e1d009.jpg'

    let bufferImage;
    try {
        // Cambiado a fetch para evitar bloqueos de Axios y mejorar compatibilidad
        let res = await fetch(imagenUrl)
        if (!res.ok) throw new Error('Error en la respuesta del servidor')
        bufferImage = await res.buffer()
    } catch (e) {
        console.error(e)
        bufferImage = null
    }

    if (!bufferImage) return m.reply('❌ No se pudo obtener la imagen del servidor. Verifica que el enlace esté activo.')

    let media = await prepareWAMessageMedia(
        { image: bufferImage },
        { upload: conn.waUploadToServer }
    ).catch(_ => null)

    if (!media || !media.imageMessage) return m.reply('❌ Error al procesar el formato de la imagen con Baileys.')

    const msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        hasMediaAttachment: true,
                        imageMessage: media.imageMessage 
                    },
                    body: { text: finalMenu },
                    footer: { text: "🪴 .ღSHADOW-BOT-MD༻๖ۣۜ◥ὦɧ◤🪴" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({
                                    title: "Select Menu",
                                    sections: [
                                        {
                                            title: "SHADOW-BOT MD",
                                            highlight_label: "POPULAR",
                                            rows: [
                                                { header: "Descargas", title: "Menú Descargas", description: "Ver comandos de descarga", id: `${usedPrefix}menudescargas` }
                                            ]
                                        }
                                    ]
                                })
                            }
                        ],
                        messageParamsJson: JSON.stringify({
                            bottom_sheet: {
                                in_thread_buttons_limit: 1,
                                divider_indices: [],
                                list_title: "Select Menu",
                                button_title: "⊱✿ ᴍᴇɴᴜ ʟɪsᴛ ✿⊰"
                            }
                        })
                    },
                    contextInfo: {
                        mentionedJid: [m.sender],
                        isForwarded: true,
                        forwardingScore: 999
                    }
                }
            }
        }
    }, { quoted: m })

    await conn.relayMessage(m.chat, msg.message, {})
    await delay(250)
}

handler.help = ['menudescargas']
handler.tags = ['downloader']
handler.command = ['menudescargas', 'menudescar']
handler.register = true

export default handler
