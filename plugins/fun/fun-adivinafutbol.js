/*
 * ⚽ ADIVINA EL JUGADOR — minijuego de fútbol para grupos
 *
 * Trivial de opción múltiple (A/B/C/D) sobre grandes jugadores: Messi,
 * Cristiano Ronaldo, Pelé, Maradona, Cruyff, Zidane, Ronaldinho, Mbappé,
 * Yamal y compañía. 40 segundos por pregunta, gana el primero que acierte.
 *
 * Comandos:
 *   .futbol [nº de preguntas]   -> arranca la partida (por defecto 10)
 *   a / b / c / d               -> responder: solo la letra, sin prefijo
 *                                (lo maneja fun-adivinafutbol-respuestas.js)
 *   .marcador                   -> tabla de posiciones
 *   .terminar                   -> cortar la partida y ver el ganador
 *
 * Estado por chat en memoria (se pierde al reiniciar el bot, a propósito:
 * no tiene sentido guardar una partida a medias de hace tres días).
 */

const LIMITE_SEGUNDOS = 40          // tiempo por pregunta
const AVISO_EN_SEGUNDOS = 10        // aviso de "quedan X segundos"
const PUNTOS_BASE = 100
const PUNTOS_BONUS = 40             // bonus proporcional a la rapidez
const ESPERA_SIGUIENTE = 2500       // pausa antes de la siguiente pregunta
const MAX_PREGUNTAS = 20
const LETRAS = ['A', 'B', 'C', 'D']

/* ─────────────────────────── BANCO DE PREGUNTAS ─────────────────────────── */
/* Cada entrada: categoría, pregunta, 4 opciones y el índice de la correcta. */

