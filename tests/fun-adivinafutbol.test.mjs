/* Pruebas del juego de fútbol: transporte simulado, reloj controlado y
 * hook before como lo invoca src/handler.js. No requieren WhatsApp. */
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import handler, {
  BANCO, partidas, barajar, normalizar, prepararPregunta, puntosPor,
  textoPregunta, LIMITE_SEGUNDOS, PUNTOS_BASE, PUNTOS_BONUS, MAX_PREGUNTAS,
} from '../plugins/fun/fun-adivinafutbol.js'
import respuestas from '../plugins/fun/fun-adivinafutbol-respuestas.js'

const GRUPO = '120363000000000000@g.us'
const P1 = '584241111111@s.whatsapp.net'
const P2 = '584242222222@s.whatsapp.net'
const NOMBRES = { [P1]: 'Yosue', [P2]: 'Dvilker' }
let secuencia = 0
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }
async function avanzar(t, ms) { t.mock.timers.tick(ms); await flush() }
function reloj(t) { t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1700000000000 }) }

afterEach(() => {
  for (const p of partidas.values()) {
    for (const key of ['timer', 'aviso', 'siguiente']) clearTimeout(p[key])
  }
  partidas.clear()
  delete global.db
})

function crearCtx(chat = GRUPO) {
  const sent = { nuevos: [], edits: [], reactions: [], pins: [] }
  const conn = {
    getName: jid => NOMBRES[jid] || 'Anónimo',
    async reply(chat, text, quoted, opts) {
      if (this.fallarAnuncio) throw Error('fallo anuncio')
      const key = { id: `msg-${++secuencia}`, remoteJid: chat, fromMe: true }
      sent.nuevos.push({ text, key, ...opts }); return { key }
    },
    async relayMessage(chat, message, options) {
      if (this.fallarEnvio) throw Error('fallo de transporte simulado')
      assert.ok(message.extendedTextMessage, 'panel nativo, sin variante setreply')
      const key = { id: options.messageId, remoteJid: chat, fromMe: true }
      sent.nuevos.push({ text: message.extendedTextMessage.text,
        mentions: message.extendedTextMessage.contextInfo.mentionedJid, key })
    },
    async sendMessage(chat, content) {
      if (content.pin) {
        if (this.fallarPin) throw Error('sin permisos para fijar')
        sent.pins.push(content)
        return { key: content.pin }
      }
      if (content.react) {
        if (this.fallarReaccion) throw Error('falló la reacción')
        sent.reactions.push(content.react.text)
        return {}
      }
      assert.ok(content.edit, 'el texto inicial no debe pasar por setreply')
      if (this.bloquearEdit) await this.bloquearEdit()
      if (this.fallarEdit) throw Error('fallo de transporte simulado')
      sent.edits.push(content)
      return { key: content.edit }
    },
  }
  const m = { chat, sender: P1, text: '.futbol', isGroup: true, pushName: NOMBRES[P1] }
  const ctx = { conn, command: 'futbol', args: [] }
  return { sent, conn, m, ctx }
}
async function iniciar(t, total = 10, chat = GRUPO) {
  reloj(t)
  const g = crearCtx(chat)
  g.ctx.args = [String(total)]
  await handler(g.m, g.ctx)
  g.p = partidas.get(chat)
  return g
}
function mensajeRespuesta(g, text, overrides = {}) {
  const p = g.p
  const quoted = { id: p.panelKey.id, fromMe: true, chat: g.m.chat,
    text: p.actual ? textoPregunta(p.actual, p.indice, p.total) : p.textoPanel }
  return { ...g.m, text, quoted, react: async emoji => g.sent.reactions.push(emoji), ...overrides }
}
async function contestar(g, text, overrides = {}, ctx = {}) {
  return respuestas.before(mensajeRespuesta(g, text, overrides), { ...g.ctx, ...ctx })
}
async function comando(g, command) { return handler(g.m, { ...g.ctx, command }) }
const ultimo = g => g.sent.edits.at(-1)?.text || g.sent.nuevos.at(-1)?.text

