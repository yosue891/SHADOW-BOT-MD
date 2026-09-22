/*
 * Tests del minijuego ⚽ Adivina el Jugador
 *   plugins/fun/fun-adivinafutbol.js
 *   plugins/fun/fun-adivinafutbol-respuestas.js
 *
 * Corre con: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import handler, {
  BANCO, partidas, barajar, normalizar, prepararPregunta, puntosPor,
  textoPregunta, LIMITE_SEGUNDOS, PUNTOS_BASE, PUNTOS_BONUS, MAX_PREGUNTAS,
} from '../plugins/fun/fun-adivinafutbol.js'
import respuestas from '../plugins/fun/fun-adivinafutbol-respuestas.js'

// src/index.js:109 -> global.prefix = new RegExp('^[#!./]')
const PREFIJO_GLOBAL = /^[#!./]/
// los dos plugins que ya usan 'c' y 'd' como comando con prefijo
const GACHA = { command: ['claim', 'c', 'reclamar'] }
const ECONOMIA = { command: ['deposit', 'depositar', 'd', 'dep'] }

const GRUPO = '120363000000000000@g.us'
const P1 = '584241111111@s.whatsapp.net'
const P2 = '584242222222@s.whatsapp.net'
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

const NOMBRES = { [P1]: 'Yosue', [P2]: 'Dvilker' }

function crearCtx() {
  const sent = { replies: [], reactions: [] }
  const conn = {
    async reply(chat, texto, quoted, opts) { sent.replies.push({ chat, texto, opts: opts || {} }) },
    getName: (jid) => NOMBRES[jid] || 'Anónimo',
  }
  return { sent, conn }
}

async function corre({ text, sender = P1, command = 'futbol', args = [], chat = GRUPO } = {}) {
  const { sent, conn } = crearCtx()
  const m = { chat, sender, text, isGroup: true, pushName: NOMBRES[sender], async react() {} }
  m.react = (e) => sent.reactions.push(e)
  await handler(m, { conn, command, args, text })
  return { sent, m, conn }
}

async function contesto(text, { sender = P1, chat = GRUPO } = {}) {
  const { sent, conn } = crearCtx()
  const m = { chat, sender, text, isGroup: true, pushName: NOMBRES[sender], async react() {} }
  m.react = (e) => sent.reactions.push(e)
  await respuestas(m, { conn, command: text.toLowerCase(), args: [], text })
  return sent
}

async function limpio() {
  for (const p of partidas.values()) {
    if (p.timer) clearTimeout(p.timer)
    if (p.aviso) clearTimeout(p.aviso)
  }
  partidas.clear()
}

function preguntaActual() { return partidas.get(GRUPO)?.actual }

/* ═══════════════════ CONFIGURACIÓN Y METADATOS ═══════════════════ */

test('el límite de tiempo es de 40 segundos, como se pidió', () => {
  assert.equal(LIMITE_SEGUNDOS, 40)
})

test('metadatos: comandos, tag de juego y solo grupos', () => {
  assert.ok(handler.command.includes('futbol'))
  assert.equal(handler.tags[0], 'game')
  assert.equal(handler.group, true)
  assert.ok(Array.isArray(handler.help) && handler.help.length > 0)
})

test('las letras NO están como comandos con prefijo (chocarían con gacha y economía)', () => {
  for (const letra of ['a', 'b', 'c', 'd']) {
    assert.ok(!handler.command.includes(letra),
      `'${letra}' no debe ser comando del plugin principal`)
  }
  assert.deepEqual(respuestas.command, ['a', 'b', 'c', 'd'])
  assert.equal(respuestas.customPrefix, '', 'las respuestas deben entrar sin prefijo')
  assert.equal(respuestas.group, true)
})

