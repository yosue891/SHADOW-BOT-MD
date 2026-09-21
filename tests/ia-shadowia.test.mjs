import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler, { parsearOrden, resolverObjetivo, esProtegido, extraerValor } from '../plugins/ia/ia-shadowia.js'

/* ──────────── mocks ──────────── */

const OWNER = '584242773183@s.whatsapp.net'
const BOT = '584240000000@s.whatsapp.net'
const GRUPO = '120363000000000000@g.us'
const CREADOR_GRUPO = '584241111111@s.whatsapp.net'
const MIEMBRO = '584242222222@s.whatsapp.net'

function makeM(over = {}) {
  return {
    chat: GRUPO,
    sender: OWNER,
    isGroup: true,
    text: '',
    mentionedJid: [],
    reactions: [],
    quoted: null,
    msg: {},
    async react(e) { this.reactions.push(e) },
    ...over,
  }
}

function makeConn(sent, meta) {
  return {
    user: { jid: BOT },
    sent,
    async reply(_c, texto, _m, opciones) { sent.replies.push({ texto, opciones }); return {} },
    async groupMetadata() { return meta },
    async groupParticipantsUpdate(jid, lista, accion) { sent.participants.push({ jid, lista, accion }) },
    async groupUpdateSubject(jid, v) { sent.subject = { jid, v } },
    async groupUpdateDescription(jid, v) { sent.desc = { jid, v } },
    async updateProfilePicture(jid, buf) { sent.pp = { jid, bytes: buf.length } },
    async groupSettingUpdate(jid, v) { sent.setting = { jid, v } },
    async groupLeave(jid) { sent.left = jid },
    async sendPresenceUpdate() {},
    async sendMessage(jid, contenido) { sent.messages.push(contenido); return { key: { id: 'X' } } },
  }
}

function makeSent() {
  return { replies: [], participants: [], messages: [], subject: null, desc: null, pp: null, setting: null, left: null }
}

const metaGrupo = {
  owner: CREADOR_GRUPO,
  participants: [
    { id: BOT, admin: 'admin' },
    { id: OWNER, admin: null },
    { id: MIEMBRO, admin: null },
    { id: CREADOR_GRUPO, admin: 'superadmin' },
  ],
}

async function correr({ text = '', over = {}, meta = metaGrupo, isROwner = true } = {}) {
  const sent = makeSent()
  const m = makeM({ text, ...over })
  const conn = makeConn(sent, meta)
  await handler(m, {
    conn,
    args: text.split(/\s+/).filter(Boolean),
    text,
    isROwner,
    isOwner: isROwner,
    usedPrefix: '>',
    command: 'shadowia',
  })
  return { m, sent, conn }
}

/* ════════════ parsearOrden: intenciones ════════════ */

test('parsearOrden: reconoce las 14 intenciones', () => {
  const casos = [
    ['sal del grupo', 'salir'],
    ['salte', 'salir'],
    ['vete de aquí', 'salir'],
    ['promueve a @584242222222', 'promote'],
    ['haz admin a @584242222222', 'promote'],
    ['dale admin @584242222222', 'promote'],
    ['degrada a @584242222222', 'demote'],
    ['quítale el admin a @584242222222', 'demote'],
    ['expulsa a @584242222222', 'kick'],
    ['kickealo', 'kick'],
    ['saca a @584242222222', 'kick'],
    ['agrega 584241234567', 'add'],
    ['cambia el nombre del grupo a Mi Grupo', 'nombre'],
    ['cambia la descripción a Grupo oficial', 'descripcion'],
    ['cambia la foto del grupo', 'foto'],
    ['abre el grupo', 'abrir'],
    ['cierra el grupo', 'cerrar'],
    ['activa los anuncios', 'anunciosOn'],
    ['desactiva los anuncios', 'anunciosOff'],
    ['ayuda', 'ayuda'],
    ['¿qué puedes hacer?', 'ayuda'],
    ['qué sabes hacer?', 'ayuda'],
    ['expulsalo', 'kick'],
    ['sacala del grupo', 'kick'],
    ['menu', 'charlar'],  // «menu» a secas NO es la ayuda: evita chocar con «usa menu»
    ['usa play bad bunny', 'comando'],
    ['ejecuta el comando menu', 'comando'],
    ['hola shadowia', 'charlar'],
  ]
  for (const [texto, esperado] of casos) {
    assert.equal(parsearOrden(texto).action, esperado, `«${texto}» debía dar ${esperado}`)
  }
})

