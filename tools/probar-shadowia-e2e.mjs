import fs from 'fs'
await import('../src/index.js')
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let listo = false
for (let i = 0; i < 90; i++) { await espera(1000); if (global.plugins && Object.keys(global.plugins).length > 0) { listo = true; break } }
if (!listo) { console.log('FALLO: sin plugins'); process.exit(1) }

const total = Object.keys(global.plugins).length
const clave = Object.keys(global.plugins).find((k) => /shadowia/i.test(k))
console.log(`\n[E2E] plugins cargados: ${total}`)
console.log('[E2E] shadowia detectada por el cargador real:', clave)
if (!clave) { console.log('FALLO: el cargador no registró ia-shadowia.js'); process.exit(1) }
const h = global.plugins[clave]
console.log('[E2E] comandos:', h.command)
console.log('[E2E] tags:', h.tags, '| rowner (solo owners):', h.rowner)

/* inyecta órdenes reales en el bot arrancado, sin red salvo la IA */
const acc = []
const conn = {
  user: { jid: '584240000000@s.whatsapp.net' },
  async reply(_c, t) { acc.push({ tipo: 'reply', t: String(t).slice(0, 80) }) },
  async groupMetadata() { return { owner: '584241111111@s.whatsapp.net', participants: [{ id: '584240000000@s.whatsapp.net', admin: 'admin' }, { id: '584242773183@s.whatsapp.net', admin: null }, { id: '584242222222@s.whatsapp.net', admin: null }] } },
  async groupParticipantsUpdate(j, l, a) { acc.push({ tipo: 'participants', a, l }) },
  async groupUpdateSubject(j, v) { acc.push({ tipo: 'subject', v }) },
  async groupUpdateDescription(j, v) { acc.push({ tipo: 'desc', v }) },
  async groupSettingUpdate(j, v) { acc.push({ tipo: 'setting', v }) },
  async updateProfilePicture(j, b) { acc.push({ tipo: 'pp', bytes: b.length }) },
  async groupLeave(j) { acc.push({ tipo: 'leave', j }) },
  async sendPresenceUpdate() {},
  async sendMessage() { return { key: { id: 'X' } } },
}
global.db = global.db || { data: { chats: {}, users: {}, settings: {} } }
const GRUPO = '120363000000000000@g.us'
global.db.data.chats[GRUPO] = {}

const mkM = (text, over = {}) => ({
  chat: GRUPO, sender: '584242773183@s.whatsapp.net', isGroup: true, text,
  mentionedJid: [], reactions: [], quoted: null, msg: {},
  async react(e) { this.reactions.push(e) }, ...over,
})
const ctx = (m, text) => ({ conn, args: text.split(/\s+/).filter(Boolean), text, isROwner: true, isOwner: true, usedPrefix: '>', command: 'shadowia' })

const casos = [
  ['promueve a @584242222222', mkM('promueve a @584242222222', { mentionedJid: ['584242222222@s.whatsapp.net'] })],
  ['expulsa a @584242222222', mkM('expulsa a @584242222222', { mentionedJid: ['584242222222@s.whatsapp.net'] })],
  ['cambia el nombre del grupo a Shadow Garden', mkM('cambia el nombre del grupo a Shadow Garden')],
  ['cambia la descripción a Grupo oficial de Yosue', mkM('cambia la descripción a Grupo oficial de Yosue')],
  ['cierra el grupo', mkM('cierra el grupo')],
  ['ayuda', mkM('ayuda')],
]
for (const [nombre, m] of casos) {
  const antes = acc.length
  await h(m, ctx(m, nombre))
  const nuevos = acc.slice(antes).map((a) => a.tipo === 'reply' ? `reply:"${a.t.slice(0, 45)}"` : JSON.stringify(a))
  console.log(`[E2E] «${nombre}» ->`, nuevos.join(' | '))
}

/* no-owner no debe poder */
const intruso = mkM('expulsa a @584242222222', { sender: '584249999999@s.whatsapp.net', mentionedJid: ['584242222222@s.whatsapp.net'] })
const antes = acc.length
await h(intruso, { ...ctx(intruso, 'expulsa a @584242222222'), isROwner: false, isOwner: false })
console.log('[E2E] intento de un NO-owner ->', acc.slice(antes).map((a) => a.tipo === 'reply' ? `reply:"${a.t}"` : JSON.stringify(a)).join(' | '))

console.log('\n[E2E] ✅ OK — Shadowia registrada y respondiendo dentro del bot real')
process.exit(0)