test('metadatos: solo grupos y respuestas mediante before, sin comandos a/b/c/d', () => {
  assert.equal(LIMITE_SEGUNDOS, 40)
  assert.ok(handler.command.includes('futbol'))
  assert.equal(handler.group, true)
  assert.equal(respuestas.group, true)
  assert.equal(typeof respuestas.before, 'function')
  assert.equal(respuestas.command, undefined)
  assert.equal(respuestas.customPrefix, undefined)
  for (const l of ['a', 'b', 'c', 'd']) assert.ok(!handler.command.includes(l))
})

test('integración: el before recibe texto sin prefijo que el dispatcher descarta después', async t => {
  const g = await iniciar(t)
  const src = fs.readFileSync(new URL('../src/handler.js', import.meta.url), 'utf8')
  assert.ok(src.indexOf('await plugin.before.call') < src.indexOf('if (!usedPrefix) continue'))
  const m = mensajeRespuesta(g, g.p.actual.correcta.toLowerCase())
  const pluginPrefix = respuestas.customPrefix || /^[#!./]/
  assert.equal(pluginPrefix.exec(m.text), null)
  await respuestas.before.call(g.conn, m, g.ctx)
  assert.equal(g.p.jugadores[P1].aciertos, 1)
  assert.equal(g.sent.nuevos.length, 2)
})

test('banco: 4 opciones distintas y una correcta válida en cada pregunta', () => {
  assert.ok(BANCO.length >= 40, `esperaba al menos 40 preguntas, hay ${BANCO.length}`)
  BANCO.forEach((p, i) => {
    assert.ok(p.q?.length > 5, `pregunta ${i} sin texto`)
    assert.ok(p.cat?.length > 0, `pregunta ${i} sin categoría`)
    assert.equal(p.o.length, 4, `pregunta ${i} («${p.q}») debe tener 4 opciones`)
    assert.ok(new Set(p.o).size === 4, `pregunta ${i} («${p.q}») tiene opciones repetidas`)
    assert.ok(Number.isInteger(p.ok) && p.ok >= 0 && p.ok < 4,
      `pregunta ${i} («${p.q}») tiene índice correcto inválido: ${p.ok}`)
  })
})

test('banco: incluye a Messi, Cristiano y otros grandes', () => {
  const todo = normalizar(BANCO.map((p) => `${p.cat} ${p.q} ${p.o.join(' ')}`).join(' '))
  for (const nombre of ['messi', 'cristiano ronaldo', 'pele', 'maradona', 'cruyff', 'zidane', 'ronaldinho', 'mbappe', 'yamal', 'klose', 'yashin', 'neymar', 'haaland']) {
    assert.ok(todo.includes(nombre), `falta «${nombre}» en el banco`)
  }
})

test('banco: conserva las respuestas que ya estaban en el repositorio', () => {
  const porPregunta = (fragmento) => BANCO.find((p) => p.q.includes(fragmento))

  const final2026 = porPregunta('final del Mundial 2026')
  assert.equal(final2026.o[final2026.ok], 'Ferran Torres',
    'España 1-0 Argentina, gol de Ferran Torres al 106\'')

  const rival2026 = porPregunta('venció España en la final del Mundial 2026')
  assert.equal(rival2026.o[rival2026.ok], 'Argentina')

  const yamal = porPregunta('16 años y 338 días')
  assert.equal(yamal.o[yamal.ok], 'Lamine Yamal')

  const balonesMessi = porPregunta('Balones de Oro ha ganado Lionel Messi')
  assert.equal(balonesMessi.o[balonesMessi.ok], '8')

  const balonesCR = porPregunta('Balones de Oro ha ganado Cristiano Ronaldo')
  assert.equal(balonesCR.o[balonesCR.ok], '5')

  const klose = porPregunta('máximo goleador en la historia de los Mundiales')
  assert.equal(klose.o[klose.ok], 'Miroslav Klose')
})

/* ═══════════════════ OPCIONES ALEATORIAS ═══════════════════ */

test('barajar conserva todos los elementos', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8]
  for (let i = 0; i < 30; i++) {
    assert.deepEqual([...barajar(original)].sort((a, b) => a - b), original)
  }
})

