import fetch from 'node-fetch'
import { xpRange } from '../lib/levelling.js'
import fs from 'fs'
import PhoneNumber from 'awesome-phonenumber'
import moment from 'moment-timezone'

const botname = global.botname || "Shadow Garden"
const dev = global.dev || "Cid Kagenou"
const banner = global.banner || "https://tmpfiles.org/dl/wywX9s5501fP/file.mp4"
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
    let pais = phone.getRegionCode() || 'Dominio Desconocido'

    let tags = {
      info: 'INFO DE LA SOMBRA',
      main: 'ESTADO DEL CÓDIGO',
      anime: 'ANIME ARCANO',
      menu: 'MENÚS OCULTOS',
      search: 'BÚSQUEDAS ESOTÉRICAS',
      descargas: 'DESCARGAS DE LA SOMBRA',
      socket: 'CONEXIONES OCULTAS',
      rg: 'PERFIL DEL CONTRATISTA',
      fun: 'JUEGOS DE SOMBRA',
      rpg: 'ECONOMÍA OCULTA',
      gacha: 'EVENTOS GACHA',
      game: 'JUEGOS ARCANOS',
      grupos: 'CÍRCULOS DE SOMBRA',
      nable: 'MODO ON / OFF',
      ia: 'INTELIGENCIA ARCANA',
      stalk: 'OBSERVACIÓN SILENCIOSA',
      maker: 'ALQUIMIA VISUAL',
      tools: 'HERRAMIENTAS DE LA SOMBRA',
      sticker: 'SELLOS ARCANOS',
      owner: 'MAESTRO DE LA ORGANIZACIÓN',
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
        .map(cmd => cmd.help.map(e => `*│*  ${usedPrefix}${e}`).join('\n'))
        .join('\n')
      if (comandos) {
        menuTexto += `\n*╭──* \`${tags[tag]}\` *⚜︎*
${comandos}
*╰─────────────╯*\n`
      }
    }

    let date = `${dia}, ${fechaTxt}, ${hora}`
    let infoUser = `
> 🌑 Bienvenido a la sombra, ${name}.
> Ya estaba escuchando tus pasos...

> ⚜︎ — INFO SHADOW BOT
> • Nombre clave: ${conn.user?.name || 'Shadow Unit'}
> • Clasificación: ${(conn.user.jid == global.conn.user.jid ? 'Núcleo Principal' : 'Unidad Subordinada')}
> • Comandos: ${totalCommands}
> • Tiempo activo: ${uptime}
> • Dominio: ${pais}
> • Almas: ${totalreg}
> • Celdas: ${groupsCount}
> • Tiempo: ${date}

${readMore}
乂 PROTOCOLO DE COMANDOS DE LA SOMBRA 乂\n`.trim()

   const icon = [
     'https://i.postimg.cc/rFfVL8Ps/image.jpg',
     'https://i.postimg.cc/rFfVL8Ps/image.jpg'
   ]
   let icons = icon[Math.floor(Math.random() * icon.length)]

   let Shadow_url = null
   try {
     const ctrl = new AbortController()
     const t = setTimeout(() => ctrl.abort(), 8000)
     Shadow_url = await (await fetch(icons, { signal: ctrl.signal })).buffer()
     clearTimeout(t)
   } catch {
     Shadow_url = Buffer.alloc(0)
   }
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
          title: `Menú de la Sombra - ${botname}`,
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
    image: { url: banner },
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
  let res = "Buenas noches de la sombra"

  if (time >= 5 && time < 12)
    res = "Buenos días, extra de la historia"
  else if (time >= 12 && time < 18)
    res = "Buenas tardes, actor de sombra"
  else if (time >= 18)
    res = "Buenas noches, la oscuridad te cubre"

  return res
      }
