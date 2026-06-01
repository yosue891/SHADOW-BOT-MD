import fs from 'fs'
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {

  let tags = {
    info: 'ᴍᴇɴᴜ ɪɴғᴏ',
    anime: 'ᴍᴇɴᴜ ᴀɴɪᴍᴇ',
    buscador: 'ᴍᴇɴᴜ ʙᴜsᴄᴀᴅᴏʀ',
    downloader: 'ᴍᴇɴᴜ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ',
    fun: 'ᴍᴇɴᴜ ғᴜɴ',
    grupo: 'ᴍᴇɴᴜ ɢʀᴜᴘᴏ',
    ai: 'ᴍᴇɴᴜ ᴀɪ',
    game: 'ᴍᴇɴᴜ ɢᴀᴍᴇ',
    serbot: 'ᴍᴇɴᴜ ᴊᴀᴅɪʙᴏᴛ',
    main: 'ᴍᴇɴᴜ ᴍᴀɪɴ',
    nable: 'ᴍᴇɴᴜ ᴏɴ / ᴏғғ',
    nsfw: 'ᴍᴇɴᴜ ɴsғᴡ',
    owner: 'ᴍᴇɴᴜ ᴏᴡɴᴇʀ',
    sticker: 'ᴍᴇɴᴜ sᴛɪᴄᴋᴇʀ',
    tools: 'ᴍᴇɴᴜ ᴛᴏᴏʟs',
    gacha: 'MENU GACHA',
    rpg: 'MENU RPG'
  }

  let header = '*– %category*'
  let body = '│  ◦ %cmd'
  let footer = '└––'
  let after = `🪴 Shadow-BOT-MD - Tu asistente oscuro y elegante`

  let user = global.db.data.users[m.sender]
  let nombre = await conn.getName(m.sender)
  let premium = user.premium ? '✅ Sí' : '❌ No'
  let limite = user.limit || 0
  let totalreg = Object.keys(global.db.data.users).length
  let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length

  function clockString(seconds) {
    let h = Math.floor(seconds / 3600)
    let m = Math.floor(seconds % 3600 / 60)
    let s = Math.floor(seconds % 60)
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
  }

  let muptime = clockString(process.uptime())

  let infoUser = `
ʜᴏʟᴀ, ${nombre}
ꜱᴏʏ 🪴 Shadow-BOT-MD 🪴, ʟɪꜱᴛᴏ ᴘᴀʀᴀ ᴀʏᴜᴅᴀʀᴛᴇ

*乂 ɪɴꜰᴏ ᴅᴇʟ ᴜꜱᴜᴀʀɪᴏ*
┌  ◦ ᴇꜱᴛᴀᴅᴏ: ᴜꜱᴜᴀʀɪᴏ
│  ◦ ᴘʀᴇᴍɪᴜᴍ: ${premium}
└  ◦ ʟíᴍɪᴛᴇ: ${limite}

*乂 ɪɴꜰᴏ ᴅᴇʟ ʙᴏᴛ*
┌  ◦ ɢʀᴜᴘᴏꜱ: ${groupsCount}
│  ◦ ᴛɪᴇᴍᴘᴏ ᴀᴄᴛɪᴠᴏ: ${muptime}
│  ◦ ᴜsᴜᴀʀɪᴏs: ${totalreg}
└  ◦ ᴘʟᴀᴛᴀꜰᴏʀᴍᴀ: ʟɪɴᴜx
`.trim()

  let commands = Object.values(global.plugins).filter(v => v.help && v.tags).map(v => ({
    help: Array.isArray(v.help) ? v.help : [v.help],
    tags: Array.isArray(v.tags) ? v.tags : [v.tags]
  }))

  let menu = []
  for (let tag in tags) {
    let cmds = commands
      .filter(v => v.tags.includes(tag))
      .map(v => v.help.map(cmd => body.replace(/%cmd/g, usedPrefix + cmd)).join('\n'))
      .join('\n')

    if (cmds) {
      menu.push(header.replace(/%category/g, tags[tag]) + '\n' + cmds + '\n' + footer)
    }
  }

  let finalMenu = infoUser + '\n\n' + menu.join('\n\n') + '\n' + after
  let imagen = 'https://cdn.adoolab.xyz/dl/760d46e7.jpg'

  let media = await prepareWAMessageMedia({ image: { url: imagen } }, { upload: conn.waUploadToServer })

  const interactive = proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({ text: finalMenu }),
    footer: proto.Message.InteractiveMessage.Footer.create({ text: "🪴 Shadow-BOT-MD 🪴" }),
    header: proto.Message.InteractiveMessage.Header.create({
      hasMediaAttachment: true,
      imageMessage: media.imageMessage
    }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
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
    })
  })

  const msg = generateWAMessageFromContent(m.chat, {
    message: {
      interactiveMessage: interactive
    }
  }, { quoted: m })

  await conn.relayMessage(m.chat, msg.message, {})
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu','help','menú','allmenu','menucompleto']
handler.register = true

export default handler