test('prepararPregunta reparte las opciones y marca bien la letra correcta', () => {
  const fichas = BANCO.slice(0, 8)
  fichas.forEach((ficha) => {
    const buena = ficha.o[ficha.ok]
    const vistas = new Set()
    for (let i = 0; i < 25; i++) {
      const p = prepararPregunta(ficha)
      assert.equal(p.opciones.length, 4)
      assert.deepEqual([...p.opciones].sort(), [...ficha.o].sort())
      assert.equal(p.opciones[['A', 'B', 'C', 'D'].indexOf(p.correcta)], buena,
        `«${ficha.q}»: la letra ${p.correcta} debe apuntar a «${buena}»`)
      vistas.add(p.correcta)
    }
    assert.ok(vistas.size > 1, `«${ficha.q}»: la correcta siempre cae en la misma letra`)
  })
})

test('textoPregunta muestra las 4 opciones, el tiempo y las preguntas restantes', () => {
  const p = prepararPregunta(BANCO[0])
  const t = textoPregunta(p, 3, 10)
  assert.match(t, /pregunta 3\/10/)
  assert.match(t, /40 segundos/)
  for (const letra of ['A', 'B', 'C', 'D']) assert.match(t, new RegExp(`^${letra}\\.`, 'm'))
})

/* ═══════════════════ PUNTOS ═══════════════════ */

test('puntos: cuanto más rápido, más bonus', () => {
  assert.equal(puntosPor(0), PUNTOS_BASE + PUNTOS_BONUS)
  assert.equal(puntosPor(LIMITE_SEGUNDOS), PUNTOS_BASE)
  assert.equal(puntosPor(LIMITE_SEGUNDOS * 5), PUNTOS_BASE, 'no debe bajar del mínimo')
  assert.ok(puntosPor(5) > puntosPor(20))
  assert.ok(puntosPor(20) > puntosPor(39))
})

/* ═══════════════════ HELPERS ═══════════════════ */

test('normalizar quita tildes, mayúsculas y signos', () => {
  assert.equal(normalizar('  Mbappé!  '), 'mbappe')
  assert.equal(normalizar('MÉXIco'), 'mexico')
  assert.equal(normalizar('O\'Brien'), 'o brien')
  assert.equal(normalizar(null), '')
})


test('arranca con instrucciones y panel; conserva key y arranca reloj al publicarse', async t => {
  const g = await iniciar(t)
  assert.equal(g.sent.nuevos.length, 2)
  assert.match(g.sent.nuevos[0].text, /Usa \*Responder\*/)
  assert.match(ultimo(g), /pregunta 1\/10/)
  assert.equal(g.p.panelKey.id, g.sent.nuevos[1].key.id)
  assert.equal(g.p.actual.preguntadaEn, Date.now())
  assert.equal(g.p.aceptando, true)
})

test('cantidad de preguntas: inválida usa 10 y se limita a 20', async t => {
  reloj(t)
  for (const [arg, total] of [['banana', 10], ['999', MAX_PREGUNTAS], ['15', 15], ['0', 10]]) {
    const g = crearCtx(`${arg}@g.us`)
    await handler(g.m, { ...g.ctx, args: [arg] })
    assert.equal(partidas.get(g.m.chat).total, total)
  }
})

test('sin cita, otra cita, chat ajeno, mensaje ajeno y privado no puntúan', async t => {
  const g = await iniciar(t)
  const buena = g.p.actual.correcta
  for (const override of [
    { quoted: null },
    { quoted: { id: 'otra-key', fromMe: true } },
    { quoted: { id: g.p.panelKey.id, fromMe: true, chat: 'otro@g.us' } },
    { isGroup: false }, { isBaileys: true },
  ]) await contestar(g, buena, override)
  assert.deepEqual(g.p.jugadores, {})
  assert.equal(g.sent.edits.length, 0)
})

