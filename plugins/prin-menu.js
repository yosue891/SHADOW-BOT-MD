import fs from 'fs'
const { prepareWAMessageMedia, generateWAMessageFromContent } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
  const delay = ms => new Promise(res => setTimeout(res, ms))

  let tags = {
    'info': 'ᴍᴇɴᴜ ɪɴғᴏ',
    'anime': 'ᴍᴇɴᴜ ᴀɴɪᴍᴇ',
    'buscador': 'ᴍᴇɴᴜ ʙᴜsᴄᴀᴅᴏʀ',
    'downloader': 'ᴍᴇɴᴜ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ',
    'fun': 'ᴍᴇɴᴜ ғᴜɴ',
    'grupo': 'ᴍᴇɴᴜ ɢʀᴜᴘᴏ',
    'ai': 'ᴍᴇɴᴜ ᴀɪ',
    'game': 'ᴍᴇɴᴜ ɢᴀᴍᴇ',
    'serbot': 'ᴍᴇɴᴜ ᴊᴀᴅɪʙᴏᴛ',
    'main': 'ᴍᴇɴᴜ ᴍᴀɪɴ',
    'nable': 'ᴍᴇɴᴜ ᴏɴ / ᴏғғ',
    'nsfw': 'ᴍᴇɴᴜ ɴsғᴡ',
    'owner': 'ᴍᴇɴᴜ ᴏᴡɴᴇʀ',
    'sticker': 'ᴍᴇɴᴜ sᴛɪᴄᴋᴇʀ',
    'tools': 'ᴍᴇɴᴜ ᴛᴏᴏʟs',
    'gacha': 'MENU GACHA',
    'rpg': 'MENU RPG'
  }

  let header = '*– %category*'
  let body = '│  ◦ %cmd'
  let footer = '└––'
  let after = `🕷 SHADOW-BOT-MD — Tu asistente oscuro favorito`

  let user = global.db.data.users[m.sender]
  let nombre = await conn.getName(m.sender)
  let premium = user?.premium ? '✅ Sí' : '❌ No'
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
ꜱᴏʏ 🕷 SHADOW-BOT-MD, ʟɪꜱᴛᴏ ᴘᴀʀᴀ ᴀʏᴜᴅᴀʀᴛᴇ

*乂 ɪɴꜰᴏ ᴅᴇʟ ᴜꜱᴜᴀʀɪᴏ*
┌  ◦ ᴘʀᴇᴍɪᴜᴍ: ${premium}
└  ◦ ʟíᴍɪᴛᴇ: ${limite}

*乂 ɪɴꜰᴏ ᴅᴇʟ ʙᴏᴛ*
┌  ◦ ɢʀᴜᴘᴏꜱ: ${groupsCount}
│  ◦ ᴛɪᴇᴍᴘᴏ ᴀᴄᴛɪᴠᴏ: ${muptime}
└  ◦ ᴜsᴜᴀʀɪᴏs: ${totalreg}
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
  let imagen = 'https://files.catbox.moe/h8lydl.jpg'

  let media = await prepareWAMessageMedia(
    { image: { url: imagen } },
    { upload: conn.waUploadToServer }
  )

  const nativeFlowPayload = {
    header: {
      documentMessage: {
        fileName: '🕷 SHADOW-BOT-MD',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileLength: 999999999999,
        jpegThumbnail: media.imageMessage.jpegThumbnail
      },
      hasMediaAttachment: true
    },
    body: { text: '' },
    footer: { text: finalMenu },

    nativeFlowMessage: {
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson:
            '{"title":"𝚂𝚎𝚕𝚎𝚌𝚝 𝙼𝚎𝚗𝚞","sections":[{"title":"Shadow 😊","rows":[{"title":"Menu Completo","description":"Ver todos los comandos","id":".allmenu"},{"title":"Info Bot","description":"Información del bot","id":".infobot"},{"title":"Ping","description":"Velocidad del bot","id":".ping"},{"title":"Status","description":"Estado del bot","id":".status"}]}]}'
        },
        {
          name: 'cta_copy',
          buttonParamsJson: '{"display_text":"Copiar Código","id":"123456789","copy_code":"SHADOW-BOT-MD"}'
        },
        {
          name: 'cta_url',
          buttonParamsJson:
            '{"display_text":"Canal de WhatsApp","url":"https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"}'
        },
        {
          name: 'galaxy_message',
          buttonParamsJson:
            '{"flow_cta":"ᴀᴄᴄᴇᴅᴇ ᴀ ʙᴏᴛ ᴀɪ","flow_action":"navigate","flow_action_payload":{"screen":"QUESTION_ONE"}}'
        }
      ]
    },

    contextInfo: {
      mentionedJid: [m.sender],
      isForwarded: true,
      forwardingScore: 999
    }
  }

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: nativeFlowPayload
      }
    }
  }, { quoted: m })

  await conn.relayMessage(m.chat, msg.message, {})
  await delay(400)
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu','help','menú','allmenu','menucompleto']
handler.register = true

export default handler
