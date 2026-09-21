const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = (await import("@whiskeysockets/baileys"));
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import { makeWASocket } from '../../lib/simple.js'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ShadowJBOptions = {}

const newsletterJid = '120363403739366547@newsletter'
const newsletterName = '👑 SHADOW-BOT-MD| ᴄʜᴀɴɴᴇʟ-ʙᴏᴛ 🌌'

function resolveExistingModule(...relativePaths) {
  for (const relativePath of relativePaths) {
    const fullPath = path.resolve(__dirname, relativePath)
    if (fs.existsSync(fullPath)) return pathToFileURL(fullPath).href
  }
  return null
}

async function loadHandlerModule() {
  const handlerUrl = resolveExistingModule(
    '../../src/handler.js'
  )
  if (!handlerUrl) return { handler: async () => {} }
  try {
    const handlerModule = await import(handlerUrl)
    if (typeof handlerModule?.handler === 'function') return handlerModule
  } catch (e) {
    console.error('[DARCODE] Error al cargar handler.js:', e)
  }
  return { handler: async () => {} }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let who
    if (m.mentionedJid && m.mentionedJid[0]) {
        who = m.mentionedJid[0]
    } else if (args[0] && args[0].match(/^\d+$/)) {
        who = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    } else {
        return conn.reply(m.chat, `*❌ Falta el usuario.*\n\n> *Debe mencionar o ingresar el número de teléfono* del usuario al que se le enviará el código.`, m);
    }

    let id = `${who.split`@`[0]}`
    let pathShadowJadiBot = path.join(`./jadibot-sessions/`, id)

    ShadowJBOptions.pathShadowJadiBot = pathShadowJadiBot
    ShadowJBOptions.m = m
    ShadowJBOptions.conn = conn
    ShadowJBOptions.args = args
    ShadowJBOptions.usedPrefix = usedPrefix
    ShadowJBOptions.command = command
    ShadowJBOptions.userToSendCode = who 

    await ShadowJadiBot(ShadowJBOptions)
} 

handler.help = ['darcode <@user|number>']
handler.tags = ['owner']
handler.command = ['darcode']
export default handler 

export async function ShadowJadiBot(options) {
    let { pathShadowJadiBot, m, conn, userToSendCode } = options
    let userJid = userToSendCode 

    if (!fs.existsSync(pathShadowJadiBot)){
        fs.mkdirSync(pathShadowJadiBot, { recursive: true })
    }

    const rcanal = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid,
            newsletterName,
            serverMessageId: -1
        }
    }

    let { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState(pathShadowJadiBot)

    const connectionOptions = {
        logger: pino({ level: "fatal" }),
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
        browser: ['Ubuntu', 'Chrome', '110.0.5585.95'], 
        version: version,
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 30000
    };

    let sock = makeWASocket(connectionOptions)
    let handlerModule = await loadHandlerModule()

    sock.handler = handlerModule.handler.bind(sock)

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update

        if (qr && !sock.user) { 
            try {
                let phoneNumber = userJid.split('@')[0];
                let rawCode = await sock.requestPairingCode(phoneNumber);
                let formattedCode = rawCode.match(/.{1,4}/g)?.join("-");

                const pairingCodeMessage = `*🔑 Código de Vinculación de Sub-Bot*\n\n> *Hola, ${phoneNumber}.* El dueño del bot te ha generado un código para vincular tu Sub-Bot.\n\n*Código:* \`\`\`${formattedCode}\`\`\``;

                await conn.sendMessage(userJid, { 
                    text: pairingCodeMessage.trim(),
                    contextInfo: { ...rcanal }
                }, { ephemeralExpiration: 60 * 60 * 24 * 7 });

                await conn.reply(m.chat, `✅ *Código enviado exitosamente* al usuario: @${phoneNumber}.\n\n> *El código se envió al privado del usuario*`, m, { 
                    mentions: [userJid],
                    contextInfo: { ...rcanal }
                });

            } catch (e) {
                console.error('Error al generar o enviar código en darcode:', e);
            }
        }

        if (connection === 'open') {
            console.log(chalk.bold.green(`[DARCODE] Sub-Bot +${userJid.split('@')[0]} vinculado y escuchando mensajes correctamente.`))
            if (!(global.conns instanceof Array)) global.conns = []
            if (!global.conns.includes(sock)) global.conns.push(sock)
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
            if (reason === 401 || reason === 405) {
                try { sock.ev.removeAllListeners() } catch {}
                try { sock.ws?.close() } catch {}
                if (fs.existsSync(pathShadowJadiBot)) {
                    fs.rmSync(pathShadowJadiBot, { recursive: true, force: true });
                }
            }
        }
    }

    sock.connectionUpdate = connectionUpdate.bind(sock)
    sock.credsUpdate = saveCreds.bind(sock, true)
    
    sock.ev.on("messages.upsert", sock.handler)
    sock.ev.on("connection.update", sock.connectionUpdate)
    sock.ev.on("creds.update", sock.credsUpdate)
}
