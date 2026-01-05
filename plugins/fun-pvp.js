let handler = async (m, { conn, command }) => {
  conn.suit = conn.suit ? conn.suit : {}
  let pp = 'https://files.catbox.moe/6fewjd.jpg' // Imagen Shadow Garden

  // Crear nueva sala de PVP
  if (command === 'pvp' || command === 'ppt') {
    let partnerId = null
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      partnerId = m.mentionedJid[0]
    } else if (m.quoted) {
      partnerId = m.quoted.sender
    }
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
      text: `☽ 『 Shadow Garden 』 ☽\n\n@${m.sender.split('@')[0]} ha retado a @${partnerId.split('@')[0]} a un duelo de *Piedra, Papel o Tijera*.\n\nResponde con *aceptar* o *rechazar*.`,
      mentions: [m.sender, partnerId],
      contextInfo: {
        externalAdReply: {
          title: 'Duelo Shadow Garden',
          body: 'El poder oculto se manifiesta...',
          thumbnailUrl: pp,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m })
  }
}

handler.before = async function (m) {
  this.suit = this.suit ? this.suit : {}
  let pp = 'https://files.catbox.moe/6fewjd.jpg'
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
      let textno = `☽ 『 Shadow Garden 』 ☽\n\n@${room.p2.split`@`[0]} rechazó el duelo.`
      m.reply(textno, null, { mentions: [room.p2] })
      delete this.suit[room.id]
      return !0
    }
    room.status = 'play'
    room.asal = m.chat
    clearTimeout(room.waktu)
    let textplay = `☽ 『 Shadow Garden 』 ☽\n\n🎮 El duelo comienza.\n\nOpciones enviadas a los chats privados de @${room.p.split`@`[0]} y @${room.p2.split`@`[0]}.\n\n*Elegir opción en wa.me/${conn.user.jid.split`@`[0]}*`
    m.reply(textplay, m.chat, { mentions: [room.p, room.p2] })

    let opciones = `☽ 『 Shadow Garden 』 ☽\n\nSelecciona una opción:\n\n✦ Piedra\n✦ Papel\n✦ Tijera\n\n*Responde con tu elección*`
    if (!room.pilih) this.sendMessage(room.p, { text: opciones })
    if (!room.pilih2) this.sendMessage(room.p2, { text: opciones })
  }

  // Elecciones
  let reg = /^(tijera|piedra|papel)$/i
  if (m.sender == room.p && reg.test(m.text) && !room.pilih && !m.isGroup) {
    room.pilih = reg.exec(m.text.toLowerCase())[0]
    room.text = m.text
    m.reply(`☽ Has elegido ${m.text}.`)
  }
  if (m.sender == room.p2 && reg.test(m.text) && !room.pilih2 && !m.isGroup) {
    room.pilih2 = reg.exec(m.text.toLowerCase())[0]
    room.text2 = m.text
    m.reply(`☽ Has elegido ${m.text}.`)
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

    let resultado = `☽ 『 Shadow Garden 』 ☽\n\n${tie ? '🥴 Empate!!' : ''}\n\n@${room.p.split`@`[0]} (${room.text})\n@${room.p2.split`@`[0]} (${room.text2})\n\n${tie ? '' : `Ganador: @${win.split`@`[0]}`}`
    this.sendMessage(room.asal, {
      text: resultado,
      mentions: [room.p, room.p2],
      contextInfo: {
        externalAdReply: {
          title: 'Resultados del PVP',
          body: 'La sombra sonríe ante el destino...',
          thumbnailUrl: pp,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
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
