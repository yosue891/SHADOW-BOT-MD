process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './settings.js'
import '../plugins/_fakes.js'
import cfonts from 'cfonts'
import { createRequire } from 'module'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { readdirSync, statSync, unlinkSync, existsSync, mkdirSync, readFileSync, rmSync, watch } from 'fs'
import yargs from 'yargs'
import { spawn, execSync } from 'child_process'
import lodash from 'lodash'
import { MichiJadiBot } from '../plugins/subs-conexion.js'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import { tmpdir } from 'os'
import { format } from 'util'
import boxen from 'boxen'
import pino from 'pino'
import Pino from 'pino'
import path, { join, dirname } from 'path'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from '../lib/simple.js'
import { Low, JSONFile } from 'lowdb'
import { mongoDB, mongoDBV2 } from '../lib/mongoDB.js'
import store from '../lib/store.js'
import { proto } from '@whiskeysockets/baileys'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const { DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser } = await import('@whiskeysockets/baileys')
import readline, { createInterface } from 'readline'
import NodeCache from 'node-cache'
const { CONNECTING } = ws
const { chain } = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let { say } = cfonts
console.log(chalk.magentaBright('\n🌾 Iniciando...'))
say('ShadowBot', {
font: 'simple',
align: 'left',
gradient: ['yellow', 'white']
})
say('Made with Yosue', {
font: 'console',
align: 'center',
colors: ['red', 'magenta', 'yellow']
})
protoType()
serialize()

fs.mkdirSync('tmp', { recursive: true });
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
}; global.__dirname = function dirname(pathURL) {
return path.dirname(global.__filename(pathURL, true))
}; global.__require = function require(dir = import.meta.url) {
return createRequire(dir)
}

global.timestamp = {start: new Date}
const __dirname = global.__dirname(import.meta.url)
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[#!./]')

global.db = new Low(/https?:\/\//.test(opts['db'] || '') ? new cloudDBAdapter(opts['db']) : new JSONFile('database.json'))
global.DATABASE = global.db; 
global.loadDatabase = async function loadDatabase() {
if (global.db.READ) {
return new Promise((resolve) => setInterval(async function() {
if (!global.db.READ) {
clearInterval(this);
resolve(global.db.data == null ? global.loadDatabase() : global.db.data)
}}, 1 * 1000))
}
if (global.db.data !== null) return
global.db.READ = true
await global.db.read().catch(console.error)
global.db.READ = null
global.db.data = {
users: {},
chats: {},
stats: {},
msgs: {},
sticker: {},
settings: {},
...(global.db.data || {}),
}
global.db.chain = chain(global.db.data)
}
loadDatabase()

const {state, saveState, saveCreds} = await useMultiFileAuthState(global.sessions)
const msgRetryCounterMap = new Map()
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const { version } = await fetchLatestBaileysVersion()
let phoneNumber = global.botNumber
const methodCodeQR = process.argv.includes("qr")
const methodCode = process.argv.includes("code")
const MethodMobile = process.argv.includes("mobile")
const colors = chalk.bold.white
const qrOption = chalk.blueBright
const textOption = chalk.cyan
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))
let opcion
if (methodCodeQR) {
opcion = '1'
}
if (!methodCodeQR && !methodCode && !fs.existsSync(`./${sessions}/creds.json`)) {
do {
opcion = await question(colors("Seleccione una opción:\n") + qrOption("1. Con código QR\n") + textOption("2. Con código de texto de 8 dígitos\n--> "))
if (!/^[1-2]$/.test(opcion)) {
console.log(chalk.bold.redBright(`No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales.`))
}} while (opcion !== '1' && opcion !== '2' || fs.existsSync(`./${sessions}/creds.json`))
} 

console.info = () => { }

const connectionOptions = {
logger: pino({ level: 'silent' }),
printQRInTerminal: opcion == '1' ? true : methodCodeQR ? true : false,
mobile: MethodMobile, 
browser: ["MacOs", "Safari"],
auth: {
creds: state.creds,
keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" })),
},
markOnlineOnConnect: false, 
generateHighQualityLinkPreview: true, 
syncFullHistory: false,
getMessage: async (key) => {
try {
let jid = jidNormalizedUser(key.remoteJid);
let msg = await store.loadMessage(jid, key.id)
return msg?.message || ""
} catch (error) {
return ""
}},
msgRetryCounterCache: msgRetryCounterCache || new Map(),
userDevicesCache: userDevicesCache || new Map(),
defaultQueryTimeoutMs: undefined,
cachedGroupMetadata: (jid) => globalThis.conn?.chats?.[jid]?.metadata ?? {},
version: version, 
keepAliveIntervalMs: 25000, 
maxIdleTimeMs: 0, 
}

