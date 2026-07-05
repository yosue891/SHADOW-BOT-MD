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
  return await r.buffer()
}

function dedupeRows(rows = []) {
  const seen = new Set()
  const out = []
  for (const r of rows) {
    const k = String(r?.id || r?.title || "").trim()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
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
    let bannerUrl = global.michipg || "https://adofiles.vercel.app/dl/3d55b968.jpg"

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
      `𔓕 *Tag*    : ${tagUser}`,
      `𔓕 *Registro* : ${isRegistered ? "✅" : "❌"}`
    ].join("\n")

    const infoBot = [
      "╭──┈ *`INFO BOT`*",
      `│ 🐢 *Nombre*  : ${botNameToShow}`,
      `│ 🌲 *Tipo*    : ${botType}`,
      `│ 🌾 *Prefix*  : ${usedPrefix}`,
      `│ 🪴 *Uptime*   : ${uptime}`,
      `│ 🌵 *Hora*    : ${time}`,
      `│ 🌱 *Fecha*   : ${date}`,
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
      await getBufferFromUrl("https://adofiles.vercel.app/dl/3d55b968.jpg")
    )

    if (!isRegistered) {
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
        footer: botNameToShow,
        interactiveButtons: [
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📝 Registrarse", id: `${usedPrefix}reg` }) },
          { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "👑 Creador", url: "https://wa.me/584242773183" }) }
        ],
        mentions: [m.sender]
      }

      return await conn.sendMessage(m.chat, productMessage, { quoted: fkontak })
    }

    const menuByTag = {}
    for (const plugin of Object.values(global.plugins || {})) {
      if (!plugin || !plugin.help) continue
      const tags = Array.isArray(plugin.tags) ? plugin.tags : []
      for (const tag of tags) {
        const t = String(tag || "OTROS").trim() || "OTROS"
        if (!menuByTag[t]) menuByTag[t] = []
        menuByTag[t].push(plugin)
      }
    }

    const quickRows = dedupeRows(
      [
        { title: "Ping", description: "🌴 Velocidad del bot", id: `${usedPrefix}ping` },
        { title: "Status", description: "🌴 Estado del bot", id: `${usedPrefix}status` },
        { title: "Creador", description: "🌴 Contacto del creador", id: `${usedPrefix}creador` }
      ].map((r) => ({ ...r, thumbnail_url: profilePic }))
    )

    const sections = [
      {
        title: "𝗔𝗖𝗖𝗘𝗦𝗢 𝗥𝗔𝗣𝗜𝗗𝗢",
        highlight_label: "⚡",
        rows: quickRows.slice(0, 30)
      }
    ]

    const sortedTags = Object.keys(menuByTag)
      .map((t) => String(t))
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))

    const MAX_ROWS_PER_SECTION = 45

    for (const tag of sortedTags) {
      const rows = []
      for (const plugin of menuByTag[tag] || []) {
        for (const cmd of plugin.help || []) {
          const c = String(cmd || "").trim()
          if (!c) continue
          rows.push({
            title: `${usedPrefix}${c}`,
            description: `🦖 Ejecutar: ${usedPrefix}${c}`,
            id: `${usedPrefix}${c}`,
            thumbnail_url: profilePic
          })
        }
      }
      const clean = dedupeRows(rows).slice(0, MAX_ROWS_PER_SECTION)
      if (clean.length) {
        sections.push({
          title: String(tag).toUpperCase(),
          highlight_label: "📁",
          rows: clean
        })
      }
    }

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
            buttonParamsJson: JSON.stringify({ display_text: "📊 𝗦𝘁𝗮𝘁𝘂𝘀", id: `${usedPrefix}status` })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({ display_text: "🍁 𝗖𝗮𝗻𝗮𝗹", url: channelUrl, merchant_url: channelUrl })
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
