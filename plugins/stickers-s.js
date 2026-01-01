import { sticker } from '../lib/sticker.js';
import fetch from 'node-fetch';

let handler = async (m, { conn, args, usedPrefix, command }) => {

  const chat = global.db.data.users[m.sender] || {}
  if (!chat.registered) {
    const thumbBuffer = await (await fetch('https://iili.io/fXp3swb.jpg')).buffer()

    // Bloque estilo mute (imagen pequeña + vCard)
    const fkontak = {
      key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'Halo' },
      message: {
        locationMessage: {
          name: '📍 Registro denegado por las Sombras 🎄',
          jpegThumbnail: thumbBuffer,
          vcard:
            'BEGIN:VCARD\nVERSION:3.0\nN:;Shadow;;;\nFN:Shadow\nORG:Eminence in Shadow\nTITLE:\nitem1.TEL;waid=584242773183:+58 424 2773183\nitem1.X-ABLabel:Shadow\nX-WA-BIZ-DESCRIPTION:Reino de las Sombras\nX-WA-BIZ-NAME:Shadow\nEND:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    }

    // Mensaje tipo catálogo con imagen grande y botón
    const productMessage = {
      product: {
        productImage: { url: 'https://files.catbox.moe/k45sr6.jpg' },
        productId: '999999999999999',
        title: `꒰ঌ*˚🎄 ˗ˏˋ REGISTRO ˎˊ˗ 🎁 ꒱`,
        description: `👋 Hola ${m.pushName || 'usuario'}\n\n🌌 Para usar el comando necesitas registrarte.\n\nUsa: *${usedPrefix}reg nombre.edad*\n\n📌 Ejemplo: *${usedPrefix}reg shadow.18*`,
        currencyCode: 'USD',
        priceAmount1000: '0',
        retailerId: 1677,
        url: `https://wa.me/584242773183`, // igual que en mute
        productImageCount: 1
      },
      businessOwnerJid: '584242773183@s.whatsapp.net', // sello WhatsApp Business
      caption: `🎄 Registro requerido`,
      footer: `🌌 Shadow Bot`,
      interactiveButtons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '📝 Registrarse',
            id: `${usedPrefix}reg`
          })
        }
      ],
      mentions: [m.sender],
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true, // activar sello WhatsApp Business
          title: 'Shadow • Sistema de Registro',
          body: 'Registro uwu',
          mediaType: 1,
          thumbnailUrl: 'https://files.catbox.moe/k45sr6.jpg',
          sourceUrl: 'https://wa.me/584242773183'
        }
      }
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