global.conn = makeWASocket(connectionOptions)
conn.ev.on('creds.update', saveCreds.bind(global.conn, true))
if (!fs.existsSync(`./${sessions}/creds.json`)) {
if (opcion === '2' || methodCode) {
opcion = '2'
let addNumber
if (methodCode && !!phoneNumber) {
addNumber = phoneNumber.replace(/[^0-9]/g, '')
} else {
do {
phoneNumber = await question(chalk.bgBlack(chalk.bold.greenBright(`[ 🍂 ]  Por favor, Ingrese el número de WhatsApp.\n${chalk.bold.magentaBright('---> ')}`)))
phoneNumber = phoneNumber.replace(/\D/g,'')
if (!phoneNumber.startsWith('+')) {
phoneNumber = `+${phoneNumber}`
}} while (!await isValidPhoneNumber(phoneNumber))
rl.close()
addNumber = phoneNumber.replace(/\D/g, '')
}
const requestPairingWithRetry = async (retries = 3) => {
for (let i = 0; i < retries; i++) {
try {
if (!global.conn?.authState?.creds?.registered) {
let codeBot = await global.conn.requestPairingCode(addNumber)
codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot
console.log(chalk.bold.white(chalk.bgMagenta(`[ ✿ ]  Código:`)), chalk.bold.white(chalk.white(codeBot)))
return
}
} catch (e) {
console.log(chalk.bold.yellowBright(`\n⚠︎ Reintentando solicitar código de vinculación (${i + 1}/${retries})...`))
await delay(5000)
}
}
console.log(chalk.bold.redBright(`\n⚠︎ No se pudo solicitar el código de vinculación.`))
}
setTimeout(() => requestPairingWithRetry(), 3000)
}}
conn.isInit = false
conn.well = false
conn.logger.info(`[ 🍐 ]  H E C H O\n`)
if (!opts['test']) {
if (global.db) setInterval(async () => {
if (global.db.data) await global.db.write()
if (opts['autocleartmp'] && (global.support || {}).find) (tmp = [os.tmpdir(), 'tmp', `${jadi}`], tmp.forEach((filename) => cp.spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete'])))
}, 30 * 1000)
}

const lidCache = global.__shadowLidCache || (global.__shadowLidCache = new Map())

async function resolveLidToRealJid(lidJid, groupJid, maxRetries = 3, retryDelay = 1000) {
if (!lidJid?.endsWith("@lid") || !groupJid?.endsWith("@g.us")) return lidJid?.includes("@") ? lidJid : `${lidJid}@s.whatsapp.net`
const cached = lidCache.get(lidJid);
if (cached) return cached;
const lidToFind = lidJid.split("@")[0];
let attempts = 0
while (attempts < maxRetries) {
try {
const metadata = await conn.groupMetadata(groupJid)
if (!metadata?.participants) throw new Error("No se obtuvieron participantes")
for (const participant of metadata.participants) {
try {
const participantJid = participant.phoneNumber || participant.jid || participant.id
if (!participantJid) continue
if (participant.lid?.split('@')[0] === lidToFind && participant.phoneNumber) {
lidCache.set(lidJid, participant.phoneNumber)
return participant.phoneNumber
}
const contactDetails = await conn.onWhatsApp(participantJid)
if (!contactDetails?.[0]?.lid) continue
const possibleLid = contactDetails[0].lid.split("@")[0]
if (possibleLid === lidToFind) {
lidCache.set(lidJid, participantJid)
return participantJid
}} catch (e) {
continue
}}
lidCache.set(lidJid, lidJid)
return lidJid
} catch (e) {
attempts++
if (attempts >= maxRetries) {
lidCache.set(lidJid, lidJid)
return lidJid
}
await new Promise(resolve => setTimeout(resolve, retryDelay))
}}
return lidJid
}

async function extractAndProcessLids(text, groupJid) {
if (!text) return text
const lidMatches = text.match(/\d+@lid/g) || []
let processedText = text
for (const lid of lidMatches) {
try {
const realJid = await resolveLidToRealJid(lid, groupJid);
processedText = processedText.replace(new RegExp(lid, 'g'), realJid)
} catch (e) {
console.error(`Error procesando LID ${lid}:`, e)
}}
return processedText
}

async function processLidsInMessage(message, groupJid) {
if (!message || !message.key) return message
try {
const messageCopy = {
key: {...message.key},
message: message.message ? {...message.message} : undefined,
...(message.quoted && {quoted: {...message.quoted}}),
...(message.mentionedJid && {mentionedJid: [...message.mentionedJid]})
}
const remoteJid = messageCopy.key.remoteJid || groupJid
if (messageCopy.key?.participant?.endsWith('@lid')) { messageCopy.key.participant = await resolveLidToRealJid(messageCopy.key.participant, remoteJid) }
if (messageCopy.message?.extendedTextMessage?.contextInfo?.participant?.endsWith('@lid')) { messageCopy.message.extendedTextMessage.contextInfo.participant = await resolveLidToRealJid( messageCopy.message.extendedTextMessage.contextInfo.participant, remoteJid ) }
if (messageCopy.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
const mentionedJid = messageCopy.message.extendedTextMessage.contextInfo.mentionedJid
if (Array.isArray(mentionedJid)) {
for (let i = 0; i < mentionedJid.length; i++) {
if (mentionedJid[i]?.endsWith('@lid')) {
mentionedJid[i] = await resolveLidToRealJid(mentionedJid[i], remoteJid)
}}}}
if (messageCopy.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.contextInfo?.mentionedJid) {
const quotedMentionedJid = messageCopy.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage.contextInfo.mentionedJid;
if (Array.isArray(quotedMentionedJid)) {
for (let i = 0; i < quotedMentionedJid.length; i++) {
if (quotedMentionedJid[i]?.endsWith('@lid')) {
quotedMentionedJid[i] = await resolveLidToRealJid(quotedMentionedJid[i], remoteJid)
}}}}
if (messageCopy.message?.conversation) { messageCopy.message.conversation = await extractAndProcessLids(messageCopy.message.conversation, remoteJid) }
if (messageCopy.message?.extendedTextMessage?.text) { messageCopy.message.extendedTextMessage.text = await extractAndProcessLids(messageCopy.message.extendedTextMessage.text, remoteJid) }
if (messageCopy.message?.extendedTextMessage?.contextInfo?.participant && !messageCopy.quoted) {
const quotedSender = await resolveLidToRealJid( messageCopy.message.extendedTextMessage.contextInfo.participant, remoteJid );
messageCopy.quoted = { sender: quotedSender, message: messageCopy.message.extendedTextMessage.contextInfo.quotedMessage }
}
return messageCopy
} catch (e) {
console.error('Error en processLidsInMessage:', e)
return message
}}

async function connectionUpdate(update) {
const {connection, lastDisconnect, isNewLogin} = update
global.stopped = connection
if (isNewLogin) conn.isInit = true
if (global.db.data == null) loadDatabase()
if (update.qr != 0 && update.qr != undefined || methodCodeQR) {
if (opcion == '1' || methodCodeQR) {
console.log(chalk.green.bold(`[ ✿ ]  Escanea este código QR`))}
}
if (connection === "open") {
if (conn.user?.id) {
global._pairingRetries = 0
const userJid = jidNormalizedUser(conn.user.id)
const userName = conn.user.name || conn.user.verifiedName || "Desconocido"
await joinChannels(conn)
console.log(chalk.green.bold(`[ ✿ ]  Conectado a: ${userName}`))
}}
let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
if (connection === 'close') {
    const isAuthenticated = !!(conn?.user?.id)
    if (reason === DisconnectReason.badSession) {
console.log(chalk.bold.cyanBright(`\n⚠︎ Sesión incorrecta, borra la session principal del Bot, y conectate nuevamente.`))
} else if (reason === DisconnectReason.connectionClosed) {
if (!isAuthenticated) {
if (opcion === '2' || methodCode) {
if ((global._pairingRetries || 0) >= 8) return
global._pairingRetries = (global._pairingRetries || 0) + 1
console.log(chalk.bold.magentaBright(`\n♻ Reconectando (${global._pairingRetries}/8)...`))
await delay(5000)
await global.reloadHandler(true).catch(console.error)
}
return
}
console.log(chalk.bold.magentaBright(`\n♻ Reconectando la conexión del Bot...`))
await delay(3000)
await global.reloadHandler(true).catch(console.error)
} else if (reason === DisconnectReason.connectionLost) {
if (!isAuthenticated) {
if (opcion === '2' || methodCode) {
if ((global._pairingRetries || 0) >= 8) return
global._pairingRetries = (global._pairingRetries || 0) + 1
await delay(5000)
await global.reloadHandler(true).catch(console.error)
}
return
}
console.log(chalk.bold.blueBright(`\n⚠︎ Conexión perdida con el servidor, reconectando el Bot...`))
await delay(3000)
await global.reloadHandler(true).catch(console.error)
} else if (reason === DisconnectReason.connectionReplaced) {
console.log(chalk.bold.yellowBright(`\nꕥ La conexión del Bot ha sido reemplazada.`))
} else if (reason === DisconnectReason.loggedOut) {
console.log(chalk.bold.redBright(`\n⚠︎ Sesión cerrada, borra la session principal del Bot, y conectate nuevamente.`))
} else if (reason === DisconnectReason.restartRequired) {
if (!isAuthenticated) {
if (opcion === '2' || methodCode) {
if ((global._pairingRetries || 0) >= 8) return
global._pairingRetries = (global._pairingRetries || 0) + 1
await delay(5000)
await global.reloadHandler(true).catch(console.error)
}
return
}
console.log(chalk.bold.cyanBright(`\n♻ Conectando el Bot con el servidor...`))
await delay(3000)
await global.reloadHandler(true).catch(console.error)
} else if (reason === DisconnectReason.timedOut) {
if (!isAuthenticated) {
if (opcion === '2' || methodCode) {
if ((global._pairingRetries || 0) >= 8) return
global._pairingRetries = (global._pairingRetries || 0) + 1
await delay(5000)
await global.reloadHandler(true).catch(console.error)
}
return
}
console.log(chalk.bold.yellowBright(`\n♻ Conexión agotada, reconectando el Bot...`))
await delay(5000)
await global.reloadHandler(true).catch(console.error)
    } else {
        if (!isAuthenticated) {
if (opcion === '2' || methodCode) {
if ((global._pairingRetries || 0) >= 8) return
global._pairingRetries = (global._pairingRetries || 0) + 1
await delay(5000)
await global.reloadHandler(true).catch(console.error)
}
return
}
        console.log(chalk.bold.redBright(`\n⚠︎ Conexión cerrada (razón: ${reason}), reconectando...`))
        await delay(3000)
        await global.reloadHandler(true).catch(console.error)
    }}}
process.on('uncaughtException', console.error)
process.on('unhandledRejection', (err) => {
if (err?.message?.includes('Connection Closed') || err?.message?.includes('not opened')) return
console.error(err)
})
let isInit = true
let handler = await import('./handler.js')
global.reloadHandler = async function(restatConn) {
try {
const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
if (Object.keys(Handler || {}).length) handler = Handler
} catch (e) {
console.error(e);
}
if (restatConn) {
const oldChats = global.conn.chats
try {
global.conn.ws.close()
} catch { }
conn.ev.removeAllListeners()
global.conn = makeWASocket(connectionOptions, {chats: oldChats})
isInit = true
}
if (!isInit) {
conn.ev.off('messages.upsert', conn.handler)
conn.ev.off('connection.update', conn.connectionUpdate)
conn.ev.off('creds.update', conn.credsUpdate)
}
conn.handler = handler.handler.bind(global.conn)
conn.connectionUpdate = connectionUpdate.bind(global.conn)
conn.credsUpdate = saveCreds.bind(global.conn, true)
conn.ev.on('messages.upsert', conn.handler)
conn.ev.on('connection.update', conn.connectionUpdate)
conn.ev.on('creds.update', conn.credsUpdate)
isInit = false
return true
}
//setInterval(() => {
//console.log('[ ✿ ]  Reiniciando...');
//process.exit(0)
//}, 10800000)
let rtU = join(__dirname, `./${jadi}`)
if (!existsSync(rtU)) {
mkdirSync(rtU, { recursive: true }) 
}

global.rutaJadiBot = join(__dirname, `./${jadi}`)
if (global.MichiJadibts) {
if (!existsSync(global.rutaJadiBot)) {
mkdirSync(global.rutaJadiBot, { recursive: true }) 
console.log(chalk.bold.cyan(`ꕥ La carpeta: ${jadi} se creó correctamente.`))
} else {
console.log(chalk.bold.cyan(`ꕥ La carpeta: ${jadi} ya está creada.`)) 
}
const readRutaJadiBot = readdirSync(rutaJadiBot)
if (readRutaJadiBot.length > 0) {
const creds = 'creds.json'
for (const gjbts of readRutaJadiBot) {
const botPath = join(rutaJadiBot, gjbts)
const readBotPath = readdirSync(botPath)
if (readBotPath.includes(creds)) {
MichiJadiBot({pathMichiJadiBot: botPath, m: null, conn, args: '', usedPrefix: '/', command: 'serbot'})
}}}}

const pluginFolder = join(__dirname, '../plugins')
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}
async function filesInit() {
for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
try {
const file = global.__filename(join(pluginFolder, filename))
const module = await import(file)
global.plugins[filename] = module.default || module
} catch (e) {
conn.logger.error(e)
delete global.plugins[filename]
}}}
await filesInit()
console.log(chalk.cyan(`[ ✿ ] Plugins cargados: ${Object.keys(global.plugins).length}`))