test('customPrefix vacío: las letras sueltas entran y nada más (extracción de handler.js)', () => {
  const regex = new RegExp(respuestas.customPrefix)
  const extraer = (texto) => {
    const match = [[regex.exec(texto), respuestas.customPrefix]].find((x) => x[0]) || [null, null]
    const usedPrefix = (match[0] || '')[0]
    if (!usedPrefix && usedPrefix !== '') return null
    const noPrefix = texto.replace(usedPrefix, '')
    const [cmd] = noPrefix.trim().split(' ').filter((v) => v)
    return (cmd || '').toLowerCase()
  }
  for (const letra of ['a', 'B', 'c', 'd']) {
    assert.ok(respuestas.command.includes(extraer(letra)), `«${letra}» debe aceptarse`)
  }
  for (const ruido of ['hola', 'abc', 'marcador', 'aeiou', '']) {
    assert.ok(!respuestas.command.includes(extraer(ruido) || ''),
      `«${ruido}» no debe aceptarse`)
  }
})

test('las letras sueltas no chocan con .c (gacha) ni .d (economía): matcheo real de prefijos', () => {
  // Replica src/handler.js:345-361. El bot no tiene break en el bucle de
  // plugins, así que si dos coincidieran se ejecutarían los dos.
  const prefijosDe = (p) => {
    const cp = p.customPrefix
    if (cp instanceof RegExp) return [cp]
    if (Array.isArray(cp)) return cp.map((x) => (x instanceof RegExp ? x : new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))))
    if (typeof cp === 'string') return [new RegExp(cp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))]
    return [PREFIJO_GLOBAL]
  }
  const comandosDe = (p) => { const c = p?.command; return Array.isArray(c) ? c : c ? [c] : [] }
  const quienResponde = (texto) => {
    const ganadores = []
    for (const p of [respuestas, GACHA, ECONOMIA, handler]) {
      const match = prefijosDe(p).map((re) => { re.lastIndex = 0; return [re.exec(texto), re] }).find((x) => x[0])
      if (!match) continue
      const usedPrefix = (match[0] || '')[0]
      if (!usedPrefix && usedPrefix !== '') continue
      const [cmd] = texto.replace(usedPrefix, '').trim().split(' ').filter((v) => v)
      const comando = (cmd || '').toLowerCase()
      if (comandosDe(p).some((c) => c === comando)) ganadores.push(p)
    }
    return ganadores
  }

  // lo que escriben los jugadores: letra suelta, sin prefijo
  for (const letra of ['a', 'b', 'c', 'd']) {
    assert.deepEqual(quienResponde(letra), [respuestas],
      `«${letra}» debe disparar SOLO el plugin de respuestas`)
  }
  // y los comandos con prefijo siguen siendo de sus dueños originales
  assert.deepEqual(quienResponde('.c'), [GACHA], '.c sigue siendo de gacha-reclamar')
  assert.deepEqual(quienResponde('.d'), [ECONOMIA], '.d sigue siendo de economia-dep')
  assert.deepEqual(quienResponde('.futbol'), [handler])
  // ruido cotidiano del grupo
  for (const ruido of ['hola', 'abc', 'adios', 'ok']) {
    assert.deepEqual(quienResponde(ruido), [], `«${ruido}» no debe disparar nada`)
  }
})


/* ═══════════════════ BANCO DE PREGUNTAS ═══════════════════ */

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

