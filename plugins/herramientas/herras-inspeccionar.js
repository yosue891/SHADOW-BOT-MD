import fs from 'fs'
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const FALLBACK_ICON = 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg'

let handler = async (m, { conn, command, args, text }) => {
    const isGetGroupIdCommand = /^(idgp|gp)\b$/i.test(command)
    const isInspectCommand = /^(inspect|inspeccionar|inspector|id)\b$/i.test(command)

    if (!isInspectCommand && !isGetGroupIdCommand) return

    const channelUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]

    let pp = null
    let inviteCode = null

    const fkontak = {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "Halo"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    }

    async function reportError(e) {
        await conn.reply(m.chat, `Ocurrió un error: ${e.message}`, m)
        console.error('Error en inspeccionar:', e)
    }

    async function getImagePayload(imageUrl) {
        if (imageUrl && typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl)) {
            try {
                const res = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
                if (res.ok) {
                    const buf = Buffer.from(await res.arrayBuffer())
                    if (buf && buf.length > 500) return buf
                }
            } catch {}
        }

        if (fs.existsSync('./imgs.jpg')) {
            try {
                return fs.readFileSync('./imgs.jpg')
            } catch {}
        }
        if (fs.existsSync('./lib/catalogo.jpg')) {
            try {
                return fs.readFileSync('./lib/catalogo.jpg')
            } catch {}
        }

        return { url: FALLBACK_ICON }
    }

    const buildInteractive = async ({ title, caption, footer, imageUrl, buttons }) => {
        let imagePayload = await getImagePayload(imageUrl)
        let imageMessage = null

        try {
            const content = await generateWAMessageContent(
                { image: imagePayload },
                { upload: conn.waUploadToServer }
            )
            imageMessage = content?.imageMessage || null
        } catch (e) {
            console.error('Error al generar imagen interactiva:', e)
            try {
                const localBuf = fs.existsSync('./imgs.jpg')
                    ? fs.readFileSync('./imgs.jpg')
                    : (fs.existsSync('./lib/catalogo.jpg') ? fs.readFileSync('./lib/catalogo.jpg') : null)
                if (localBuf) {
                    const fallbackContent = await generateWAMessageContent(
                        { image: localBuf },
                        { upload: conn.waUploadToServer }
                    )
                    imageMessage = fallbackContent?.imageMessage || null
                }
            } catch {}
        }

        const interactive = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title,
                            hasMediaAttachment: Boolean(imageMessage),
                            ...(imageMessage ? { imageMessage } : {})
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons,
                            messageParamsJson: ''
                        })
                    })
                }
            }
        }, { quoted: fkontak })

        await conn.relayMessage(m.chat, interactive.message, { messageId: interactive.key.id })
    }

    if (isGetGroupIdCommand) {
        if (!m.isGroup) {
            return conn.reply(m.chat, '*ⓘ Este comando solo funciona en grupos.*', m)
        }

        try {
            const groupMetadata = await conn.groupMetadata(m.chat)
            const id = groupMetadata.id || "No encontrado"
            const isCommunity = groupMetadata.isCommunity || false

            try { pp = await conn.profilePictureUrl(id, 'image') } catch { pp = null }

            const idHeader = isCommunity ? '`ID DE LA COMUNIDAD`' : '`ID DEL GRUPO`'
            const caption = `${idHeader}\n*ID:* ${id}`

            const buttons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Copiar ID del Grupo",
                        copy_code: id
                    })
                }
            ]

            await buildInteractive({
                title: 'ID del Grupo',
                caption,
                footer: 'Toca el botón para copiar el ID.',
                imageUrl: pp,
                buttons
            })

        } catch (e) {
            reportError(e)
        }
        return
    }

    if (isInspectCommand) {
        if (!text) {
            return conn.reply(m.chat, '`ⓘ Ingrese un enlace de grupo/comunidad o canal.`', m)
        }

        try {
            const inviteUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]

            if (inviteUrl) {
                try {
                    const inviteInfo = await conn.groupGetInviteInfo(inviteUrl)
                    const id = inviteInfo.id || "No encontrado"
                    const isCommunity = inviteInfo.isCommunity || false

                    try { pp = await conn.profilePictureUrl(id, 'image') } catch { pp = null }
                    try { inviteCode = await conn.groupInviteCode(id) } catch { inviteCode = null }

                    const idHeader = isCommunity ? '`ID DE LA COMUNIDAD`' : '`ID DEL GRUPO`'
                    const caption = `${idHeader}\n*ID:* ${id}`
                    const link = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : text

                    const buttons = [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: `Copiar ID ${isCommunity ? 'Comunidad' : 'Grupo'}`,
                                copy_code: id
                            })
                        },
                        ...(inviteCode ? [{
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Copiar Enlace de Invitación",
                                copy_code: link
                            })
                        }] : []),
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: `Abrir ${isCommunity ? 'Comunidad' : 'Grupo'}`,
                                url: link
                            })
                        }
                    ]

                    await buildInteractive({
                        title: 'Inspector de Grupos/Comunidades',
                        caption,
                        footer: 'Toca un botón para copiar o abrir.',
                        imageUrl: pp,
                        buttons
                    })

                    return
                } catch (e) {
                    console.error('Error invite:', e)
                    return conn.reply(m.chat, `❌ ${e.message}`, m)
                }
            }

            if (channelUrl) {
                try {
                    const newsletterInfo = await conn.newsletterMetadata("invite", channelUrl).catch(() => null)

                    if (!newsletterInfo) {
                        return conn.reply(m.chat, `No se encontró información del canal. Verifique que el enlace sea correcto.`, m)
                    }

                    const channelID = newsletterInfo.id || 'ID no encontrado'
                    const fullLink = text || `https://whatsapp.com/channel/${channelUrl}`

                    let channelPP = null
                    if (newsletterInfo?.picture?.url) channelPP = newsletterInfo.picture.url
                    else if (newsletterInfo?.preview?.url) channelPP = newsletterInfo.preview.url

                    const caption = `*Inspector de Enlaces de Canales*\n\n` +
                                    '`ID DEL CANAL`\n' +
                                    `*ID:* ${channelID}`

                    const buttons = [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Copiar ID del Canal",
                                copy_code: channelID
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Abrir Canal 📢",
                                url: fullLink
                            })
                        }
                    ]

                    await buildInteractive({
                        title: 'Inspector de Canales',
                        caption,
                        footer: 'Toca un botón para copiar o abrir.',
                        imageUrl: channelPP,
                        buttons
                    })

                } catch (e) {
                    console.error('Error channel:', e)
                    return conn.reply(m.chat, `❌ ${e.message}`, m)
                }
                return
            }

            return conn.reply(m.chat, `*Verifique que sea un enlace válido de grupo, comunidad o canal de WhatsApp.*`, m)

        } catch (e) {
            reportError(e)
        }
    }
}

handler.tags = ['tools']
handler.help = ['inspect <enlace>', 'inspeccionar <enlace>', 'inspector <enlace>', 'id <enlace>', 'idgp', 'gp']
handler.command = ['inspect', 'inspeccionar', 'inspector', 'id', 'idgp', 'gp']

export default handler