test('parsearOrden: sin texto devuelve ayuda', () => {
  assert.equal(parsearOrden('').action, 'ayuda')
  assert.equal(parsearOrden('   ').action, 'ayuda')
})

test('parsearOrden: marca qué necesita grupo y ser admin', () => {
  const p = parsearOrden('expulsa a @584242222222')
  assert.equal(p.needsGroup, true)
  assert.equal(p.needsAdmin, true)
  assert.equal(parsearOrden('usa play').needsGroup, undefined)
})

test('parsearOrden: «usa <comando>» separa comando y resto', () => {
  const p = parsearOrden('usa play bad bunny')
  assert.equal(p.value, 'play')
  assert.equal(p.extra, 'bad bunny')
})

test('extraerValor: quita preposición y «del grupo»', () => {
  const RE = /^(cambia|cambiar|pon|poner|pone|actualiza|actualizar|renombra|renombrar)\s+(el\s+)?(nombre|titulo|título|subject)/i
  assert.equal(extraerValor('cambia el nombre del grupo a Mi Grupo Nuevo', RE), 'Mi Grupo Nuevo')
  assert.equal(extraerValor('pon el nombre por Shadow', RE), 'Shadow')
  assert.equal(parsearOrden('cambia el nombre del grupo a Mi Grupo').value, 'Mi Grupo')
  const RE2 = /^(cambia|cambiar|pon|poner|pone|actualiza|actualizar)\s+(la\s+)?(descripcion|descripción|desc)/i
  assert.equal(extraerValor('cambia la descripción a Grupo oficial 2026', RE2), 'Grupo oficial 2026')
})

test('resolverObjetivo: mención > citado > número', () => {
  assert.equal(resolverObjetivo({ mentionedJid: [MIEMBRO] }).jid, MIEMBRO)
  assert.equal(resolverObjetivo({ quoted: { sender: MIEMBRO } }).jid, MIEMBRO)
  assert.equal(resolverObjetivo({}, ['584241234567']).jid, '584241234567@s.whatsapp.net')
  assert.equal(resolverObjetivo({}), null)
  // la mención gana sobre el citado
  assert.equal(resolverObjetivo({ mentionedJid: [OWNER], quoted: { sender: MIEMBRO } }).jid, OWNER)
})

test('esProtegido: bloquea bot, creador del grupo y owner del bot', () => {
  const ctx = { botJid: BOT, ownerGrupo: CREADOR_GRUPO, ownerBot: OWNER }
  assert.match(esProtegido(BOT, ctx), /mí misma/)
  assert.match(esProtegido(CREADOR_GRUPO, ctx), /creador del grupo/)
  assert.match(esProtegido(OWNER, ctx), /owner del bot/)
  assert.equal(esProtegido(MIEMBRO, ctx), null)
  assert.match(esProtegido(null, ctx), /No indicaste/)
})

/* ════════════ handler: permisos ════════════ */

test('handler: rechaza a quien no es owner', async () => {
  const { sent } = await correr({ text: 'expulsa a @584242222222', isROwner: false, over: { sender: MIEMBRO } })
  assert.equal(sent.participants.length, 0, 'no debe ejecutar ninguna acción')
  assert.match(sent.replies[0].texto, /solo responde a los owners/)
})

test('metadata: solo owners (rowner) y comandos registrados', () => {
  assert.equal(handler.rowner, true)
  assert.deepEqual(handler.command, ['shadowia', 'asistente', 'ayuda'])
  assert.deepEqual(handler.tags, ['ia'])
})

/* ════════════ handler: acciones de grupo ════════════ */

