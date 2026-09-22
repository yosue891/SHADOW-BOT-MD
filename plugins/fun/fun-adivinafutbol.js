import { randomBytes } from 'node:crypto'

/*
 * ⚽ ADIVINA EL JUGADOR — minijuego de fútbol para grupos
 *
 * Trivial de opción múltiple (A/B/C/D) sobre grandes jugadores: Messi,
 * Cristiano Ronaldo, Pelé, Maradona, Cruyff, Zidane, Ronaldinho, Mbappé,
 * Yamal y compañía. 40 segundos por pregunta, gana el primero que acierte.
 *
 * Comandos:
 *   .futbol [nº de preguntas]   -> arranca la partida (por defecto 10)
 *   a / b / c / d               -> responder AL PANEL, sin prefijo
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
const MAX_INTENTOS = 2

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

// El cargador usa ?update=...: cada import crea un módulo nuevo, pero todos
// deben consultar el MISMO registro, incluido el plugin de respuestas.
const REGISTRO = Symbol.for('shadow.futbol.partidas.v2')
const partidas = (globalThis[REGISTRO] ||= new Map())

function mismaConexion(a, b) {
  if (a === b) return true
  const ids = c => [c?.user?.jid, c?.user?.id, c?.user?.lid]
    .filter(v => typeof v === 'string' && v.includes('@'))
    .map(v => v.replace(/:\d+@/, '@').replace(/@c\.us$/, '@s.whatsapp.net'))
  return ids(a).some(id => ids(b).includes(id))
}

function citaDe(m) {
  const context = m.msg?.contextInfo || m.message?.extendedTextMessage?.contextInfo || {}
  return {
    id: m.quoted?.id || m.quoted?.key?.id || context.stanzaId,
    chat: m.quoted?.chat || m.quoted?.key?.remoteJid || context.remoteJid,
  }
}

// Baileys puede entregar el ID en m.text o dentro del mensaje interactivo.
function botonDe(m) {
  let message = m.message || {}
  for (let i = 0; i < 5; i++) {
    const inner = message.ephemeralMessage?.message || message.viewOnceMessage?.message || message.viewOnceMessageV2?.message
    if (!inner) break
    message = inner
  }
  const native = message.interactiveResponseMessage?.nativeFlowResponseMessage
    || m.msg?.nativeFlowResponseMessage
  let id
  if (native) {
    try {
      if (typeof native.paramsJson !== 'string' || native.paramsJson.length > 4096) return null
      const params = JSON.parse(native.paramsJson)
      id = params?.id || params?.selectedId || params?.selected_id
    } catch { return null }
  } else {
    id = message.buttonsResponseMessage?.selectedButtonId
      || message.templateButtonReplyMessage?.selectedId
      || m.msg?.selectedButtonId || m.msg?.selectedId || m.text || m.body
  }
  if (typeof id !== 'string') return null
  const match = /^futbol:([a-f0-9]{16}):([a-f0-9]{16}):([A-D])$/.exec(id.trim())
  return match ? { sesion: match[1], ronda: match[2], letra: match[3] } : null
}

async function retirarBotones(m, ctx, actual) {
  if (!actual?.botonesKey) return
  const key = actual.botonesKey
  actual.botonesKey = null
  try { await ctx.conn.sendMessage(m.chat, { delete: key }) }
  catch (error) { console.warn('[futbol] No se pudieron retirar los botones:', error?.message || error) }
}

async function enviarBotones(m, ctx, partida, actual) {
  const key = { remoteJid: m.chat, fromMe: true, id: `3EB0${randomBytes(9).toString('hex').toUpperCase()}` }
  const content = {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2, messageSecret: randomBytes(32) },
        interactiveMessage: {
          header: { hasMediaAttachment: false },
          body: { text: textoPregunta(actual, partida.indice, partida.total) },
          footer: { text: '2 intentos por jugador · ❌ Te queda 1 · 🚫 Sin intentos · ✅ Acierto' },
          nativeFlowMessage: {
            buttons: LETRAS.map(letra => ({
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: letra,
                id: `futbol:${partida.id}:${actual.id}:${letra}`,
              }),
            })),
          },
        },
      },
    },
  }
  try {
    // El Baileys incluido reconoce nativeFlowMessage y añade los nodos biz.
    await ctx.conn.relayMessage(m.chat, content, { messageId: key.id })
    actual.botonesKey = key
    if (partida.cerrada || partidas.get(m.chat) !== partida || partida.actual !== actual) {
      await retirarBotones(m, ctx, actual)
      return false
    }
    return true
  } catch (error) {
    console.warn('[futbol] No se pudieron enviar los botones:', error?.message || error)
    partida.avisoBotones = '⚠️ No pude enviar los botones. Responde al panel con a/b/c/d; también tienes 2 intentos.'
    await actualizarPanel(m, ctx, partida, () => partida.textoPanel, () => partida.mencionesPanel || [])
    return false
  }
}

async function reaccionar(m, conn, emoji) {
  try {
    if (typeof m.react === 'function') return await m.react(emoji)
  } catch {}
  const key = m.key || (m.id ? { remoteJid: m.chat, id: m.id, fromMe: !!m.fromMe, participant: m.sender } : null)
  if (!key?.id) return
  try { await conn.sendMessage(m.chat, { react: { text: emoji, key } }) } catch {}
}

async function enviarTexto(conn, chat, text, contextInfo = {}) {
  const key = { remoteJid: chat, fromMe: true, id: `3EB0${randomBytes(9).toString('hex').toUpperCase()}` }
  await conn.relayMessage(chat, { extendedTextMessage: { text, contextInfo } }, { messageId: key.id })
  return key
}

async function desfijarPanel(m, ctx, partida) {
  if (!partida.fijada) return
  partida.fijada = false
  try { await ctx.conn.sendMessage(m.chat, { pin: partida.panelKey, type: 2, time: 0 }) }
  catch (error) { console.warn('[futbol] No se pudo desfijar:', error?.message || error) }
}

async function fijarPanel(m, ctx, partida) {
  if (partida.pinIntentado || !partida.panelKey) return
  partida.pinIntentado = true
  try {
    await ctx.conn.sendMessage(m.chat, { pin: partida.panelKey, type: 1, time: 86400 })
    partida.fijada = true
    if (partida.cerrada || partidas.get(m.chat) !== partida) await desfijarPanel(m, ctx, partida)
  } catch (error) {
    console.warn('[futbol] No se pudo fijar:', error?.message || error)
    partida.avisoFijado = '📌 No pude fijar la partida. Revisa los permisos del bot (puede necesitar ser administrador) o fija este mensaje manualmente.'
    await actualizarPanel(m, ctx, partida, () => partida.textoPanel, () => partida.mencionesPanel || [])
  }
}

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
    id: randomBytes(8).toString('hex'),
    intentos: new Map(),
    mensajes: new Set(),
  }
}

function textoPregunta(p, indice, total) {
  return [
    `⚽ *ADIVINA EL JUGADOR* — pregunta ${indice}/${total}`,
    ``, `🏷️ ${p.ficha.cat}`, `❓ *${p.ficha.q}*`, ``,
    ...p.opciones.map((op, i) => `${LETRAS[i]}. ${op}`),
    ``, `⏱️ *${LIMITE_SEGUNDOS} segundos*`,
    `🎮 Pulsa A/B/C/D en la tarjeta de botones de esta pregunta.\n✍️ Si no aparecen, responde a este mensaje con a/b/c/d, sin prefijo.`,
    `🎯 ${PUNTOS_BASE} pts + hasta ${PUNTOS_BONUS} de bonus por rapidez`,
    `🥇 Gana el primero que acierte. *2 intentos por jugador en cada pregunta.*`,
  ].join('\n')
}

function puntosPor(segundosUsados) {
  const restantes = Math.max(0, LIMITE_SEGUNDOS - segundosUsados)
  return Math.round(PUNTOS_BASE + (PUNTOS_BONUS * restantes) / LIMITE_SEGUNDOS)
}

function medalla(puesto) {
  return ['🥇', '🥈', '🥉'][puesto] || '▫️'
}

function rankingDe(partida) {
  return Object.entries(partida.jugadores)
    .map(([jid, j]) => ({ jid, ...j }))
    .sort((a, b) => b.puntos - a.puntos || b.aciertos - a.aciertos)
}

function textoMarcador(partida) {
  const ranking = rankingDe(partida).slice(0, 10)
  return ranking.length ? [
    '📊 *MARCADOR*',
    ...ranking.map((j, i) => `${medalla(i)} @${j.jid.split('@')[0]} — *${j.puntos} pts* (${j.aciertos} ✅ / ${j.fallos} ❌)`),
  ].join('\n') : '📊 Nadie ha sumado puntos todavía.'
}

function terminarTimers(partida) {
  for (const key of ['timer', 'aviso', 'siguiente']) {
    if (partida[key]) clearTimeout(partida[key])
    partida[key] = null
  }
}

async function falloPanel(m, ctx, partida, error) {
  if (partida.errorNotificado) return
  partida.errorNotificado = true
  partida.cerrada = true
  const anterior = partida.actual
  partida.actual = null
  partida.aceptando = false
  terminarTimers(partida)
  await retirarBotones(m, ctx, anterior)
  await desfijarPanel(m, ctx, partida)
  if (partidas.get(m.chat) === partida) partidas.delete(m.chat)
  console.error('[futbol] No se pudo actualizar el panel:', error?.message || error)
  // Un único aviso; no reenviar una pregunta nueva en cada fallo de edición.
  try {
    await ctx.conn.reply(m.chat, '⚠️ No pude actualizar el mensaje de fútbol. La partida se detuvo para evitar mensajes repetidos. Puedes iniciar otra con .futbol.')
  } catch {}
}

/* Todas las actualizaciones usan la MISMA key del segundo mensaje.
 * La cola impide que un aviso lento sobrescriba un gol o el resultado final. */