test('texto completo de la opción, con tildes y mayúsculas, se acepta sin prefijo', async t => {
  const g = await iniciar(t)
  const p = prepararPregunta({ cat: 'Test', q: 'Prueba', o: ['Ángel Di María', 'Pelé', 'Messi', 'Zidane'], ok: 0 })
  g.p.actual = p
  await contestar(g, '  ANGEL DI MARIA  ')
  assert.equal(g.p.jugadores[P1].aciertos, 1)
  assert.match(ultimo(g), /¡GOL/)
})

test('letras con prefijo y ruido no consumen intento; .c/.d no son comandos del juego', async t => {
  const g = await iniciar(t)
  for (const text of ['.a', '.b', '.c', '.d', '!a', '/b', '#c', 'a hola', 'hola']) await contestar(g, text)
  assert.deepEqual(g.p.jugadores, {})
  assert.equal(g.p.actual.respondieron.size, 0)
  await contestar(g, `  ${g.p.actual.correcta.toLowerCase()}  `)
  assert.equal(g.p.jugadores[P1].aciertos, 1)
})

test('usuarios baneados y modo admin respetados por el hook', async t => {
  const g = await iniciar(t)
  global.db = { data: { users: { [P1]: { banned: true } } } }
  await contestar(g, g.p.actual.correcta)
  assert.deepEqual(g.p.jugadores, {})
  delete global.db
  await contestar(g, g.p.actual.correcta, {}, { chat: { isBanned: true } })
  await contestar(g, g.p.actual.correcta, {}, { chat: { modoadmin: true } })
  assert.deepEqual(g.p.jugadores, {})
  await contestar(g, g.p.actual.correcta, {}, { chat: { modoadmin: true }, isAdmin: true })
  assert.equal(g.p.jugadores[P1].aciertos, 1)
})

test('otro subbot no puede puntuar ni editar la partida del socket creador', async t => {
  const g = await iniciar(t)
  const ajeno = crearCtx()
  await contestar(g, g.p.actual.correcta, {}, { conn: ajeno.conn })
  await handler(g.m, { ...ajeno.ctx, command: 'terminar' })
  assert.equal(partidas.get(GRUPO), g.p)
  assert.deepEqual(g.p.jugadores, {})
  assert.equal(ajeno.sent.edits.length, 0)
})

test('error solo reacciona; no hay segundo intento ni mensajes nuevos', async t => {
  const g = await iniciar(t)
  const correcta = g.p.actual.correcta
  const mala = ['A', 'B', 'C', 'D'].find(l => l !== correcta)
  await contestar(g, mala)
  await contestar(g, correcta)
  assert.deepEqual(g.sent.reactions, ['❌', '🔁'])
  assert.equal(g.p.jugadores[P1].fallos, 1)
  assert.equal(g.p.jugadores[P1].puntos, 0)
  assert.equal(g.sent.nuevos.length, 2)
  assert.equal(g.sent.edits.length, 0)
})

test('dos aciertos simultáneos: solo puntúa el primero y se edita el panel', async t => {
  const g = await iniciar(t)
  const buena = g.p.actual.correcta
  const m1 = mensajeRespuesta(g, buena), m2 = mensajeRespuesta(g, buena, { sender: P2 })
  await Promise.all([respuestas.before(m1, g.ctx), respuestas.before(m2, g.ctx)])
  assert.equal(g.p.jugadores[P1].aciertos, 1)
  assert.equal(g.p.jugadores[P2], undefined)
  assert.equal(g.sent.edits.length, 1)
  assert.equal(g.sent.edits[0].edit.id, g.p.panelKey.id)
  assert.deepEqual(g.sent.edits[0].mentions, [P1])
  assert.equal(g.sent.nuevos.length, 2)
  await avanzar(t, 2500)
  assert.match(ultimo(g), /pregunta 2\/10/)
  assert.equal(g.sent.edits.at(-1).edit.id, g.p.panelKey.id)
})

