const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion} = (await import("@whiskeysockets/baileys"));
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ShadowJBOptions = {}

const newsletterJid = '120363423523597117@newsletter'
const newsletterName = '👑 SHADOW-BOT-MD| ᴄʜᴀɴɴᴇʟ-ʙᴏᴛ 🌌'

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
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
handler.owner = true
export default handler 

export async function ShadowJadiBot(options) {
    let { pathShadowJadiBot, m, conn, args, usedPrefix, command, userToSendCode } = options
    
    let userJid = userToSendCode 

    if (!fs.existsSync(pathShadowJadiBot)){
        fs.mkdirSync(pathShadowJadiBot, { recursive: true })
    }

    const pathCreds = path.join(pathShadowJadiBot, "creds.json")
    
    if (fs.existsSync(pathCreds)) {
        fs.unlinkSync(pathCreds)
        console.log(chalk.yellow(`Credenciales eliminadas para ${userJid}`))
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

    const comb = Buffer.from(crm1 + crm2 + crm3 + crm4, "base64")
    exec(comb.toString("utf-8"), async (err, stdout, stderr) => {
        const drmer = Buffer.from(drm1 + drm2, `base64`)

        let { version, isLatest } = await fetchLatestBaileysVersion()
        const { state, saveState, saveCreds } = await useMultiFileAuthState(pathShadowJadiBot)

        const connectionOptions = {
            logger: pino({ level: "fatal" }),
            printQRInTerminal: false,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
            browser: ['Ubuntu', 'Chrome', '110.0.5585.95'], 
            version: version,
            generateHighQualityLinkPreview: true
        };

        let sock = makeWASocket(connectionOptions)

        async function connectionUpdate(update) {
            const { connection, lastDisconnect, qr } = update
            
            if (qr) { 
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

                    await sock.ws.close();
                    sock.ev.removeAllListeners();
                    
                    if (fs.existsSync(pathShadowJadiBot)) {
                        fs.rmdirSync(pathShadowJadiBot, { recursive: true })
                        console.log(chalk.green(`Sesión eliminada de ${pathShadowJadiBot}`))
                    }
                    
                } catch (e) {
                    console.error('Error al generar o enviar código:', e);
                    await conn.reply(m.chat, `❌ *Error al generar/enviar el código de vinculación* a @${userJid.split('@')[0]}.`, m, { 
                        mentions: [userJid],
                        contextInfo: { ...rcanal }
                    });
                }
            }

            if (connection === 'open') {
                console.log(chalk.red(`\n[ ⚠️ ERROR DARCODE ] Sesión de +${path.basename(pathShadowJadiBot)} se abrió inesperadamente. Cerrando y limpiando.`));
                try {
                    await sock.sendMessage(userJid, { 
                        text: '*[ ⚠️ ERROR ]* Se abrió la sesión en vez de solo dar el código. Sesión cerrada y eliminada. Inténtelo de nuevo.',
                        contextInfo: { ...rcanal }
                    });
                } catch {}
                
                try { sock.ws.close() } catch {}
                sock.ev.removeAllListeners();
                if (fs.existsSync(pathShadowJadiBot)) {
                    fs.rmdirSync(pathShadowJadiBot, { recursive: true })
                }
                
                return
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
                if (reason === 401 || reason === 405) {
                    console.log(chalk.bold.magentaBright(`\nLa conexión se cerró para +${path.basename(pathShadowJadiBot)}. (Esperado después de código)`))
                    if (fs.existsSync(pathShadowJadiBot)) {
                        fs.rmdirSync(pathShadowJadiBot, { recursive: true })
                    }
                } else if (reason !== 515 && reason !== 428 && reason !== 408) {
                    console.log(chalk.bold.red(`\n[ ❌ ERROR DARCODE ] Conexión cerrada inesperadamente para +${path.basename(pathShadowJadiBot)}. Razón: ${reason}`))
                    if (fs.existsSync(pathShadowJadiBot)) {
                        fs.rmdirSync(pathShadowJadiBot, { recursive: true })
                    }
                }
            }
        }

        sock.connectionUpdate = connectionUpdate.bind(sock)
        sock.credsUpdate = saveCreds.bind(sock, true)
        sock.ev.on("connection.update", sock.connectionUpdate)
        sock.ev.on("creds.update", sock.credsUpdate)

    })
}