const BANCO = [
  /* ——— Messi y Cristiano ——— */
  { cat: 'Messi', q: '¿Cuál es el apodo de Lionel Messi?', o: ['La Pulga', 'El Bicho', 'O Fenômeno', 'El Matador'], ok: 0 },
  { cat: 'Messi', q: '¿En qué ciudad argentina nació Lionel Messi?', o: ['Rosario', 'Córdoba', 'Buenos Aires', 'Santa Fe'], ok: 0 },
  { cat: 'Messi', q: '¿Con qué selección ganó Messi su primer Mundial?', o: ['Argentina', 'Brasil', 'España', 'Uruguay'], ok: 0 },
  { cat: 'Messi', q: '¿Cuántos Balones de Oro ha ganado Lionel Messi?', o: ['8', '5', '6', '7'], ok: 0 },
  { cat: 'Messi', q: '¿A qué club se marchó Messi cuando dejó el Barcelona?', o: ['Paris Saint-Germain', 'Manchester City', 'Inter de Milán', 'Chelsea'], ok: 0 },
  { cat: 'Cristiano', q: '¿Qué significa el apodo "CR7"?', o: ['Cristiano Ronaldo y su dorsal 7', 'Copa Real 7', 'Club Recife 7', 'Campeón Round 7'], ok: 0 },
  { cat: 'Cristiano', q: '¿Cuál es la nacionalidad de Cristiano Ronaldo?', o: ['Portuguesa', 'Española', 'Brasileña', 'Italiana'], ok: 0 },
  { cat: 'Cristiano', q: '¿En qué isla portuguesa nació Cristiano Ronaldo?', o: ['Madeira', 'Azores', 'Cabo Verde', 'Porto Santo'], ok: 0 },
  { cat: 'Cristiano', q: '¿Cuántos Balones de Oro ha ganado Cristiano Ronaldo?', o: ['5', '3', '7', '4'], ok: 0 },
  { cat: 'Cristiano', q: '¿Con qué club ganó Cristiano su primera Champions League?', o: ['Manchester United', 'Real Madrid', 'Juventus', 'Sporting de Lisboa'], ok: 0 },

  /* ——— Apodos ——— */
  { cat: 'Apodos', q: '¿A qué jugador llaman "El Bicho"?', o: ['Cristiano Ronaldo', 'Lionel Messi', 'Neymar', 'Mbappé'], ok: 0 },
  { cat: 'Apodos', q: '¿Quién es "O Fenômeno"?', o: ['Ronaldo Nazário', 'Ronaldinho', 'Rivaldo', 'Romário'], ok: 0 },
  { cat: 'Apodos', q: '¿A qué jugador conocían como "El Pibe de Oro"?', o: ['Diego Maradona', 'Lionel Messi', 'Juan Román Riquelme', 'Gabriel Batistuta'], ok: 0 },
  { cat: 'Apodos', q: '¿Qué portero era "La Araña Negra"?', o: ['Lev Yashin', 'Gianluigi Buffon', 'Iker Casillas', 'Oliver Kahn'], ok: 0 },
  { cat: 'Apodos', q: '¿Quién era "El Kaiser"?', o: ['Franz Beckenbauer', 'Gerd Müller', 'Lothar Matthäus', 'Karl-Heinz Rummenigge'], ok: 0 },

  /* ——— Leyendas ——— */
  { cat: 'Leyendas', q: '¿Qué selección ganó el primer Mundial de la historia (1930)?', o: ['Uruguay', 'Brasil', 'Argentina', 'Italia'], ok: 0 },
  { cat: 'Leyendas', q: '¿Quién es el máximo goleador en la historia de los Mundiales?', o: ['Miroslav Klose', 'Ronaldo Nazário', 'Gerd Müller', 'Pelé'], ok: 0 },
  { cat: 'Leyendas', q: '¿Quién anotó el gol del 2-1 en la final de Qatar 2022?', o: ['Lionel Messi', 'Kylian Mbappé', 'Ángel Di María', 'Julián Álvarez'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué portero hizo la parada más recordada a Robben en la final de 2010?', o: ['Iker Casillas', 'Víctor Valdés', 'Pepe Reina', 'David de Gea'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué defensa metió el cabezazo del 1-0 ante Alemania en la semifinal de 2010?', o: ['Carles Puyol', 'Sergio Ramos', 'Gerard Piqué', 'Joan Capdevila'], ok: 0 },
  { cat: 'Leyendas', q: '¿Quién marcó el gol de Stamford Bridge en 2009, ante el Chelsea?', o: ['Andrés Iniesta', 'Xavi Hernández', 'Thierry Henry', 'Samuel Eto\'o'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué jugador dio el cabezazo a Materazzi en la final del Mundial 2006?', o: ['Zinedine Zidane', 'Marco Materazzi', 'Thierry Henry', 'Fabien Barthez'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué crack holandés fue símbolo del "fútbol total"?', o: ['Johan Cruyff', 'Marco van Basten', 'Ruud Gullit', 'Dennis Bergkamp'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué club hizo gigante Alfredo Di Stéfano?', o: ['Real Madrid', 'Barcelona', 'River Plate', 'Boca Juniors'], ok: 0 },
  { cat: 'Leyendas', q: '¿Cuántos Mundiales ganó Pelé?', o: ['3', '1', '2', '4'], ok: 0 },
  { cat: 'Leyendas', q: '¿Con qué selección ganó Pelé sus Mundiales?', o: ['Brasil', 'Argentina', 'Uruguay', 'Italia'], ok: 0 },
  { cat: 'Leyendas', q: '¿Quién hizo "la Mano de Dios" y "el Gol del Siglo" en el mismo partido?', o: ['Diego Maradona', 'Jorge Valdano', 'Gary Lineker', 'Oscar Ruggeri'], ok: 0 },
  { cat: 'Leyendas', q: '¿Contra qué selección hizo Maradona esos dos goles en 1986?', o: ['Inglaterra', 'Alemania', 'Bélgica', 'Brasil'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué pareja de mediocampistas brilló en el Barça y en la selección española?', o: ['Xavi e Iniesta', 'Modric y Kroos', 'Pirlo y Gattuso', 'Vieira y Makelele'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué brasileño ganó el Balón de Oro en 2005 jugando en el Barcelona?', o: ['Ronaldinho', 'Rivaldo', 'Kaká', 'Ronaldo Nazário'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué jugador brasileño ganó el Balón de Oro en 2007 con el Milan?', o: ['Kaká', 'Ronaldinho', 'Adriano', 'Robinho'], ok: 0 },
  { cat: 'Leyendas', q: '¿Quién fue el húngaro que brilló en el Real Madrid de los 50?', o: ['Ferenc Puskás', 'Sándor Kocsis', 'József Bozsik', 'Zoltán Czibor'], ok: 0 },
  { cat: 'Leyendas', q: '¿Quién marcó el gol decisivo en la final del Mundial 1974?', o: ['Gerd Müller', 'Franz Beckenbauer', 'Johan Cruyff', 'Paul Breitner'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué delantero del Manchester United ganó el Balón de Oro en 1968?', o: ['George Best', 'Bobby Charlton', 'Denis Law', 'Eric Cantona'], ok: 0 },
  { cat: 'Leyendas', q: '¿Qué portero fue el único en ganar un Balón de Oro?', o: ['Lev Yashin', 'Gianluigi Buffon', 'Iker Casillas', 'Manuel Neuer'], ok: 0 },

  /* ——— Mundiales ——— */
  { cat: 'Mundiales', q: '¿Qué selección ganó el Mundial de Qatar 2022?', o: ['Argentina', 'Francia', 'Brasil', 'Croacia'], ok: 0 },
  { cat: 'Mundiales', q: '¿Dónde se jugó la final del Mundial 2010 que ganó España?', o: ['Sudáfrica', 'Brasil', 'Alemania', 'Qatar'], ok: 0 },
  { cat: 'Mundiales', q: '¿Quién anotó el gol de España en la final del Mundial 2010?', o: ['Andrés Iniesta', 'David Villa', 'Cesc Fàbregas', 'Fernando Torres'], ok: 0 },
  { cat: 'Mundiales', q: '¿Qué selección ganó el Mundial de Rusia 2018?', o: ['Francia', 'Croacia', 'Bélgica', 'Inglaterra'], ok: 0 },
  { cat: 'Mundiales', q: '¿Qué selección organizó y ganó el Mundial de 1998?', o: ['Francia', 'Brasil', 'Italia', 'Alemania'], ok: 0 },
  { cat: 'Mundiales', q: '¿En qué estadio se definió el Mundial 2014 que ganó Alemania?', o: ['Maracaná', 'Wembley', 'Estadio Azteca', 'Allianz Arena'], ok: 0 },
  { cat: 'Mundiales', q: '¿Quién anotó el único gol de la final del Mundial 2026?', o: ['Ferran Torres', 'Nico Williams', 'Lamine Yamal', 'Rodri'], ok: 0 },
  { cat: 'Mundiales', q: '¿A qué selección venció España en la final del Mundial 2026?', o: ['Argentina', 'Francia', 'Brasil', 'Inglaterra'], ok: 0 },

  /* ——— Presente ——— */
  { cat: 'Presente', q: '¿De qué nacionalidad es Kylian Mbappé?', o: ['Francesa', 'Belga', 'Española', 'Portuguesa'], ok: 0 },
  { cat: 'Presente', q: '¿De qué nacionalidad es Erling Haaland?', o: ['Noruega', 'Suecia', 'Dinamarca', 'Islandia'], ok: 0 },
  { cat: 'Presente', q: '¿De qué nacionalidad es Robert Lewandowski?', o: ['Polonia', 'Alemania', 'Croacia', 'República Checa'], ok: 0 },
  { cat: 'Presente', q: '¿De qué nacionalidad es Neymar?', o: ['Brasil', 'Argentina', 'Portugal', 'Uruguay'], ok: 0 },
  { cat: 'Presente', q: '¿De qué país es el portero Thibaut Courtois?', o: ['Bélgica', 'Francia', 'Países Bajos', 'Alemania'], ok: 0 },
  { cat: 'Presente', q: '¿Qué joven extremo español debutó en la Eurocopa con 16 años y 338 días?', o: ['Lamine Yamal', 'Pedri', 'Gavi', 'Nico Williams'], ok: 0 },
  { cat: 'Presente', q: '¿Quién fue elegido mejor jugador del Mundial 2026?', o: ['Rodri', 'Lamine Yamal', 'Ferran Torres', 'Unai Simón'], ok: 0 },
  { cat: 'Presente', q: '¿Quién ganó la Bota de Oro del Mundial 2026, la segunda de su carrera?', o: ['Kylian Mbappé', 'Lionel Messi', 'Lamine Yamal', 'Harry Kane'], ok: 0 },
  { cat: 'Presente', q: '¿Qué portero argentino fue clave en la Copa América 2024?', o: ['Emiliano "Dibu" Martínez', 'Franco Armani', 'Gerónimo Rulli', 'Juan Musso'], ok: 0 },
  { cat: 'Presente', q: '¿Qué selección ganó la Copa América 2024?', o: ['Argentina', 'Brasil', 'Colombia', 'Uruguay'], ok: 0 },
]

/* ─────────────────────────── ESTADO POR CHAT ─────────────────────────── */

const partidas = new Map()

const aleatorio = (n) => Math.floor(Math.random() * n)

function barajar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1)
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function nombreDe(conn, m) {
  const desdeConn = conn?.getName?.(m.sender)
  return desdeConn || m.pushName || String(m.sender || '').split('@')[0]
}

/* Reparte las opciones en posiciones aleatorias y devuelve la letra buena. */
function prepararPregunta(ficha) {
  const opciones = barajar(ficha.o)
  return {
    ficha,
    opciones,
    correcta: LETRAS[opciones.indexOf(ficha.o[ficha.ok])],
    preguntadaEn: Date.now(),
    respondieron: new Set(),
  }
}

function textoPregunta(p, indice, total) {
  return [
    `⚽ *ADIVINA EL JUGADOR* — pregunta ${indice}/${total}`,
    ``,
    `🏷️ ${p.ficha.cat}`,
    `❓ *${p.ficha.q}*`,
    ``,
    ...p.opciones.map((op, i) => `${LETRAS[i]}. ${op}`),
    ``,
    `⏱️ *${LIMITE_SEGUNDOS} segundos* — responde con una letra (a/b/c/d)`,
    `🎯 ${PUNTOS_BASE} pts + hasta ${PUNTOS_BONUS} de bonus por rapidez`,
    `🥇 Gana el primero que acierte.`,
  ].join('\n')
}

function puntosPor(segundosUsados) {
  const restantes = Math.max(0, LIMITE_SEGUNDOS - segundosUsados)
  return Math.round(PUNTOS_BASE + (PUNTOS_BONUS * restantes) / LIMITE_SEGUNDOS)
}

function medalla(puesto) {
  return ['🥇', '🥈', '🥉'][puesto] || '▫️'
}

async function tablaDe(partida, conn, m) {
  const ranking = Object.entries(partida.jugadores)
    .map(([jid, j]) => ({ jid, ...j }))
    .sort((a, b) => b.puntos - a.puntos || b.aciertos - a.aciertos)

  if (!ranking.length) return '📊 Nadie ha sumado puntos todavía.'

  const lineas = ranking.slice(0, 10).map((j, i) =>
    `${medalla(i)} @${String(j.jid).split('@')[0]} — *${j.puntos} pts* (${j.aciertos} ✅ / ${j.fallos} ❌)`)

  const texto = [
    `📊 *MARCADOR* — pregunta ${Math.min(partida.indice, partida.total)} de ${partida.total}`,
    ``,
    ...lineas,
  ].join('\n')

  await conn.reply(m.chat, texto, null, { mentions: ranking.slice(0, 10).map((j) => j.jid) })
}

function terminarTimers(partida) {
  if (partida.timer) clearTimeout(partida.timer)
  if (partida.aviso) clearTimeout(partida.aviso)
  partida.timer = null
  partida.aviso = null
}

/* ─────────────────────────── FIN DE PARTIDA ─────────────────────────── */

async function cerrarPartida(m, { conn }, partida, motivo) {
  terminarTimers(partida)
  partidas.delete(m.chat)

  const ranking = Object.entries(partida.jugadores)
    .map(([jid, j]) => ({ jid, ...j }))
    .sort((a, b) => b.puntos - a.puntos || b.aciertos - a.aciertos)

  if (!ranking.length) {
    return conn.reply(m.chat, `⚽ *Partido terminado* (${motivo})\n\nNadie llegó a anotar. 😅\n\nCuando quieras otra: *.futbol*`)
  }

  const [campeon, ...resto] = ranking
  const menciones = [campeon.jid]

  const lineas = [
    `🏆 *¡FIN DEL PARTIDO!* ${motivo}`,
    ``,
    `🥇 @${String(campeon.jid).split('@')[0]} gana con *${campeon.puntos} puntos* (${campeon.aciertos} aciertos de ${partida.total})`,
  ]

  if (resto.length) {
    lineas.push(``, `*Resto del marcador:*`)
    resto.slice(0, 9).forEach((j, i) => {
      menciones.push(j.jid)
      lineas.push(`${medalla(i + 1)} @${String(j.jid).split('@')[0]} — ${j.puntos} pts`)
    })
  }

  lineas.push(``, `⚽ ¿Revancha? *.futbol*`)

  return conn.reply(m.chat, lineas.join('\n'), null, { mentions: menciones })
}

/* ─────────────────────────── SIGUIENTE PREGUNTA ─────────────────────────── */

async function siguientePregunta(m, ctx, partida) {
  if (!partidas.has(m.chat) || partidas.get(m.chat) !== partida) return

  if (partida.indice > partida.total) {
    return cerrarPartida(m, ctx, partida, 'se acabaron las preguntas')
  }

  const ficha = partida.preguntas[partida.indice - 1]
  partida.actual = prepararPregunta(ficha)

  await ctx.conn.reply(m.chat, textoPregunta(partida.actual, partida.indice, partida.total))

  partida.aviso = setTimeout(() => {
    const viva = partidas.get(m.chat)
    if (!viva || viva !== partida || !partida.actual) return
    ctx.conn.reply(m.chat, `⏱️ ¡Quedan *${AVISO_EN_SEGUNDOS} segundos*! ⚡`).catch(() => {})
  }, (LIMITE_SEGUNDOS - AVISO_EN_SEGUNDOS) * 1000)

  partida.timer = setTimeout(() => {
    const viva = partidas.get(m.chat)
    if (!viva || viva !== partida || !partida.actual) return

    const fallida = partida.actual
    partida.actual = null
    terminarTimers(partida)

    ctx.conn.reply(m.chat, [
      `⏰ *¡Se acabó el tiempo!*`,
      ``,
      `La respuesta era *${fallida.correcta}. ${fallida.opciones[LETRAS.indexOf(fallida.correcta)]}*`,
      ``,
      `Siguiente pregunta... ⚽`,
    ].join('\n'), null, { mentions: [] }).catch(() => {})

    partida.indice++
    setTimeout(() => siguientePregunta(m, ctx, partida), ESPERA_SIGUIENTE)
  }, LIMITE_SEGUNDOS * 1000)
}

/* ─────────────────────────── RESPUESTA ─────────────────────────── */

async function responder(m, ctx, partida, entrada) {
  const actual = partida.actual
  if (!actual) return

  const jugador = m.sender
  if (actual.respondieron.has(jugador)) return

  const letra = /^[a-dA-D]$/.exec(entrada)
  let elegida = null
  if (letra) {
    elegida = letra[0].toUpperCase()
  } else {
    const buscado = normalizar(entrada)
    if (buscado.length < 3) return
    const i = actual.opciones.findIndex((op) => normalizar(op) === buscado)
    if (i < 0) return
    elegida = LETRAS[i]
  }

  actual.respondieron.add(jugador)

  const j = (partida.jugadores[jugador] ||= {
    nombre: nombreDe(ctx.conn, m), puntos: 0, aciertos: 0, fallos: 0,
  })

  if (elegida !== actual.correcta) {
    j.fallos++
    return m.react?.('❌')
  }

  const segundos = (Date.now() - actual.preguntadaEn) / 1000
  const ganados = puntosPor(segundos)
  j.puntos += ganados
  j.aciertos++

  const fallida = actual
  partida.actual = null
  terminarTimers(partida)

  await ctx.conn.reply(m.chat, [
    `⚽🎉 *¡GOL de @${String(jugador).split('@')[0]}!*`,
    ``,
    `✅ ${fallida.correcta}. ${fallida.opciones[LETRAS.indexOf(fallida.correcta)]}`,
    `⚡ ${segundos.toFixed(1)}s → *+${ganados} puntos* (total: ${j.puntos})`,
    ``,
    `Siguiente...`,
  ].join('\n'), null, { mentions: [jugador] })

  partida.indice++
  setTimeout(() => siguientePregunta(m, ctx, partida), ESPERA_SIGUIENTE)
}

/* ─────────────────────────── HANDLER ─────────────────────────── */

let handler = async (m, ctx) => {
  const { conn, command, args } = ctx
  const partida = partidas.get(m.chat)

  /* ── marcador ── */
  if (command === 'marcador' || command === 'tabla') {
    if (!partida) return conn.reply(m.chat, '⚽ No hay ningún partido en juego.\n\nArranca uno con *.futbol*')
    return tablaDe(partida, conn, m)
  }

  /* ── terminar ── */
  if (command === 'terminar' || command === 'finpartido') {
    if (!partida) return conn.reply(m.chat, '⚽ No hay ningún partido en juego.')
    return cerrarPartida(m, ctx, partida, 'lo cortaron')
  }

  /* ── arrancar ── */
  if (command === 'futbol' || command === 'futbolito' || command === 'adivinafutbol' ||
      command === 'adivinajugador' || command === 'quienjugador' || command === 'trivalfutbol') {
    if (partida) {
      return conn.reply(m.chat, [
        `⚽ *Ya hay un partido en juego.*`,
        ``,
        `Pregunta ${Math.min(partida.indice, partida.total)} de ${partida.total}.`,
        `Para cortarlo: *.terminar*`,
      ].join('\n'))
    }

    let total = parseInt(args?.[0], 10)
    if (!Number.isFinite(total) || total < 1) total = 10
    total = Math.min(total, MAX_PREGUNTAS, BANCO.length)

    if (BANCO.length < total) total = BANCO.length

    const nueva = {
      preguntas: barajar(BANCO).slice(0, total),
      total,
      indice: 1,
      actual: null,
      jugadores: {},
      creador: m.sender,
      timer: null,
      aviso: null,
    }
    partidas.set(m.chat, nueva)

    await conn.reply(m.chat, [
      `⚽🏆 *¡ARRANCA ADIVINA EL JUGADOR!*`,
      ``,
      `🎯 ${total} preguntas sobre los grandes del fútbol`,
      `⏱️ ${LIMITE_SEGUNDOS} segundos por pregunta`,
      `✍️ Responde escribiendo solo la letra: *a*, *b*, *c* o *d* — gana el primero en acertar`,
      `🎁 ${PUNTOS_BASE} puntos + hasta ${PUNTOS_BONUS} de bonus por rapidez`,
      ``,
      `📊 *.marcador* para ver la tabla  ·  ⏹️ *.terminar* para cortar`,
      ``,
      `¡Vamos con la primera! 🔥`,
    ].join('\n'))

    return siguientePregunta(m, ctx, nueva)
  }

  /* ── ayuda ── */
  return conn.reply(m.chat, [
    `⚽ *ADIVINA EL JUGADOR*`,
    ``,
    `Trivial de fútbol con 4 opciones y ${LIMITE_SEGUNDOS} segundos por pregunta.`,
    ``,
    `*.futbol* — partida de 10 preguntas`,
    `*.futbol 15* — partida de 15 (máx. ${MAX_PREGUNTAS})`,
    `a / b / c / d — responder (solo la letra, sin prefijo)`,
    `*.marcador* — tabla de posiciones`,
    `*.terminar* — cortar y ver al ganador`,
    ``,
    `${BANCO.length} preguntas sobre Messi, Cristiano, Pelé, Maradona, Cruyff,`,
    `Zidane, Ronaldinho, Mbappé, Yamal y muchos más. 🌍`,
  ].join('\n'))
}

handler.help = ['futbol [preguntas]', 'marcador', 'terminar']
handler.tags = ['game']
// OJO: 'a'/'b'/'c'/'d' NO van acá. Los maneja fun-adivinafutbol-respuestas.js,
// que usa customPrefix '' para que se responda escribiendo solo la letra.
// Acá irían chocando con 'c' (gacha-reclamar) y 'd' (economia-dep).
handler.command = ['futbol', 'futbolito', 'adivinafutbol', 'adivinajugador', 'quienjugador', 'trivalfutbol', 'marcador', 'terminar', 'finpartido', 'futbolayuda']
handler.group = true

export { BANCO, partidas, barajar, normalizar, prepararPregunta, puntosPor, textoPregunta, siguientePregunta, cerrarPartida, responder, LIMITE_SEGUNDOS, PUNTOS_BASE, PUNTOS_BONUS, MAX_PREGUNTAS }
export default handler
