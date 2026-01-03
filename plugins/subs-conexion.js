const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = (await import("@whiskeysockets/baileys"))
import qrcode from "qrcode"
import NodeCache from "node-cache"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import util from 'util'
import * as ws from 'ws'
const { child, spawn, exec } = await import('child_process')
const { CONNECTING } = ws
import { makeWASocket } from '../lib/simple.js'
import { fileURLToPath } from 'url'

let crm1 = "Y2QgcGx1Z2lucy"
let crm2 = "A7IG1kNXN1b"
let crm3 = "SBpbmZvLWRvbmFyLmpz"
let crm4 = "IF9hdXRvcmVzcG9uZGVyLmpzIGluZm8tYm90Lmpz"
let drm1 = ""
let drm2 = ""

let rtx = `❐ *_Vincula via codigo qr_*
✩ Escanea este QR para ser *Sub-Bot* temporal.  
✦ Pasos:  
1 » Toca ⋮ arriba a la derecha  
2 » Ve a *Dispositivos vinculados* 3 » Escanea el QR  

✧ Este código expira en *45s*!`

let rtx2 = `❐ *_Vincula via código de 8 digitos_*
✩ Usa este código para ser *Sub-Bot* temporal.  
✦ Pasos:  
1 » Toca ⋮ arriba a la derecha  
2 » *Dispositivos vinculados* 3 » Vincular con el *número de teléfono* 4 » Escribe el *código*`

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MichiJBOptions = {}
if (global.conns instanceof Array) console.log()
else global.conns = []

function isSubBotConnected(jid) { 
  return global.conns.some(sock => sock?.user?.jid && sock.user.jid.split("@")[0] === jid.split("@")[0]) 
}

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  if (!globalThis.db.data.settings[conn.user.jid].jadibotmd) return m.reply(`ꕥ El Comando *${command}* está desactivado temporalmente.`)

  let time = global.db.data.users[m.sender].Subs + 120000
  if (new Date - global.db.data.users[m.sender].Subs < 120000) return conn.reply(m.chat, `ꕥ Debes esperar ${msToTime(time - new Date())} para volver a vincular un *Sub-Bot.*`, m)

  let socklimit = global.conns.filter(sock => sock?.user).length
  if (socklimit >= 50) {
    return m.reply(`ꕥ No se han encontrado espacios para *Sockets* disponibles.`)
  }

  let mentionedJid = await m.mentionedJid
  let who = mentionedJid && mentionedJid[0] ? mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
  let id = `${who.split`@`[0]}`
  let pathMichiJadiBot = path.join(`./${jadi}/`, id)

  if (!fs.existsSync(pathMichiJadiBot)){
    fs.mkdirSync(pathMichiJadiBot, { recursive: true })
  }

  MichiJBOptions.pathMichiJadiBot = pathMichiJadiBot
  MichiJBOptions.m = m
  MichiJBOptions.conn = conn
  MichiJBOptions.args = args
  MichiJBOptions.usedPrefix = usedPrefix
  MichiJBOptions.command = command
  MichiJBOptions.fromCommand = true

  MichiJadiBot(MichiJBOptions)
  global.db.data.users[m.sender].Subs = new Date * 1
}

handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code']
export default handler 

