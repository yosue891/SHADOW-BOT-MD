import { randomBytes } from 'node:crypto'


const LIMITE_SEGUNDOS = 40
const AVISO_EN_SEGUNDOS = 10
const PUNTOS_BASE = 100
const PUNTOS_BONUS = 40
const ESPERA_SIGUIENTE = 2500
const MAX_PREGUNTAS = 20
const MAX_PREGUNTAS_DUELO = 7
const INVITACION_SEGUNDOS = 60
const LETRAS = ['A', 'B', 'C', 'D']


const BANCO = [
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

  { cat: 'Apodos', q: '¿A qué jugador llaman "El Bicho"?', o: ['Cristiano Ronaldo', 'Lionel Messi', 'Neymar', 'Mbappé'], ok: 0 },
  { cat: 'Apodos', q: '¿Quién es "O Fenômeno"?', o: ['Ronaldo Nazário', 'Ronaldinho', 'Rivaldo', 'Romário'], ok: 0 },
  { cat: 'Apodos', q: '¿A qué jugador conocían como "El Pibe de Oro"?', o: ['Diego Maradona', 'Lionel Messi', 'Juan Román Riquelme', 'Gabriel Batistuta'], ok: 0 },
  { cat: 'Apodos', q: '¿Qué portero era "La Araña Negra"?', o: ['Lev Yashin', 'Gianluigi Buffon', 'Iker Casillas', 'Oliver Kahn'], ok: 0 },
  { cat: 'Apodos', q: '¿Quién era "El Kaiser"?', o: ['Franz Beckenbauer', 'Gerd Müller', 'Lothar Matthäus', 'Karl-Heinz Rummenigge'], ok: 0 },

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

  { cat: 'Mundiales', q: '¿Qué selección ganó el Mundial de Qatar 2022?', o: ['Argentina', 'Francia', 'Brasil', 'Croacia'], ok: 0 },
  { cat: 'Mundiales', q: '¿Dónde se jugó la final del Mundial 2010 que ganó España?', o: ['Sudáfrica', 'Brasil', 'Alemania', 'Qatar'], ok: 0 },
  { cat: 'Mundiales', q: '¿Quién anotó el gol de España en la final del Mundial 2010?', o: ['Andrés Iniesta', 'David Villa', 'Cesc Fàbregas', 'Fernando Torres'], ok: 0 },
  { cat: 'Mundiales', q: '¿Qué selección ganó el Mundial de Rusia 2018?', o: ['Francia', 'Croacia', 'Bélgica', 'Inglaterra'], ok: 0 },
  { cat: 'Mundiales', q: '¿Qué selección organizó y ganó el Mundial de 1998?', o: ['Francia', 'Brasil', 'Italia', 'Alemania'], ok: 0 },
  { cat: 'Mundiales', q: '¿En qué estadio se definió el Mundial 2014 que ganó Alemania?', o: ['Maracaná', 'Wembley', 'Estadio Azteca', 'Allianz Arena'], ok: 0 },
  { cat: 'Mundiales', q: '¿Quién anotó el único gol de la final del Mundial 2026?', o: ['Ferran Torres', 'Nico Williams', 'Lamine Yamal', 'Rodri'], ok: 0 },
  { cat: 'Mundiales', q: '¿A qué selección venció España en la final del Mundial 2026?', o: ['Argentina', 'Francia', 'Brasil', 'Inglaterra'], ok: 0 },

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

function textoDeRespuesta(m) {
  let message = m.message || {}
  for (let i = 0; i < 5; i++) {
    const inner = message.ephemeralMessage?.message || message.viewOnceMessage?.message || message.viewOnceMessageV2?.message
    if (!inner) break
    message = inner
  }
  if (message.interactiveResponseMessage || message.buttonsResponseMessage || message.templateButtonReplyMessage
    || m.msg?.nativeFlowResponseMessage || m.msg?.selectedButtonId || m.msg?.selectedId
    || ['interactiveResponseMessage', 'buttonsResponseMessage', 'templateButtonReplyMessage'].includes(m.mtype)) return ''
  const texto = m.text || m.body || message.conversation || message.extendedTextMessage?.text || m.msg?.text
  return typeof texto === 'string' ? texto.trim() : ''
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

function normalizarIdentidad(value) {
  if (typeof value !== 'string') return ''
  const jid = value.replace(/:\d+@/, '@').replace(/@c\.us$/, '@s.whatsapp.net')
  if (/^\d+@(s\.whatsapp\.net|lid)$/.test(jid)) return jid
  return /^\+?\d+$/.test(jid) ? `${jid.replace('+', '')}@s.whatsapp.net` : ''
}

function identidades(persona) {
  return [...new Set([persona?.id, persona?.jid, persona?.lid, persona?.phoneNumber, persona?.pn, persona?.phone]
    .map(normalizarIdentidad).filter(Boolean))]
}

function identidadesMensaje(m) {
  return [m.sender, m.participant, m.key?.participant, m.key?.participantAlt]
    .map(normalizarIdentidad).filter(Boolean)
}

function equipoDe(partida, m) {
  const ids = identidadesMensaje(m)
  return partida.equipos?.find(e => e.ids.some(id => ids.includes(id)))
}

function textoEquipos(partida) {
  return partida.equipos.map(e => `${e.color} *Equipo ${e.nombre}:* @${e.jid.split('@')[0]}`).join('\n')
}

function textoInvitacion(partida) {
  return [
    '⚽ *¡DESAFÍO DE FÚTBOL!*', '', textoEquipos(partida), '',
    `🎯 ${partida.total} preguntas · 40 segundos por pregunta`,
    'Cada jugador tiene 1 intento por pregunta. El primer acierto suma 1 punto.',
    'Si fallas, el rival todavía puede contestar. Gana quien consiga más aciertos.', '',
    `🔴 @${partida.equipos[1].jid.split('@')[0]}, escribe *acepto* o *rechazo* sin prefijo.`,
    `⏳ La invitación vence en ${INVITACION_SEGUNDOS} segundos.`,
    '🔵 Quien invita puede escribir *cancelar*.',
  ].join('\n')
}

async function editarInvitacion(m, ctx, partida, text) {
  const mentions = partida.equipos.map(e => e.jid)
  try {
    await ctx.conn.sendMessage(m.chat, { text, mentions, edit: partida.invitacionKey })
  } catch (error) {
    console.warn('[futbol] No se pudo editar la invitación:', error?.message || error)
    await ctx.conn.reply(m.chat, text, null, { mentions })
  }
}

async function cancelarInvitacion(m, ctx, partida, motivo) {
  if (partidas.get(m.chat) !== partida || partida.fase !== 'pendiente') return
  partida.fase = 'cerrada'
  partida.cerrada = true
  terminarTimers(partida)
  partidas.delete(m.chat)
  try { await editarInvitacion(m, ctx, partida, `⚽ *Invitación ${motivo}*\n\n${textoEquipos(partida)}\n\nPuedes crear otro duelo con *.futbol @persona*.`) }
  catch (error) { console.warn('[futbol] Invitación:', error?.message || error) }
}

async function procesarInvitacion(m, ctx, partida, entrada) {
  if (!m.isGroup || partida.fase !== 'pendiente' || !partida.invitacionKey || !mismaConexion(ctx.conn, partida.conn)) return
  if (partidas.get(m.chat) !== partida) return
  const quoted = citaDe(m)
  if (quoted.id && quoted.id !== partida.invitacionKey.id) return
  if (quoted.chat && quoted.chat !== m.chat) return
  const accion = String(entrada || '').trim().toLowerCase()
  const equipo = equipoDe(partida, m)
  if (accion === 'cancelar' && (equipo?.nombre === 'Azul' || ctx.isAdmin || ctx.isOwner)) {
    return cancelarInvitacion(m, ctx, partida, 'cancelada')
  }
  if (equipo?.nombre !== 'Rojo' || !['acepto', 'rechazo'].includes(accion)) return
  if (Date.now() >= partida.expiraInvitacion) return cancelarInvitacion(m, ctx, partida, 'vencida')
  if (accion === 'rechazo') return cancelarInvitacion(m, ctx, partida, 'rechazada')
  partida.fase = 'jugando'
  terminarTimers(partida)
  try {
    await reaccionar(m, ctx.conn, '🤝')
    await editarInvitacion(m, ctx, partida, [
      '⚽ *¡DUELO ACEPTADO!*', '', textoEquipos(partida), '',
      `🎯 ${partida.total} preguntas · 1 punto por acierto · 1 intento por pregunta`,
      'Solo juegan los dos equipos. Escriban a/b/c/d o el texto de la opción, sin prefijo ni citar.',
      '❌ Un fallo agota tu intento en esa pregunta. 🚫 Espera a la siguiente.',
      'En caso de igualdad de aciertos, el resultado será empate.',
    ].join('\n'))
    if (partidas.get(m.chat) === partida && !partida.cerrada) await siguientePregunta(m, ctx, partida)
  } catch (error) { await falloPanel(m, ctx, partida, error) }
}

async function invitarDuelo(m, ctx) {
  const mentions = [...new Set((m.mentionedJid || []).map(normalizarIdentidad).filter(Boolean))]
  if (mentions.length !== 1) return ctx.conn.reply(m.chat, '⚽ Menciona a una sola persona: *.futbol @persona* (o *.futbol @persona 5*).')
  const participantes = (ctx.participants?.length ? ctx.participants : ctx.groupMetadata?.participants) || []
  const rival = participantes.find(p => identidades(p).includes(mentions[0]))
  if (!rival) return ctx.conn.reply(m.chat, '⚽ No pude verificar que la persona mencionada pertenezca al grupo. Menciona a un miembro del grupo.')
  const propios = identidadesMensaje(m)
  const autor = participantes.find(p => identidades(p).some(id => propios.includes(id)))
  const azulIds = [...new Set([...propios, ...identidades(autor)])]
  const rojoIds = [...new Set([mentions[0], ...identidades(rival)])]
  if (azulIds.some(id => rojoIds.includes(id))) return ctx.conn.reply(m.chat, '⚽ No puedes desafiarte a ti mismo. Menciona a otra persona.')
  if (identidades(ctx.conn.user).some(id => rojoIds.includes(id))) return ctx.conn.reply(m.chat, '🤖 No puedo aceptar desafíos. Menciona a otro jugador del grupo.')
  const cantidad = (ctx.args || []).find(arg => /^\d+$/.test(arg))
  const total = Math.min(Math.max(Number(cantidad) || MAX_PREGUNTAS_DUELO, 1), MAX_PREGUNTAS_DUELO, BANCO.length)
  const equipos = [
    { jid: normalizarIdentidad(m.sender), ids: azulIds, nombre: 'Azul', color: '🔵' },
    { jid: mentions[0], ids: rojoIds, nombre: 'Rojo', color: '🔴' },
  ]
  const nueva = {
    duelo: true, fase: 'pendiente', equipos, total, indice: 1,
    preguntas: barajar(BANCO).slice(0, total), actual: null,
    jugadores: Object.fromEntries(equipos.map(e => [e.jid, { nombre: e.nombre, puntos: 0, aciertos: 0, fallos: 0 }])),
    creador: m.sender, conn: ctx.conn, responder, procesarInvitacion,
    timer: null, aviso: null, siguiente: null, timerInvitacion: null,
    panelKey: null, colaPanel: Promise.resolve(), cerrada: false, aceptando: false,
  }
  partidas.set(m.chat, nueva)
  try {
    nueva.invitacionKey = await enviarTexto(ctx.conn, m.chat, textoInvitacion(nueva), { mentionedJid: equipos.map(e => e.jid) })
    nueva.expiraInvitacion = Date.now() + INVITACION_SEGUNDOS * 1000
    if (partidas.get(m.chat) !== nueva || nueva.cerrada) return
    nueva.timerInvitacion = setTimeout(() => {
      cancelarInvitacion(m, ctx, nueva, 'vencida').catch(error => console.warn('[futbol] Invitación:', error?.message || error))
    }, INVITACION_SEGUNDOS * 1000)
    await reaccionar(m, ctx.conn, '⚔️')
  } catch (error) { await falloPanel(m, ctx, nueva, error) }
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

function prepararPregunta(ficha) {
  const opciones = barajar(ficha.o)
  return {
    ficha,
    opciones,
    correcta: LETRAS[opciones.indexOf(ficha.o[ficha.ok])],
    preguntadaEn: Date.now(),
    intentos: new Map(),
    mensajes: new Set(),
  }
}

function textoPregunta(p, indice, total, partida) {
  return [
    `⚽ *ADIVINA EL JUGADOR* — pregunta ${indice}/${total}`,
    ``, `🏷️ ${p.ficha.cat}`, `❓ *${p.ficha.q}*`, ``,
    ...p.opciones.map((op, i) => `${LETRAS[i]}. ${op}`),
    ``, `⏱️ *${LIMITE_SEGUNDOS} segundos*`,
    `✍️ Escribe *a, b, c o d* (o el texto de la opción) directamente en el grupo. *Sin prefijo ni citar mensajes.*`,
    partida?.duelo ? '🎯 1 punto para el primer equipo que acierte.' : `🎯 ${PUNTOS_BASE} pts + hasta ${PUNTOS_BONUS} de bonus por rapidez`,
    partida?.duelo ? '🔵 vs 🔴 · *1 intento por jugador en esta pregunta.* Si fallas, el rival puede responder.' : '🥇 Gana el primero que acierte. *Intentos ilimitados por jugador mientras la pregunta esté activa.*',
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
  if (partida.duelo) return ['📊 *MARCADOR DEL DUELO*', ...partida.equipos.map(e => {
    const j = partida.jugadores[e.jid]
    return `${e.color} *${e.nombre}* @${e.jid.split('@')[0]} — *${j.aciertos} aciertos* · ${j.fallos} fallos`
  })].join('\n')
  const ranking = rankingDe(partida).slice(0, 10)
  return ranking.length ? [
    '📊 *MARCADOR*',
    ...ranking.map((j, i) => `${medalla(i)} @${j.jid.split('@')[0]} — *${j.puntos} pts* (${j.aciertos} ✅ / ${j.fallos} ❌)`),
  ].join('\n') : '📊 Nadie ha sumado puntos todavía.'
}

function terminarTimers(partida) {
  for (const key of ['timer', 'aviso', 'siguiente', 'timerInvitacion']) {
    if (partida[key]) clearTimeout(partida[key])
    partida[key] = null
  }
}

async function falloPanel(m, ctx, partida, error) {
  if (partida.errorNotificado) return
  partida.errorNotificado = true
  partida.cerrada = true
  partida.actual = null
  partida.aceptando = false
  terminarTimers(partida)
  await desfijarPanel(m, ctx, partida)
  if (partidas.get(m.chat) === partida) partidas.delete(m.chat)
  console.error('[futbol] No se pudo actualizar el panel:', error?.message || error)
  try {
    await ctx.conn.reply(m.chat, '⚠️ No pude actualizar el mensaje de fútbol. La partida se detuvo para evitar mensajes repetidos. Puedes iniciar otra con .futbol.')
  } catch {}
}

async function actualizarPanel(m, ctx, partida, texto, menciones = [], { final = false, vigente = () => true } = {}) {
  const tarea = (partida.colaPanel || Promise.resolve()).then(async () => {
    if (partida.errorNotificado || !vigente()) return false
    if (!final && (partida.cerrada || partidas.get(m.chat) !== partida)) return false
    const base = typeof texto === 'function' ? texto() : texto
    const nombres = typeof menciones === 'function' ? menciones() : menciones
    const ranking = final ? [] : rankingDe(partida).slice(0, 10)
    const mentions = [...new Set([...nombres, ...ranking.map(j => j.jid)])]
    const text = final ? base : `${base}\n\n${textoMarcador(partida)}${partida.avisoFijado ? `\n\n${partida.avisoFijado}` : ''}`
    try {
      if (partida.panelKey) {
        await ctx.conn.sendMessage(m.chat, { text, mentions, edit: partida.panelKey })
      } else {
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


async function cerrarPartida(m, ctx, partida, motivo) {
  if (partidas.get(m.chat) !== partida || partida.cerrada) return
  if (partida.fase === 'pendiente') return cancelarInvitacion(m, ctx, partida, 'cancelada')
  partida.cerrada = true
  partida.actual = null
  partida.aceptando = false
  terminarTimers(partida)
  partidas.delete(m.chat)
  await desfijarPanel(m, ctx, partida)
  if (partida.duelo) {
    const [azul, rojo] = partida.equipos
    const a = partida.jugadores[azul.jid].aciertos
    const r = partida.jugadores[rojo.jid].aciertos
    const terminado = motivo === 'se acabaron las preguntas'
    const ganador = a > r ? azul : rojo
    const resultado = !terminado ? '⏹️ Duelo cancelado: marcador parcial, sin ganador.'
      : a === r ? `🤝 *¡EMPATE!* ${a}–${r}`
      : `🏆 *¡GANA EL EQUIPO ${ganador.nombre.toUpperCase()}!* ${ganador.color} @${ganador.jid.split('@')[0]}`
    return actualizarPanel(m, ctx, partida, [
      terminado ? '⚽ *¡FIN DEL DUELO!*' : '⚽ *DUELO CANCELADO*', '', resultado, '',
      textoMarcador(partida), '', '⚽ ¿Revancha? *.futbol @persona*',
    ].join('\n'), partida.equipos.map(e => e.jid), { final: true })
  }
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

async function agotarPregunta(m, ctx, partida, actual, aviso = '⏰ *¡Se acabó el tiempo!*') {
  if (partidas.get(m.chat) !== partida || partida.actual !== actual || !partida.aceptando) return
  partida.actual = null
  partida.aceptando = false
  terminarTimers(partida)
  const publicado = await actualizarPanel(m, ctx, partida, [
    aviso, '',
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
  partida.aceptando = false
  const publicado = await actualizarPanel(m, ctx, partida, textoPregunta(actual, partida.indice, partida.total, partida), [], {
    vigente: () => partida.actual === actual,
  })
  if (!publicado || partidas.get(m.chat) !== partida || partida.actual !== actual || partida.cerrada) return
  await fijarPanel(m, ctx, partida)
  if (partida.cerrada || partidas.get(m.chat) !== partida || partida.actual !== actual) return
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
    `⏳⚽ ¡Quedan *${AVISO_EN_SEGUNDOS} segundos* para la pregunta ${partida.indice}/${partida.total}!\nEscribe *a, b, c o d* directamente en el grupo, *sin prefijo ni citar*. ${partida.duelo ? '*Un intento por equipo* en esta pregunta.' : '*Intentos ilimitados* hasta que termine la pregunta.'}`, contextInfo)
}


async function responder(m, ctx, partida, entrada) {
  const actual = partida.actual
  if (!actual || !partida.aceptando || partida.cerrada || partidas.get(m.chat) !== partida) return
  if (!m.isGroup || !mismaConexion(ctx.conn, partida.conn) || !m.sender) return
  const quoted = citaDe(m)
  const permitidas = [partida.panelKey?.id, actual.avisoKey?.id].filter(Boolean)
  if (quoted.id && !permitidas.includes(quoted.id)) return
  if (quoted.chat && quoted.chat !== m.chat) return
  if (Date.now() - actual.preguntadaEn >= LIMITE_SEGUNDOS * 1000) {
    return agotarPregunta(m, ctx, partida, actual)
  }
  const equipo = partida.duelo ? equipoDe(partida, m) : null
  if (partida.duelo && !equipo) return
  const jugador = equipo?.jid || m.sender
  const texto = String(entrada || '').trim()
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
  const messageId = m.key?.id || m.id
  const evento = messageId ? `${jugador}:${messageId}` : null
  if (evento && actual.mensajes.has(evento)) return
  if (evento) actual.mensajes.add(evento)
  const usados = actual.intentos.get(jugador) || 0
  if (partida.duelo && usados >= 1) {
    await reaccionar(m, ctx.conn, '🚫')
    return
  }
  actual.intentos.set(jugador, usados + 1)
  const j = (partida.jugadores[jugador] ||= {
    nombre: nombreDe(ctx.conn, m), puntos: 0, aciertos: 0, fallos: 0,
  })
  if (elegida !== actual.correcta) {
    j.fallos++
    const ambosFallaron = partida.duelo && partida.equipos.every(e => (actual.intentos.get(e.jid) || 0) >= 1)
    if (ambosFallaron) {
      await Promise.all([
        reaccionar(m, ctx.conn, '❌'),
        agotarPregunta(m, ctx, partida, actual, '❌ *Los dos equipos fallaron. Nadie suma en esta pregunta.*'),
      ])
    } else await reaccionar(m, ctx.conn, '❌')
    return
  }
  partida.actual = null
  partida.aceptando = false
  terminarTimers(partida)
  const segundos = (Date.now() - actual.preguntadaEn) / 1000
  const ganados = partida.duelo ? 1 : puntosPor(segundos)
  j.puntos += ganados
  j.aciertos++
  await reaccionar(m, ctx.conn, '✅')
  const publicado = await actualizarPanel(m, ctx, partida, [
    `${equipo ? `${equipo.color} ` : ''}⚽🎉 *¡GOL de @${jugador.split('@')[0]}!*`, '',
    `✅ ${actual.correcta}. ${actual.opciones[LETRAS.indexOf(actual.correcta)]}`,
    partida.duelo ? `✅ *+1 acierto para el equipo ${equipo.nombre}* (total: ${j.aciertos})` : `⚡ ${segundos.toFixed(1)}s → *+${ganados} puntos* (total: ${j.puntos})`, '',
    partida.indice < partida.total ? 'Siguiente...' : 'Calculando el resultado final…',
  ].join('\n'), [jugador])
  if (publicado) programarSiguiente(m, ctx, partida)
}


let handler = async (m, ctx) => {
  const { conn, command, args } = ctx
  const partida = partidas.get(m.chat)
  if (partida && !mismaConexion(partida.conn, conn)) return

  if (command === 'marcador' || command === 'tabla') {
    if (!partida) return conn.reply(m.chat, '⚽ No hay ningún partido en juego.\n\nArranca uno con *.futbol*')
    return tablaDe(partida, conn, m)
  }
  if (command === 'terminar' || command === 'finpartido') {
    if (!partida) return conn.reply(m.chat, '⚽ No hay ningún partido en juego.')
    if (partida.duelo && !equipoDe(partida, m) && !(ctx.isAdmin || ctx.isOwner)) return
    return cerrarPartida(m, ctx, partida, 'lo cortaron')
  }
  if (['futbol', 'futbolito', 'adivinafutbol', 'adivinajugador', 'quienjugador', 'trivalfutbol'].includes(command)) {
    if (partida) {
      if (partida.fase === 'pendiente' && partida.invitacionKey) return editarInvitacion(m, ctx, partida, textoInvitacion(partida))
      return tablaDe(partida, conn, m)
    }
    if (m.mentionedJid?.length) return invitarDuelo(m, ctx)
    let total = parseInt(args?.[0], 10)
    if (!Number.isFinite(total) || total < 1) total = 10
    total = Math.min(total, MAX_PREGUNTAS, BANCO.length)
    const nueva = {
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
        '✍️ Escribe *a*, *b*, *c* o *d* directamente en el grupo.',
        '🎯 Tienes *intentos ilimitados* mientras la pregunta esté activa. Gana el primero que acierte.',
        'No necesitas prefijo, botones ni citar ningún mensaje.',
        'También puedes responder con el texto exacto de la opción.',
        '🔄 El mismo panel se irá editando durante la partida.',
        '📌 Intentaré fijarlo en el grupo y lo desfijaré al terminar.',
        '⏳ Enviaré un aviso aparte cuando queden 10 segundos.',
        '✅ Acierto · ❌ Fallo: puedes volver a intentar.',
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
    '*.futbol @persona* — duelo azul vs rojo de 7 preguntas',
    '*.futbol @persona 5* — duelo de 5 preguntas (máximo 7)',
    'El rival debe escribir acepto o rechazo en 60 segundos. Un intento por pregunta y 1 punto por acierto; empate si igualan.',
    '*.futbol* — juego grupal de 10 preguntas',
    `*.futbol 15* — partida de 15 (máx. ${MAX_PREGUNTAS})`,
    'Escribe a/b/c/d o el texto exacto de la opción directamente en el grupo.',
    'Sin prefijo ni citar mensajes. En el juego grupal hay intentos ilimitados; en el duelo, uno por pregunta.',
    'Las preguntas y el resultado se editan en el panel fijado.',
    'A los 10 segundos restantes llega un aviso aparte. ✅ Acierto · ❌ Puedes volver a intentar.',
    '*.marcador* — actualiza la tabla en el panel',
    '*.terminar* — cortar y ver al ganador', '',
    `${BANCO.length} preguntas sobre grandes del fútbol. 🌍`,
  ].join('\n'))
}

handler.help = ['futbol @persona [preguntas]', 'futbol [preguntas]', 'marcador', 'terminar']
handler.tags = ['game']
handler.command = ['futbol', 'futbolito', 'adivinafutbol', 'adivinajugador', 'quienjugador', 'trivalfutbol', 'marcador', 'terminar', 'finpartido', 'futbolayuda']
handler.group = true

export { BANCO, partidas, barajar, normalizar, prepararPregunta, puntosPor, textoPregunta, siguientePregunta, cerrarPartida, responder, citaDe, textoDeRespuesta, procesarInvitacion, MAX_PREGUNTAS_DUELO, INVITACION_SEGUNDOS, LIMITE_SEGUNDOS, PUNTOS_BASE, PUNTOS_BONUS, MAX_PREGUNTAS }
export default handler
