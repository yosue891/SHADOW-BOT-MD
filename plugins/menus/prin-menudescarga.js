import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys";
import fetch from "node-fetch";

let handler = async (m, { conn, usedPrefix }) => {
    const delay = ms => new Promise(res => setTimeout(res, ms))

    let after = '🪴 ღSHADOW-BOT-MD༻๖ۣۜ◥ὦɧ◤'
    let user = global.db.data.users[m.sender]
    let nombre = await conn.getName(m.sender)
    let registrado = user?.registered ? '✅ Sí' : '❌ No'
    let limite = user?.limit || 0
    let totalreg = Object.keys(global.db.data.users).length
    let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length
    let muptime = clockString(process.uptime())

    function clockString(seconds) {
        let h = Math.floor(seconds / 3600)
        let m = Math.floor(seconds % 3600 / 60)
        let s = Math.floor(seconds % 60)
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
    let imagenUrl = 'https://u.pone.rs/qhsqizgs.jpg'

    let media;
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);
        let res = await fetch(imagenUrl, { signal: controller.signal });
        if (res.ok) {
            let bufferImage = await res.buffer();
            media = await prepareWAMessageMedia(
                { image: bufferImage },
                { upload: conn.waUploadToServer }
            );
        }
    } catch {
        media = null;
    }

    if (!media) return m.reply('❌ No se pudo cargar la imagen para el menú.')

    const msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: media ? {
                        hasMediaAttachment: true,
                        imageMessage: media.imageMessage 
                    } : undefined,
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
                                                { header: "todo", title: "Menu completo", description: "Ver todos los comandos", id: `${usedPrefix}allmenu` }
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