test('cita con texto anterior sigue apuntando al mismo panel editado', async t => {
  const g = await iniciar(t)
  const quoted = mensajeRespuesta(g, '').quoted
  await contestar(g, g.p.actual.correcta)
  await avanzar(t, 2500)
  await contestar(g, g.p.actual.correcta, { sender: P2, quoted })
  assert.equal(g.p.jugadores[P2].aciertos, 1)
})

test('aviso aparte a los 10 segundos; tiempo agotado y siguiente editan el panel', async t => {
  const g = await iniciar(t)
  const buena = g.p.actual.correcta
  await avanzar(t, 30000)
  assert.match(g.sent.nuevos.at(-1).text, /Quedan \*10 segundos\*/)
  assert.match(g.sent.nuevos.at(-1).text, /pregunta 1\/10/)
  assert.equal(g.sent.edits.length, 0)
  await avanzar(t, 9999)
  assert.ok(g.p.actual)
  await avanzar(t, 1)
  assert.equal(g.p.actual, null)
  assert.match(ultimo(g), /Se acabó el tiempo/)
  assert.ok(ultimo(g).includes(`*${buena}.`))
  await avanzar(t, 2500)
  assert.match(ultimo(g), /pregunta 2\/10/)
  assert.equal(g.sent.nuevos.length, 3)
  assert.ok(g.sent.edits.every(e => e.edit.id === g.p.panelKey.id))
})

test('respuesta tardía no gana aunque el callback de timeout esté retrasado', async t => {
  const g = await iniciar(t)
  g.p.actual.preguntadaEn -= 40000
  await contestar(g, g.p.actual.correcta)
  assert.deepEqual(g.p.jugadores, {})
  assert.match(ultimo(g), /Se acabó el tiempo/)
})

test('marcador vacío y con puntos refresca panel sin mensajes adicionales', async t => {
  const g = await iniciar(t)
  await comando(g, 'marcador')
  assert.match(ultimo(g), /Nadie ha sumado/)
  await contestar(g, g.p.actual.correcta)
  await avanzar(t, 2500)
  await comando(g, 'marcador')
  assert.match(ultimo(g), /pregunta 2\/10/)
  assert.match(ultimo(g), /MARCADOR/)
  assert.ok(ultimo(g).includes(P1.split('@')[0]))
  assert.equal(g.sent.nuevos.length, 2)
})

test('segundo .futbol no crea otro partido ni otro mensaje', async t => {
  const g = await iniciar(t)
  await comando(g, 'futbol')
  assert.equal(partidas.get(GRUPO), g.p)
  assert.equal(g.sent.nuevos.length, 2)
})

test('terminar edita resultado final, cancela pausa y no revive la partida', async t => {
  const g = await iniciar(t)
  await contestar(g, g.p.actual.correcta)
  await comando(g, 'terminar')
  assert.match(ultimo(g), /FIN DEL PARTIDO/)
  assert.ok(!partidas.has(GRUPO))
  assert.equal(g.p.actual, null)
  for (const k of ['timer', 'aviso', 'siguiente']) assert.equal(g.p[k], null)
  const count = g.sent.edits.length
  await avanzar(t, 60000)
  assert.equal(g.sent.edits.length, count)
  assert.equal(g.sent.nuevos.length, 2)
})

test('partida de una pregunta termina automáticamente editando el mismo panel', async t => {
  const g = await iniciar(t, 1)
  await contestar(g, g.p.actual.correcta, { sender: P2 })
  await avanzar(t, 2500)
  assert.match(ultimo(g), /FIN DEL PARTIDO/)
  assert.ok(ultimo(g).includes(`@${P2.split('@')[0]} gana`))
  assert.equal(partidas.has(GRUPO), false)
  assert.equal(g.sent.nuevos.length, 2)
})

