import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler, { parsearOrden, resolverObjetivo, esProtegido, extraerValor, jidNumero, buscarParticipante, esAdminParticipante, registrarAccion, getMemoria, limpiarMemoria } from '../plugins/ia/ia-shadowia.js'

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

async function correr({ text = '', over = {}, meta = metaGrupo, isROwner = true, isBotAdmin } = {}) {
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
    isBotAdmin, // undefined => el plugin lo calcula (ruta de respaldo)
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
  assert.match(sent.replies[0].texto, /ya es administrador del grupo/, 'el mensaje debe leerse bien')
  assert.match(sent.replies[0].texto, /jefe/, 'tono de asistente personal')
  assert.deepEqual(sent.replies[0].opciones, { mentions: [MIEMBRO] })
})

test('handler: kick usa la acción «remove»', async () => {
  const { sent } = await correr({ text: 'expulsa a @584242222222', over: { mentionedJid: [MIEMBRO] } })
  assert.equal(sent.participants[0].accion, 'remove')
  assert.match(sent.replies[0].texto, /Expulsé a .* del grupo/)
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
  assert.match(sent.replies[0].texto, /Mándame la imagen junto con el comando/)
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
  assert.match(sent.replies[0].texto, /Me despido y salgo del grupo/)
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


/* ════════════ BUGFIX: detección de admin ════════════ */

test('jidNumero: quita el sufijo de dispositivo y acepta @lid', () => {
  assert.equal(jidNumero('584241234567:12@s.whatsapp.net'), '584241234567')
  assert.equal(jidNumero('584241234567@s.whatsapp.net'), '584241234567')
  assert.equal(jidNumero('1234567890@lid'), '1234567890')
  assert.equal(jidNumero(''), null)
})

test('buscarParticipante: encuentra por id, jid, lid o phoneNumber', () => {
  const parts = [
    { id: '584240000000:33@s.whatsapp.net', admin: 'superadmin' },
    { lid: '999888777@lid', admin: 'admin' },
    { id: '584243333333@s.whatsapp.net', phoneNumber: '584243333333' },
  ]
  assert.equal(buscarParticipante(parts, '584240000000@s.whatsapp.net').admin, 'superadmin')
  assert.equal(buscarParticipante(parts, '584240000000:99@s.whatsapp.net').admin, 'superadmin')
  assert.equal(buscarParticipante(parts, '999888777@lid').admin, 'admin')
  assert.equal(buscarParticipante(parts, '584243333333@s.whatsapp.net').phoneNumber, '584243333333')
  assert.equal(buscarParticipante(parts, '111111111@s.whatsapp.net'), null)
})

test('esAdminParticipante: acepta admin, superadmin y booleanos', () => {
  assert.equal(esAdminParticipante({ admin: 'admin' }), true)
  assert.equal(esAdminParticipante({ admin: 'superadmin' }), true)
  assert.equal(esAdminParticipante({ isAdmin: true }), true)
  assert.equal(esAdminParticipante({ isSuperAdmin: true }), true)
  assert.equal(esAdminParticipante({ admin: null }), false)
  assert.equal(esAdminParticipante(undefined), false)
})

test('BUGFIX: reconoce al bot como admin aunque su JID traiga :dispositivo', async () => {
  // antes fallaba: comparaba p.id === conn.user.jid y el bot aparecía con ":12"
  const meta = {
    owner: CREADOR_GRUPO,
    participants: [
      { id: '584240000000:12@s.whatsapp.net', admin: 'superadmin' },
      { id: MIEMBRO, admin: null },
    ],
  }
  const { sent } = await correr({ text: 'promueve a @584242222222', over: { mentionedJid: [MIEMBRO] }, meta })
  assert.deepEqual(sent.participants, [{ jid: GRUPO, lista: [MIEMBRO], accion: 'promote' }], 'debe promover sin quejarse de admin')
  assert.match(sent.replies[0].texto, /ya es administrador del grupo/)
})

test('BUGFIX: reconoce al bot admin cuando el participante usa @lid', async () => {
  const meta = {
    owner: CREADOR_GRUPO,
    participants: [{ lid: '584240000000@lid', admin: 'admin' }, { id: MIEMBRO, admin: null }],
  }
  const { sent } = await correr({ text: 'degrada a @584242222222', over: { mentionedJid: [MIEMBRO] }, meta })
  assert.deepEqual(sent.participants, [{ jid: GRUPO, lista: [MIEMBRO], accion: 'demote' }])
})

test('BUGFIX: acepta superadmin y las variantes booleanas', async () => {
  for (const forma of [{ admin: 'superadmin' }, { isAdmin: true }, { isSuperAdmin: true }]) {
    const meta = { owner: CREADOR_GRUPO, participants: [{ id: BOT, ...forma }, { id: MIEMBRO, admin: null }] }
    const { sent } = await correr({ text: 'expulsa a @584242222222', over: { mentionedJid: [MIEMBRO] }, meta })
    assert.equal(sent.participants.length, 1, `debía funcionar con ${JSON.stringify(forma)}`)
  }
})

test('prefiere el isBotAdmin que ya calculó el framework', async () => {
  // metadata vacía (no se puede saber) pero el framework dice que SÍ es admin
  const { sent } = await correr({
    text: 'promueve a @584242222222',
    over: { mentionedJid: [MIEMBRO] },
    meta: { owner: CREADOR_GRUPO, participants: [] },
    isBotAdmin: true,
  })
  assert.equal(sent.participants.length, 1, 'debe confiar en el isBotAdmin del contexto')
})


/* ════════════ NUEVO: devolver el admin ════════════ */

test('parsearOrden: reconoce «devuélvele admin» y no lo confunde con demote', () => {
  for (const t of [
    'devuélvele admin',
    'devuelvele el admin',
    'devuélvele el admin al que se lo quitaste',
    'regresale el admin',
    'dale de vuelta el admin',
    'restaura el admin',
    'deshaz lo del admin',
  ]) {
    assert.equal(parsearOrden(t).action, 'devolverAdmin', `«${t}» debía dar devolverAdmin`)
  }
  // y demote sigue intacto
  assert.equal(parsearOrden('quítale el admin a @584242222222').action, 'demote')
  assert.equal(parsearOrden('degrada a @584242222222').action, 'demote')
})

test('flujo real: quitar admin y luego devolvérselo a la misma persona', async () => {
  limpiarMemoria(GRUPO)

  // 1) le quita el admin a MIEMBRO
  const a = await correr({ text: 'quitar admin a @584242222222', over: { mentionedJid: [MIEMBRO] } })
  assert.deepEqual(a.sent.participants, [{ jid: GRUPO, lista: [MIEMBRO], accion: 'demote' }])
  assert.match(a.sent.replies[0].texto, /dime «devuélvele admin»/, 'debe ofrecer deshacer la acción')

  // 2) sin mencionar a nadie, se lo devuelve a quien se lo quitó
  const b = await correr({ text: 'devuélvele admin al que se lo quitaste' })
  assert.deepEqual(b.sent.participants, [{ jid: GRUPO, lista: [MIEMBRO], accion: 'promote' }], 'debe promover a la misma persona')
  assert.match(b.sent.replies[0].texto, /Le devolví el admin/)
  assert.match(b.sent.replies[0].texto, /a quien se lo quité hace \d+ min/)
  assert.deepEqual(b.sent.replies[0].opciones, { mentions: [MIEMBRO] })
})

test('devolver admin: si no hay registro, lo dice y no hace nada', async () => {
  limpiarMemoria(GRUPO)
  const { sent } = await correr({ text: 'devuélvele admin' })
  assert.equal(sent.participants.length, 0, 'no debe promover a nadie a ciegas')
  assert.match(sent.replies[0].texto, /No tengo registro/)
})

test('devolver admin: si menciona a otro, le devuelve a ese', async () => {
  limpiarMemoria(GRUPO)
  await correr({ text: 'quitar admin a @584242222222', over: { mentionedJid: [MIEMBRO] } })
  const OTRO = '584243333333@s.whatsapp.net'
  const { sent } = await correr({ text: 'devuélvele admin a @584243333333', over: { mentionedJid: [OTRO] } })
  assert.deepEqual(sent.participants.at(-1).lista, [OTRO], 'debe respetar la mención explícita')
})

test('devolver admin: usa el último demote, no uno antiguo', async () => {
  limpiarMemoria(GRUPO)
  const OTRO = '584243333333@s.whatsapp.net'
  registrarAccion(GRUPO, 'demote', MIEMBRO)
  registrarAccion(GRUPO, 'demote', OTRO)
  const { sent } = await correr({ text: 'devuélvele admin' })
  assert.deepEqual(sent.participants.at(-1).lista, [OTRO])
})

/* ════════════ NUEVO: memoria ════════════ */

test('memoria: guarda las últimas acciones y las limita', () => {
  limpiarMemoria(GRUPO)
  for (let i = 0; i < 9; i++) registrarAccion(GRUPO, 'demote', `${5842400000 + i}@s.whatsapp.net`)
  const reg = getMemoria(GRUPO)
  assert.equal(reg.acciones.length, 5, 'debe conservar como máximo 5 acciones')
  assert.equal(reg.acciones.at(-1).jid, `${5842400000 + 8}@s.whatsapp.net`, 'la más reciente va al final')
})

test('memoria: descarta lo que ya expiró', () => {
  limpiarMemoria(GRUPO)
  const reg = getMemoria(GRUPO)
  reg.acciones.push({ accion: 'demote', jid: MIEMBRO, ts: Date.now() - 31 * 60 * 1000 })
  reg.acciones.push({ accion: 'demote', jid: MIEMBRO, ts: Date.now() })
  assert.equal(getMemoria(GRUPO).acciones.length, 1, 'la acción de hace 31 min debe caer')
})

test('memoria: limpiarMemoria vacía el registro del chat', () => {
  registrarAccion(GRUPO, 'demote', MIEMBRO)
  limpiarMemoria(GRUPO)
  assert.equal(getMemoria(GRUPO).acciones.length, 0)
})

/* ════════════ NUEVO: tono de asistente personal ════════════ */

test('tono: las confirmaciones hablan como asistente personal', async () => {
  limpiarMemoria(GRUPO)
  const casos = [
    ['promueve a @584242222222', /jefe/],
    ['cierra el grupo', /jefe/],
    ['abre el grupo', /jefe/],
    ['cambia la descripción a Grupo oficial', /jefe/],
    ['cambia el nombre del grupo a Shadow', /jefe/],
  ]
  for (const [texto, esperado] of casos) {
    const { sent } = await correr({ text: texto, over: { mentionedJid: [MIEMBRO] } })
    assert.match(sent.replies[0].texto, esperado, `«${texto}» debe sonar a asistente personal`)
  }
})

test('tono: al degradar ofrece deshacer la acción', async () => {
  limpiarMemoria(GRUPO)
  const { sent } = await correr({ text: 'degrada a @584242222222', over: { mentionedJid: [MIEMBRO] } })
  assert.match(sent.replies[0].texto, /devuélvele admin/)
})

test('ayuda: menciona «devuélvele admin»', async () => {
  const { sent } = await correr({ text: 'ayuda' })
  assert.match(sent.replies[0].texto, /devuélvele admin/)
})

test('charla: guarda el intercambio para tener contexto', async () => {
  limpiarMemoria(GRUPO)
  await correr({ text: 'hola shadowia' })
  const reg = getMemoria(GRUPO)
  assert.ok(reg.conversa.length >= 2, 'debe guardar el mensaje del usuario y la respuesta')
  assert.equal(reg.conversa[0].rol, 'user')
  assert.equal(reg.conversa[1].rol, 'shadowia')
})

/* ════════════ BUGFIX: imagen del grupo ════════════ */

test('BUGFIX: cambia la foto cuando la imagen va adjunta en el mismo mensaje', async () => {
  const png = Buffer.from('89504e470d0a1a0a', 'hex')
  const { sent } = await correr({
    text: 'cambia la foto del grupo',
    over: { mimetype: 'image/jpeg', msg: { mimetype: 'image/jpeg' }, async download() { return png } },
  })
  assert.deepEqual(sent.pp, { jid: GRUPO, bytes: png.length })
})

test('BUGFIX: acepta webp y cualquier image/*', async () => {
  for (const mime of ['image/webp', 'image/png', 'image/heic', 'image/gif']) {
    const buf = Buffer.from('89504e470d0a1a0a', 'hex')
    const { sent } = await correr({
      text: 'cambia la foto del grupo',
      over: { quoted: { mimetype: mime, async download() { return buf } } },
    })
    assert.ok(sent.pp, `debía aceptar ${mime}`)
  }
})

test('BUGFIX: «foto del grupo» a secas también se reconoce', () => {
  assert.equal(parsearOrden('foto del grupo').action, 'foto')
  assert.equal(parsearOrden('cambia la foto del grupo').action, 'foto')
  assert.equal(parsearOrden('pon la portada del grupo').action, 'foto')
})

test('avisa distinto si la imagen no se puede descargar', async () => {
  const { sent } = await correr({ text: 'cambia la foto del grupo', over: { quoted: { mimetype: 'image/png' } } })
  assert.equal(sent.pp, null)
  assert.match(sent.replies[0].texto, /no puedo descargar esa imagen|No pude descargar/i)
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
