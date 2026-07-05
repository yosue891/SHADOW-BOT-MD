import moment from "moment-timezone"
import fs from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import fetch from "node-fetch"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const baileysMod = await import("@whiskeysockets/baileys")
const prepareWAMessageMedia =
  baileysMod.prepareWAMessageMedia ||
  baileysMod.default?.prepareWAMessageMedia

if (typeof prepareWAMessageMedia !== "function") {
  throw new Error("Tu versión de Baileys no expone prepareWAMessageMedia")
}

function clockString(ms) {
  let h = isNaN(ms) ? "--" : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? "--" : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? "--" : Math.floor(ms / 1000) % 60
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":")
}

async function getBufferFromUrl(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`No se pudo descargar: ${url}`)
  const arrayBuffer = await r.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const userData = global.db?.data?.users?.[m.sender] || {}
    const isRegistered = !!userData.registered

    const tz = "America/Tegucigalpa"
    const time = moment.tz(tz).format("HH:mm:ss")
    const date = moment.tz(tz).format("DD/MM/YYYY")
    const uptime = clockString(process.uptime() * 1000)

    const tagUser = "@" + m.sender.split("@")[0]
    const name = (await conn.getName(m.sender)) || "User"
    const meName =
      (await conn.getName(conn.user?.id || conn.user?.jid || "")) ||
      global.botname ||
      "Bot"

    let profilePic
    try {
      profilePic = await conn.profilePictureUrl(m.sender, "image")
    } catch {
      profilePic = "https://i.ibb.co/3NfYh9k/default-avatar.png"
    }
    if (!profilePic) profilePic = "https://i.ibb.co/3NfYh9k/default-avatar.png"

    let botNameToShow = global.botname || meName
    let bannerUrl = "https://adofiles.vercel.app/dl/1dc604bd.jpg"

    const channelUrl = "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
    const botType = (conn.user?.jid || "") === (global.conn?.user?.jid || "") ? "Principal" : "Sub-Bot"

    const senderBotNumber = (conn.user?.jid || "").split("@")[0]
    let configPath
    if ((conn.user?.jid || "") === (global.conn?.user?.jid || "")) configPath = join("./Sessions", "config.json")
    else configPath = join("./Sessions/SubBot", senderBotNumber, "config.json")

    if (configPath && fs.existsSync(configPath)) {
      try {
        const botConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"))
        if (botConfig?.name) botNameToShow = botConfig.name
        if (botConfig?.banner) bannerUrl = botConfig.banner
      } catch {}
    }

    const infoUser = [
      "─┈➤ *`INFO USER`*",
      `𔓕 *Nombre* : ${name}`,
      `𔓕 *Tag* : ${tagUser}`,
      `𔓕 *Registro* : ${isRegistered ? "✅" : "❌"}`
    ].join("\n")

    const infoBot = [
      "╭──┈ *`INFO BOT`*",
      `│ 🐢 *Nombre* : ${botNameToShow}`,
      `│ 🌲 *Tipo* : ${botType}`,
      `│ 🌾 *Prefix* : ${usedPrefix}`,
      `│ 🪴 *Uptime* : ${uptime}`,
      `│ 🌵 *Hora* : ${time}`,
      `│ 🌱 *Fecha* : ${date}`,
      "╰------------------------------------------"
    ].join("\n")

    const menuText = [
      `Hola *${tagUser}!*`,
      `Bienvenido a *${botNameToShow}*`,
      ``,
      infoUser,
      ``,
      infoBot,
      ``,
      ` *\`CANAL\`*`,
      `🌵 ${channelUrl}`
    ].join("\n")

    const thumbBuffer = await getBufferFromUrl(bannerUrl).catch(async () =>
      await getBufferFromUrl("https://adofiles.vercel.app/dl/1dc604bd.jpg")
    )

    const sections = [
      {
        title: "👑 OWNER",
        highlight_label: "✨",
        rows: [
          { title: "Menú Owner", description: "Comandos exclusivos para creadores", id: `${usedPrefix}menuowner` }
        ]
      },
      {
        title: "📁 CATEGORIAS PRINCIPALES",
        highlight_label: "🤖",
        rows: [
          { title: "Menú Grupos", description: "Comandos de administración de grupos", id: `${usedPrefix}menugrupos` },
          { title: "Menú Descargas", description: "Descargar videos, música y fotos", id: `${usedPrefix}menudescargas` },
          { title: "Menú Fun", description: "Comandos de entretenimiento y diversión", id: `${usedPrefix}menufun` },
          { title: "Menú Gacha", description: "Comandos de juegos gacha y casino", id: `${usedPrefix}menugacha` },
          { title: "Menú IA", description: "Interactuar con Inteligencias Artificiales", id: `${usedPrefix}menuia` },
          { title: "Menú Herramientas", description: "Utilidades y herramientas útiles", id: `${usedPrefix}menuherramientas` },
          { title: "Menú Anime", description: "Comandos e imágenes del mundo anime", id: `${usedPrefix}menuanime` }
        ]
      }
    ]

    const media = await prepareWAMessageMedia(
      { image: thumbBuffer },
      { upload: conn.waUploadToServer }
    )

    const nativeFlowPayload = {
      body: { text: `𝗠𝗘𝗡𝗨 • ${botNameToShow}` },
      footer: { text: menuText },
      header: {
        title: `🐢 ${botNameToShow}`,
        subtitle: `👤 ${name} • ⏱ ${uptime}`,
        hasMediaAttachment: true,
        imageMessage: media.imageMessage
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "📜 𝗦𝗲𝗹𝗲𝗰𝘁 𝗠𝗲𝗻𝘂",
              sections
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "🚀 𝗣𝗶𝗻𝗴", id: `${usedPrefix}ping` })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "📝 𝗥𝗲𝗴𝗶𝘀𝘁𝗿𝗮𝗿𝘀𝗲", id: `${usedPrefix}reg` })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({ display_text: "🍁 𝗖𝗮𝗻𝗮𝗹", url: channelUrl, merchant_url: channelUrl })
          }
        ],
        messageParamsJson: JSON.stringify({
          bottom_sheet: {
            list_title: "🐢 Sub-Menús Disponibles",
            button_title: "🍄 Menu List",
            in_thread_buttons_limit: 2,
            divider_indices: [1, 2, 3, 999]
          }
        })
      },
      contextInfo: { mentionedJid: [m.sender], forwardingScore: 777, isForwarded: true }
    }

    await conn.relayMessage(
      m.chat,
      { viewOnceMessage: { message: { interactiveMessage: nativeFlowPayload } } },
      { quoted: m }
    )
  } catch (e) {
    console.error(e)
    await m.reply(`Error: ${e?.message || e}`)
  }
}

handler.command = ["help", "menu", "m"]
export default handler