async function actualizarPanel(m, ctx, partida, texto, menciones = [], { final = false, vigente = () => true } = {}) {
  const tarea = (partida.colaPanel || Promise.resolve()).then(async () => {
    if (partida.errorNotificado || !vigente()) return false
    if (!final && (partida.cerrada || partidas.get(m.chat) !== partida)) return false
    const base = typeof texto === 'function' ? texto() : texto
    const nombres = typeof menciones === 'function' ? menciones() : menciones
    const ranking = final ? [] : rankingDe(partida).slice(0, 10)
    const mentions = [...new Set([...nombres, ...ranking.map(j => j.jid)])]
    const text = final ? base : `${base}\n\n${textoMarcador(partida)}${partida.avisoFijado ? `\n\n${partida.avisoFijado}` : ''}${partida.avisoBotones ? `\n\n${partida.avisoBotones}` : ''}`
    try {
      if (partida.panelKey) {
        await ctx.conn.sendMessage(m.chat, { text, mentions, edit: partida.panelKey })
      } else {
        // sendMessage(text) pasa por setreply y podría transformarse en imagen,
        // documento o carrusel. Crear texto nativo para que SIEMPRE sea editable.
        partida.panelKey = await enviarTexto(ctx.conn, m.chat, text, { mentionedJid: mentions })
      }
      partida.textoPanel = base
      partida.mencionesPanel = nombres
      return true
    } catch (error) {
      await falloPanel(m, ctx, partida, error)
      return false
    }
  })
  partida.colaPanel = tarea
  return tarea
}