test('fin sin aciertos se edita y se limpian temporizadores', async t => {
  const g = await iniciar(t, 1)
  await avanzar(t, 40000)
  await avanzar(t, 2500)
  assert.match(ultimo(g), /Nadie llegó a anotar/)
  assert.equal(partidas.has(GRUPO), false)
  assert.equal(g.sent.nuevos.length, 3)
})

test('partida completa de 20 preguntas: solo 2 mensajes originales', async t => {
  const g = await iniciar(t, 20)
  for (let i = 0; i < 20; i++) {
    await contestar(g, g.p.actual.correcta)
    await avanzar(t, 2500)
  }
  assert.match(ultimo(g), /FIN DEL PARTIDO/)
  assert.equal(g.p.jugadores[P1].aciertos, 20)
  assert.equal(g.sent.nuevos.length, 2)
  assert.ok(g.sent.edits.every(e => e.edit.id === g.p.panelKey.id))
})

test('fallo de edición detiene el juego y da un único aviso sin recrear preguntas', async t => {
  const g = await iniciar(t)
  g.conn.fallarEdit = true
  await contestar(g, g.p.actual.correcta)
  assert.equal(partidas.has(GRUPO), false)
  assert.match(g.sent.nuevos.at(-1).text, /partida se detuvo/)
  assert.equal(g.sent.nuevos.length, 3)
  await avanzar(t, 120000)
  assert.equal(g.sent.nuevos.length, 3)
})

test('error inicial no deja una partida bloqueada', async t => {
  reloj(t)
  for (const propiedad of ['fallarEnvio', 'fallarAnuncio']) {
    const g = crearCtx(`${propiedad}@g.us`)
    g.conn[propiedad] = true
    await handler(g.m, g.ctx)
    assert.equal(partidas.has(g.m.chat), false)
  }
})

test('acertar antes del aviso cancela el mensaje de cuenta atrás', async t => {
  const g = await iniciar(t)
  await avanzar(t, 29000)
  await contestar(g, g.p.actual.correcta)
  await comando(g, 'terminar')
  await avanzar(t, 120000)
  assert.match(ultimo(g), /FIN DEL PARTIDO/)
  assert.equal(g.sent.nuevos.length, 2)
})

test('reiniciar después de cerrar no recibe temporizadores ni citas del juego anterior', async t => {
  const g = await iniciar(t)
  const vieja = mensajeRespuesta(g, '').quoted
  await contestar(g, g.p.actual.correcta)
  await comando(g, 'terminar')
  await comando(g, 'futbol')
  const nueva = partidas.get(GRUPO)
  assert.notEqual(nueva.panelKey.id, vieja.id)
  g.p = nueva
  await contestar(g, nueva.actual.correcta, { quoted: vieja })
  assert.deepEqual(nueva.jugadores, {})
  await avanzar(t, 2500)
  assert.equal(nueva.indice, 1)
  assert.equal(g.sent.nuevos.length, 4)
})

test('grupos distintos tienen paneles y puntajes independientes', async t => {
  const g = await iniciar(t)
  const otro = crearCtx('999@g.us')
  await handler(otro.m, otro.ctx)
  otro.p = partidas.get(otro.m.chat)
  await contestar(g, g.p.actual.correcta)
  assert.deepEqual(otro.p.jugadores, {})
  assert.equal(otro.sent.edits.length, 0)
  assert.notEqual(g.p.panelKey.id, otro.p.panelKey.id)
})

test('sin partida: letras se ignoran, comandos informan y ayuda explica las citas', async t => {
  reloj(t)
  const g = crearCtx()
  await respuestas.before({ ...g.m, text: 'a', quoted: { id: 'old' } }, g.ctx)
  assert.equal(g.sent.nuevos.length, 0)
  await comando(g, 'marcador')
  assert.match(ultimo(g), /No hay ningún partido/)
  await comando(g, 'terminar')
  assert.match(ultimo(g), /No hay ningún partido/)
  await comando(g, 'futbolayuda')
  assert.match(ultimo(g), /sin prefijo/)
  assert.match(ultimo(g), /Responde al mensaje/)
})

