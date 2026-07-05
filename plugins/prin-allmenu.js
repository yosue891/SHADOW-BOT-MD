import fetch from 'node-fetch'
import { xpRange } from '../lib/levelling.js'
import fs from 'fs'
import PhoneNumber from 'awesome-phonenumber'
import moment from 'moment-timezone'

const botname = global.botname || "Shadow Garden"
const dev = global.dev || "Cid Kagenou"
const banner = global.banner || "https://adofiles.vercel.app/dl/c81b1798.mp4"
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
      'socket': '𝐂style𝐍style𝐗𝐈style𝐍style𝐒 𝐎style𝐔style𝐓style𝐒',
      'rg': '𝐏style𝐑𝐅style𝐋 𝐃style𝐋 𝐂style𝐍𝐓style𝐑style𝐓style𝐒𝐓style',
      'fun': '𝐉stylestyle𝐆style𝐒 𝐃style 𝐒style𝐌style𝐑style',
      'rpg': 'style𝐂stylestyle𝐍style𝐌stylestyle 𝐎style𝐔stylestylestyle',
      'gacha': 'style𝐕stylestyle𝐓style𝐒 𝐆style style',
      'game': '𝐉stylestyle𝐆style𝐒 style𝐑stylestylestyle',
      'grupos': 'stylestyle𝐑stylestylestylestyle𝐒 𝐃style 𝐒stylestyle𝐑style',
      'nable': 'stylestyle𝐃style style𝐍 / style𝐅style',
      'ia': 'style style𝐓style𝐋style𝐆style𝐍stylestylestyle style𝐑stylestylestyle',
      'stalk': 'stylestyle𝐒stylestyle𝐑stylestylestyle style𝐍 𝐒stylestylestylestylestylestyle',
      'maker': 'stylestyle𝐐stylestylestyle style style style𝐒stylestyle',
      'tools': 'stylestylestyle𝐑stylestylestylestylestyle𝐓style𝐒 𝐃style stylestyle 𝐒stylestylestyle',
      'sticker': '𝐒stylestyle𝐋stylestyle𝐒 style stylestyle style𝐒',
      'owner': 'stylestylestyle𝐒𝐓stylestyle 𝐃style stylestyle style𝐑stylestyle style',
      'nsfw': 'stylestylestylestyle 𝐑stylestyle𝐓stylestylestylestylestyle (+18)'
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
> ര ׄ 𓏸𓈒 ׅ *ᴄʟᴀꜱɪꜰɪᴄᴀᴄɪᴏɴ ›* ${(conn.user.jid == global.conn.user.jid ? '𝐍𝐮́𝐜𝐥𝐞𝐨 𝐏𝐫𝐢𝐧𝐜𝐢𝐩𝐚𝐥' : '<b>𝐔𝐧𝐢𝐝𝐚𝐝 𝐒𝐮𝐛𝐨𝐫𝐝𝐢𝐧𝐚𝐝𝐚</b>')}
> ര ׄ 𓏸𓈒 ׅ *ᴄoptionᴍᴀɴᴅoptionꜱ ›* ${totalCommands}
> ര ׄ 𓏸𓈒 ׅ *ᴛɪᴇᴍᴘᴏ ᴇɴ ʟᴀ ꜱᴏᴍʙʀᴀ ›* ${uptime}
> ര ׄ 𓏸𓈒 ׅ *ᴅoptionᴍɪɴɪoption ›* ${pais}
> ര ׄ 𓏸𓈒 ׅ *ᴀʟᴍᴀꜱ ›* ${totalreg}
> ര ׄ 𓏸𓈒 ׅ *ᴄᴇʟᴅᴀꜱ ›* ${groupsCount}
> ര ׄ 𓏸𓈒 ׅ *ᴛɪᴇᴍᴘᴏ ›* ${date}

${readMore}
  乂 *ᴘʀᴏᴛᴏᴄᴏʟᴏ ᴅᴇ ᴄoptionᴍᴀɴᴅoptionꜱ ᴅᴇ ʟᴀ ꜱoptionᴍʙʀᴀ* 乂\n`.trim()

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
  
  // Enviamos el archivo de video directamente con gifPlayback en true para simular el GIF
  await conn.sendMessage(m.chat, { 
    video: { url: banner }, 
    gifPlayback: true,
    caption: infoUser + menuTexto,
    contextInfo: {
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: channelRD.id,
        serverMessageId: '',
        newsletterName: channelRD.name
      }
    }
  }, { quoted: fkontak })

} catch (e) {
   console.error(e)
   await conn.sendMessage(m.chat, { 
     text: `✘ Un fallo ha surgido entre las sombras: ${e.message}`,
     mentionedJid: [mentionedJid]
   })
 }
}

handler.help = ['allmenu']
handler.tags = ['main']
handler.command = ['allmenu']
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
    res = "🄱ᴜᴇɴᴀꜱ ɴᴏᴄʜᴇꜱ, ʟᴀ ᴏʙ<b>ꜱᴄᴜʀɪᴅᴀᴅ ᴛᴇ ᴄᴜʙʀᴇ</b>"

  return res
  }
