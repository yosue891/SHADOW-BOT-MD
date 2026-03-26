import fetch from 'node-fetch'
import { xpRange } from '../lib/levelling.js'
import fs from 'fs'
import PhoneNumber from 'awesome-phonenumber'
import moment from 'moment-timezone'

const botname = global.botname || "Shadow Garden"
const dev = global.dev || "Cid Kagenou"
const banner = global.banner || "https://files.catbox.moe/gbp5x3.jpg"
const channelRD = global.channelRD || { id: "0@newsletter", name: "Shadow Channel" }

let handler = async (m, { conn, usedPrefix, __dirname, participants }) => {
  try {

    let mentionedJid = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
    let user = global.db.data.users[m.sender] || {}
    let name = await conn.getName(m.sender)
    let totalreg = Object.keys(global.db.data.users).length
    let groupUserCount = m.isGroup ? participants.length : '-'
    let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length
    let uptime = clockString(process.uptime() * 1000)
    let fecha = new Date(Date.now())
    let locale = 'es-PE'
    let dia = fecha.toLocaleDateString(locale, { weekday: 'long' })
    let fechaTxt = fecha.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    let hora = fecha.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
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
      'tools': '𝐇𝐄𝐑𝐑𝐀𝐌𝐈𝐄𝐍𝐓𝐀𝐒 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
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
        .map(cmd => cmd.help.map(e => `*│ׄꤥㅤׅ*  ${usedPrefix}${e}`).join('\n'))
        .join('\n')
      if (comandos) {
        menuTexto += `\n*╭──･ ̸̷∵* \`${tags[tag]}\`  *݁ ⚜︎*
${comandos}
*╰─────────────֙╯*\n`
      }
    }

    let date = `${dia}, ${fechaTxt}, ${hora}`
    let infoUser = `
> . ݁  🌑՞ *ʙɪᴇɴᴠᴇɴɪᴅᴏ ᴀ ʟᴀ ꜱᴏᴍʙʀᴀ,* ${name}.
>    ʏᴀ ᴇꜱᴛᴀʙᴀ ᴇꜱᴄᴜᴄhᴀɴᴅᴏ ᴛᴜꜱ ᴘᴀꜱᴏꜱ...

> ﹙⚜︎﹚੭੭ ─ \`ɪ ɴ ғ ᴏ - ꜱʜᴀᴅᴏᴡ ʙᴏᴛ\`
> ര ׄ 𓏸𓈒 ׅ *ɴᴏᴍʙʀᴇ ᴄʟᴀᴠᴇ ›* ${conn.user?.name || 'Shadow Unit'}
> ര ׄ 𓏸𓈒 ׅ *ᴄʟᴀꜱɪꜰɪᴄᴀᴄɪᴏɴ ›* ${(conn.user.jid == global.conn.user.jid ? '𝐍𝐮́𝐜𝐥𝐞𝐨 𝐏𝐫𝐢𝐧𝐜𝐢𝐩𝐚𝐥' : '𝐔𝐧𝐢𝐝𝐚𝐝 𝐒𝐮𝐛𝐨𝐫𝐝𝐢𝐧𝐚𝐝𝐚')}
> ര ׄ 𓏸𓈒 ׅ *ᴄᴏᴍᴀɴᴅᴏꜱ ›* ${totalCommands}
> ര ׄ 𓏸𓈒 ׅ *ᴛɪᴇᴍᴘᴏ ᴇɴ ʟᴀ ꜱᴏᴍʙʀᴀ ›* ${uptime}
> ര ׄ 𓏸𓈒 ׅ *ᴅᴏᴍɪɴɪᴏ ›* ${pais}
> ര ׄ 𓏸𓈒 ׅ *ᴀʟᴍᴀꜱ ›* ${totalreg}
> ര ׄ 𓏸𓈒 ׅ *ᴄᴇʟᴅᴀꜱ ›* ${groupsCount}
> ര ׄ 𓏸𓈒 ׅ *ᴛɪᴇᴍᴘᴏ ›* ${date}

${readMore}
  乂 *ᴘʀᴏᴛᴏᴄᴏʟᴏ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏꜱ ᴅᴇ ʟᴀ ꜱᴏᴍʙʀᴀ* 乂\n`.trim()


   const icon = [
     'https://i.postimg.cc/rFfVL8Ps/image.jpg',
     'https://i.postimg.cc/rFfVL8Ps/image.jpg'
   ]
   let icons = icon[Math.floor(Math.random() * icon.length)]

  const Shadow_url = await (await fetch(icons)).buffer()
  const fkontak = {
    key: {
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast"
    },
    message: {
      productMessage: {
        product: {
          productImage: {
            mimetype: "image/jpeg",
            jpegThumbnail: Shadow_url
          },
          title: `⌗ֶㅤ𝐌𝐞𝐧𝐮 𝐝𝐞 𝐥𝐚 𝐒𝐨𝐦𝐛𝐫𝐚 - ${botname} 𝅄⚜︎`,
          description: "« Soy quien actúa en las sombras, fingiendo ser un simple extra. »",
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
text: infoUser + menuTexto,
contextInfo: {
 isForwarded: true,
 forwardedNewsletterMessageInfo: {
   newsletterJid: channelRD.id,
   serverMessageId: '',
   newsletterName: channelRD.name
 },
 externalAdReply: {
   title: `${botname} ┊ Organización en las Sombras`,
   body: `Dirigido por ${dev}, el que juega a ser un simple mob.`,
   mediaType: 1,
   mediaUrl: null,
   sourceUrl: null,
   thumbnail: await (await fetch(banner)).buffer(),
   showAdAttribution: false,
   containsAutoReply: true,
   renderLargerThumbnail: true
 }}}, { quoted: fkontak })

} catch (e) {
   console.error(e)
   await conn.sendMessage(m.chat, { 
     text: `✘ Un fallo ha surgido entre las sombras: ${e.message}`,
     mentionedJid: [mentionedJid]
   })
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

function ucapan() {
  const time = moment.tz('America/Lima').format('HH')
  let res = "🄱ᴜᴇɴᴀs ɴᴏᴄʜᴇs ᴅᴇ ʟᴀ ꜱᴏᴍʙʀᴀ"

  if (time >= 5 && time < 12)
    res = "🄱ᴜᴇɴᴏꜱ ᴅɪᴀꜱ, ᴇxᴛʀᴀ ᴅᴇ ʟᴀ ʜɪꜱᴛᴏʀɪᴀ"
  else if (time >= 12 && time < 18)
    res = "🄱ᴜᴇɴᴀꜱ ᴛᴀʀᴅᴇꜱ, ᴀᴄᴛᴏʀ ᴅᴇ ꜱᴏᴍʙʀᴀ"
  else if (time >= 18)
    res = "🄱ᴜᴇɴᴀꜱ ɴᴏᴄʜᴇꜱ, ʟᴀ ᴏʙꜱᴄᴜʀɪᴅᴀᴅ ᴛᴇ ᴄᴜʙʀᴇ"

  return res
      }