async function tablaDe(partida, conn, m) {
  if (!partida.panelKey) return
  return actualizarPanel(m, { conn }, partida, () => partida.textoPanel, () => partida.mencionesPanel || [])
}

/* ─────────────────────────── FIN DE PARTIDA ─────────────────────────── */

async function cerrarPartida(m, ctx, partida, motivo) {
  if (partidas.get(m.chat) !== partida || partida.cerrada) return
  partida.cerrada = true
  const anterior = partida.actual
  partida.actual = null
  partida.aceptando = false
  terminarTimers(partida)
  partidas.delete(m.chat)
  await retirarBotones(m, ctx, anterior)
  await desfijarPanel(m, ctx, partida)
  const ranking = rankingDe(partida)
  if (!ranking.length) {
    return actualizarPanel(m, ctx, partida,
      `⚽ *Partido terminado* (${motivo})\n\nNadie llegó a anotar. 😅\n\nCuando quieras otra: *.futbol*`, [], { final: true })
  }
  const [campeon, ...resto] = ranking
  const lineas = [
    `🏆 *¡FIN DEL PARTIDO!* ${motivo}`, ``,
    `🥇 @${campeon.jid.split('@')[0]} gana con *${campeon.puntos} puntos* (${campeon.aciertos} aciertos de ${partida.total})`,
  ]
  if (resto.length) {
    lineas.push('', '*Resto del marcador:*')
    resto.slice(0, 9).forEach((j, i) => lineas.push(`${medalla(i + 1)} @${j.jid.split('@')[0]} — ${j.puntos} pts`))
  }
  lineas.push('', '⚽ ¿Revancha? *.futbol*')
  return actualizarPanel(m, ctx, partida, lineas.join('\n'), ranking.slice(0, 10).map(j => j.jid), { final: true })
}