global.reload = async (_ev, filename) => {
if (pluginFilter(filename)) {
const dir = global.__filename(join(pluginFolder, filename), true);
if (filename in global.plugins) {
if (existsSync(dir)) conn.logger.info(` updated plugin - '${filename}'`)
else {
conn.logger.warn(`deleted plugin - '${filename}'`)
return delete global.plugins[filename]
}} else conn.logger.info(`new plugin - '${filename}'`)
const err = syntaxerror(readFileSync(dir), filename, {
sourceType: 'module',
allowAwaitOutsideFunction: true,
});
if (err) conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`)
else {
try {
const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`));
global.plugins[filename] = module.default || module;
} catch (e) {
conn.logger.error(`error require plugin '${filename}\n${format(e)}'`)
} finally {
global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
}}}}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()
async function _quickTest() {
const test = await Promise.all([
spawn('ffmpeg'),
spawn('ffprobe'),
spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
spawn('convert'),
spawn('magick'),
spawn('gm'),
spawn('find', ['--version']),
].map((p) => {
return Promise.race([
new Promise((resolve) => {
p.on('close', (code) => {
resolve(code !== 127);
});
}),
new Promise((resolve) => {
p.on('error', (_) => resolve(false))
})])
}))
const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
const s = global.support = {ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find};
Object.freeze(global.support);
}
// Limpieza automática de audios innecesarios de subbots cada 3 minutos
setInterval(async () => {
  const baseDir = `./${jadi}/`;
  try {
    if (!existsSync(baseDir)) return;

    const subBots = await fs.promises.readdir(baseDir);
    let totalDeleted = 0;

    for (const bot of subBots) {
      const botPath = join(baseDir, bot);
      const stat = await fs.promises.stat(botPath).catch(() => null);
      if (!stat?.isDirectory()) continue;

      const files = await fs.promises.readdir(botPath);
      for (const file of files) {
        if (!['creds.json', 'config.json', 'config.js'].includes(file)) {
          const filePath = join(botPath, file);
          try {
            await fs.promises.rm(filePath, { recursive: true, force: true });
            totalDeleted++;
          } catch {}
        }
      }
    }
  } catch {}
}, 3 * 60 * 1000)

