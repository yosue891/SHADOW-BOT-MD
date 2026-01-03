import * as baileys from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import { handleMessage, start as startManager } from '../manager.js'
import { promotePairedSocket } from '../subbotManager.js'

const SUBBOT_DIR = 'Sessions/SubBotTemp'

const styleHeader = (text = '') => `✿ 》》${text || 'SerBot'}《《 ✿`

if (!(global.conns instanceof Array)) global.conns = []
if (!global.SUBBOT_SESSIONS) global.SUBBOT_SESSIONS = new Map()
if (!global.SUBBOT_LOCKS) global.SUBBOT_LOCKS = new Map()

if (!global.MANAGER_STARTED) {
  global.MANAGER_STARTED = true
  try {
    startManager()
  } catch {}
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function sanitizeId(jidOrNum = '') {
  return String(jidOrNum || '').replace(/\D/g, '')
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function isWsOpen(sock) {
  const rs1 = sock?.ws?.socket?.readyState
  const rs2 = sock?.ws?.readyState
  return rs1 === 1 || rs2 === 1
}

function pickCode(lastDisconnect) {
  return (
    lastDisconnect?.error?.output?.statusCode ||
    lastDisconnect?.error?.output?.payload?.statusCode ||
    lastDisconnect?.error?.statusCode ||
    lastDisconnect?.error?.output?.status ||
    lastDisconnect?.error?.output?.payload?.status ||
    null
  )
}

// Lógica de vinculación para el sub-bot
export async function meowJadiBot({ m, conn, args, command }) {
  const chatId = m?.chat
  if (!chatId) return

  const senderJid = m?.sender
  const senderNum = sanitizeId((senderJid || '').split('@')[0] || '')

  if (!senderNum) {
    return conn.sendMessage(
      chatId,
      { text: `${styleHeader('Error')}\n\n⛀ No se pudo detectar tu número.` },
      { quoted: m }
    )
  }

  const isCode = command === 'code' || (args || []).includes('--code')
  const phoneToPair = sanitizeId(args?.[0]) || senderNum

  const id = senderNum

  return withLock(id, async () => {
    const sessionPath = path.join('./', SUBBOT_DIR, id)
    ensureDir(sessionPath)

    const { state, saveCreds } = await baileys.useMultiFileAuthState(sessionPath)
    const { version } = await baileys.fetchLatestBaileysVersion()
    const msgRetryCache = new NodeCache({ stdTTL: 60, checkperiod: 120 })

    let sock = null
    let pairRequested = false
    let lastPairTs = 0

    // Función para crear el socket de vinculación
    function createPairingSocket() {
      const storeLogger = pino({ level: 'silent' })
      const store = baileys.makeInMemoryStore({ logger: storeLogger })

      const browser =
        (baileys.Browsers?.windows && baileys.Browsers.windows('Firefox')) || ['Windows', 'Firefox', '1.0.0']

      const s = baileys.makeWASocket({
        version,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        auth: {
          creds: state.creds,
          keys: baileys.makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser,
        msgRetryCache,
        markOnlineOnConnect: false,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 25_000,
      })

      try {
        store.bind(s.ev)
      } catch {}

      return s
    }

    async function sendPairCode(code) {
      const messageContent =
        `*❏ Pasos »*\n` +
        `1 » Toca "Dispositivos vinculados" en tu WhatsApp.\n` +
        `2 » "Vincular con número de teléfono".\n` +
        `3 » Pega el código de abajo.\n\n` +
        `> ¡Cópialo rápido con el botón!`

      const msg = generateWAMessageFromContent(
        chatId,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage: {
                body: { text: messageContent },
                footer: { text: '𝖢𝗈𝗇𝖾𝗑𝗂𝗈𝗇 𝖵𝗂𝖺 𝖢𝗈́𝖽𝗂𝗀𝗈' },
                header: {
                  title: styleHeader('SerBot • Mode Code'),
                  subtitle: 'Vinculación',
                  hasMediaAttachment: false
                },
                nativeFlowMessage: {
                  buttons: [
                    {
                      name: 'cta_copy',
                      buttonParamsJson: JSON.stringify({
                        display_text: '✐ Code',
                        id: 'copy_code_btn',
                        copy_code: code
                      })
                    }
                  ]
                }
              }
            }
          }
        },
        { quoted: m }
      )

      await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id }).catch(() => {})
    }

    async function maybeRequestPairCode() {
      if (pairRequested || state.creds.registered) return
      const now = Date.now()
      if (now - lastPairTs < 60_000) return
      lastPairTs = now
      pairRequested = true

      try {
        const raw = await requestPairingCodeWithRetry(sock, phoneToPair, { attempts: 4 })
        const code = formatPairCode(raw)

        await sendPairCode(code)
        console.log(chalk.greenBright(`[PAIR CODE] ${phoneToPair} => ${code}`))
      } catch (e) {
        const msg = String(e?.message || e || '')
        await conn
          .sendMessage(chatId, { text: `${styleHeader('Error')}\n\n⛀ ${msg}` }, { quoted: m })
          .catch(() => {})
      } finally {
        pairRequested = false
      }
    }

    // Evento de conexión y manejo del QR
    async function connectionUpdate(update) {
      const { connection, lastDisconnect, qr } = update || {}
      const code = pickCode(lastDisconnect)

      if (connection === 'open') {
        console.log(chalk.greenBright(`[PAIR] open id=${id}`))

        try {
          promotePairedSocket({
            socket: sock,
            id,
            sessionPath,
            ownerJid: senderJid,
            saveCreds
          })
          console.log(chalk.cyanBright(`[PAIR] promoted OK id=${id}`))
        } catch (err) {
          console.error(chalk.red('[PAIR] fallo promotePairedSocket:'), err)
        }

        await conn
          .sendMessage(
            chatId,
            { text: `${styleHeader('Conexión Exitosa')}\n\n> *★* Haz registrado un nuevo Sub-Bot con éxito.` },
            { quoted: m }
          )
          .catch(() => {})

        setTimeout(() => {
          try {
            process.exit(0)
          } catch {}
        }, 1200)

        return
      }

      if (connection === 'close') {
        if (code === baileys.DisconnectReason.restartRequired || String(code) === '515') {
          console.log(chalk.yellowBright(`[PAIR] restartRequired -> recreando socket id=${id}`))
          try {
            await destroySock()
          } catch {}

          sock = createPairingSocket()
          sock.isSubBot = true
          sock.subbotId = id
          sock.subbotOwner = senderJid
          sock.subbotSessionPath = sessionPath

          await bindSocketEvents()
          setTimeout(() => maybeRequestPairCode().catch(() => {}), 1200)
        }
        return
      }

      if (qr) {
        const img = await qrcode.toBuffer(qr, { scale: 8 })
        const caption = `${styleHeader('SerBot • Mode QR')}\n\n⛀ Escanea este QR para vincularte.\n> Caduca pronto.`
        await conn.sendMessage(chatId, { image: img, caption }, { quoted: m }).catch(() => {})
      }
    }

    sock = createPairingSocket()
    sock.ev.on('connection.update', connectionUpdate)

    await maybeRequestPairCode()
  })
}

let handler = async (m, { conn, args, command }) => {
  const chatId = getChatId(m)
  if (!chatId) return

  const socklimit = global.conns.filter((s) => s?.user).length
  if (socklimit >= 50) {
    return conn.sendMessage(
      chatId,
      { text: `${styleHeader('Límite Alcanzado')}\n\n⛀ No hay espacios disponibles.` },
      { quoted: m }
    )
  }

  const senderJid = getSenderJid(m)
  const senderNum = sanitizeId((senderJid || '').split('@')[0] || '')

  if (senderNum && global.SUBBOT_SESSIONS?.has?.(senderNum)) {
    return conn.sendMessage(
      chatId,
      { text: `${styleHeader('Ya Conectado')}\n\n> Ya tienes una sesión activa.` },
      { quoted: m }
    )
  }

  await meowJadiBot({ m, conn, args, command })
}

handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code']

export default handler
