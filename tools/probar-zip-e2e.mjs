/* Prueba E2E: inyecta un mensaje falso en el bot REAL ya vinculado a WhatsApp.
   Uso: node tools/probar-zip-e2e.mjs
   Necesita que el bot esté corriendo (misma carpeta) para usar sus módulos. */
import fs from 'fs'
import AdmZip from 'adm-zip'

// arranca el bot real (se queda esperando QR / conexión)
await import('../src/index.js')

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

let listo = false
for (let i = 0; i < 90; i++) {
  await espera(1000)
  if (global.plugins && Object.keys(global.plugins).length > 0) { listo = true; break }
}
if (!listo) { console.log('FALLO: no se cargaron plugins'); process.exit(1) }

const claves = Object.keys(global.plugins).filter((k) => /zipcode/i.test(k))
console.log('\n[E2E] plugin detectado por el cargador real:', claves)
if (!claves.length) { console.log('FALLO: el cargador no registró herras-zipcode.js'); process.exit(1) }

const handler = global.plugins[claves[0]]
const comandos = handler?.command || handler?.default?.command
console.log('[E2E] comandos registrados:', comandos)

/* --- fake conn que usa sendFile de verdad (simple.js) pero sin red --- */
const enviados = []
const conn = {
  user: { jid: '584242773183@s.whatsapp.net' },
  logger: { error: (e) => console.log('[E2E][err]', e?.message || e), info: () => {}, warn: () => {} },
  async reply(_c, t) { enviados.push({ tipo: 'reply', texto: t }) },
  async sendMessage(_jid, contenido) { enviados.push({ tipo: 'sendMessage', contenido }); return { key: { id: 'X' } } },
  async sendFile(_jid, buffer, filename, caption, _q, _ptt, options) {
    enviados.push({ tipo: 'sendFile', buffer, filename, caption, options })
  },
  async parseMention() { return [] },
}

const codigo = '```javascript\nconst http = require("http");\nconst server = http.createServer((req,res)=>{\n  res.writeHead(200,{"Content-Type":"application/json"});\n  res.end(JSON.stringify({ok:true, ruta:req.url}));\n});\nserver.listen(3000, ()=>console.log("arriba en 3000"));\n```'

const m = {
  chat: '120363000000000000@g.us',
  sender: '584242773183@s.whatsapp.net',
  isGroup: true,
  text: '',
  reactions: [],
  quoted: { text: codigo, mimetype: 'text/plain', sender: '584242773183@s.whatsapp.net' },
  async react(e) { this.reactions.push(e) },
  async reply(t) { enviados.push({ tipo: 'm.reply', texto: t }) },
}

global.db = global.db || { data: { chats: {}, users: {}, settings: {} } }
global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
global.db.data.users[m.sender] = global.db.data.users[m.sender] || {}

await handler(m, { conn, text: '', usedPrefix: '>', command: 'zip' })

console.log('[E2E] reacciones:', m.reactions)
const f = enviados.find((e) => e.tipo === 'sendFile')
if (!f) { console.log('FALLO: no se envió ningún archivo ->', JSON.stringify(enviados)); process.exit(1) }

fs.writeFileSync('/tmp/e2e-salida.zip', f.buffer)
console.log('[E2E] archivo enviado:', f.filename, '| mimetype:', f.options?.mimetype, '| asDocument:', f.options?.asDocument)
console.log('[E2E] tamaño del zip:', f.buffer.length, 'bytes')
const zip = new AdmZip(f.buffer)
const entradas = zip.getEntries().map((e) => `${e.entryName} (${e.header.size} bytes)`)
console.log('[E2E] contenido del zip:', entradas)
console.log('[E2E] primeras 3 líneas del archivo extraído:')
console.log(zip.readAsText(zip.getEntries()[0]).split('\n').slice(0, 3).map((l) => '    ' + l).join('\n'))
console.log('\n[E2E] ✅ OK — el comando respondió con un .zip válido')
process.exit(0)
