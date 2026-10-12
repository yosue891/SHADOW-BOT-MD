import fetch from 'node-fetch'
import { xpRange } from '../../lib/levelling.js'
import fs from 'fs'
import PhoneNumber from 'awesome-phonenumber'
import moment from 'moment-timezone'
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const botname = global.botname || "Shadow Garden"
const dev = global.dev || "Cid Kagenou"
const banners = [
  "https://u.pone.rs/jsdvjbfl.mp4",
  "https://u.pone.rs/uehppizl.mp4",
  "https://u.pone.rs/vazblnca.mp4"
]
let availableBanners = []

function getNextBanner() {
  if (!availableBanners.length) {
    availableBanners = [...banners].sort(() => Math.random() - 0.5)
  }
  return availableBanners.shift()
}
const allMenuAudio = "https://u.pone.rs/drnkzprg.m4a"
const channelRD = global.channelRD || { id: "0@newsletter", name: "Shadow Channel" }

async function sendAllMenuAudio(conn, m) {
  await conn.sendMessage(
    m.chat,
    {
      audio: { url: allMenuAudio },
      mimetype: 'audio/mp4',
      fileName: 'shadow-allmenu.m4a',
      ptt: true
    },
    { quoted: m }
  )
}

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
    let pais = phone.getRegionCode() || 'Dominio Desconocido'

    let tags = {
      info: 'INFO DE LA SOMBRA',
      main: 'ESTADO DEL CÓDIGO',
      anime: 'ANIME DE PESADILLA',
      menu: 'MENÚS Y RITUALES',
      search: 'BÚSQUEDAS ESOTÉRICAS',
      descargas: 'DESCARGAS DE LA CRIPTA',
      socket: 'CONEXIONES ESPECTRALES',
      rg: 'PERFIL DEL CONTRATISTA',
      fun: 'JUEGOS EMBRUJADOS',
      rpg: 'ECONOMÍA DEL INFRAMUNDO',
      gacha: 'INVOCACIÓN DE ESPÍRITUS',
      game: 'JUEGOS ARCANOS',
      grupos: 'CÍRCULOS Y AQUELARRES',
      nable: 'SELLOS ON / OFF',
      ia: 'INTELIGENCIA ARCANA',
      stalk: 'OJO DE LA SOMBRA',
      maker: 'ALQUIMIA VISUAL',
      tools: 'HERRAMIENTAS OSCURAS',
      sticker: 'SELLOS ARCANOS',
      owner: 'MAESTRO DE LA NOCHE',
      nsfw: 'ZONA RESTRINGIDA (+18)'
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
        .map(cmd => cmd.help.map(e => `*│ 🕸️*  ${usedPrefix}${e}`).join('\n'))
        .join('\n')
      if (comandos) {
        menuTexto += `\n*╭──* 🎃 \`${tags[tag]}\` *🦇*
${comandos}
*╰─────────────╯*\n`
      }
    }

    let date = `${dia}, ${fechaTxt}, ${hora}`
    let infoUser = `
🎃 *¡BIENVENIDO A SHADOW GARDEN!* 🦇
_« En la noche de Halloween, las sombras bailan bajo la luna »_ 🕯️

🕸️ *Contratista:* ${name}

*╭── 🎃 ɪɴꜰᴏ ᴅᴇ ʟᴀ ꜱᴏᴍʙʀᴀ 🦇 ──╮*
│
│ 🦇 *Líder:* ${conn.user?.name || 'Lord Shadow'}
│ 🕸️ *Rango:* ${(conn.user.jid == global.conn.user.jid ? 'Núcleo Supremo' : 'Unidad Espectral')}
│ 🎃 *Hechizos:* ${totalCommands}
│ ⏳ *Actividad:* ${uptime}
│ 🏰 *Dominio:* ${pais}
│ 👻 *Almas:* ${totalreg}
│ ⚰️ *Aquelarres:* ${groupsCount}
│ 🌘 *Hora de brujas:* ${date}
│
*╰────────────────────╯*

${readMore}
乂 🎃 𝐑𝐈𝐓𝐔𝐀𝐋𝐄𝐒 𝐘 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀 🦇 乂\n`.trim()

    await m.react('🎃')

    const finalBanner = getNextBanner()
    const isVideo = true

    let messageOptions = {
      caption: infoUser + menuTexto,
      contextInfo: {
        forwardingScore: 777,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelRD.id,
          serverMessageId: '',
          newsletterName: channelRD.name
        }
      }
    }

    // Conserva el contexto de WhatsApp Business del menú sin enviar una imagen adicional.
    const businessThumbnail = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    const fkontak = {
      key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
      message: {
        productMessage: {
          product: {
            productImage: { mimetype: 'image/gif', jpegThumbnail: businessThumbnail },
            title: `Menú de la Sombra - ${botname}`,
            description: '« Soy quien actúa en las sombras, fingiendo ser un simple extra. »',
            currencyCode: 'USD',
            priceAmount1000: 0,
            retailerId: 'menu'
          },
          businessOwnerJid: '584242773183@s.whatsapp.net'
        }
      }
    }

    if (isVideo) {
      let sent = false
      try {
        const media = await prepareWAMessageMedia(
          { video: { url: finalBanner }, gifPlayback: true },
          { upload: conn.waUploadToServer }
        )
        const msg = generateWAMessageFromContent(m.chat, {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                contextInfo: messageOptions.contextInfo,
                body: proto.Message.InteractiveMessage.Body.create({ text: infoUser + menuTexto }),
                footer: proto.Message.InteractiveMessage.Footer.create({ text: `${global.dev || dev} • Menú completo` }),
                header: proto.Message.InteractiveMessage.Header.create({
                  title: `${botname}`,
                  hasMediaAttachment: true,
                  videoMessage: media.videoMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons: [
                    {
                      name: 'cta_url',
                      buttonParamsJson: JSON.stringify({
                        display_text: '🎃 Canal Oficial 🦇',
                        url: global.channel || 'https://whatsapp.com',
                        has_multiple_buttons: true
                      })
                    }
                  ]
                })
              })
            }
          }
        }, { quoted: fkontak })
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
        sent = true
      } catch (ev) {
        console.error('No se pudo enviar el menú interactivo con video:', ev)
      }
      if (!sent) {
        try {
          await conn.sendMessage(m.chat, {
            video: { url: finalBanner },
            gifPlayback: true,
            mimetype: 'video/mp4',
            caption: `${botname} • Menú completo`,
            contextInfo: messageOptions.contextInfo
          }, { quoted: fkontak })
        } catch (ev2) {
          console.error('No se pudo enviar el video del menú:', ev2)
        }
        delete messageOptions.caption
        messageOptions.text = infoUser + menuTexto
        messageOptions.mentionedJid = [mentionedJid]
        await conn.sendMessage(m.chat, messageOptions, { quoted: fkontak })
      }
      await sendAllMenuAudio(conn, m)
      return
    }

    await conn.sendMessage(m.chat, messageOptions, { quoted: fkontak })
    await sendAllMenuAudio(conn, m)

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
