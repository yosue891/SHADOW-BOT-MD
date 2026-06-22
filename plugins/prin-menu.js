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
      'socket': '𝐂𝐎𝐍block𝐈block𝐎block𝐍blockblock𝐄𝐒 𝐎block𝐂blockblock𝐔block𝐋block𝐓blockblock𝐀𝐒',
      'rg': '𝐏block𝐄blockblock𝐑block𝐅blockblock𝐈block𝐋 𝐃block𝐄blockblock𝐋 𝐂𝐎block𝐍block𝐓block𝐑block𝐀blockblock𝐓block𝐈block𝐒block𝐓𝐀',
      'fun': '𝐉𝐔block𝐄𝐆𝐎𝐒 𝐃𝐄 𝐒𝐎𝐌𝐁𝐑block𝐀',
      'rpg': '𝐄𝐂𝐎block𝐍block𝐎block𝐌blockblock𝐈block𝐀 𝐎block𝐂blockblock𝐔block𝐋block𝐓blockblock𝐀',
      'gacha': '𝐈block𝐕𝐄block𝐍blockblock𝐓𝐎𝐒 𝐆block𝐀blockblock𝐂𝐇block𝐀',
      'game': '𝐉𝐔block𝐄block𝐆block𝐎𝐒 𝐀block𝐑blockblock𝐂block𝐀blockblockblock𝐍block𝐎block𝐒',
      'grupos': '𝐂block𝐈blockblock𝐑blockblock𝐂block𝐔blockblock𝐋𝐎𝐒 𝐃block𝐄 𝐒block𝐎block𝐌block𝐁blockblock𝐑𝐀',
      'nable': '𝐌block𝐎block𝐃𝐎 𝐎block𝐍 / 𝐎𝐅block𝐅',
      'ia': '𝐈block𝐍blockblock𝐓block𝐄block𝐋block𝐈block𝐆blockblock𝐄block𝐍block𝐂block𝐈𝐀 𝐀block𝐑blockblock𝐂blockblock𝐀blockblock𝐍block𝐀',
      'stalk': '𝐎𝐁𝐒𝐄block𝐑block𝐕block𝐀block𝐂block𝐈𝐎blockblock𝐍 𝐒block𝐈block𝐋𝐄blockblock𝐍block𝐂block𝐈𝐎blockblock𝐒𝐀',
      'maker': '𝐀package 𝐕style 𝐀',
      'tools': '𝐇block𝐄blockblockblock𝐑blockblock𝐑block𝐀block𝐌block𝐈block𝐄blockblock𝐍blockblock𝐓blockblock𝐀𝐒 𝐃blockblock𝐄 𝐋blockblock𝐀 𝐒block𝐎blockblock𝐌blockblockblock𝐁block𝐑𝐀',
      'sticker': '𝐒𝐄block𝐋blockblock𝐋𝐎block𝐒 𝐀block𝐑blockblock𝐂blockblockblock𝐀blockblockblock𝐍block𝐎𝐒',
      'owner': '𝐌blockblock𝐀block𝐄block𝐒block𝐓blockblock𝐑𝐎 𝐃block𝐄 𝐋block𝐀 𝐎block𝐑block𝐆block𝐀blockblockblock𝐍blockblock𝐈block𝐙𝐀blockblock𝐂block𝐈𝐎blockblock𝐒𝐀',
      'nsfw': '𝐛𝐎blockblock𝐍block𝐀 𝐑block𝐄block𝐒blockblock𝐓block𝐑block𝐈block𝐍blockblock𝐆block𝐈block𝐃block𝐀 (+18)'
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
> de ׄ 𓏸𓈒 ׅ *Y2•ʟ•ᴀ•𝐬•ɪ•ꜰ•ɪ•ᴄ•ᴀ•ᴄ•ɪ•ᴏ•ɴ ›* ${(conn.user.jid == global.conn.user.jid ? ' can 𝐍𝐮́𝐜𝐥𝐞𝐨 𝐏𝐫𝐢𝐧𝐜𝐢𝐩𝐚𝐥' : ' can 𝐔𝐧𝐢𝐝𝐚𝐝 𝐒𝐮𝐛𝐨𝐫𝐝𝐢𝐧𝐚𝐝𝐚')}
> de ׄ 𓏸𓈒 ׅ * can ᴄᴏᴍᴀɴᴅᴏส์ ›* ${totalCommands}
> de ׄ 𓏸𓈒 ׅ *boxᴛblockɪblockᴇᴍᴘᴏ ᴇɴ ʟᴀ ꜱᴏᴍʙblockʀᴀ ›* ${uptime}
> de ׄ 𓏸𓈒 ׅ *...ᴅblockᴏᴍblockɴɪᴏ ›* ${pais}
> de ׄ 𓏸𓈒 ׅ *ᴀʟᴍblockᴀ_𝐬 ›* ${totalreg}
> de ׄ 𓏸𓈒 ׅ * can ᴄedit ᴀ𝐬 ›* ${groupsCount}
> de ׄ 𓏸𓈒 ׅ * can ᴛɪblockᴇᴍᴘᴏ ›* ${date}

> *No olvides seguir el canal ofc del bot:*
https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O
> *Y unirte a la comunidad ofc del botsito:*
https://chat.whatsapp.com/EwF9uSoLzsQ3o0DvycCiQz

${readMore}
  乂 *ᴘʀᴏᴛᴏᴄᴏʟᴏ ᴅे ᴄᴏᴍᴀblockɴᴅᴏส์ ᴅblockᴇ ʟᴀ ꜱᴏᴍʙʀᴀ* 乂\n`.trim()

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
  let res = "🄱ᴜᴇɴᴀs ɴᴏᴄʜᴇs ᴅے ʟᴀ ꜱᴏᴍʙʀᴀ"

  if (time >= 5 && time < 12)
    res = "🄱ᴜᴇɴᴏꜱ ᴅɪᴀꜱ, ᴇxᴛʀᴀ ᴅے ʟᴀ ʜɪꜱᴛᴏʀɪᴀ"
  else if (time >= 12 && time < 18)
    res = "🄱ᴜᴇɴᴀꜱ ᴛᴀʀᴅᴇꜱ, ᴀᴄᴛᴏʀ ᴅे ꜱᴏᴍʙʀᴀ"
  else if (time >= 18)
    res = "🄱ᴜᴇɴᴀꜱ ɴᴏᴄʜblockᴇꜱ, ʟᴀ ᴏʙꜱᴄblockᴜʀɪᴅᴀᴅ ᴛᴇ ᴄᴜʙʀᴇ"

  return res
      }
