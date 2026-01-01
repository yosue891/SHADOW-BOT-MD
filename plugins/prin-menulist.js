import fs, { promises as fsp } from 'fs'
import { fileURLToPath } from 'url'
import path, { dirname, join } from 'path'
import * as Jimp from 'jimp'
import { xpRange } from '../lib/levelling.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    const prem = (global.prems || []).includes(m.sender.split`@`[0])

    const Styles = (text, style = 1) => {
      const xStr = 'abcdefghijklmnñopqrstuvwxyz1234567890'.split('')
      const yStr = Object.freeze({
        1: 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴñᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ1234567890'
      })
      const map = xStr.map((v, i) => ({ o: v, c: yStr[style].split('')[i] || v }))
      return text.toLowerCase().split('').map(v => (map.find(x => x.o === v)?.c || v)).join('')
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms))

    async function resizeImage(buffer, width, height) {
      try {
        const img = await Jimp.read(buffer)
        return await img.resize(width, height).getBufferAsync(Jimp.MIME_JPEG)
      } catch {
        return buffer
      }
    }

    const more = String.fromCharCode(8206)
    const readMore = more.repeat(4001)

    function clockString(ms) {
      let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
      let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
      let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
      return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
    }

    function limaGreetingText() {
      const now = new Date()
      const hour = new Intl.DateTimeFormat('es-PE', { hour: 'numeric', hour12: false, timeZone: 'America/Lima' }).format(now)
      const h = parseInt(hour, 10)
      if (h >= 5 && h < 12) return 'Buenos días 🏙'
      if (h >= 12 && h < 18) return 'Buenas tardes 🌤'
      return 'Buenas noches 🌙'
    }



    const _package = JSON.parse((await fsp.readFile(join(__dirname, '../package.json')).catch(() => '{}')).toString())
    const userData = (global.db?.data?.users?.[m.sender]) || {}
    const exp = userData.exp || 0
    const level = userData.level || 0
    const role = userData.role || 'Newbie'
    const limit = userData.limit || 20
    const money = userData.money || 10000
    const { min, xp, max } = xpRange(level, global.multiplier || 1)
    const name = (await conn.getName(m.sender)) || 'User'
    const meName = await conn.getName(conn.user?.id || conn.user?.jid || '')
    const totalreg = Object.keys(global.db?.data?.users || {}).length
    const rtotalreg = Object.values(global.db?.data?.users || {}).filter(u => u.registered).length
    const totalFitur = Object.keys(global.plugins || {}).length

    const d = new Date()
    const locale = 'es-PE'
    const week = d.toLocaleDateString(locale, { weekday: 'long', timeZone: 'America/Lima' })
    const date = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' })
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' })

    const _uptime = process.uptime() * 1000
    let _muptime
    if (process.send) {
      process.send('uptime')
      _muptime = (await new Promise(resolve => {
        process.once('message', resolve)
        setTimeout(resolve, 1000)
      })) * 1000
    }
    const muptime = clockString(_muptime)
    const uptime = clockString(_uptime)

    const imgPath1 = join(__dirname, '../imgs.jpg')
    const thumbLocal = fs.existsSync(imgPath1) ? fs.readFileSync(imgPath1) : null
    const thumbResized = thumbLocal ? await resizeImage(thumbLocal, 300, 150) : null

    const headerGreet = `${limaGreetingText()}`
    const tagUser = '@' + m.sender.split('@')[0]

    const menu = `hello *${tagUser}!* ${headerGreet}
bienvenido uwu *${meName || 'MyBot'}*, soy Shadow-BOT-MD estoy aquí para ayudarte 🌌

╭──┈➤ *\`𝗜𝗡𝗙𝗢 𝗨𝗦𝗘𝗥\`*
│ 𔓕 *Nombre*  : ${name}
│ 𔓕 *Tag*     : ${tagUser}
│ 𔓕 *Rol*     : ${role}
│ 𔓕 *Nivel*   : ${level} (${(exp - (min || 0))}/${xp || 100})
│ 𔓕 *Límite*  : ${limit}
│ 𔓕 *Money*   : S/.${money.toLocaleString('es-PE')}
│ 𔓕 *Premium* : ${prem ? '✅' : '❌'}
╰────────────────┈➤

╭──┈➤ *\`𝗜𝗡𝗙𝗢 𝗕𝗢𝗧\`*
│ 𔓕 *Nombre*     : ${meName || 'Bot'}
│ 𔓕 *Owner*      : ${_package?.author?.name || 'dev'}
│ 𔓕 *Powered*    : WhatsApp Business
│ 𔓕 *Prefix*     : ${_p}
│ 𔓕 *Mode*       : ${global.opts?.['self'] ? 'Privado' : 'Público'}
│ 𔓕 *Total Fitur*: ${totalFitur}+
│ 𔓕 *Version*    : ${_package?.version || '1.0.0'}
│ 𔓕 *Language*   : Javascript
│ 𔓕 *Type*       : NodeJs/Case
│ 𔓕 *Library*    : Baileys-MD
│ 𔓕 *Uptime*     : ${uptime}
│ 𔓕 *Users*      : ${totalreg} (${rtotalreg} reg.)
│ 𔓕 *Hora*       : ${time} WIB
│ 𔓕 *Día*        : ${week}
│ 𔓕 *Fecha*      : ${date}
╰────────────────┈➤`.trim()

    const nativeFlowPayload = {
      header: {
        documentMessage: {
          url: 'https://mmg.whatsapp.net/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileSha256: Buffer.from('fa09afbc207a724252bae1b764ecc7b13060440ba47a3bf59e77f01924924bfe', 'hex'),
          fileLength: { low: -727379969, high: 232, unsigned: true },
          pageCount: 0,
          mediaKey: Buffer.from('3163ba7c8db6dd363c4f48bda2735cc0d0413e57567f0a758f514f282889173c', 'hex'),
          fileName: '🕷 Shadow 😎',
          fileEncSha256: Buffer.from('652f2ff6d8a8dae9f5c9654e386de5c01c623fe98d81a28f63dfb0979a44a22f', 'hex'),
          directPath: '/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc',
          mediaKeyTimestamp: { low: 1756370084, high: 0, unsigned: false },
          jpegThumbnail: thumbResized || null,
          contextInfo: {
            mentionedJid: [m.sender],
            groupMentions: [],
            forwardingScore: 777,
            isForwarded: true
          }
        },
        hasMediaAttachment: true
      },
      body: { text: '' },
      footer: { text: menu },
      nativeFlowMessage: {
        buttons: [
          { name: 'single_select', buttonParamsJson: '{"has_multiple_buttons":true}' },
          { name: 'call_permission_request', buttonParamsJson: '{"has_multiple_buttons":true}' },
          {
            name: 'single_select',
            buttonParamsJson:
              '{"title":"𝚂𝚎𝚕𝚎𝚌𝚝 𝙼𝚎𝚗𝚞","sections":[{"title":"Shadow 😊","highlight_label":"🫩","rows":[{"title":"Ask Gemini","description":"Información de grupos","id":".gemini hola recuerdame que tu comando es .gemini >texto"},{"title":"Info Bot","description":"Información del bot","id":".infobot"},{"title":"Menu All","description":"Menú completo","id":".allmenu"},{"title":"Auto Reg","description":"Registro automático","id":".reg "},{"title":"Ping","description":"Velocidad del bot","id":".ping"},{"title":"Status","description":"Estado del bot","id":".status"}]}],"has_multiple_buttons":true}'
          },
          { name: 'cta_copy', buttonParamsJson: '{"display_text":"Copiar Código","id":"123456789","copy_code":"SHADOW BOT uwu"}' },
          {
            name: 'cta_url',
            buttonParamsJson:
              '{"display_text":"Canal de WhatsApp","url":"https:\\/\\/whatsapp.com\\/channel\\/0029VbArz9fAO7RGy2915k3O","merchant_url":"https:\\/\\/whatsapp.com\\/channel\\/0029VbArz9fAO7RGy2915k3O"}'
          },
          {
            name: 'galaxy_message',
            buttonParamsJson:
              '{"mode":"published","flow_message_version":"3","flow_token":"1:1307913409923914:293680f87029f5a13d1ec5e35e718af3","flow_id":"1307913409923914","flow_cta":"ᴀᴄᴄᴇᴅᴇ ᴀ ʙᴏᴛ ᴀɪ","flow_action":"navigate","flow_action_payload":{"screen":"QUESTION_ONE","params":{"user_id":"123456789","referral":"campaign_xyz"}},"flow_metadata":{"flow_json_version":"201","data_api_protocol":"v2","flow_name":"Lead Qualification [en]","data_api_version":"v2","categories":["Lead Generation","Sales"]}}'
          }
        ],
        messageParamsJson:
          '{"limited_time_offer":{"text":"🫧 𝗠𝗲𝗻𝘂 𝗟𝗶𝘀𝘁","url":"https://github.com/xrljosedv","copy_code":"SHADOW BOT uwu","expiration_time":1754613436864329},"bottom_sheet":{"in_thread_buttons_limit":2,"divider_indices":[1,2,3,4,5,999],"list_title":"Select Menu","button_title":"⊱✿ ᴍᴇɴᴜ ʟɪsᴛ ✿⊰"},"tap_target_configuration":{"title":"▸ X ◂","description":"Let’s go","canonical_url":"https://github.com/xrljosedv","domain":"https://xrljosedvapi.vercel.app","button_index":0}}'
      },
      contextInfo: {
        mentionedJid: [m.sender],
        groupMentions: [],
        forwardingScore: 777,
        isForwarded: true,
        quotedMessage: m.quoted ? {
          conversation: m.quoted.text || '',
          senderKeyDistributionMessage: m.quoted.senderKeyDistributionMessage || null
        } : null
      }
    }

    await conn.relayMessage(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: m.quoted ? {
                senderKeyHash: m.quoted.senderKeyHash || null,
                recipientKeyHash: m.quoted.recipientKeyHash || null
              } : null,
              deviceListMetadataVersion: m.quoted ? 2 : 1
            },
            interactiveMessage: nativeFlowPayload
          }
        }
      },
      { quoted: m }
    )
    } catch (e) {
    console.error(e)
    await m.react?.('❎')
    await m.reply(`❌ Error: ${e?.message || e}`)
  }
}

handler.help = ['menulist']
handler.tags = ['main']
handler.command = ['mls','menulist']
handler.register = true

export default handler