test('marcador solicitado durante un gol lento no restaura la pregunta anterior', async t => {
  const g = await iniciar(t)
  let liberar
  const bloqueo = new Promise(resolve => { liberar = resolve })
  g.conn.bloquearEdit = () => bloqueo
  const respuesta = contestar(g, g.p.actual.correcta)
  await flush()
  const marcador = comando(g, 'marcador')
  liberar()
  await Promise.all([respuesta, marcador])
  assert.match(ultimo(g), /¡GOL/)
  assert.match(ultimo(g), /MARCADOR/)
  assert.equal(g.sent.nuevos.length, 2)
})

test('REGRESIÓN: import con ?update como el cargador comparte partidas con el lector sin query', async t => {
  reloj(t)
  const recargado = await import(`../plugins/fun/fun-adivinafutbol.js?update=regresion-${Date.now()}`)
  assert.equal(recargado.partidas, partidas)
  const g = crearCtx()
  await recargado.default(g.m, g.ctx)
  g.p = partidas.get(GRUPO)
  assert.equal(g.p.responder, recargado.responder)
  const lector = await import('../plugins/fun/fun-adivinafutbol-respuestas.js?update=lector-regresion')
  await lector.default.before(mensajeRespuesta(g, g.p.actual.correcta.toLowerCase()), g.ctx)
  assert.equal(g.p.jugadores[P1].aciertos, 1)
  assert.deepEqual(g.sent.reactions, ['✅'])
})

test('recargar solo el principal durante una partida no pierde el registro activo', async t => {
  const g = await iniciar(t)
  const recargado = await import('../plugins/fun/fun-adivinafutbol.js?update=partida-viva')
  assert.equal(recargado.partidas.get(GRUPO), g.p)
  await contestar(g, g.p.actual.correcta)
  await avanzar(t, 2500)
  assert.match(ultimo(g), /pregunta 2\/10/)
})

test('cita PN/LID con fromMe falso y texto antiguo no bloquea la respuesta', async t => {
  const g = await iniciar(t)
  await contestar(g, g.p.actual.correcta.toLowerCase(), {
    quoted: { id: g.p.panelKey.id, fromMe: false, text: 'Texto guardado por WhatsApp antes de editar' },
  })
  assert.equal(g.p.jugadores[P1].aciertos, 1)
  assert.deepEqual(g.sent.reactions, ['✅'])
})

test('cita solo con stanzaId en contextInfo se acepta sin m.quoted', async t => {
  const g = await iniciar(t)
  await contestar(g, g.p.actual.correcta, {
    quoted: undefined,
    msg: { contextInfo: { stanzaId: g.p.panelKey.id } },
  })
  assert.equal(g.p.jugadores[P1].aciertos, 1)
})

test('serialización básica: texto y cita en extendedTextMessage sin getters', async t => {
  const g = await iniciar(t)
  const m = { ...g.m, text: undefined, quoted: undefined, message: {
    extendedTextMessage: { text: g.p.actual.correcta, contextInfo: { stanzaId: g.p.panelKey.id } },
  } }
  await respuestas.before(m, g.ctx)
  assert.equal(g.p.jugadores[P1].aciertos, 1)
})

test('socket envuelto del mismo bot se acepta; otro número se ignora', async t => {
  const g = await iniciar(t)
  g.conn.user = { id: '584121234567:4@s.whatsapp.net' }
  const otro = { ...g.conn, user: { jid: '584129999999@s.whatsapp.net' } }
  await contestar(g, g.p.actual.correcta, {}, { conn: otro })
  assert.deepEqual(g.p.jugadores, {})
  const envuelto = { ...g.conn, user: { jid: '584121234567@s.whatsapp.net' } }
  await contestar(g, g.p.actual.correcta, {}, { conn: envuelto })
  assert.equal(g.p.jugadores[P1].aciertos, 1)
})

