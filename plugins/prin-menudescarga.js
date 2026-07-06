import fs from 'fs'
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = (await import("@whiskeysockets/baileys")).default;

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
*│*  ${usedPrefix}anime <nombre> 
*│*  ${usedPrefix}apk
*│*  ${usedPrefix}facebook
*│*  ${usedPrefix}fb
*│*  ${usedPrefix}instagram
*│*  ${usedPrefix}ig
*│*  ${usedPrefix}mediafire
*│*  ${usedPrefix}play
*│*  ${usedPrefix}mp3doc
*│*  ${usedPrefix}ytmp3doc
*│*  ${usedPrefix}mp4doc
*│*  ${usedPrefix}ytmp4doc
*│*  ${usedPrefix}spotify *<nombre|url>*
*│*  ${usedPrefix}tiktok
*│*  ${usedPrefix}wallpaper
*╰─────────────╯*
`.trim()

    let finalMenu = infoUser + '\n\n' + listaDescargas + '\n\n' + after
    let imagen = 'https://adofiles.vercel.app/dl/58483102.jpg'

    let media = await prepareWAMessageMedia(
        { image: { url: imagen } },
        { upload: conn.waUploadToServer }
    )

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
                                                { header: "Descargas", title: "Menú Descargas", description: "Ver comandos de descarga", id: `${usedPrefix}menudescargas` },
                                                { header: "Info", title: "Estado del Bot", description: "Ver estado y velocidad", id: `${usedPrefix}ping` },
                                                { header: "Owner", title: "Creador", description: "Contacto del creador", id: `${usedPrefix}owner` },
                                                { header: "Auto", title: "Registro", description: "Registro automático", id: `${usedPrefix}reg` }
                                            ]
                                        }
                                    ]
                                })
                            },
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Copiar Código",
                                    id: "123456789",
                                    copy_code: "SHADOW BOT MD - SCRIPT"
                                })
                            },
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Canal de WhatsApp",
                                    url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O",
                                    merchant_url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
                                })
                            },
                            {
                                name: "galaxy_message",
                                buttonParamsJson: JSON.stringify({
                                    mode: "published",
                                    flow_message_version: "3",
                                    flow_token: "1:1307913409923914:293680f87029f5a13d1ec5e35e718af3",
                                    flow_id: "1307913409923914",
                                    flow_cta: "ACCEDE A BOT AI",
                                    flow_action: "navigate",
                                    flow_action_payload: {
                                        screen: "QUESTION_ONE",
                                        params: { user_id: "123456789", referral: "campaign_xyz" }
                                    },
                                    flow_metadata: {
                                        flow_json_version: "201",
                                        data_api_protocol: "v2",
                                        flow_name: "Lead Qualification [en]",
                                        data_api_version: "v2",
                                        categories: ["Lead Generation", "Sales"]
                                    }
                                })
                            }
                        ],
                        messageParamsJson: JSON.stringify({
                            limited_time_offer: {
                                text: "꩜ 𝗠𝗲𝗻𝘂 𝗟𝗶𝘀𝘁",
                                url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O",
                                copy_code: "SHADOW-BOT-MD",
                                expiration_time: 1754613436864329
                            },
                            bottom_sheet: {
                                in_thread_buttons_limit: 2,
                                divider_indices: [1, 2, 3],
                                list_title: "Select Menu",
                                button_title: "⊱✿ ᴍᴇɴᴜ ʟɪsᴛ ✿⊰"
                            },
                            tap_target_configuration: {
                                title: "▸ SHADOW ◂",
                                description: "Menú Principal",
                                canonical_url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O",
                                domain: "https://whatsapp.com",
                                button_index: 0
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
    await delay(400)
}

handler.help = ['menudescargas']
handler.tags = ['downloader']
handler.command = ['menudescargas', 'menudescar']
handler.register = true

export default handler
