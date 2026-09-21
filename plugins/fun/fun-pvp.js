let handler = async (m, { conn, command }) => {
  conn.suit = conn.suit ? conn.suit : {}

  // Crear nueva sala de PVP
  if (command === 'pvp' || command === 'ppt') {
    let partnerId = null
    if (m.mentionedJid && m.mentionedJid.length > 0) partnerId = m.mentionedJid[0]
    else if (m.quoted) partnerId = m.quoted.sender
    if (!partnerId) return m.reply('☽ Debes mencionar o responder a alguien para iniciar el duelo.')

    let id = 'suit_' + new Date() * 1
    conn.suit[id] = {
      id,
      p: m.sender,
      p2: partnerId,
      status: 'wait',
      poin: 100,
      poin_lose: 50,
      poin_bot: 20,
      timeout: 60000
    }

    conn.sendMessage(m.chat, {
      text: `☽ 『 Shadow Garden 』 ☽

@${m.sender.split('@')[0]} ha retado a @${partnerId.split('@')[0]} a un duelo de Piedra, Papel o Tijera.

Responde con "aceptar" o "rechazar".`,
      mentions: [m.sender, partnerId]
    }, { quoted: m })
  }
}

handler.before = async function (m) {
  this.suit = this.suit ? this.suit : {}

  // Normalizador de elección (corrige variantes y errores comunes)
  const normalizeChoice = (txt) => {
    if (!txt) return null
    // quitar prefijos como . o ! y espacios extras
    let t = txt.trim().toLowerCase().replace(/^[^\wñ]+/, '').replace(/\s+/g, ' ')
    // quitar acentos
    t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // mapas de sinónimos/errores y emojis
    const map = [
      { key: 'piedra', match: /\b(piedra|pierda|pierde|piedro|roca|piedrita|🪨|💎)\b/ },
      { key: 'papel',  match: /\b(papel|papeles|hoja|folio|cuartilla|📄|🧻)\b/ },
      { key: 'tijera', match: /\b(tijera|tijeras|tiseras|corte|✂️|✂)\b/ }
    ]
    for (const m of map) if (m.match.test(t)) return m.key
    // también aceptar exactos
    if (['piedra', 'papel', 'tijera'].includes(t)) return t
    return null
  }

  let room = Object.values(this.suit).find(room => room.id && room.status && [room.p, room.p2].includes(m.sender))
  if (!room) return

  let win = ''
  let tie = false

  // Aceptar/Rechazar
  if (
    m.sender == room.p2 &&
    /^(aceptar|rechazar)$/i.test(m.text) &&
    m.isGroup &&
    room.status == 'wait'
  ) {
    if (/^rechazar$/i.test(m.text)) {
      const textno = `☽ 『 Shadow Garden 』 ☽

@${room.p2.split`@`[0]} rechazó el duelo.`
      m.reply(textno, null, { mentions: [room.p2] })
      delete this.suit[room.id]
      return !0
    }
    room.status = 'play'
    room.asal = m.chat
    clearTimeout(room.waktu)

    const textplay = `☽ 『 Shadow Garden 』 ☽

🎮 El duelo comienza.

Opciones enviadas a los chats privados de @${room.p.split`@`[0]} y @${room.p2.split`@`[0]}.

Elige: Piedra, Papel o Tijera (se aceptan variantes como "pierde", "tijeras", "hoja" y emojis 🪨📄✂️).`
    m.reply(textplay, m.chat, { mentions: [room.p, room.p2] })

    const opciones = `🌙 『 Shadow Garden 』 🌙
Selecciona una opción:

✨ Piedra
✨ Papel
✨ Tijera

Responde con tu elección (variante o emoji también sirve).`
    if (!room.pilih) this.sendMessage(room.p, { text: opciones })
    if (!room.pilih2) this.sendMessage(room.p2, { text: opciones })
  }

  // Elecciones (privados)
  if (m.sender == room.p && !room.pilih && !m.isGroup) {
    const choice = normalizeChoice(m.text)
    if (!choice) return m.reply('☽ No entendí tu elección. Usa Piedra, Papel o Tijera (también acepto variantes y emojis).')
    room.pilih = choice
    room.text = m.text
    m.reply(`☽ Elegiste: ${choice.toUpperCase()}.`)
  }
  if (m.sender == room.p2 && !room.pilih2 && !m.isGroup) {
    const choice = normalizeChoice(m.text)
    if (!choice) return m.reply('☽ No entendí tu elección. Usa Piedra, Papel o Tijera (también acepto variantes y emojis).')
    room.pilih2 = choice
    room.text2 = m.text
    m.reply(`☽ Elegiste: ${choice.toUpperCase()}.`)
  }

  // Resultado
  if (room.pilih && room.pilih2) {
    if (room.pilih === room.pilih2) tie = true
    else if (room.pilih === 'piedra' && room.pilih2 === 'tijera') win = room.p
    else if (room.pilih === 'piedra' && room.pilih2 === 'papel') win = room.p2
    else if (room.pilih === 'tijera' && room.pilih2 === 'papel') win = room.p
    else if (room.pilih === 'tijera' && room.pilih2 === 'piedra') win = room.p2
    else if (room.pilih === 'papel' && room.pilih2 === 'piedra') win = room.p
    else if (room.pilih === 'papel' && room.pilih2 === 'tijera') win = room.p2

    const resultado = `☽ 『 Shadow Garden 』 ☽

${tie ? '🥴 Empate!!' : ''}
@${room.p.split`@`[0]} (${room.text})
@${room.p2.split`@`[0]} (${room.text2})

${tie ? '' : `Ganador: @${win.split`@`[0]}`}`
    this.sendMessage(room.asal, {
      text: resultado,
      mentions: [room.p, room.p2]
    }, { quoted: m })
    delete this.suit[room.id]
  }
}

handler.command = ['pvp', 'ppt']
handler.group = true
handler.exp = 0

export default handler

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
            }