test('handler: promote con mención ejecuta groupParticipantsUpdate', async () => {
  const { sent } = await correr({ text: 'promueve a @584242222222', over: { mentionedJid: [MIEMBRO] } })
  assert.deepEqual(sent.participants, [{ jid: GRUPO, lista: [MIEMBRO], accion: 'promote' }])
  assert.match(sent.replies[0].texto, /fue promovido a administrador\./, 'el mensaje debe leerse bien')
  assert.deepEqual(sent.replies[0].opciones, { mentions: [MIEMBRO] })
})

test('handler: kick usa la acción «remove»', async () => {
  const { sent } = await correr({ text: 'expulsa a @584242222222', over: { mentionedJid: [MIEMBRO] } })
  assert.equal(sent.participants[0].accion, 'remove')
  assert.match(sent.replies[0].texto, /fue expulsado del grupo\./)
})

test('handler: se niega a expulsar al creador del grupo', async () => {
  const { sent } = await correr({ text: 'expulsa a @584241111111', over: { mentionedJid: [CREADOR_GRUPO] } })
  assert.equal(sent.participants.length, 0)
  assert.match(sent.replies[0].texto, /creador del grupo/)
})

test('handler: se niega a expulsarse a sí mismo', async () => {
  const { sent } = await correr({ text: 'expulsa a @584240000000', over: { mentionedJid: [BOT] } })
  assert.equal(sent.participants.length, 0)
  assert.match(sent.replies[0].texto, /mí misma/)
})

test('handler: exige objetivo para promover', async () => {
  const { sent } = await correr({ text: 'promueve a alguien' })
  assert.equal(sent.participants.length, 0)
  assert.match(sent.replies[0].texto, /No indicaste|Menciona/)
})

test('handler: cambia nombre, descripción y ajustes del grupo', async () => {
  const a = await correr({ text: 'cambia el nombre del grupo a Shadow Garden' })
  assert.deepEqual(a.sent.subject, { jid: GRUPO, v: 'Shadow Garden' })

  const b = await correr({ text: 'cambia la descripción a Grupo oficial de Yosue' })
  assert.deepEqual(b.sent.desc, { jid: GRUPO, v: 'Grupo oficial de Yosue' })

  const c = await correr({ text: 'cierra el grupo' })
  assert.deepEqual(c.sent.setting, { jid: GRUPO, v: 'announcement' })

  const d = await correr({ text: 'abre el grupo' })
  assert.deepEqual(d.sent.setting, { jid: GRUPO, v: 'not_announcement' })
})

test('handler: cambia la foto del grupo desde una imagen citada', async () => {
  const png = Buffer.from('89504e470d0a1a0a', 'hex')
  const { sent } = await correr({
    text: 'cambia la foto del grupo',
    over: { quoted: { mimetype: 'image/png', async download() { return png } } },
  })
  assert.deepEqual(sent.pp, { jid: GRUPO, bytes: png.length })
})

test('handler: pide imagen si no la hay para la foto', async () => {
  const { sent } = await correr({ text: 'cambia la foto del grupo' })
  assert.equal(sent.pp, null)
  assert.match(sent.replies[0].texto, /Responde a una imagen/)
})

test('handler: fuera de un grupo explica que necesita grupo', async () => {
  const { sent } = await correr({ text: 'expulsa a @584242222222', over: { isGroup: false, chat: OWNER, mentionedJid: [MIEMBRO] }, meta: null })
  assert.equal(sent.participants.length, 0)
  assert.match(sent.replies[0].texto, /solo funciona dentro de un grupo/)
})

test('handler: avisa si el bot no es admin del grupo', async () => {
  const meta = { owner: CREADOR_GRUPO, participants: [{ id: BOT, admin: null }, { id: MIEMBRO, admin: null }] }
  const { sent } = await correr({ text: 'expulsa a @584242222222', over: { mentionedJid: [MIEMBRO] }, meta })
  assert.equal(sent.participants.length, 0)
  assert.match(sent.replies[0].texto, /ser administradora/)
})

/* ════════════ handler: salir del grupo ════════════ */