// Tmp
setInterval(async () => {
const tmpDir = join(__dirname, 'tmp')
try {
const filenames = await fs.promises.readdir(tmpDir)
await Promise.all(filenames.map(f => fs.promises.unlink(join(tmpDir, f)).catch(() => {})))
} catch {}}, 30 * 1000)

// Sessions Subs
setInterval(async () => {
const directories = [`./${sessions}/`, `./${jadi}/`]
for (const dir of directories) {
try {
const files = await fs.promises.readdir(dir)
for (const file of files) {
if (file !== 'creds.json') await fs.promises.unlink(path.join(dir, file)).catch(() => {})
}
} catch {} } }, 10 * 60 * 1000)
// Health check - cada 30s verifica que el WebSocket esté vivo (solo si autenticado)
setInterval(async () => {
    try {
        if (global.conn?.user?.id) {
            const state = global.conn.ws?.readyState
            if (!global.conn.ws || state === 3 || state === 2) {
                console.log(chalk.bold.yellowBright(`\n⚠︎ Health check: WebSocket cerrado (${state}). Reconectando...`))
                await global.reloadHandler(true).catch(console.error)
            }
        }
    } catch (e) {
        console.error('Error en health check:', e)
    }
}, 30000)

_quickTest().catch(console.error)
async function isValidPhoneNumber(number) {
try {
number = number.replace(/\s+/g, '')
if (number.startsWith('+521')) {
number = number.replace('+521', '+52');
} else if (number.startsWith('+52') && number[4] === '1') {
number = number.replace('+52 1', '+52');
}
const parsedNumber = phoneUtil.parseAndKeepRawInput(number)
return phoneUtil.isValidNumber(parsedNumber)
} catch (error) {
return false
}}

async function joinChannels(sock) {
for (const value of Object.values(global.ch)) {
if (typeof value === 'string' && value.endsWith('@newsletter')) {
await sock.newsletterFollow(value).catch(() => {})
}}}