function programarSiguiente(m, ctx, partida) {
  if (partidas.get(m.chat) !== partida || partida.cerrada) return
  partida.indice++
  partida.siguiente = setTimeout(() => {
    partida.siguiente = null
    siguientePregunta(m, ctx, partida).catch(error => falloPanel(m, ctx, partida, error))
  }, ESPERA_SIGUIENTE)
}

async function agotarPregunta(m, ctx, partida, actual) {
  if (partidas.get(m.chat) !== partida || partida.actual !== actual || !partida.aceptando) return
  partida.actual = null
  partida.aceptando = false
  terminarTimers(partida)
  await retirarBotones(m, ctx, actual)
  const publicado = await actualizarPanel(m, ctx, partida, [
    '⏰ *¡Se acabó el tiempo!*', '',
    `La respuesta era *${actual.correcta}. ${actual.opciones[LETRAS.indexOf(actual.correcta)]}*`, '',
    partida.indice < partida.total ? 'Siguiente pregunta... ⚽' : 'Calculando el resultado final…',
  ].join('\n'))
  if (publicado) programarSiguiente(m, ctx, partida)
}

async function siguientePregunta(m, ctx, partida) {
  if (partidas.get(m.chat) !== partida || partida.cerrada) return
  if (partida.indice > partida.total) return cerrarPartida(m, ctx, partida, 'se acabaron las preguntas')

  const actual = prepararPregunta(partida.preguntas[partida.indice - 1])
  partida.actual = actual
  partida.avisoBotones = ''
  partida.aceptando = false
  const publicado = await actualizarPanel(m, ctx, partida, textoPregunta(actual, partida.indice, partida.total), [], {
    vigente: () => partida.actual === actual,
  })
  if (!publicado || partidas.get(m.chat) !== partida || partida.actual !== actual || partida.cerrada) return
  await fijarPanel(m, ctx, partida)
  if (partida.cerrada || partidas.get(m.chat) !== partida || partida.actual !== actual) return
  await enviarBotones(m, ctx, partida, actual)
  if (partida.cerrada || partidas.get(m.chat) !== partida || partida.actual !== actual) return
  // El reloj arranca DESPUÉS de enviar/editar, no durante la subida del mensaje.
  actual.preguntadaEn = Date.now()
  partida.aceptando = true
  partida.aviso = setTimeout(() => {
    avisarTiempo(m, ctx, partida, actual).catch(error => console.warn('[futbol] Aviso:', error?.message || error))
  }, (LIMITE_SEGUNDOS - AVISO_EN_SEGUNDOS) * 1000)
  partida.timer = setTimeout(() => {
    agotarPregunta(m, ctx, partida, actual).catch(error => falloPanel(m, ctx, partida, error))
  }, LIMITE_SEGUNDOS * 1000)
}

async function avisarTiempo(m, ctx, partida, actual) {
  if (partidas.get(m.chat) !== partida || partida.actual !== actual || !partida.aceptando || actual.avisoEnviado) return
  actual.avisoEnviado = true
  const contextInfo = {
    stanzaId: partida.panelKey.id,
    quotedMessage: { extendedTextMessage: { text: partida.textoPanel } },
  }
  const botJid = ctx.conn.user?.jid || ctx.conn.user?.id
  if (botJid) contextInfo.participant = botJid
  actual.avisoKey = await enviarTexto(ctx.conn, m.chat,
    `⏳⚽ ¡Quedan *${AVISO_EN_SEGUNDOS} segundos* para la pregunta ${partida.indice}/${partida.total}!\nPulsa los botones de esta pregunta o responde al panel con *a, b, c o d*. Máximo *2 intentos*.`, contextInfo)
}

/* ─────────────────────────── RESPUESTA SIN PREFIJO ─────────────────────────── */