test('pin fija exactamente el panel por 24h una vez y lo desfija al terminar', async t => {
  const g = await iniciar(t)
  assert.equal(g.sent.pins.length, 1)
  assert.equal(g.sent.pins[0].pin.id, g.p.panelKey.id)
  assert.equal(g.sent.pins[0].type, 1)
  assert.equal(g.sent.pins[0].time, 86400)
  await contestar(g, g.p.actual.correcta)
  await avanzar(t, 2500)
  assert.equal(g.sent.pins.length, 1)
  await comando(g, 'terminar')
  assert.equal(g.sent.pins.length, 2)
  assert.equal(g.sent.pins[1].type, 2)
  assert.equal(g.sent.pins[1].pin.id, g.p.panelKey.id)
})

test('sin permiso para fijar: muestra aviso en panel, no cancela ni insiste cada ronda', async t => {
  reloj(t)
  const g = crearCtx()
  let intentos = 0
  const send = g.conn.sendMessage.bind(g.conn)
  g.conn.sendMessage = async (chat, content) => {
    if (content.pin) { intentos++; throw Error('403: sin permiso') }
    return send(chat, content)
  }
  await handler(g.m, g.ctx)
  g.p = partidas.get(GRUPO)
  assert.ok(g.p.aceptando)
  assert.match(ultimo(g), /No pude fijar/)
  await contestar(g, g.p.actual.correcta)
  await avanzar(t, 2500)
  assert.equal(intentos, 1)
  assert.equal(g.p.indice, 2)
  assert.equal(g.sent.nuevos.length, 2)
})

test('el aviso separado referencia el panel y permite contestar sin prefijo', async t => {
  const g = await iniciar(t)
  await avanzar(t, 30000)
  const key = g.p.actual.avisoKey
  assert.ok(key?.id)
  assert.notEqual(key.id, g.p.panelKey.id)
  assert.equal(g.sent.nuevos.length, 3)
  await contestar(g, g.p.actual.correcta, { quoted: { id: key.id } })
  assert.equal(g.p.jugadores[P1].aciertos, 1)
  await avanzar(t, 2500)
  await contestar(g, g.p.actual.correcta, { sender: P2, quoted: { id: key.id } })
  assert.equal(g.p.jugadores[P2], undefined, 'no aceptar un aviso de otra ronda')
})

test('fallar el envío del aviso no detiene la pregunta ni el timeout', async t => {
  const g = await iniciar(t)
  const relay = g.conn.relayMessage.bind(g.conn)
  g.conn.relayMessage = async (chat, message, opts) => {
    if (message.extendedTextMessage.text.includes('¡Quedan')) throw Error('fallo aviso')
    return relay(chat, message, opts)
  }
  await avanzar(t, 30000)
  assert.ok(g.p.aceptando)
  await avanzar(t, 10000)
  assert.match(ultimo(g), /Se acabó el tiempo/)
  assert.ok(partidas.has(GRUPO))
})

test('reacción usa sendMessage si no existe m.react', async t => {
  const g = await iniciar(t)
  await contestar(g, g.p.actual.correcta, {
    react: undefined, key: { remoteJid: GRUPO, id: 'RESPUESTA-USUARIO', participant: P1, fromMe: false },
  })
  assert.deepEqual(g.sent.reactions, ['✅'])
  assert.equal(g.p.jugadores[P1].aciertos, 1)
})

test('reacciones fallidas no impiden sumar ni pasar a la siguiente pregunta', async t => {
  const g = await iniciar(t)
  g.conn.fallarReaccion = true
  await contestar(g, g.p.actual.correcta, {
    react: async () => { throw Error('no se pudo reaccionar') },
    key: { remoteJid: GRUPO, id: 'USER-2', participant: P1 },
  })
  assert.equal(g.p.jugadores[P1].aciertos, 1)
  await avanzar(t, 2500)
  assert.match(ultimo(g), /pregunta 2\/10/)
})

test('comando inicial reacciona con fútbol', async t => {
  reloj(t)
  const g = crearCtx()
  g.m.react = async emoji => g.sent.reactions.push(emoji)
  await handler(g.m, g.ctx)
  assert.deepEqual(g.sent.reactions, ['⚽'])
})
