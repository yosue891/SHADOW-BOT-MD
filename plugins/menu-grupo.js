import fs from 'fs'
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
    const delay = ms => new Promise(res => setTimeout(res, ms))

    let tags = {
        'grupo': 'ᴍᴇɴᴜ ɢʀᴜᴘᴏ'
    }

    let header = '– %category'
    let body = '│  ◦ %cmd'
    let footer = '└––'
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

    let commands = Object.values(global.plugins).filter(v => v.help && v.tags).map(v => ({
        help: Array.isArray(v.help) ? v.help : [v.help],
        tags: Array.isArray(v.tags) ? v.tags : [v.tags]
    }))

    let menu = []
    for (let tag in tags) {
        let comandos = commands
            .filter(cmd => cmd.tags.includes(tag))
            .map(cmd => cmd.help.map(c => body.replace(/%cmd/g, usedPrefix + c)).join('\n'))
            .join('\n')

        if (comandos) {
            menu.push(header.replace(/%category/g, tags[tag]) + '\n' + comandos + '\n' + footer)
        }
    }

    let finalMenu = infoUser + '\n\n' + menu.join('\n\n') + '\n' + after
    let imagen = 'https://adofiles.vercel.app/dl/3d55b968.jpg'

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
                                    flow_token: "1:13079134099239
