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

async function resolveSenderToPhone(sender, m, conn) {
  if (!sender) return ''
  if (!sender.endsWith('@lid')) return extractPhone(sender)
  const remoteJid = m?.key?.remoteJid
  if (remoteJid && !remoteJid.endsWith('@lid') && !remoteJid.endsWith('@g.us') && !remoteJid.endsWith('@newsletter')) {
    return extractPhone(remoteJid)
  }
  const lidToFind = sender.split('@')[0]
  const groups = Object.keys(conn?.chats || {}).filter(jid => jid.endsWith('@g.us'))
  for (const groupJid of groups) {
    try {
      const metadata = await conn.groupMetadata(groupJid).catch(() => null)
      if (!metadata?.participants) continue
      for (const participant of metadata.participants) {
        if (participant.lid?.split('@')[0] === lidToFind && participant.phoneNumber) {
          return extractPhone(participant.phoneNumber)
        }
        const participantJid = participant.phoneNumber || participant.jid || participant.id
        if (!participantJid || participantJid.endsWith('@lid')) continue
        const contactDetails = await conn.onWhatsApp(participantJid).catch(() => [])
        if (contactDetails?.[0]?.lid?.split('@')[0] === lidToFind) {
          return extractPhone(participantJid)
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

  const socklimit = global.conns.filter(sock => sock?.user).length
  if (socklimit >= 10) return m.reply('ꕥ No se han encontrado espacios para *Sockets* disponibles.')

  const mentionedJid = m.mentionedJid || []
  const who = mentionedJid[0] || m.sender
  const pairingNumber = await resolveSenderToPhone(who, m, conn)
  console.log('m.sender =>', m.sender)
  console.log('who =>', who)
  console.log('pairingNumber =>', pairingNumber)
  console.log('mentionedJid =>', mentionedJid)
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
handler.tags = ['serbot']
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
    markOnlineOnConnect: false,
    syncFullHistory: false
  }

  let sock = makeWASocket(connectionOptions)
  sock.isInit = false
  sock.isPairingRequested = false
  let isInit = true

  setTimeout(async () => {
    if (!sock.user) {
      try { fs.rmSync(pathMichiJadiBot, { recursive: true, force: true }) } catch {}
      try { sock.ws?.close() } catch {}
      try { sock.ev.removeAllListeners() } catch {}
      const i = global.conns.indexOf(sock)
      if (i >= 0) global.conns.splice(i, 1)
      console.log(`[AUTO-LIMPIEZA] Sesión ${path.basename(pathMichiJadiBot)} eliminada por credenciales inválidas.`)
    }
  }, 60000)

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

console.log('sender:', m.sender)
console.log('contact:', conn.contacts?.[m.sender])

const secret = await sock.requestPairingCode(phoneNumber)
      const formattedSecret = secret.match(/.{1,4}/g)?.join('-') || secret
      txtCode = await conn.sendMessage(m.chat, { text: `${rtx2}

✧ Número solicitado: +${phoneNumber}
✧ Código: *${formattedSecret}*

> Escríbelo en WhatsApp exactamente cuando aparezca la pantalla de vinculación. Si WhatsApp no acepta guiones, escríbelo así: *${secret}*`, ...global.rcanal }, { quoted: m })
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
      if ([428, 408, 515].includes(reason)) {
        console.log(chalk.bold.magentaBright(`\n┆ La conexión (+${path.basename(pathMichiJadiBot)}) se cerró. Razón: ${reason}. Intentando reconectar...`))
        await creloadHandler(true).catch(console.error)
      }

      if (reason === 440) {
        console.log(chalk.bold.magentaBright(`\n┆ La conexión (+${path.basename(pathMichiJadiBot)}) fue reemplazada por otra sesión activa.`))
        try {
          if (options.fromCommand && m?.chat) await conn.sendMessage(`${path.basename(pathMichiJadiBot)}@s.whatsapp.net`, { text: '⚠︎ Hemos detectado una nueva sesión, borre la antigua sesión para continuar.\n\n> ☁︎ Si hay algún problema vuelva a conectarse.' }, { quoted: m || null })
        } catch {
          console.error(chalk.bold.yellow(`⚠︎ Error 440 no se pudo enviar mensaje a: +${path.basename(pathMichiJadiBot)}`))
        }
      }

      if (reason === 405 || reason === 401 || reason === 403) {
        console.log(chalk.bold.magentaBright(`\n┆ La sesión (+${path.basename(pathMichiJadiBot)}) fue cerrada o tiene credenciales no válidas.`))
        try {
          if (options.fromCommand && m?.chat) await conn.sendMessage(`${path.basename(pathMichiJadiBot)}@s.whatsapp.net`, { text: '⚠︎ Sesión pendiente.\n\n> ☁︎ Vuelva a intentar nuevamente volver a ser *SUB-BOT*.' }, { quoted: m || null })
        } catch {
          console.error(chalk.bold.yellow(`⚠︎ Error ${reason} no se pudo enviar mensaje a: +${path.basename(pathMichiJadiBot)}`))
        }
        fs.rmSync(pathMichiJadiBot, { recursive: true, force: true })
      }

      if (reason === 500) {
        console.log(chalk.bold.magentaBright(`\n┆ Conexión perdida en la sesión (+${path.basename(pathMichiJadiBot)}). Reconectando...`))
        if (options.fromCommand && m?.chat) await conn.sendMessage(`${path.basename(pathMichiJadiBot)}@s.whatsapp.net`, { text: '⚠︎ Conexión perdida.\n\n> ☁︎ Intente conectarse manualmente para volver a ser *SUB-BOT*' }, { quoted: m || null })
        return creloadHandler(true).catch(console.error)
      }
    }

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

  setInterval(async () => {
    if (!sock.user) {
      try { sock.ws.close() } catch {}
      try { sock.ev.removeAllListeners() } catch {}
      const i = global.conns.indexOf(sock)
      if (i >= 0) global.conns.splice(i, 1)
    }
  }, 60000)

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
