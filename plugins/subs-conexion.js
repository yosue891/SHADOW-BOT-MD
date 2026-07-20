const { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = await import('@whiskeysockets/baileys')
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import pino from 'pino'
import chalk from 'chalk'
import { makeWASocket } from '../lib/simple.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PAIRING_CODE_TTL_MS = 45000
const QR_TTL_MS = 45000

const rtx = `❐ *_Vincula via codigo qr_*
✩ Escanea este QR para ser *Sub-Bot* temporal.
✦ Pasos:
1 » Toca ⋮ arriba a la derecha
2 » Ve a *Dispositivos vinculados*
3 » Escanea el QR

✧ Este código expira en *45s*!`

const rtx2 = `❐ *_Vincula via código de 8 digitos_*
✩ Usa este código para ser *Sub-Bot* temporal.
✦ Pasos:
1 » Toca ⋮ arriba a la derecha
2 » Ve a *Dispositivos vinculados*
3 » Vincular con el *número de teléfono*
4 » Escribe el *código*`


function resolveExistingModule(...relativePaths) {
  for (const relativePath of relativePaths) {
    const fullPath = path.resolve(__dirname, relativePath)
    if (fs.existsSync(fullPath)) return pathToFileURL(fullPath).href
  }
  return null
}

function getNoopHandlerModule() {
  return {
    handler: async () => {}
  }
}

async function loadHandlerModule(cacheBust = false) {
  const handlerUrl = resolveExistingModule(
    '../handler.js',
    './handler.js',
    '../../handler.js',
    '../src/handler.js',
    '../handler/index.js'
  )

  if (!handlerUrl) {
    console.warn('[SUB-BOT] No se encontró handler.js; se conectará solo con connection.update/creds.update.')
    return getNoopHandlerModule()
  }

  try {
    const url = cacheBust ? `${handlerUrl}?update=${Date.now()}` : handlerUrl
    const handlerModule = await import(url)
    if (typeof handlerModule?.handler === 'function') return handlerModule
  } catch (e) {
    console.error('[SUB-BOT] No se pudo cargar handler.js:', e)
  }

  return getNoopHandlerModule()
}

const MichiJBOptions = {}
if (!(global.conns instanceof Array)) global.conns = []

function isActiveConnection(sock) {
  return sock?.user && sock.ws?.readyState !== 3 && sock.ws?.readyState !== undefined
}

function cleanStaleConns() {
  if (!Array.isArray(global.conns)) return
  for (let i = global.conns.length - 1; i >= 0; i--) {
    const sock = global.conns[i]
    if (!sock || (!sock.user && (!sock.ws || sock.ws.readyState === 3))) {
      try { sock?.ev?.removeAllListeners() } catch {}
      try { sock?.ws?.close() } catch {}
      global.conns.splice(i, 1)
    }
  }
}

function isSubBotConnected(jid) {
  if (!jid) return false
  const user = jid.split('@')[0]
  return global.conns.some(sock => sock?.user?.jid && sock.user.jid.split('@')[0] === user)
}

function normalizePhoneNumber(value) {
  return String(value || '').replace(/\D/g, '')
}

function extractPhone(jid = '') {
  return String(jid || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function isLidUser(jid) {
  if (!jid) return false
  return jid.endsWith('@lid')
}

function isLidConverted(jid) {
  if (!jid || !jid.endsWith('@s.whatsapp.net')) return false
  const number = jid.replace('@s.whatsapp.net', '')
  if (number.length > 14) return true
  const codes = ["1","7","20","27","30","31","32","33","34","36","39","40","41","43","44","45","46","47","48","49","51","52","53","54","55","56","57","58","60","61","62","63","64","65","66","81","82","84","86","90","91","92","93","94","95","98","212","213","216","218","220","221","234","249","254","255","256","260","263","351","352","353","354","355","356","357","358","359","370","371","372","373","374","375","376","377","378","380","381","382","383","385","386","387","389","420","421","423","852","853","855","856","880","886","960","961","962","963","964","965","966","967","968","970","971","972","973","974","975","976","977","992","993","994","995","996","998"]
  for (const c of codes) {
    if (number.startsWith(c) && number.length >= c.length + 6 && number.length <= c.length + 12) return false
  }
  return true
}

function resolveAnyLidToJid(jid, participants = []) {
  if (!jid || !participants.length) return jid
  const lidNumber = jid.replace(/@.*$/, '')
  const lidFormat = lidNumber + '@lid'
  for (const p of participants) {
    let pLid = '', pJid = ''
    if (p.lid && p.lid.endsWith('@lid')) { pLid = p.lid; pJid = p.id || p.jid || '' }
    else if (p.phoneNumber) { pLid = p.id || ''; pJid = p.phoneNumber }
    else if (p.id && p.id.endsWith('@lid')) { pLid = p.id; pJid = p.jid || '' }
    else { pLid = p.lid || ''; pJid = p.id || p.jid || '' }
    const pLidNum = pLid.replace('@lid', '')
    if (pLid === lidFormat || pLid === jid || pLidNum === lidNumber) {
      if (pJid && !pJid.endsWith('@lid') && !isLidConverted(pJid)) return pJid
    }
  }
  return jid
}

const _lidCache = new Map()

async function resolveSenderToPhone(sender, m, conn) {
  if (!sender) return ''
  if (!sender.endsWith('@lid')) return extractPhone(sender)
  const cached = _lidCache.get(sender)
  if (cached && !cached.endsWith('@lid')) {
    return extractPhone(cached)
  }

  try {
    const repo = conn.signalRepository || conn.repository
    if (repo?.lidMapping?.getPNForLID) {
      const pn = await repo.lidMapping.getPNForLID(sender)
      if (pn && !pn.endsWith('@lid') && !isLidConverted(pn)) {
        _lidCache.set(sender, pn)
        return extractPhone(pn)
      }
    }
  } catch {}

  try {
    if (conn.store?.contacts) {
      for (const [pnJid, contact] of Object.entries(conn.store.contacts)) {
        if (contact.lid === sender || contact.id === sender) {
          if (pnJid && !pnJid.endsWith('@lid') && !isLidConverted(pnJid) && pnJid !== 'status@broadcast') {
            _lidCache.set(sender, pnJid)
            return extractPhone(pnJid)
          }
        }
      }
    }
  } catch {}

  const chatJid = m?.chat || m?.key?.remoteJid
  if (chatJid && chatJid.endsWith('@g.us')) {
    try {
      const metadata = await conn.groupMetadata(chatJid).catch(() => null)
      if (metadata?.participants) {
        const resolved = resolveAnyLidToJid(sender, metadata.participants)
        if (resolved && resolved !== sender && !resolved.endsWith('@lid')) {
          _lidCache.set(sender, resolved)
          return extractPhone(resolved)
        }
      }
    } catch {}
  }

  return ''
}

function getPairingPhoneNumber(m, args, fallbackJid) {
  const explicitArg = (args || []).find(arg => {
    const value = String(arg || '').trim()
    if (/^(--code|code)$/i.test(value)) return false
    return normalizePhoneNumber(value).length >= 8
  })

  const explicitNumber = normalizePhoneNumber(explicitArg)
  if (explicitNumber) return explicitNumber

  let number =
    extractPhone(fallbackJid) ||
    extractPhone(m?.sender) ||
    extractPhone(m?.key?.participant) ||
    extractPhone(m?.participant)

  return number
}
let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!global.db.data.settings[conn.user.jid].jadibotmd) return m.reply(`ꕥ El Comando *${command}* está desactivado temporalmente.`)

  const userData = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  const now = Date.now()
  const isCodeCommand = command === 'code'
  const cooldownMs = isCodeCommand ? 60000 : 120000
  const lastUse = isCodeCommand ? (userData.lastCodeRequest || 0) : (userData.Subs || 0)
  const remaining = cooldownMs - (now - lastUse)

  if (remaining > 0) {
    const retryMsg = isCodeCommand
      ? `Debes esperar ${msToTime(remaining)} para volver a usar *${usedPrefix}code*.`
      : `Debes esperar ${msToTime(remaining)} para volver a vincular un *Sub-Bot.*`
    return conn.reply(m.chat, retryMsg, m)
  }

  cleanStaleConns()
  const socklimit = global.conns.filter(isActiveConnection).length
  if (socklimit >= 10) return m.reply('ꕥ No se han encontrado espacios para *Sockets* disponibles.')

  const mentionedJid = m.mentionedJid || []
  const who = mentionedJid[0] || m.sender
  let pairingNumber = await resolveSenderToPhone(who, m, conn)

  if (!pairingNumber && who.endsWith('@lid')) {
    const argNumber = args.find(a => normalizePhoneNumber(a).length >= 8)
    if (argNumber) {
      pairingNumber = normalizePhoneNumber(argNumber)
    } else {
      return conn.reply(m.chat, `ꕥ No pude detectar tu número real porque estás en un dispositivo vinculado.\n\nUsa el comando así:\n*${usedPrefix}code <tu número>*\n\nEjemplo: *${usedPrefix}code 573001234567*`, m)
    }
  }
  const id = pairingNumber || extractPhone(who)
  const pairingPhoneNumber = getPairingPhoneNumber(m, args, who)
  const jadiDir = global.jadi || 'Sessions/SubBot'
  const pathMichiJadiBot = path.join(jadiDir, id)

  if (!fs.existsSync(pathMichiJadiBot)) fs.mkdirSync(pathMichiJadiBot, { recursive: true })

  MichiJBOptions.pathMichiJadiBot = pathMichiJadiBot
  MichiJBOptions.m = m
  MichiJBOptions.conn = conn
  MichiJBOptions.args = [...args]
  MichiJBOptions.usedPrefix = usedPrefix
  MichiJBOptions.command = command
  MichiJBOptions.pairingPhoneNumber = pairingNumber
  MichiJBOptions.fromCommand = true

  if (isCodeCommand) userData.lastCodeRequest = now
  else userData.Subs = now

  await MichiJadiBot(MichiJBOptions)
}

handler.help = ['qr', 'code']
handler.tags = ['socket']
handler.command = ['qr', 'code']
export default handler

export async function MichiJadiBot(options) {
  let { pathMichiJadiBot, m, conn, args, usedPrefix, command, pairingPhoneNumber } = options

  if (command === 'code') {
    command = 'qr'
    args.unshift('code')
  }

  const mcodeArg = (args[0] && /^(--code|code)$/.test(args[0].trim())) || (args[1] && /^(--code|code)$/.test(args[1].trim()))
  const mcode = options.command === 'code' || mcodeArg
  let txtCode, codeBot, txtQR

  if (mcodeArg) {
    if (args[0]) args[0] = args[0].replace(/^--code$|^code$/, '').trim()
    if (args[1]) args[1] = args[1].replace(/^--code$|^code$/, '').trim()
    if (args[0] === '') args[0] = undefined
  }

  if (mcode && args[0] === undefined) {
    try { fs.rmSync(pathMichiJadiBot, { recursive: true, force: true }) } catch {}
  }

  const pathCreds = path.join(pathMichiJadiBot, 'creds.json')
  if (!fs.existsSync(pathMichiJadiBot)) fs.mkdirSync(pathMichiJadiBot, { recursive: true })

  try {
    if (args[0] !== undefined) {
      fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(Buffer.from(args[0], 'base64').toString('utf-8')), null, '\t'))
    }
  } catch {
    conn.reply(m.chat, `ꕥ Use correctamente el comando » ${usedPrefix + command}`, m)
    return
  }

  const { version } = await fetchLatestBaileysVersion()
  const msgRetry = () => {}
  const msgRetryCache = new NodeCache()
  const { state, saveCreds } = await useMultiFileAuthState(pathMichiJadiBot)
  const connectionOptions = {
    logger: pino({ level: 'fatal' }),
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
    msgRetry,
    msgRetryCache,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    version,
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    keepAliveIntervalMs: 45000,
    maxIdleTimeMs: 120000
  }

  let sock = makeWASocket(connectionOptions)
  sock.isInit = false
  sock.isPairingRequested = false
  let isInit = true

  setTimeout(async () => {
    const wsClosed = !sock.ws || sock.ws.readyState === 3
    if (!sock.user && wsClosed) {
      try { fs.rmSync(pathMichiJadiBot, { recursive: true, force: true }) } catch {}
      try { sock.ws?.close() } catch {}
      try { sock.ev.removeAllListeners() } catch {}
      const i = global.conns.indexOf(sock)
      if (i >= 0) global.conns.splice(i, 1)
      console.log(`[AUTO-LIMPIEZA] Sesión ${path.basename(pathMichiJadiBot)} eliminada por credenciales inválidas.`)
    }
  }, 120000)

  async function sendPairingCode() {
    if (!mcode || sock.user || codeBot || sock.isPairingRequested) return false
    sock.isPairingRequested = true
    await delay(3000)
    try {
      const phoneNumber =
  (pairingPhoneNumber && normalizePhoneNumber(pairingPhoneNumber).length >= 8 ? pairingPhoneNumber : '') ||
  (await resolveSenderToPhone(m?.sender, m, conn)) ||
  (await resolveSenderToPhone(m?.key?.participant, m, conn)) ||
  (await resolveSenderToPhone(m?.participant, m, conn))
      if (!phoneNumber) throw new Error('No se pudo detectar el número del usuario para generar el código.')

      const secret = await sock.requestPairingCode(phoneNumber)
      const formattedSecret = secret.match(/.{1,4}/g)?.join('-') || secret
      txtCode = await conn.sendMessage(m.chat, { text: `${rtx2}

✧ Número solicitado: +${phoneNumber}
✧ Código: *${formattedSecret}*

> Escríbelo en WhatsApp exactamente cuando aparezca la pantalla de vinculación. Si WhatsApp no acepta guiones, escríbelo así: *${secret}*` }, { quoted: m })

      // ╭─ Integrando comando pix: envía el código de 8 dígitos como código copiable ─╮
      await conn.relayMessage(
        m.chat,
        {
          interactiveMessage: {
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'payment_info',
                  buttonParamsJson: JSON.stringify({
                    payment_settings: [
                      {
                        type: 'pix_static_code',
                        pix_static_code: {
                          merchant_name: 'SHADOW-BOT-MD',
                          key: secret,
                          key_type: 'EVP'
                        }
                      }
                    ]
                  })
                }
              ],
              messageParamsJson: '{}'
            },
            contextInfo: {}
          }
        },
        {}
      )

      // ╭─ Envía la imagen junto con el código de vinculación ─╮
      await conn.sendMessage(m.chat, {
        image: { url: 'https://h.uguu.se/iywLLjvT.jpeg' },
        caption: `✧ Código de vinculación copiable: *${secret}*`
      }, { quoted: m })
      // ╰───────────────────────────────────────────────────────╯

      codeBot = await m.reply(secret)
      console.log(`[PAIRING-CODE] ${phoneNumber}: ${secret}`)
      if (txtCode?.key) setTimeout(() => conn.sendMessage(m.chat, { delete: txtCode.key }).catch(() => {}), PAIRING_CODE_TTL_MS)
      if (codeBot?.key) setTimeout(() => conn.sendMessage(m.chat, { delete: codeBot.key }).catch(() => {}), PAIRING_CODE_TTL_MS)
      return true
    } catch (e) {
      console.error('Error generando pairing code:', e)
      sock.isPairingRequested = false
      await m.reply('⚠︎ No fue posible generar el código en este momento. Intenta nuevamente.')
      return false
    }
  }

  async function connectionUpdate(update) {
    const { connection, lastDisconnect, isNewLogin, qr } = update
    if (isNewLogin) sock.isInit = false

    if (await sendPairingCode()) return

    if (qr && !mcode) {
      if (!m?.chat) return
      txtQR = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption: rtx.trim() }, { quoted: m })
      if (txtQR?.key) setTimeout(() => conn.sendMessage(m.chat, { delete: txtQR.key }).catch(() => {}), QR_TTL_MS)
      return
    }

    const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
    if (connection === 'close') {
      const subReconnectCount = sock._reconnectCount || 0
      if (subReconnectCount >= 15) {
        console.log(chalk.bold.redBright(`\n┆ Sesión (+${path.basename(pathMichiJadiBot)}) alcanzó máximo de reconexiones. Eliminando...`))
        try { sock.ev.removeAllListeners() } catch {}
        try { sock.ws?.close() } catch {}
        const idx = global.conns.indexOf(sock)
        if (idx >= 0) global.conns.splice(idx, 1)
        return
      }
      const backoff = Math.min(3000 * Math.pow(2, subReconnectCount), 60000)
      sock._reconnectCount = subReconnectCount + 1

      if ([428, 408, 515].includes(reason)) {
        console.log(chalk.bold.magentaBright(`\n┆ La conexión (+${path.basename(pathMichiJadiBot)}) se cerró. Razón: ${reason}. Reconectando en ${Math.round(backoff/1000)}s...`))
        await delay(backoff)
        await creloadHandler(true).catch(console.error)
        return
      }

      if (reason === 440) {
        console.log(chalk.bold.magentaBright(`\n┆ La conexión (+${path.basename(pathMichiJadiBot)}) fue reemplazada por otra sesión activa.`))
        try {
          if (options.fromCommand && m?.chat) await conn.sendMessage(`${path.basename(pathMichiJadiBot)}@s.whatsapp.net`, { text: '⚠︎ Hemos detectado una nueva sesión, borre la antigua sesión para continuar.\n\n> ☁︎ Si hay algún problema vuelva a conectarse.' }, { quoted: m || null })
        } catch {
          console.error(chalk.bold.yellow(`⚠︎ Error 440 no se pudo enviar mensaje a: +${path.basename(pathMichiJadiBot)}`))
        }
        return
      }

      if (reason === 405 || reason === 401 || reason === 403) {
        console.log(chalk.bold.magentaBright(`\n┆ La sesión (+${path.basename(pathMichiJadiBot)}) fue cerrada o tiene credenciales no válidas.`))
        try {
          if (options.fromCommand && m?.chat) await conn.sendMessage(`${path.basename(pathMichiJadiBot)}@s.whatsapp.net`, { text: '⚠︎ Sesión pendiente.\n\n> ☁︎ Vuelva a intentar nuevamente volver a ser *SUB-BOT*.' }, { quoted: m || null })
        } catch {
          console.error(chalk.bold.yellow(`⚠︎ Error ${reason} no se pudo enviar mensaje a: +${path.basename(pathMichiJadiBot)}`))
        }
        try { sock.ev.removeAllListeners() } catch {}
        try { sock.ws?.close() } catch {}
        const idx = global.conns.indexOf(sock)
        if (idx >= 0) global.conns.splice(idx, 1)
        fs.rmSync(pathMichiJadiBot, { recursive: true, force: true })
        return
      }

      if (reason === 500 || reason === 502) {
        console.log(chalk.bold.magentaBright(`\n┆ Conexión perdida en la sesión (+${path.basename(pathMichiJadiBot)}). Reconectando en ${Math.round(backoff/1000)}s...`))
        await delay(backoff)
        return creloadHandler(true).catch(console.error)
      }

      if (!reason || ![428, 408, 440, 405, 401, 403, 500, 502, 515].includes(reason)) {
        console.log(chalk.bold.yellowBright(`\n┆ Conexión cerrada en sesión (+${path.basename(pathMichiJadiBot)}), razón: ${reason}. Reconectando en ${Math.round(backoff/1000)}s...`))
        await delay(backoff)
        return creloadHandler(true).catch(console.error)
      }
    }
    if (connection === 'open') sock._reconnectCount = 0

    if (global.db.data == null) loadDatabase()
    if (connection === 'open') {
      if (!global.db.data?.users) loadDatabase()
      await joinChannels(sock)
      await sock.newsletterFollow('120363403739366547@newsletter').catch(() => {})
      const userJid = sock.authState.creds.me.jid || `${path.basename(pathMichiJadiBot)}@s.whatsapp.net`
      const userName = sock.authState.creds.me.name || 'Anónimo'
      console.log(chalk.bold.cyanBright(`\n❒⸺⸺⸺⸺【• SUB-BOT •】⸺⸺⸺⸺❒\n│\n│ ❍ ${userName} (+${path.basename(pathMichiJadiBot)}) conectado exitosamente.\n│\n❒⸺⸺⸺【• CONECTADO •】⸺⸺⸺❒`))
      sock.isInit = true
      if (!global.conns.includes(sock)) global.conns.push(sock)
      const targetChat = m?.chat || userJid
      const userSender = m?.sender || userJid
      await conn.sendMessage(targetChat, { text: isSubBotConnected(userSender) ? `> @${userSender.split('@')[0]}, ❐ Has registrado un nuevo _shadow_ *Sub-Bot* 👻` : `> ❀ Has registrado un nuevo *Sub-Bot!* [@${userSender.split('@')[0]}]`, mentions: [userSender] }, { quoted: m || null })
    }
  }

  let healthCheckFailures = 0
  setInterval(async () => {
    const wsClosed = !sock.ws || sock.ws.readyState === 3
    if (sock.user && wsClosed) {
      healthCheckFailures++
      if (healthCheckFailures >= 5) {
        console.log(chalk.bold.yellowBright(`\n⚠︎ Health check Sub-Bot (+${path.basename(pathMichiJadiBot)}): WebSocket cerrado (${healthCheckFailures} fallos). Reconectando...`))
        healthCheckFailures = 0
        await creloadHandler(true).catch(console.error)
      }
    } else {
      healthCheckFailures = 0
      if (!sock.user && wsClosed) {
        try { sock.ev.removeAllListeners() } catch {}
        const i = global.conns.indexOf(sock)
        if (i >= 0) global.conns.splice(i, 1)
      }
    }
  }, 120000)

  let handlerModule = await loadHandlerModule()
  const creloadHandler = async function (restatConn) {
    try {
      const Handler = await loadHandlerModule(true)
      if (typeof Handler?.handler === 'function') handlerModule = Handler
    } catch (e) {
      console.error('⚠︎ Nuevo error: ', e)
    }

    if (restatConn) {
      const oldChats = sock.chats
      try { sock.ws.close() } catch {}
      try { sock.ev.removeAllListeners() } catch {}
      sock = makeWASocket(connectionOptions, { chats: oldChats })
      sock.isInit = false
      sock.isPairingRequested = false
      isInit = true
    }

    if (!isInit) {
      sock.ev.off('messages.upsert', sock.handler)
      sock.ev.off('connection.update', sock.connectionUpdate)
      sock.ev.off('creds.update', sock.credsUpdate)
    }

    sock.handler = handlerModule.handler.bind(sock)
    sock.connectionUpdate = connectionUpdate.bind(sock)
    sock.credsUpdate = saveCreds.bind(sock, true)
    sock.ev.on('messages.upsert', sock.handler)
    sock.ev.on('connection.update', sock.connectionUpdate)
    sock.ev.on('creds.update', sock.credsUpdate)
    isInit = false
    return true
  }

  await creloadHandler(false)
  if (mcode) setTimeout(() => sendPairingCode().catch(console.error), 1500)
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes < 10 ? '0' + minutes : minutes} m y ${seconds < 10 ? '0' + seconds : seconds} s `
}

async function joinChannels(sock) {
  for (const value of Object.values(global.ch || {})) {
    if (typeof value === 'string' && value.endsWith('@newsletter')) await sock.newsletterFollow(value).catch(() => {})
  }
}
