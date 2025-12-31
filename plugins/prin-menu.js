import moment from "moment-timezone"
import fs from "fs"
import path from "path"
import fetch from "node-fetch"
const { generateWAMessageFromContent, prepareWAMessageMedia } = (await import("@whiskeysockets/baileys")).default

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const userData = global.db.data.users[m.sender] || {}
    if (!userData.registered) {
      const thumbUrl = 'https://files.catbox.moe/k45sr6.jpg'
      const thumbBuffer = await fetch(thumbUrl).then(res => res.buffer())

      const fkontak = {
        key: { participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
        message: { locationMessage: { name: '🎄 REGISTRO | SHADOW BOT 💫', jpegThumbnail: thumbBuffer } },
        participant: '0@s.whatsapp.net'
      }

      const productMessage = {
        product: {
          productImage: { url: thumbUrl },
          productId: '999999999999999',
          title: `꒰ঌ*˚🎄 ˗ˏˋ REGISTRO ˎˊ˗ 🎁 ꒱`,
          description: `👋 Hola ${m.pushName || 'usuario'}\n\n🌌 Para usar el menú necesitas registrarte.\n\nUsa: *${usedPrefix}register nombre.edad*`,
          currencyCode: 'USD',
          priceAmount1000: '100000',
          retailerId: 1677,
          url: `https://wa.me/${m.sender.split('@')[0]}`,
          productImageCount: 1
        },
        businessOwnerJid: m.sender,
        caption: `🎄 Registro requerido`,
        footer: `🌌 Shadow Bot`,
        interactiveButtons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📝 Registrarse',
              id: `${usedPrefix}register`
            })
          }
        ],
        mentions: [m.sender]
      }

      return await conn.sendMessage(m.chat, productMessage, { quoted: fkontak })
    }

    let menu = {}
    for (let plugin of Object.values(global.plugins)) {
      if (!plugin || !plugin.help) continue
      let taglist = plugin.tags || []
      for (let tag of taglist) {
        if (!menu[tag]) menu[tag] = []
        menu[tag].push(plugin)
      }
    }

    let uptimeSec = process.uptime()
    let hours = Math.floor(uptimeSec / 3600)
    let minutes = Math.floor((uptimeSec % 3600) / 60)
    let seconds = Math.floor(uptimeSec % 60)
    let uptimeStr = `${hours}h ${minutes}m ${seconds}s`

    let botNameToShow = global.botname || ""
    let bannerUrl = global.michipg || ""
    let videoUrl = null

    const senderBotNumber = conn.user.jid.split('@')[0]
    let configPath
    if (conn.user.jid === global.conn.user.jid) {
      configPath = path.join("./Sessions", "config.json")
    } else {
      configPath = path.join("./Sessions/SubBot", senderBotNumber, "config.json")
    }

    if (fs.existsSync(configPath)) {
      try {
        const botConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"))
        if (botConfig.name) botNameToShow = botConfig.name
        if (botConfig.banner) bannerUrl = botConfig.banner
        if (botConfig.video) videoUrl = botConfig.video
      } catch (e) { console.error(e) }
    }

    let txt = `📢 *Canal Oficial del Bot:*
https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O

🎄 ¡Bienvenido al *Shadow Garden Navideño*! 🎄
Soy *${botNameToShow}* ${(conn.user.jid == global.conn.user.jid ? '(Principal 🅥)' : '(Sub-Bot 🅑)')}

> 🕒 *Hora:* ${moment.tz("America/Tegucigalpa").format("HH:mm:ss")}
> 📅 *Fecha:* ${moment.tz("America/Tegucigalpa").format("DD/MM/YYYY")}
> ⛄ *Actividad:* ${uptimeStr}

Aquí tienes la lista de comandos:\n\n`

    for (let tag in menu) {
      txt += `*» 🎁 ${tag.toUpperCase()} 🎁*\n`
      for (let plugin of menu[tag]) {
        for (let cmd of plugin.help) {
          txt += `> ✨ ${usedPrefix + cmd}\n`
        }
      }
      txt += `\n`
    }

    txt += `⚠️ *No olvides:* Si eres Sub-Bot puedes cambiar el nombre con *${usedPrefix}setname*, la imagen con *${usedPrefix}setimagen* y colocar un video con *${usedPrefix}setvid*.\n\n`

    let mediaMessage = null
    if (videoUrl) {
      mediaMessage = await prepareWAMessageMedia(
        { video: { url: videoUrl }, gifPlayback: false },
        { upload: conn.waUploadToServer }
      )
    } else if (bannerUrl) {
      mediaMessage = await prepareWAMessageMedia(
        { image: { url: bannerUrl } },
        { upload: conn.waUploadToServer }
      )
    }

    let profilePic
    try {
      profilePic = await conn.profilePictureUrl(m.sender, 'image')
    } catch {
      profilePic = "https://i.ibb.co/3NfYh9k/default-avatar.png"
    }
    if (!profilePic) profilePic = "https://i.ibb.co/3NfYh9k/default-avatar.png"

    const nativeFlowPayload = {
      buttons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "🎄 𝚂𝚎𝚕𝚎𝚌𝚝 𝙼𝚎𝚗𝚞 🎄",
            sections: [{
              title: "Shadow Garden 🌌",
              highlight_label: "🎄",
              rows: [
                { title: "📊 Status", description: "Estado actual del Reino", id: `${usedPrefix}status`, thumbnail_url: profilePic },
                { title: "🚀 Ping", description: "Velocidad de respuesta sombría", id: `${usedPrefix}ping`, thumbnail_url: profilePic },
                { title: "👤 Creador", description: "Contacto de Yosue, Maestro de las Sombras", id: `${usedPrefix}creador`, thumbnail_url: profilePic }
              ]
            }]
          })
        }
      ],
      messageParamsJson: JSON.stringify({
        bottom_sheet: { button_title: "🎅 Menú Navideño Shadow Garden 🎅" }
      })
    }

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: txt },
            footer: { text: "Shadow Garden • Reino Navideño de las Sombras ❤️🎄" },
            header: {
              hasMediaAttachment: !!mediaMessage,
              ...(mediaMessage?.videoMessage ? { videoMessage: mediaMessage.videoMessage } : {}),
              ...(mediaMessage?.imageMessage ? { imageMessage: mediaMessage.imageMessage } : {})
            },
            nativeFlowMessage: nativeFlowPayload,
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardingScore: 9999999
            }
          }
        }
      }
    }, { quoted: m })

    await conn.relayMessage(m.chat, msg.message, {})

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, "👻 Ocurrió un error al generar el menú.", m)
  }
}

handler.command = ['help', 'menu', 'm']
export default handler