export async function MichiJadiBot(options) {
  let { pathMichiJadiBot, m, conn, args, usedPrefix, command } = options

  if (command === 'code') {
    command = 'qr'
    args.unshift('code')
  }

  const mcodeArg =
    (args[0] && /(--code|code)/.test(args[0].trim())) ||
    (args[1] && /(--code|code)/.test(args[1].trim()))
  let mcode = (options.command === 'code') || mcodeArg

  let txtCode, codeBot, txtQR

  if (mcodeArg) {
    if (args[0]) args[0] = args[0].replace(/^--code$|^code$/, "").trim()
    if (args[1]) args[1] = args[1].replace(/^--code$|^code$/, "").trim()
    if (args[0] == "") args[0] = undefined
  }

  const pathCreds = path.join(pathMichiJadiBot, "creds.json")
  if (!fs.existsSync(pathMichiJadiBot)){
    fs.mkdirSync(pathMichiJadiBot, { recursive: true })
  }

  try {
    args[0] && args[0] != undefined ? fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(Buffer.from(args[0], "base64").toString("utf-8")), null, '\t')) : ""
  } catch {
    conn.reply(m.chat, `ꕥ Use correctamente el comando » ${usedPrefix + command}`, m)
    return
  }

  const comb = Buffer.from(crm1 + crm2 + crm3 + crm4, "base64")
  exec(comb.toString("utf-8"), async (err, stdout, stderr) => {
    let { version, isLatest } = await fetchLatestBaileysVersion()
    const msgRetryCache = new NodeCache()
    const { state, saveCreds } = await useMultiFileAuthState(pathMichiJadiBot)
    
    const connectionOptions = {
      logger: pino({ level: "fatal" }),
      printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
      msgRetryCache, 
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      version: version,
      generateHighQualityLinkPreview: true
    }

    let sock = makeWASocket(connectionOptions)
    sock.isInit = false
    let isInit = true

    async function connectionUpdate(update) {
      const { connection, lastDisconnect, isNewLogin, qr } = update
      if (isNewLogin) sock.isInit = false

      if (mcode && !sock.user && !codeBot && !qr) {
  
        await new Promise(resolve => setTimeout(resolve, 3000))
        try {
          let secret = await sock.requestPairingCode((m.sender.split`@`[0]))
          secret = secret.match(/.{1,4}/g)?.join("-")
          txtCode = await conn.sendMessage(m.chat, { text: rtx2 }, { quoted: m })
          codeBot = await m.reply(secret)
          console.log(`[PAIRING] Código para ${m.sender}: ${secret}`)

          if (txtCode?.key) setTimeout(() => { conn.sendMessage(m.chat, { delete: txtCode.key }) }, 30000)
          if (codeBot?.key) setTimeout(() => { conn.sendMessage(m.chat, { delete: codeBot.key }) }, 30000)
        } catch (e) {
          console.error('Error generando pairing code:', e)
        }
        return
      }

      if (qr && !mcode) {
        if (m?.chat) {
          txtQR = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption: rtx.trim() }, { quoted: m })
        }
        if (txtQR && txtQR.key) {
          setTimeout(() => { conn.sendMessage(m.chat, { delete: txtQR.key }) }, 30000)
        }
        return
      } 

      const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
      if (connection === 'close') {
        if (reason === 428 || reason === 408 || reason === 515 || reason === 500) {
          console.log(chalk.bold.magentaBright(`\n[RECONEXIÓN] Sesión (+${path.basename(pathMichiJadiBot)}) reintentando por error ${reason}`))
          await creloadHandler(true).catch(console.error)
        } else if (reason === 401 || reason === 405 || reason === 403) {
          console.log(chalk.bold.red(`\n[SESIÓN FINALIZADA] Borrando datos de (+${path.basename(pathMichiJadiBot)})`))
          fs.rmSync(pathMichiJadiBot, { recursive: true, force: true })
        }
      }

      if (connection == `open`) {
        console.log(chalk.bold.cyanBright(`\n❒⸺⸺⸺⸺【• SUB-BOT •】⸺⸺⸺⸺❒\n│ ❍ ${sock.user.name || 'Sub-Bot'} Conectado exitosamente.\n❒⸺⸺⸺【• CONECTADO •】⸺⸺⸺❒`))
        sock.isInit = true
        global.conns.push(sock)
        m?.chat ? await conn.sendMessage(m.chat, { text: `> @${m.sender.split('@')[0]}, ✅ ¡Sub-Bot conectado!`, mentions: [m.sender] }, { quoted: m }) : ''
      }
    }

    let handler = await import('../handler.js')
    let creloadHandler = async function (restatConn) {
      try {
        const Handler = await import(`../handler.js?update=${Date.now()}`).catch(console.error)
        if (Object.keys(Handler || {}).length) handler = Handler
      } catch (e) { console.error(e) }
      if (restatConn) {
        try { sock.ws.close() } catch { }
        sock.ev.removeAllListeners()
        sock = makeWASocket(connectionOptions)
        isInit = true
      }
      sock.handler = handler.handler.bind(sock)
      sock.connectionUpdate = connectionUpdate.bind(sock)
      sock.credsUpdate = saveCreds.bind(sock, true)
      sock.ev.on("messages.upsert", sock.handler)
      sock.ev.on("connection.update", sock.connectionUpdate)
      sock.ev.on("creds.update", sock.credsUpdate)
      isInit = false
      return true
    }
    creloadHandler(false)
  })
}

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60),
  minutes = Math.floor((duration / (1000 * 60)) % 60),
  hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return minutes + ' m y ' + seconds + ' s '
}

async function joinChannels(sock) {
  for (const value of Object.values(global.ch)) {
    if (typeof value === 'string' && value.endsWith('@newsletter')) {
      await sock.newsletterFollow(value).catch(() => {})
    }
  }
                                                                                                }
