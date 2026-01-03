import * as baileys from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'
import config from '../config.js'
import { handleMessage, start as startManager } from '../manager.js'
import { promotePairedSocket } from '../subbotManager.js'

const { generateWAMessageFromContent } = baileys
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

function formatPairCode(code = '') {
  return String(code || '').match(/.{1,4}/g)?.join('-') || String(code || '')
}

function normalizePairCodeRaw(code = '') {
  // Evita inválido por guiones/espacios
  return String(code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

function getChatId(m = {}) {
  return m?.chat || m?.key?.remoteJid || ''
}

function getSenderJid(m = {}) {
  return (
    m?.sender ||
    m?.key?.participant ||
    m?.participant ||
    m?.key?.remoteJid ||
    m?.chat ||
    ''
  )
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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function withLock(id, fn) {
  const prev = global.SUBBOT_LOCKS.get(id) || Promise.resolve()
  let release
  const next = new Promise((res) => (release = res))
  global.SUBBOT_LOCKS.set(
    id,
    prev
      .catch(() => {})
      .then(async () => {
        try {
          return await fn()
        } finally {
          release()
        }
      })
  )
  return next
}

async function waitWsOpen(sock, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (isWsOpen(sock)) return true
    await sleep(250)
  }
  return isWsOpen(sock)
}

async function waitForPairingReady(sock, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let done = false

    const finish = (ok, err) => {
      if (done) return
      done = true
      try {
        sock?.ev?.off?.('connection.update', onUpdate)
      } catch {}
      clearTimeout(t)
      if (ok) resolve(true)
      else reject(err || new Error('No listo para pairing'))
    }

    const onUpdate = (u) => {
      const { connection, qr } = u || {}
      if (connection === 'connecting' || !!qr) return finish(true)
    }

    const t = setTimeout(
      () => finish(false, new Error('Timeout esperando estado connecting/qr')),
      timeoutMs
    )

    sock.ev.on('connection.update', onUpdate)
  })
}

async function requestPairingCodeWithRetry(sock, phone, { attempts = 4 } = {}) {
  const normalizedPhone = sanitizeId(phone)
  if (!normalizedPhone) throw new Error('Número inválido')

  await sleep(500)
  if (!(await waitWsOpen(sock, 15000))) throw new Error('Conexión cerrada, intenta de nuevo')

  let lastErr = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (!sock || !isWsOpen(sock)) throw new Error('Connection Closed')
      const codeRaw = await sock.requestPairingCode(normalizedPhone)
      return normalizePairCodeRaw(codeRaw)
    } catch (e) {
      lastErr = e
      const status =
        e?.output?.statusCode ||
        e?.output?.status ||
        e?.statusCode ||
        e?.status ||
        null

      const msg = String(e?.message || '').toLowerCase()

      if (String(status) === '428' || msg.includes('connection closed') || msg.includes('closed')) {
        await sleep(900 * attempt)
        continue
      }

      if (String(status) === '429') {
        throw new Error('Rate limit de WhatsApp. Espera 30-40s y vuelve a intentar.')
      }

      throw e
    }
  }

  throw lastErr || new Error('No se pudo generar el código')
}

export async function meowJadiBot({ m, conn, args, command }) {
  const chatId = getChatId(m)
  if (!chatId) return

  const senderJid = getSenderJid(m)
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
    let stopping = false
    let pairRequested = false
    let lastPairTs = 0

    const destroySock = async () => {
      if (!sock) return
      const old = sock
      sock = null
      try {
        old.ev?.removeAllListeners?.()
      } catch {}
      try {
        old.ws?.close?.()
      } catch {}
      try {
        old.end?.()
      } catch {}
    }

    const stopNoDelete = async (msgText) => {
      stopping = true
      if (msgText) {
        await conn.sendMessage(chatId, { text: msgText }, { quoted: m }).catch(() => {})
      }
      await destroySock().catch(() => {})
    }

    const hardStopAndDelete = async (msgText) => {
      stopping = true
      if (msgText) {
        await conn.sendMessage(chatId, { text: msgText }, { quoted: m }).catch(() => {})
      }
      await destroySock().catch(() => {})
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true })
      } catch {}
    }

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

        getMessage: async (key) => {
          try {
            const msg = await store?.loadMessage?.(key?.remoteJid, key?.id)
            return msg?.message || undefined
          } catch {
            return undefined
          }
        }
      })

      try {
        store.bind(s.ev)
      } catch {}

      return s
    }

    async function sendQr(qr) {
      try {
        const img = await qrcode.toBuffer(qr, { scale: 8 })
        const caption =
          `${styleHeader('SerBot • Mode QR')}\n\n` +
          `⛀ Escanea este QR para vincularte.\n` +
          `> Caduca pronto.`
        await conn.sendMessage(chatId, { image: img, caption }, { quoted: m }).catch(() => {})
      } catch {}
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
      if (!isCode || pairRequested || state.creds.registered) return
      const now = Date.now()
      if (now - lastPairTs < 60_000) return
      lastPairTs = now
      pairRequested = true

      try {
        try {
          await waitForPairingReady(sock, 20000)
        } catch {}

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

    async function bindSocketEvents() {
      sock.ev.on('creds.update', () => {
        Promise.resolve(saveCreds()).catch(() => {})
      })

      sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') return
        for (const msg of messages || []) {
          if (!msg?.message) continue
          ;(async () => {
            try {
              await handleMessage(sock, msg)
            } catch (e) {
              console.error('SubBot Error:', e)
            }
          })().catch(() => {})
        }
      })

      sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u || {}
        const code = pickCode(lastDisconnect)

        if (!isCode && qr) {
          await sendQr(qr)
        }

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
          if (stopping) return

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
            if (isCode && !state.creds.registered) {
              // reintentar code
              setTimeout(() => maybeRequestPairCode().catch(() => {}), 1200)
            }
            return
          }

          console.log(chalk.red(`❌ SubBot cerrado. Código: ${code}`))

          if (code === baileys.DisconnectReason.loggedOut || String(code) === '401') {
            await hardStopAndDelete(`${styleHeader('Sesión Cerrada')}\n\n⛀ Vuelve a vincularte.`)
            return
          }

          if (String(code) === '440' || code === baileys.DisconnectReason.connectionReplaced) {
            await hardStopAndDelete(`${styleHeader('Sesión Reemplazada')}\n\n⛀ Se detectó otra sesión abierta.`)
            return
          }

          if (String(code) === '403') {
            await stopNoDelete(`${styleHeader('Error 403')}\n\n⛀ WhatsApp rechazó la sesión temporalmente.`)
            return
          }

          await destroySock().catch(() => {})
          await sleep(2500)
          sock = createPairingSocket()
          sock.isSubBot = true
          sock.subbotId = id
          sock.subbotOwner = senderJid
          sock.subbotSessionPath = sessionPath
          await bindSocketEvents()

          if (isCode && !state.creds.registered) {
            setTimeout(() => maybeRequestPairCode().catch(() => {}), 1200)
          }
        }
      })
    }

    sock = createPairingSocket()
    sock.isSubBot = true
    sock.subbotId = id
    sock.subbotOwner = senderJid
    sock.subbotSessionPath = sessionPath

    await bindSocketEvents()

    if (isCode && !state.creds.registered) {
      setTimeout(() => maybeRequestPairCode().catch(() => {}), 1200)
    }
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
