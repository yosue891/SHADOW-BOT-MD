import moment from "moment-timezone"
import fs, { promises as fsp } from "fs"
import path, { dirname, join } from "path"
import { fileURLToPath } from "url"
import fetch from "node-fetch"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const { generateWAMessageFromContent, prepareWAMessageMedia } = (await import("@whiskeysockets/baileys")).default

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function clockString(ms) {
  let h = isNaN(ms) ? "--" : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? "--" : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? "--" : Math.floor(ms / 1000) % 60
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":")
}

async function getBufferFromUrl(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`No se pudo descargar: ${url}`)
  return await r.buffer()
}

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const userData = global.db?.data?.users?.[m.sender] || {}
    const isRegistered = !!userData.registered

    const tz = "America/Tegucigalpa"
    const time = moment.tz(tz).format("HH:mm:ss")
    const date = moment.tz(tz).format("DD/MM/YYYY")

    const _uptime = process.uptime() * 1000
    const uptime = clockString(_uptime)

    const tagUser = "@" + m.sender.split("@")[0]
    const name = (await conn.getName(m.sender)) || "User"
    const meName = (await conn.getName(conn.user?.id || conn.user?.jid || "")) || (global.botname || "Bot")

    let profilePic
    try {
      profilePic = await conn.profilePictureUrl(m.sender, "image")
    } catch {
      profilePic = "https://i.ibb.co/3NfYh9k/default-avatar.png"
    }
    if (!profilePic) profilePic = "https://i.ibb.co/3NfYh9k/default-avatar.png"

    let botNameToShow = global.botname || meName
    let bannerUrl = global.michipg || "https://files.catbox.moe/k45sr6.jpg"
    let videoUrl = null

    const senderBotNumber = conn.user.jid.split("@")[0]
    let configPath
    if (conn.user.jid === global.conn.user.jid) configPath = join("./Sessions", "config.json")
    else configPath = join("./Sessions/SubBot", senderBotNumber, "config.json")

    if (fs.existsSync(configPath)) {
      try {
        const botConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"))
        if (botConfig.name) botNameToShow = botConfig.name
        if (botConfig.banner) bannerUrl = botConfig.banner
        if (botConfig.video) videoUrl = botConfig.video
      } catch {}
    }

    let menuByTag = {}
    for (const plugin of Object.values(global.plugins || {})) {
      if (!plugin || !plugin.help) continue
      const tags = plugin.tags || []
      for (const tag of tags) {
        if (!menuByTag[tag]) menuByTag[tag] = []
        menuByTag[tag].push(plugin)
      }
    }

    const channelUrl = "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
    const botType = conn.user.jid === global.conn.user.jid ? "Principal" : "Sub-Bot"

    const infoUser = [
      "─┈➤ *`INFO USER`*",
      `𔓕 *Nombre* : ${name}`,
      `𔓕 *Tag*    : ${tagUser}`,
      `𔓕 *Registro* : ${isRegistered ? "✅" : "❌"}`
    ].join("\n")

    const infoBot = [
      "╭──┈ *`INFO BOT`*",
      `│ 🐢 *Nombre*  : ${botNameToShow}`,
      `│ 🌲 *Tipo*  : ${botType}`,
      `│ 🌾 *Prefix*  : ${usedPrefix}`,
      `│ 🪴 *Uptime*  : ${uptime}`,
      `│ 🌵 *Hora*   : ${time}`,
      `│ 🌱 *Fecha*  : ${date}`,
      "╰------------------------------------------"
    ].join("\n")

    const menuText = [
      `Hola *${tagUser}!* uwu`,
      `Bienvenido *${meName}*, soy *${botNameToShow}* y estoy aquí para ayudarte 🌿`,
      ``,
      infoUser,
      ``,
      infoBot,
      ``,
      ` *\`CANAL\`*`,
      `🌵 ${channelUrl}`
    ].join("\n")

    if (!isRegistered) {
      const thumbBuffer = await getBufferFromUrl(bannerUrl).catch(async () => await getBufferFromUrl("https://files.catbox.moe/k45sr6.jpg"))

      const fkontak = {
        key: { participants: "0@s.whatsapp.net", fromMe: false, id: "Shadow" },
        message: {
          locationMessage: {
            name: "Registro requerido",
            jpegThumbnail: thumbBuffer,
            vcard:
              "BEGIN:VCARD\nVERSION:3.0\nN:;Shadow;;;\nFN:Shadow\nORG:Shadow Garden\nitem1.TEL;waid=584242773183:+58 424 2773183\nitem1.X-ABLabel:Shadow\nEND:VCARD"
          }
        },
        participant: "0@s.whatsapp.net"
      }

      const productMessage = {
        product: {
          productImage: { url: bannerUrl },
          productId: "999999999999999",
          title: "REGISTRO",
          description: "Registro requerido",
          currencyCode: "USD",
          priceAmount1000: 0,
          retailerId: "1677",
          url: "https://wa.me/584242773183",
          productImageCount: 1
        },
        businessOwnerJid: "584242773183@s.whatsapp.net",
        caption: [
          `➤ *\`REGISTRO\`*`,
          `𔓕 Hola ${tagUser}`,
          `𔓕 Para usar el menú necesitas registrarte`,
          `𔓕 Comando: \`${usedPrefix}reg nombre.edad\``,
          `𔓕 Ejemplo: \`${usedPrefix}reg shadow.18\``
        ].join("\n"),
        footer: "Shadow Bot",
        interactiveButtons: [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "📝 Registrarse", id: `${usedPrefix}reg` })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({ display_text: "👑 Creador", url: "https://wa.me/584242773183" })
          }
        ],
        mentions: [m.sender]
      }

      return await conn.sendMessage(m.chat, productMessage, { quoted: fkontak })
    }

    const thumbBuffer = await getBufferFromUrl(bannerUrl).catch(async () => await getBufferFromUrl("https://files.catbox.moe/k45sr6.jpg"))

    const sections = []
    const quickRows = [
      { title: "Ping", description: "🌴 Velocidad del bot", id: `${usedPrefix}ping` },
      { title: "Status", description: "🌴 Estado del bot", id: `${usedPrefix}status` },
      { title: "Creador", description: "🌴 Contacto del creador", id: `${usedPrefix}creador` }
    ].map((r) => ({ ...r, thumbnail_url: profilePic }))

    sections.push({
      title: "𝗦𝗵𝗮𝗱𝗼𝘄 𝗠𝗲𝗻𝘂",
      highlight_label: "🐛",
      rows: quickRows
    })

    for (const tag of Object.keys(menuByTag)) {
      const rows = []
      for (const plugin of menuByTag[tag]) {
        for (const cmd of plugin.help || []) {
          rows.push({
            title: `${usedPrefix}${cmd}`,
            description: `🦖 Ejecutar: ${usedPrefix}${cmd}`,
            id: `${usedPrefix}${cmd}`,
            thumbnail_url: profilePic
          })
        }
      }
      if (rows.length) {
        sections.push({
          title: String(tag).toUpperCase(),
          highlight_label: "🫟",
          rows: rows.slice(0, 50)
        })
      }
    }

    const nativeFlowPayload = {
      header: {
        documentMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          fileSha256: Buffer.from("fa09afbc207a724252bae1b764ecc7b13060440ba47a3bf59e77f01924924bfe", "hex"),
          fileLength: { low: 0, high: 0, unsigned: true },
          pageCount: 0,
          mediaKey: Buffer.from("3163ba7c8db6dd363c4f48bda2735cc0d0413e57567f0a758f514f282889173c", "hex"),
          fileName: `⊹ Shadow • ${botNameToShow}`,
          fileEncSha256: Buffer.from("652f2ff6d8a8dae9f5c9654e386de5c01c623fe98d81a28f63dfb0979a44a22f", "hex"),
          directPath: "/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc",
          mediaKeyTimestamp: { low: 1756370084, high: 0, unsigned: false },
          jpegThumbnail: thumbBuffer,
          contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 777,
            isForwarded: true
          }
        },
        hasMediaAttachment: true
      },
      body: { text: "" },
      footer: { text: menuText },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "𝖲𝖾𝗅𝖾𝖼𝗍 𝖬𝖾𝗇𝗎",
              sections,
              has_multiple_buttons: true
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🚀 𝗣𝗶𝗻𝗴",
              id: `${usedPrefix}ping`
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "📊 𝗦𝘁𝗮𝘁𝘂𝘀",
              id: `${usedPrefix}status`
            })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "🍁 𝗖𝗮𝗻𝗮𝗹",
              url: channelUrl,
              merchant_url: channelUrl
            })
          }
        ],
        messageParamsJson: JSON.stringify({
          bottom_sheet: {
            list_title: "🐢 Select Menu",
            button_title: "🍄 Menu List",
            in_thread_buttons_limit: 2,
            divider_indices: [1, 2, 3, 999]
          }
        })
      },
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 777,
        isForwarded: true
      }
    }

    await conn.relayMessage(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: nativeFlowPayload
          }
        }
      },
      { quoted: m }
    )
  } catch (e) {
    console.error(e)
    await m.reply(`Error: ${e?.message || e}`)
  }
}

handler.command = ["help", "menu", "m"]
export default handler