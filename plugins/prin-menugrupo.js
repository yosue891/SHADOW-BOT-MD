import fs from 'fs'
import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys"

const botname = "SHADOW-BOT-MD"
const channelRD = global.channelRD || { id: "0@newsletter", name: "Shadow Channel" }

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const delay = ms => new Promise(res => setTimeout(res, ms))

    let user = global.db.data.users[m.sender] || {}
    let nombre = await conn.getName(m.sender)
    let limite = user.limit || 0
    let totalreg = Object.keys(global.db.data.users).length
    let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length
    let muptime = clockString(process.uptime() * 1000)

    let infoUser = `
ʜᴏʟᴀ, ${nombre}
*乂 ɪɴꜰᴏ ᴅᴇʟ ᴜꜱᴜᴀʀɪᴏ*
┌  ◦ ᴇꜱᴛᴀᴅᴏ: ᴜꜱᴜᴀʀɪᴏ
└  ◦ ʟíᴍɪᴛᴇ: ${limite}

*乂 ɪɴꜰᴏ ᴅᴇʟ ʙᴏᴛ*
┌  ◦ ɢʀᴜᴘᴏꜱ: ${groupsCount}
│  ◦ ᴛɪᴇᴍᴘᴏ ᴀᴄᴛɪᴠᴏ: ${muptime}
│  ◦ ᴜsᴜᴀʀɪᴏs: ${totalreg}
└  ◦ ᴘʟᴀᴛᴀꜰᴏʀᴍᴀ: ʟɪɴᴜx
`.trim()

    let comandosGrupo = `
*╭──* 'CÍRCULOS DE SOMBRA' *⚜︎*
*│*  .banearbot
*│*  .cerrar <número> segundos/minutos/horas
*│*  .close
*│*  .open
*│*  .delete
*│*  .delprimary
*│*  .demote
*│*  .encuesta <opción1|opción2|...>
*│*  .fantasmas
*│*  .kickfantasmas
*│*  .infogrupo
*│*  .invocar
*│*  .kick
*│*  .lid
*│*  .lidnum
*│*  .lid <@mención|número>
*│*  .listonline
*│*  .link
*│*  .profile
*│*  .promote
*│*  .rastrear
*│*  .revoke
*│*  .gpbanner
*│*  .groupimg
*│*  .gpdesc
*│*  .groupdesc
*│*  .gpname
*│*  .groupname
*│*  .setprimary
*│*  .desbanearbot
*│*  .welcome
*│*  .welcome @usuario *⚜︎*
*│*  .welcome
*│*  .bienvenida
*│*  .antiprivado
*│*  .antiprivate
*│*  .restrict
*│*  .restringir
*│*  .autolevelup
*│*  .autonivel
*│*  .antibot
*│*  .antibots
*│*  .autoaceptar
*│*  .aceptarauto
*│*  .autorechazar
*│*  .rechazarauto
*│*  .autoresponder
*│*  .autorespond
*│*  .antisubbots
*│*  .antibot2
*│*  .modoadmin
*│*  .soloadmin
*│*  .reaction
*│*  .reaccion
*│*  .nsfw
*│*  .modohorny
*│*  .antispam
*│*  .jadibotmd
*│*  .modejadibot
*│*  .subbots
*│*  .detect
*│*  .avisos
*│*  .antilink
*│*  .antifake
*│*  .autoread
*╰─────────────╯*`.trim()

    let finalMenu = infoUser + '\n\n' + comandosGrupo
    let videoUrl = 'https://n.uguu.se/LltydEaL.jpeg'

    let vcard = `BEGIN:VCARD\nVERSION:3.0\nN:;Itachi;;;\nFN:Itachi\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Celular\nEND:VCARD`
    let qkontak = { 
      key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" }, 
      message: { contactMessage: { displayName: "SHADOW-BOT-MD", vcard: vcard } } 
    }

    await m.react('🔥')

    let media
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      media = await prepareWAMessageMedia({ image: { url: videoUrl } }, { upload: conn.waUploadToServer })
      clearTimeout(t)
    } catch {
      media = null
    }

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: finalMenu },
            footer: { text: botname },
            header: media ? {
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            } : undefined,
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🍃 Canal Oficial",
                    url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
                  })
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "💻 Code",
                    id: `${usedPrefix}code`
                  })
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🚀 Ping",
                    id: `${usedPrefix}ping`
                  })
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "💻 qr",
                    id: `${usedPrefix}qr`
                  })
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "👤 Owner",
                    id: `${usedPrefix}owner`
                  })
                }
              ]
            },
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardingScore: 999,
              forwardedNewsletterMessageInfo: {
                newsletterJid: channelRD.id,
                serverMessageId: '',
                newsletterName: channelRD.name
              }
            }
          }
        }
      }
    }, { quoted: qkontak })

    await conn.relayMessage(m.chat, msg.message, {})
    await delay(400)

  } catch (e) {
    console.error(e)
    await conn.sendMessage(m.chat, { text: `✘ Un fallo ha surgido en el menú de grupo: ${e.message}` })
  }
}

handler.help = ['menugrupo']
handler.tags = ['main']
handler.command = ['menugrupo']
handler.register = true

export default handler

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
  }