async function responder(m, ctx, partida, entrada) {
  const actual = partida.actual
  if (!actual || !partida.aceptando || partida.cerrada || partidas.get(m.chat) !== partida) return
  if (!m.isGroup || !mismaConexion(ctx.conn, partida.conn) || !m.sender) return
  const boton = botonDe(m)
  if (boton) {
    if (boton.sesion !== partida.id || boton.ronda !== actual.id) return
    const quoted = citaDe(m)
    if (quoted.chat && quoted.chat !== m.chat) return
    if (quoted.id && ![actual.botonesKey?.id, partida.panelKey?.id, actual.avisoKey?.id].includes(quoted.id)) return
  } else {
    const quoted = citaDe(m)
    const permitidas = [partida.panelKey?.id, actual.avisoKey?.id, actual.botonesKey?.id].filter(Boolean)
    if (!quoted.id || !permitidas.includes(quoted.id)) return
    if (quoted.chat && quoted.chat !== m.chat) return
  }
  if (Date.now() - actual.preguntadaEn >= LIMITE_SEGUNDOS * 1000) {
    return agotarPregunta(m, ctx, partida, actual)
  }
  const jugador = m.sender
  const texto = boton?.letra || String(entrada || '').trim()
  if (/^[#!./]/.test(texto)) return
  const letra = /^[a-d]$/i.exec(texto)
  let elegida
  if (letra) elegida = letra[0].toUpperCase()
  else {
    const buscado = normalizar(texto)
    if (buscado.length < 3) return
    const i = actual.opciones.findIndex(op => normalizar(op) === buscado)
    if (i < 0) return
    elegida = LETRAS[i]
  }
  // Un mismo evento reenviado por Baileys nunca consume dos oportunidades.
  const messageId = m.key?.id || m.id
  const evento = messageId ? `${jugador}:${messageId}` : null
  if (evento && actual.mensajes.has(evento)) return
  if (evento) actual.mensajes.add(evento)
  const usados = actual.intentos.get(jugador) || 0
  if (usados >= MAX_INTENTOS) {
    await reaccionar(m, ctx.conn, '🚫')
    return
  }
  actual.intentos.set(jugador, usados + 1)
  const j = (partida.jugadores[jugador] ||= {
    nombre: nombreDe(ctx.conn, m), puntos: 0, aciertos: 0, fallos: 0,
  })
  if (elegida !== actual.correcta) {
    j.fallos++
    await reaccionar(m, ctx.conn, usados + 1 === MAX_INTENTOS ? '🚫' : '❌')
    return
  }
  // Cerrar la ronda antes del primer await: solo un ganador por pregunta.
  partida.actual = null
  partida.aceptando = false
  terminarTimers(partida)
  const segundos = (Date.now() - actual.preguntadaEn) / 1000
  const ganados = puntosPor(segundos)
  j.puntos += ganados
  j.aciertos++
  await retirarBotones(m, ctx, actual)
  await reaccionar(m, ctx.conn, '✅')
  const publicado = await actualizarPanel(m, ctx, partida, [
    `⚽🎉 *¡GOL de @${jugador.split('@')[0]}!*`, '',
    `✅ ${actual.correcta}. ${actual.opciones[LETRAS.indexOf(actual.correcta)]}`,
    `⚡ ${segundos.toFixed(1)}s → *+${ganados} puntos* (total: ${j.puntos})`, '',
    partida.indice < partida.total ? 'Siguiente...' : 'Calculando el resultado final…',
  ].join('\n'), [jugador])
  if (publicado) programarSiguiente(m, ctx, partida)
}

/* ─────────────────────────── HANDLER ─────────────────────────── */

let handler = async (m, ctx) => {
  const { conn, command, args } = ctx
  const partida = partidas.get(m.chat)
  // El registro es compartido por los subbots, pero solo el socket creador
  // puede editar su mensaje o controlar esta partida.
  if (partida && !mismaConexion(partida.conn, conn)) return

  if (command === 'marcador' || command === 'tabla') {
    if (!partida) return conn.reply(m.chat, '⚽ No hay ningún partido en juego.\n\nArranca uno con *.futbol*')
    return tablaDe(partida, conn, m)
  }
  if (command === 'terminar' || command === 'finpartido') {
    if (!partida) return conn.reply(m.chat, '⚽ No hay ningún partido en juego.')
    return cerrarPartida(m, ctx, partida, 'lo cortaron')
  }
  if (['futbol', 'futbolito', 'adivinafutbol', 'adivinajugador', 'quienjugador', 'trivalfutbol'].includes(command)) {
    if (partida) {
      // Un segundo .futbol refresca el panel, no abre ni anuncia otra partida.
      return tablaDe(partida, conn, m)
    }
    let total = parseInt(args?.[0], 10)
    if (!Number.isFinite(total) || total < 1) total = 10
    total = Math.min(total, MAX_PREGUNTAS, BANCO.length)
    const nueva = {
      id: randomBytes(8).toString('hex'),
      preguntas: barajar(BANCO).slice(0, total), total, indice: 1,
      actual: null, jugadores: {}, creador: m.sender, conn, responder,
      timer: null, aviso: null, siguiente: null,
      panelKey: null, colaPanel: Promise.resolve(), cerrada: false, aceptando: false,
    }
    partidas.set(m.chat, nueva)
    try {
      await reaccionar(m, conn, '⚽')
      await conn.reply(m.chat, [
        '⚽🏆 *¡ARRANCA ADIVINA EL JUGADOR!*', '',
        `🎯 ${total} preguntas sobre los grandes del fútbol`,
        `⏱️ ${LIMITE_SEGUNDOS} segundos por pregunta`,
        '🎮 Pulsa los botones *A*, *B*, *C* o *D* de cada pregunta.',
        '🎯 Tienes *2 intentos por pregunta*. Gana el primero que acierte.',
        '✍️ Si no ves los botones, usa *Responder* sobre el panel con a/b/c/d, sin prefijo.',
        'También puedes responder con el texto exacto de la opción.',
        '🔄 El panel se edita; la tarjeta de botones se retira al terminar cada pregunta.',
        '📌 Intentaré fijarlo en el grupo y lo desfijaré al terminar.',
        '⏳ Enviaré un aviso aparte cuando queden 10 segundos.',
        '✅ Acierto · ❌ Te queda 1 intento · 🚫 Sin intentos hasta la próxima pregunta.',
        `🎁 ${PUNTOS_BASE} puntos + hasta ${PUNTOS_BONUS} de bonus por rapidez`, '',
        '📊 *.marcador* actualiza el panel · ⏹️ *.terminar* para cortar', '',
        '¡Vamos con la primera! 🔥',
      ].join('\n'))
      return await siguientePregunta(m, ctx, nueva)
    } catch (error) {
      return falloPanel(m, ctx, nueva, error)
    }
  }
  return conn.reply(m.chat, [
    '⚽ *ADIVINA EL JUGADOR*', '',
    `Trivial de fútbol con 4 opciones y ${LIMITE_SEGUNDOS} segundos por pregunta.`, '',
    '*.futbol* — partida de 10 preguntas',
    `*.futbol 15* — partida de 15 (máx. ${MAX_PREGUNTAS})`,
    'Pulsa A/B/C/D en la tarjeta interactiva. Tienes 2 intentos por pregunta.',
    'Si no ves los botones, responde al mensaje del panel con a/b/c/d, sin prefijo.',
    'Las preguntas y el resultado se editan en el panel fijado.',
    'A los 10 segundos restantes llega un aviso aparte. ✅ Acierto · ❌ Queda 1 intento · 🚫 Sin intentos.',
    '*.marcador* — actualiza la tabla en el panel',
    '*.terminar* — cortar y ver al ganador', '',
    `${BANCO.length} preguntas sobre grandes del fútbol. 🌍`,
  ].join('\n'))
}

handler.help = ['futbol [preguntas]', 'marcador', 'terminar']
handler.tags = ['game']
// Las respuestas llegan por el hook before del plugin de respuestas, no
// como comandos: .c y .d siguen perteneciendo a gacha y economía.
handler.command = ['futbol', 'futbolito', 'adivinafutbol', 'adivinajugador', 'quienjugador', 'trivalfutbol', 'marcador', 'terminar', 'finpartido', 'futbolayuda']
handler.group = true

export { BANCO, partidas, barajar, normalizar, prepararPregunta, puntosPor, textoPregunta, siguientePregunta, cerrarPartida, responder, citaDe, botonDe, MAX_INTENTOS, LIMITE_SEGUNDOS, PUNTOS_BASE, PUNTOS_BONUS, MAX_PREGUNTAS }
export default handler
