import fetch from 'node-fetch'
import { xpRange } from '../lib/levelling.js'
import fs from 'fs'
import PhoneNumber from 'awesome-phonenumber'
import moment from 'moment-timezone'

const botname = global.botname || "Shadow Garden"
const dev = global.dev || "Cid Kagenou"
const banner = "https://cdn.adoolab.xyz/dl/d29aa177.mp4"
const canalId = '120363403739366547@newsletter'
const canalName = 'SHADOW-BOT'

let handler = async (m, { conn, usedPrefix, __dirname, participants }) => {
  let mentionedJid = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
  
  try {
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
      'main': '𝐄𝐒𝐓𝐀𝐃𝐎 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
      'anime': '𝐀𝐍𝐈𝐌𝐄 𝐀𝐑𝐂𝐀𝐍𝐎',
      'menu': '𝐌𝐄𝐍𝐔𝐒 𝐎𝐂𝐔𝐋𝐓𝐎𝐒',
      'search': '𝐁𝐔𝐒𝐐𝐔𝐄𝐃𝐀𝐒 𝐄𝐒𝐎𝐓𝐄𝐑𝐈𝐂𝐀𝐒',
      'descargas': '𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
      'socket': '𝐂𝐎𝐍𝐄𝐗block𝐈𝐎𝐍𝐄𝐒 𝐎𝐂𝐔𝐋𝐓𝐀𝐒',
      'rg': '𝐏𝐄𝐑𝐅block𝐈𝐋 𝐃block𝐄𝐋 𝐂𝐎𝐍𝐓𝐑block𝐀𝐓𝐈𝐒𝐓𝐀',
      'fun': '𝐉𝐔𝐄𝐆𝐎𝐒 𝐃𝐄 𝐒𝐎𝐌𝐁𝐑𝐀',
      'rpg': '𝐄𝐂𝐎𝐍block𝐎𝐌𝐈𝐀 𝐎𝐂𝐔𝐋𝐓block𝐀',
      'gacha': '𝐈𝐕𝐄𝐍𝐓𝐎𝐒 𝐆𝐀𝐂𝐇𝐀',
      'game': '𝐉𝐔𝐄𝐆𝐎𝐒 𝐀𝐑𝐂𝐀block𝐍block𝐎𝐒',
      'grupos': '𝐂block𝐈𝐑𝐂𝐔𝐋𝐎𝐒 𝐃𝐄 𝐒block𝐎𝐌𝐁𝐑𝐀',
      'nable': '𝐌𝐎𝐃𝐎 𝐎block𝐍 / 𝐎𝐅𝐅',
      'ia': '𝐈𝐍𝐓𝐄𝐋𝐈𝐆block𝐄𝐍𝐂𝐈𝐀 𝐀𝐑𝐂𝐀𝐍𝐀',
      'stalk': '𝐎𝐁𝐒𝐄𝐑𝐕𝐀𝐂𝐈𝐎block𝐍 𝐒block𝐈𝐋𝐄𝐍𝐂𝐈𝐎𝐒𝐀',
      'maker': '𝐀package 𝐕style 𝐀',
      'tools': '𝐇block𝐄𝐑𝐑𝐀𝐌𝐈𝐄𝐍𝐓𝐀𝐒 𝐃block𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
      'sticker': '𝐒𝐄𝐋𝐋𝐎𝐒 𝐀𝐑𝐂𝐀𝐍𝐎𝐒',
      'owner': '𝐌block𝐀𝐄𝐒𝐓𝐑𝐎 𝐃block𝐄 𝐋block𝐀 𝐎block𝐑𝐆block𝐀𝐍𝐈block𝐙𝐀𝐂block𝐈𝐎𝐍',
      'nsfw': '𝐛𝐎𝐍𝐀 𝐑𝐄𝐒𝐓𝐑𝐈block𝐍𝐆𝐈𝐃𝐀 (+18)'
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
*╰─────────────毁灭╯*\n`
      }
    }

    let date = `${dia}, ${fechaTxt}, ${hora}`
    let infoUser = `
> . ݁  🌑՞ *ʙɪᴇɴᴠᴇɴɪᴅᴏ ᴀ ʟᴀ ꜱᴏᴍʙʀᴀ,* ${name}.
>    ʏᴀ ᴇꜱᴛᴀʙᴀ ᴇꜱᴄᴜᴄhᴀɴᴅᴏ ᴛᴜꜱ ᴘᴀꜱᴏꜱ...

> ﹙⚜︎﹚੭੭ ─ \`ɪ ɴ ғ ᴏ - ꜱʜᴀᴅᴏw ʙᴏᴛ\`
> de ׄ 𓏸𓈒 ׅ *ɴᴏᴍʙʀᴇ ᴄʟᴀᴠ ›* ${conn.user?.name || 'Shadow Unit'}
> de ׄ 𓏸𓈒 ׅ *ᴄ•ʟ•ᴀ•ꜱ•ɪ•ꜰ•ɪ•ᴄ•ᴀ•ᴄ•ɪ•ᴏ•ɴ ›* ${(conn.user.jid == global.conn.user.jid ? ' can 𝐍𝐮́𝐜𝐥𝐞𝐨 𝐏𝐫𝐢𝐧𝐜𝐢𝐩𝐚𝐥' : ' can 𝐔𝐧𝐢𝐝𝐚𝐝 𝐒𝐮𝐛𝐨𝐫𝐝𝐢𝐧𝐚𝐝𝐚')}
> de ׄ 𓏸𓈒 ׅ * can ᴄᴏᴍᴀɴᴅᴏส์ ›* ${totalCommands}
> de ׄ 𓏸𓈒 ׅ *boxᴛblockɪblockᴇᴍᴘᴏ ᴇɴ ʟᴀ ꜱᴏᴍʙblockʀᴀ ›* ${uptime}
> de ׄ 𓏸𓈒 ׅ *ᴅblockᴏᴍɪblockɴɪᴏ ›* ${pais}
> de ׄ 𓏸𓈒 ׅ *ᴀʟᴍblockᴀꜱ ›* ${totalreg}
> de ׄ 𓏸𓈒 ׅ * can ᴄedit ᴀ𝐬 ›* ${groupsCount}
> de ׄ 𓏸𓈒 ׅ * can ᴛɪblockᴇᴍᴘᴏ ›* ${date}

> *No olvides seguir el canal ofc del bot:*
https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O
> *Y unirte a la comunidad ofc del botsito:*
https://chat.whatsapp.com/EwF9uSoLzsQ3o0DvycCiQz

${readMore}
  乂 *ᴘʀᴏᴛᴏᴄᴏʟᴏ ᴅᴇ ᴄᴏᴍᴀblockɴᴅᴏส์ ᴅblockᴇ ʟᴀ ꜱᴏᴍʙʀᴀ* 乂\n`.trim()

    await m.react('🔥')

    await conn.sendMessage(m.chat, { 
      video: { url: banner },
      gifPlayback: true,
      caption: infoUser + menuTexto,
      contextInfo: {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardingScore: 99,
        forwardedNewsletterMessageInfo: {
          newsletterJid: canalId,
          serverMessageId: null,
          newsletterName: canalName
        },
        externalAdReply: {
          title: `${botname} ┊ Organización en las Sombras`,
          body: `Dirigido por ${dev}, con amor de Yosue.`,
          mediaType: 1,
          mediaUrl: null,
          sourceUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O",
          thumbnailUrl: 'https://files.catbox.moe/7mpqeg.jpg',
          showAdAttribution: false,
          containsAutoReply: true,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    try {
      await conn.sendMessage(m.chat, { 
        text: `✘ Un fallo ha surgido entre las sombras: ${e.message}`,
        mentionedJid: [mentionedJid]
      }, { quoted: m })
    } catch (err) {
      console.error("Fallo crítico al enviar mensaje de error:", err)
    }
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