test('banco: los datos de los últimos torneos son los verificados', () => {
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

/* ═══════════════════ ARRANQUE ═══════════════════ */

test('arrancar: anuncia la partida y lanza la pregunta 1', async () => {
  await limpio()
  const { sent } = await corre({ text: '.futbol' })
  assert.equal(sent.replies.length, 2, 'anuncio + primera pregunta')
  assert.match(sent.replies[0].texto, /ARRANCA ADIVINA EL JUGADOR/)
  assert.match(sent.replies[0].texto, /40 segundos/)
  assert.match(sent.replies[0].texto, /solo la letra/)
  assert.match(sent.replies[1].texto, /pregunta 1\/10/)
  assert.ok(preguntaActual(), 'debe quedar una pregunta activa')
  await limpio()
})

test('arrancar: .futbol 15 hace 15 preguntas y respeta el máximo', async () => {
  await limpio()
  await corre({ command: 'futbol', args: ['15'] })
  assert.equal(partidas.get(GRUPO).total, 15)
  await limpio()

  await corre({ command: 'futbol', args: ['999'] })
  assert.equal(partidas.get(GRUPO).total, MAX_PREGUNTAS)
  await limpio()
})

test('arrancar: un argumento inválido cae en 10 preguntas', async () => {
  await limpio()
  await corre({ command: 'futbol', args: ['banana'] })
  assert.equal(partidas.get(GRUPO).total, 10)
  await limpio()
})

test('no arranca un segundo partido si ya hay uno', async () => {
  await limpio()
  await corre({})
  const primera = partidas.get(GRUPO)
  const { sent } = await corre({})
  assert.equal(partidas.get(GRUPO), primera, 'no debe reemplazar la partida')
  assert.match(sent.replies[0].texto, /Ya hay un partido en juego/)
  await limpio()
})

/* ═══════════════════ RESPUESTAS ═══════════════════ */

test('acierto: suma puntos, felicita al jugador y pasa a la siguiente', async () => {
  await limpio()
  await corre({})
  const buena = preguntaActual().correcta.toLowerCase()
  const total = partidas.get(GRUPO).total

  const sent = await contesto(buena)
  assert.match(sent.replies[0].texto, /¡GOL de @584241111111!/)
  assert.match(sent.replies[0].texto, /puntos/)
  assert.equal(sent.replies[0].opts.mentions[0], P1)

  const j = partidas.get(GRUPO).jugadores[P1]
  assert.ok(j.puntos >= PUNTOS_BASE)
  assert.equal(j.aciertos, 1)
  assert.equal(j.fallos, 0)
  assert.equal(j.nombre, 'Yosue')

  await espera(ESPERA_TEST)
  assert.equal(partidas.get(GRUPO).indice, 2, 'debe avanzar a la pregunta 2')
  assert.match(partidas.get(GRUPO).actual.ficha.q, /.+/)
  await limpio()
})

const ESPERA_TEST = 2900

test('error: marca ❌, cuenta el fallo y no suma puntos', async () => {
  await limpio()
  await corre({})
  const buena = preguntaActual().correcta
  const mala = ['a', 'b', 'c', 'd'].find((l) => l.toUpperCase() !== buena)

  const sent = await contesto(mala)
  assert.deepEqual(sent.replies, [], 'un error no debe mandar mensaje')
  assert.deepEqual(sent.reactions, ['❌'])

  const j = partidas.get(GRUPO).jugadores[P1]
  assert.equal(j.puntos, 0)
  assert.equal(j.fallos, 1)
  assert.equal(partidas.get(GRUPO).indice, 1, 'no debe avanzar con un error')
  await limpio()
})

test('el primero que acierta gana; el segundo no suma', async () => {
  await limpio()
  await corre({})
  const buena = preguntaActual().correcta.toLowerCase()

  await contesto(buena, { sender: P1 })
  const delPrimero = partidas.get(GRUPO).jugadores[P1].puntos

  const sent2 = await contesto(buena, { sender: P2 })
  assert.deepEqual(sent2.replies, [], 'el segundo en acertar no debe recibir nada')
  assert.equal(partidas.get(GRUPO).jugadores[P2], undefined)
  assert.equal(partidas.get(GRUPO).jugadores[P1].puntos, delPrimero)
  await limpio()
})

test('un jugador no puede responder dos veces la misma pregunta', async () => {
  await limpio()
  await corre({})
  const buena = preguntaActual().correcta
  const mala = ['a', 'b', 'c', 'd'].find((l) => l.toUpperCase() !== buena)

  await contesto(mala)
  const fallos = partidas.get(GRUPO).jugadores[P1].fallos
  await contesto(buena)
  assert.equal(partidas.get(GRUPO).jugadores[P1].fallos, fallos,
    'tras fallar ya no puede volver a intentar esa pregunta')
  await limpio()
})

test('si no hay partida, las letras se ignoran en silencio', async () => {
  await limpio()
  const sent = await contesto('a')
  assert.deepEqual(sent.replies, [])
  assert.deepEqual(sent.reactions, [])
})

test('marcador sin partida avisa cómo empezar', async () => {
  await limpio()
  const { sent } = await corre({ command: 'marcador' })
  assert.match(sent.replies[0].texto, /No hay ningún partido en juego/)
  assert.match(sent.replies[0].texto, /\.futbol/)
})

/* ═══════════════════ TIEMPO AGOTADO (40 s reales) ═══════════════════ */

test('a los 40 segundos revela la respuesta y sigue con la siguiente pregunta', { timeout: 90_000 }, async () => {
  await limpio()
  await corre({})

  const buena = preguntaActual().correcta
  const correctaTexto = preguntaActual().opciones[['A', 'B', 'C', 'D'].indexOf(buena)]
  assert.ok(correctaTexto.length > 1, 'debe saber cuál era la respuesta correcta')

  // A los 35 s no puede haber pasado nada todavía. Se usan 35 y no 39 para
  // que el test no dependa de la carga de la máquina: si el temporizador se
  // adelantara, acá ya se vería.
  await espera(35_000)
  assert.equal(partidas.get(GRUPO).indice, 1, 'antes de los 40 s no debe avanzar')
  assert.ok(preguntaActual(), 'la pregunta debe seguir activa antes de los 40 s')

  // Sondeo en vez de sleep fijo: espera a que el bot dé por perdida la pregunta.
  const inicio = Date.now()
  while (partidas.get(GRUPO).indice === 1 && Date.now() - inicio < 20_000) await espera(250)
  const tardó = (Date.now() - inicio) / 1000

  const partida = partidas.get(GRUPO)
  assert.equal(partida.indice, 2, 'debe avanzar al acabarse los 40 segundos')
  assert.ok(tardó >= 3 && tardó <= 15, `el corte llegó ${tardó.toFixed(1)} s después del chequeo de los 35 s`)

  // tras la pausa ya está la pregunta 2 en pantalla
  const arranque = Date.now()
  while (!partidas.get(GRUPO).actual && Date.now() - arranque < 8000) await espera(250)
  assert.match(partidas.get(GRUPO).actual.ficha.q, /.+/, 'debe haber una pregunta 2')
  assert.ok(preguntaActual().correcta, 'la pregunta 2 debe tener su respuesta')
  await limpio()
})

/* ═══════════════════ MARCADOR Y FIN ═══════════════════ */

test('marcador: muestra la tabla con menciones', async () => {
  await limpio()
  await corre({})
  await contesto(preguntaActual().correcta.toLowerCase())

  const { sent } = await corre({ command: 'marcador' })
  assert.match(sent.replies[0].texto, /MARCADOR/)
  assert.match(sent.replies[0].texto, /584241111111/)
  assert.match(sent.replies[0].texto, /pts/)
  assert.deepEqual(sent.replies[0].opts.mentions, [P1])
  await limpio()
})

test('terminar: corona al que más puntos hizo y limpia la partida', async () => {
  await limpio()
  await corre({})
  await contesto(preguntaActual().correcta.toLowerCase(), { sender: P2 })

  const { sent } = await corre({ command: 'terminar' })
  assert.match(sent.replies[0].texto, /FIN DEL PARTIDO/)
  assert.match(sent.replies[0].texto, /@584242222222 gana con/)
  assert.ok(!partidas.has(GRUPO), 'la partida debe borrarse')
  assert.deepEqual(sent.replies[0].opts.mentions[0], P2)
  await limpio()
})

test('terminar sin partida avisa', async () => {
  await limpio()
  const { sent } = await corre({ command: 'terminar' })
  assert.match(sent.replies[0].texto, /No hay ningún partido en juego/)
})

test('partida de una sola pregunta: al acertar se termina sola', async () => {
  await limpio()
  await corre({ command: 'futbol', args: ['1'] })
  await contesto(preguntaActual().correcta.toLowerCase())

  await espera(ESPERA_TEST)
  assert.ok(!partidas.has(GRUPO), 'debe cerrarse al acabar las preguntas')
  await limpio()
})

test('ayuda: explica cómo se juega', async () => {
  await limpio()
  const { sent } = await corre({ command: 'futbolayuda' })
  assert.match(sent.replies[0].texto, /ADIVINA EL JUGADOR/)
  assert.match(sent.replies[0].texto, /40 segundos/)
  assert.match(sent.replies[0].texto, /sin prefijo/)
  await limpio()
})
