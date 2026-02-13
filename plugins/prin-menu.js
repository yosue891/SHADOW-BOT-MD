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
  let after = `🪴 ღNAGI-BOT༻๖ۣۜ◥ὦɧ◤ - Tu asistente anime favorito`

  let user = global.db.data.users[m.sender]
  let nombre = await conn.getName(m.sender)
  let premium = user.premium ? '✅ Sí' : '❌ No'
  let limite = user.limit || 0
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
ꜱᴏʏ 🪴 ღNAGI-BOT༻๖ۣۜ◥ὦɧ◤🪴, ʟɪꜱᴛᴏ ᴘᴀʀᴀ ᴀʏᴜᴅᴀʀᴛᴇ

*乂 ɪɴꜰᴏ ᴅᴇʟ ᴜꜱᴜᴀʀɪᴏ*
┌  ◦ ᴇꜱᴛᴀᴅᴏ: ᴜꜱᴜᴀʀɪᴏ
│  ◦ ᴘʀᴇᴍɪᴜᴍ: ${premium}
└  ◦ ʟíᴍɪᴛᴇ: ${limite}

*乂 ɪɴꜰᴏ ᴅᴇʟ ʙᴏᴛ*
┌  ◦ ɢʀᴜᴘᴏꜱ: ${groupsCount}
│  ◦ ᴛɪᴇᴍᴘᴏ ᴀᴄᴛɪᴠᴏ: ${muptime}
│  ◦ ᴜsᴜᴀʀɪᴏs: ${totalreg}
└  ◦ ᴘʟᴀᴛᴀꜰᴏʀᴍᴀ: ʟɪɴᴜx

*ꜱɪ ᴇɴᴄᴜᴇɴᴛʀᴀꜱ ᴀʟɢᴜ́ɴ ᴇʀʀᴏʀ, ᴘᴏʀ ꜰᴀᴠᴏʀ ᴄᴏɴᴛᴀᴄᴛᴀ ᴀʟ ᴏᴡɴᴇʀ.*
`.trim()

  let commands = Object.values(global.plugins).filter(v => v.help && v.tags).map(v => {
    return {
      help: Array.isArray(v.help) ? v.help : [v.help],
      tags: Array.isArray(v.tags) ? v.tags : [v.tags]
    }
  })

  let menu = []
  for (let tag in tags) {
    let comandos = commands
      .filter(command => command.tags.includes(tag))
      .map(command => command.help.map(cmd => body.replace(/%cmd/g, usedPrefix + cmd)).join('\n'))
      .join('\n')
    if (comandos) {
      menu.push(header.replace(/%category/g, tags[tag]) + '\n' + comandos + '\n' + footer)
    }
  }

  let finalMenu = infoUser + '\n\n' + menu.join('\n\n') + '\n' + after
  let imagen = 'https://files.catbox.moe/3z7wet.jpg'

  let vcard = `BEGIN:VCARD\nVERSION:3.0\nN:;Itachi;;;\nFN:Itachi\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Celular\nEND:VCARD`
  let qkontak = { key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" }, message: { contactMessage: { displayName: "H A Y A B U S A - B O T", vcard: vcard } } }

  let media = await prepareWAMessageMedia({ image: { url: imagen } }, { upload: conn.waUploadToServer })

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: { text: finalMenu },
          footer: { text: "🪴 .ღshadow-BOT༻๖ۣۜ◥ὦɧ◤🪴" },
          header: {
            hasMediaAttachment: true,
            imageMessage: media.imageMessage
          },
          nativeFlowMessage: {
  buttons: [
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "🍃 Canal Oficial",
        url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O/"
      })
    },
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "📸 Instagram",
        url: "https://www.instagram.com/its_ga3b?igsh=MTEwNGI0YjNqamV3dA=="
      })
    },
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "🎵 TikTok",
        url: "https://www.tiktok.com/@gab_zz32?_r=1&_t=ZS-93NFDkvQqV2"
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
      })
        display_text: "💻 qr",
        id: `${usedPrefix}qr`
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
            forwardingScore: 999
          }
        }
      }
    }
  }, { quoted: qkontak })

  await conn.relayMessage(m.chat, msg.message, {})
  await delay(400)
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu','help','menú','allmenu','menucompleto']
handler.register = true

export default handler