test('handler: al pedirle que salga, se despide ANTES de salir', async () => {
  const orden = []
  const sent = makeSent()
  const m = makeM({ text: 'sal del grupo' })
  const conn = makeConn(sent, metaGrupo)
  conn.reply = async (_c, texto) => { orden.push('mensaje'); sent.replies.push({ texto }) }
  conn.groupLeave = async (jid) => { orden.push('leave'); sent.left = jid }

  await handler(m, { conn, args: ['sal'], text: 'sal del grupo', isROwner: true, isOwner: true, usedPrefix: '>', command: 'shadowia' })

  assert.deepEqual(orden, ['mensaje', 'leave'], 'el mensaje de despedida debe ir antes de groupLeave')
  assert.equal(sent.left, GRUPO)
  assert.match(sent.replies[0].texto, /se retira/)
})

/* ════════════ handler: ejecutar cualquier plugin ════════════ */

test('handler: «usa <comando>» ejecuta el plugin real con isOwner', async () => {
  let recibido = null
  global.plugins = {
    'grupos/group-kick.js': { command: ['kick', 'echar'] },
    'menus/menu.js': Object.assign(async function (_m, ctx) { recibido = ctx }, { command: ['menu', 'allmenu'] }),
  }
  global.db = { data: { chats: {}, users: {}, settings: {} } }

  const { sent } = await correr({ text: 'usa menu' })
  assert.ok(recibido, 'el plugin debió ejecutarse')
  assert.equal(recibido.command, 'menu')
  assert.equal(recibido.isOwner, true)
  assert.equal(recibido.isROwner, true)
  assert.equal(recibido.conn.user.jid, BOT)
  assert.equal(sent.replies.length, 0, 'el plugin ya responde por su cuenta')
})

test('handler: pasa el resto del texto como argumento del comando', async () => {
  let recibido = null
  global.plugins = { 'descargas/dls-play.js': Object.assign(async function (_m, ctx) { recibido = ctx }, { command: ['play', 'ytmp3'] }) }
  await correr({ text: 'usa play bad bunny' })
  assert.equal(recibido.command, 'play')
  assert.equal(recibido.text, 'bad bunny')
  assert.deepEqual(recibido.args, ['play', 'bad', 'bunny'])
})

test('handler: avisa si el comando no existe', async () => {
  global.plugins = { 'menus/menu.js': Object.assign(async function () {}, { command: ['menu'] }) }
  const { sent } = await correr({ text: 'usa comandoinexistente' })
  assert.match(sent.replies[0].texto, /No encontré el comando/)
})

test('handler: bloquea comandos peligrosos', async () => {
  let llamado = false
  global.plugins = { 'owner/dueño-delplugin.js': Object.assign(async function () { llamado = true }, { command: ['delplugin'] }) }
  const { sent } = await correr({ text: 'usa delplugin' })
  assert.equal(llamado, false, 'no debe ejecutar un comando bloqueado')
  assert.match(sent.replies[0].texto, /bloqueado/)
})

/* ════════════ handler: ayuda ════════════ */

test('handler: «ayuda» lista las capacidades', async () => {
  const { sent } = await correr({ text: 'ayuda' })
  const t = sent.replies[0].texto
  assert.match(t, /Shadowia/)
  assert.match(t, /promueve/)
  assert.match(t, /expulsa/)
  assert.match(t, /sal del grupo/)
  assert.match(t, /cambia el nombre del grupo/)
})

/* ════════════ API real (la misma que usa Simi) ════════════ */

test('handler: conversa usando la API real de Simi (red)', { timeout: 180000 }, async () => {
  const { sent, m } = await correr({ text: 'hola shadowia' })
  assert.equal(sent.replies.length, 1, 'debe responder algo')
  const respuesta = sent.replies[0].texto
  assert.ok(respuesta.length > 0, 'la respuesta no puede estar vacía')
  assert.ok(!/no devolvió respuesta/.test(respuesta), 'la API debe haber respondido texto real')
  assert.ok(m.reactions.includes('✅'))
})
