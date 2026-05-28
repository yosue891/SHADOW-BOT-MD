import fetch from 'node-fetch'
import { xpRange } from '../lib/levelling.js'
import fs from 'fs'
import PhoneNumber from 'awesome-phonenumber'
import moment from 'moment-timezone'

const botname = global.botname || "Shadow Garden"
const dev = global.dev || "Cid Kagenou"
const videoMenu = "https://cdn.adoolab.xyz/dl/f0924ab5.mp4"
const thumbMenu = "https://cdn.adoolab.xyz/dl/796b0515.jpg"
const channelRD = global.channelRD || { id: "120363403739366547@newsletter", name: "Shadow" }
const menuCooldown = new Map()
const MENU_COOLDOWN_MS = 15000
let thumbCache = null

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function isRateOverlimitError(err) {
  return err?.data === 429 || /rate-overlimit/i.test(String(err?.message || ""))
}

async function getThumbBuffer() {
  if (thumbCache) return thumbCache
  const response = await fetch(thumbMenu)
  const arr = await response.arrayBuffer()
  thumbCache = Buffer.from(arr)
  return thumbCache
}

let handler = async (m, { conn, usedPrefix, dirname, participants }) => {
  try {
    const now = Date.now()
    const cooldownKey = `${m.chat}:${m.sender}`
    const lastMenu = menuCooldown.get(cooldownKey) || 0
    const remaining = MENU_COOLDOWN_MS - (now - lastMenu)
    if (remaining > 0) {
      return conn.reply(m.chat, `⏳ Espera ${Math.ceil(remaining / 1000)}s para volver a pedir el menú.`, m)
    }
    menuCooldown.set(cooldownKey, now)

    let mentionedJid = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
    let name = await conn.getName(m.sender)
    let totalreg = Object.keys(global.db.data.users).length
    let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length
    let uptime = clockString(process.uptime() * 1000)
    let totalCommands = Object.keys(global.plugins).length
    let readMore = String.fromCharCode(8206).repeat(4001)

    let userIdNum = m.sender.split('@')[0]
    let phone = PhoneNumber('+' + userIdNum)
    let pais = phone.getRegionCode() || 'Dominio Desconocido 🌑'

    let tags = {
      'info': '𝐈𝐍𝐅𝐎 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
      'main': '𝐄𝐒𝐓𝐀𝐃𝐎 𝐃𝐄𝐋 𝐂𝐎𝐑𝐓𝐈𝐆𝐎',
      'anime': '𝐀𝐍𝐈𝐌𝐄 𝐀𝐑𝐂𝐀𝐍𝐎',
      'menu': '𝐌𝐄𝐍𝐔𝐒 𝐎𝐂𝐔𝐋𝐓𝐎𝐒',
      'search': '𝐁𝐔𝐒𝐐𝐔𝐄𝐃𝐀𝐒 𝐄𝐒𝐎𝐓𝐄𝐑𝐈𝐂𝐀𝐒',
      'descargas': '𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
      'socket': '𝐂𝐎𝐍𝐄𝐗𝐈𝐎𝐍𝐄𝐒 𝐎𝐂𝐔𝐋𝐓𝐀𝐒',
      'rg': '𝐏𝐄𝐑𝐅𝐈𝐋 𝐃𝐄𝐋 𝐂𝐎𝐍𝐓𝐑𝐀𝐓𝐈𝐒𝐓𝐀',
      'fun': '𝐉𝐔𝐄𝐆𝐎𝐒 𝐃𝐄 𝐒𝐎𝐌𝐁𝐑𝐀',
      'rpg': '𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 𝐎𝐂𝐔𝐋𝐓𝐀',
      'gacha': '𝐈𝐕𝐄𝐍𝐓𝐎𝐒 𝐆𝐀𝐂𝐇𝐀',
      'game': '𝐉𝐔𝐄𝐆𝐎𝐒 𝐀𝐑𝐂𝐀𝐍𝐎𝐒',
      'grupos': '𝐂𝐈𝐑𝐂𝐔𝐋𝐎𝐒 𝐃𝐄 𝐒𝐎𝐌𝐁𝐑𝐀',
      'nable': '𝐌𝐎𝐃𝐎 𝐎𝐍 / 𝐎𝐅𝐅',
      'ia': '𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄𝐍𝐂𝐈𝐀 𝐀𝐑𝐂𝐀𝐍𝐀',
      'stalk': '𝐎𝐁𝐒𝐄𝐑𝐕𝐀𝐂𝐈𝐎𝐍 𝐒𝐈𝐋𝐄𝐍𝐂𝐈𝐎𝐒𝐀',
      'maker': '𝐀𝐋𝐐𝐔𝐈𝐌𝐈𝐀 𝐕𝐈𝐒𝐔𝐀𝐋',
      'tools': '𝐇𝐄𝐑𝐀𝐌𝐈𝐄𝐍𝐓𝐀𝐒 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
      'sticker': '𝐒𝐄𝐋𝐋𝐎𝐒 𝐀𝐑𝐂𝐀𝐍𝐎𝐒',
      'owner': '𝐌𝐀𝐄𝐒𝐓𝐑𝐎 𝐃𝐄 𝐋𝐀 𝐎𝐑𝐆𝐀𝐍𝐈𝐙𝐀𝐂𝐈𝐎𝐍',
      'nsfw': '𝐙𝐎𝐍𝐀 𝐑𝐄𝐒𝐓𝐑𝐈𝐍𝐆𝐈𝐃𝐀 (+18)'
    }

    let commands = Object.values(global.plugins)
      .filter(v => v.help && v.tags)
      .map(v => ({
        help: Array.isArray(v.help) ? v.help : [v.help],
        tags: Array.isArray(v.tags) ? v.tags : [v.tags]
      }))

    let menuTexto = ''
    for (let tag in tags) {
      let comandos = commands
        .filter(cmd => cmd.tags.includes(tag))
        .map(cmd => cmd.help.map(e => `*│ׄꤥㅤׅ* ${usedPrefix}${e}`).join('\n'))
        .join('\n')
      if (comandos) {
        menuTexto += `\n*╭──･ ̸̷∵* \`${tags[tag]}\`  *݁ ⚜︎*
${comandos}
*╰─────────────֙╯*\n`
      }
    }

    let infoUser = `
> . ݁  🌑՞ *ʙɪᴇɴᴠᴇɴɪᴅᴏ ᴀ ʟᴀ ꜱᴏᴍʙʀᴀ,* ${name}.

> ﹙⚜︎﹚੭੭ ─ \`ɪ ɴ ғ ᴏ - ꜱʜᴀᴅᴏᴡ ʙᴏᴛ\`
> ര ׄ 𓏸𓈒 ׅ *ᴄᴏᴍᴀɴᴅᴏꜱ ›* ${totalCommands}
> ര ׄ 𓏸𓈒 ׅ *ᴛɪᴇᴍᴘᴏ ›* ${uptime}
> ര ׄ 𓏸𓈒 ׅ *ᴅᴏᴍɪɴɪᴏ ›* ${pais}
> ര ׄ 𓏸𓈒 ׅ *ᴀʟᴍᴀꜱ ›* ${totalreg}
> ര ׄ 𓏸𓈒 ׅ *ᴄᴀɴᴀʟ ›* https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O

${readMore}
  乂 *ᴘʀᴏᴛᴏᴄᴏʟᴏ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏꜱ ᴅᴇ ʟᴀ ꜱᴏᴍʙʀᴀ* 乂\n`.trim()

    const thumbBuffer = await getThumbBuffer()
    const fkontak = {
      key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
      message: {
        productMessage: {
          product: {
            productImage: { mimetype: "image/jpeg", jpegThumbnail: thumbBuffer },
            title: `⌗ֶㅤ𝐌𝐞𝐧𝐮 𝐝𝐞 𝐥𝐚 𝐒𝐨𝐦𝐛𝐫𝐚`,
            description: "« Soy quien actúa en las sombras »",
            currencyCode: "USD",
            priceAmount1000: 0,
            retailerId: "menu"
          },
          businessOwnerJid: "584242773183@s.whatsapp.net"
        }
      }
    }

    await m.react('🔥')

    await conn.sendMessage(m.chat, {
      video: { url: videoMenu },
      caption: infoUser + menuTexto,
      gifPlayback: true,
      contextInfo: {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelRD.id,
          serverMessageId: '',
          newsletterName: channelRD.name
        },
        externalAdReply: {
          title: `${botname} organizacional`,
          body: `By ${dev}`,
          mediaType: 1,
          sourceUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O",
          thumbnailUrl: thumbMenu,
          renderLargerThumbnail: true,
          showAdAttribution: true
        }
      }
    }, { quoted: fkontak })

    await delay(1200)
    try {
      await conn.sendMessage(m.chat, {
        audio: { url: "https://cdn.adoolab.xyz/dl/fdc14de5.m4a" },
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: "menu-shadow.mp3",
        contextInfo: {
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363403739366547@newsletter",
            serverMessageId: '',
            newsletterName: "shadow"
          },
          forwardingScore: 9999999,
          isForwarded: true,
          externalAdReply: {
            title: "👻 Menú de la Sombra",
            body: "« Soy quien actúa en las sombras »",
            previewType: "PHOTO",
            thumbnail: thumbBuffer,
            sourceUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O",
            showAdAttribution: true
          }
        }
      })
    } catch (audioErr) {
      if (!isRateOverlimitError(audioErr)) throw audioErr
    }

  } catch (e) {
    if (isRateOverlimitError(e)) return
    await conn.sendMessage(m.chat, { text: `✘ Error: ${e.message}` })
  }
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu','help','menú', 'allmenu']
handler.register = true
export default handler

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}
