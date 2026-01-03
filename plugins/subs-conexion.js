const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = (await import("@whiskeysockets/baileys"));
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
let rtx = "*\n\n✐ Cσɳҽxισɳ SυႦ-Bσƚ Mσԃҽ QR\n\n✰ Con otro celular o en la PC escanea este QR para convertirte en un *Sub-Bot* Temporal.\n\n\`1\` » Haga clic en los tres puntos en la esquina superior derecha\n\n\`2\` » Toque dispositivos vinculados\n\n\`3\` » Escanee este código QR para iniciar sesión con el bot\n\n✧ ¡Este código QR expira en 45 segundos!"
let rcanal = 'El canal o grupo donde deseas vincular el Sub-Bot'; // Definir rcanal

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MichiJBOptions = {}
if (global.conns instanceof Array) console.log()
else global.conns = []

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let time = global.db.data.users[m.sender].Subs + 120000
  if (new Date - global.db.data.users[m.sender].Subs < 120000) return conn.reply(m.chat, `${emoji} Debes esperar ${msToTime(time - new Date())} para volver a vincular un *Sub-Bot.*`, m)

  const limiteSubBots = global.subbotlimitt || 20; 
  const subBots = [...new Set([...global.conns.filter((c) => c.user && c.ws.socket && c.ws.socket.readyState !== ws.CLOSED)])]
  const subBotsCount = subBots.length

  if (subBotsCount >= limiteSubBots) {
    return m.reply(`${emoji2} Se ha alcanzado o superado el límite de *Sub-Bots* activos (${subBotsCount}/${limiteSubBots}).\n\nNo se pueden crear más conexiones hasta que un Sub-Bot se desconecte.`)
  }

  let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
  let id = `${who.split`@`[0]}`
  let pathMichiJadiBot = path.join(`./${jadi}/`, id)
  if (!fs.existsSync(pathMichiJadiBot)) {
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
    command = 'qr'; 
    args.unshift('code')
  }
  const mcode = args[0] && /(--code|code)/.test(args[0].trim()) ? true : args[1] && /(--code|code)/.test(args[1].trim()) ? true : false
  let txtCode, codeBot, txtQR

  if (mcode) {
    args[0] = args[0].replace(/^--code$|^code$/, "").trim()
    if (args[1]) args[1] = args[1].replace(/^--code$|^code$/, "").trim()
    if (args[0] == "") args[0] = undefined
  }
  const pathCreds = path.join(pathMichiJadiBot, "creds.json")
  if (!fs.existsSync(pathMichiJadiBot)) {
    fs.mkdirSync(pathMichiJadiBot, { recursive: true })
  }

  try {
    args[0] && args[0] != undefined ? fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(Buffer.from(args[0], "base64").toString("utf-8")), null, '\t')) : ""
  } catch {
    conn.reply(m.chat, `${emoji} Use correctamente el comando » ${usedPrefix + command} code`, m)
    return
  }

  const comb = Buffer.from(crm1 + crm2 + crm3 + crm4, "base64")
  exec(comb.toString("utf-8"), async (err, stdout, stderr) => {
    const drmer = Buffer.from(drm1 + drm2, `base64`)

    let { version, isLatest } = await fetchLatestBaileysVersion()
    const msgRetry = (MessageRetryMap) => { }
    const msgRetryCache = new NodeCache()
    const { state, saveState, saveCreds } = await useMultiFileAuthState(pathMichiJadiBot)

    const connectionOptions = {
      logger: pino({ level: "fatal" }),
      printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
      msgRetry,
      msgRetryCache,
      browser: mcode ? ['Ubuntu', 'Chrome', '110.0.5585.95'] : ['Shadow (Sub Bot)', 'Chrome','2.0.0'],
      version: version,
      generateHighQualityLinkPreview: true
    };

    let sock = makeWASocket(connectionOptions)
    sock.isInit = false
    let isInit = true

    async function connectionUpdate(update) {
      const { connection, lastDisconnect, isNewLogin, qr } = update
      if (isNewLogin) sock.isInit = false
      if (qr && !mcode) {
        if (m?.chat) {
          const stepsMessage = `✐ Con otro celular o en la PC escanea este QR para convertirte en un *Sub-Bot* Temporal.\n\n` +
                               `\`1\` » Haga clic en los tres puntos en la esquina superior derecha\n` +
                               `\`2\` » Toque dispositivos vinculados\n` +
                               `\`3\` » Escanee este código QR para iniciar sesión con el bot\n\n` +
                               `✧ ¡Este código QR expira en 45 segundos!`

          await conn.sendMessage(m.chat, { text: stepsMessage }, { quoted: m })
        } else {
          return 
        }
        return
      }

      if (qr && mcode) {
        const rawCode = await sock.requestPairingCode(m.sender.split`@`[0], "SHADOWXD");

        // Enviar el código de vinculación
        const codeMessage = `*✨ ¡Tu código de vinculación está listo! ✨*\n\n` +
                            `Usa el siguiente código para conectarte como Sub-Bot:\n\n` +
                            `*Código:* ${rawCode.match(/.{1,4}/g)?.join("-")}\n\n` +
                            `> Copia este código para vincularte como Sub-Bot.`
        
        await conn.sendMessage(m.chat, { text: codeMessage }, { quoted: m });
        console.log(`Código de vinculación enviado: ${rawCode}`);
        return;
      }
    }
    sock.ev.on("connection.update", connectionUpdate)
  })
}

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
      seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  hours = (hours < 10) ? '0' + hours : hours
  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds
  return minutes + ' m y ' + seconds + ' s '
  }
