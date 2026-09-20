// 👻 Juego del Ahorcado Shadow Garden + Navidad echo por yosue uwu osea shadow 👻
let partidas = {} // almacena partidas activas por chat

// Dibujos del ahorcado paso a paso
const ahorcadoStages = [
  `
  
  

  
  `,
  `
  
  |
  |
  |
  `,
  `
  ______
  |
  |
  |
  `,
  `
  ______
  |    O
  |
  |
  `,
  `
  ______
  |    O
  |    |
  |
  `,
  `
  ______
  |    O
  |   /|
  |
  `,
  `
  ______
  |    O
  |   /|\\
  |
  `,
  `
  ______
  |    O
  |   /|\\
  |   /
  `,
  `
  ______
  |    O
  |   /|\\
  |   / \\
  `
]

function ocultarPalabra(palabra, letras) {
  return palabra.split('').map(l => letras.includes(l) ? l : '_').join(' ')
}

let handler = async (m, { command, text }) => {
  const chatId = m.chat
  const jugador = m.pushName || m.sender

  // Palabras fijas estilo Shadow Garden + Navidad
  const palabras = [
    "shadow", "garden", "eminence", "alpha", "beta", "gamma",
    "delta", "epsilon", "zeta", "navidad", "regalo", "nieve",
    "sombras", "trineo", "estrella", "festivo"
  ]

  if (command === 'orcado' || command === 'ahorcado') {
    const palabra = palabras[Math.floor(Math.random() * palabras.length)]
    partidas[chatId] = { jugador, palabra, letras: [], errores: 0 }

    await m.reply(
`🌑🎄 *Juego del Ahorcado del Shadow Garden* 🎄🌑
👤 Jugador: ${jugador}

Palabra oculta: ${ocultarPalabra(partidas[chatId].palabra, [])}

✨ Usa el comando .letra <letra> para adivinar antes de que las sombras festivas te ahorquen...`
    )
  }

  if (command === 'letra') {
    if (!partidas[chatId]) return m.reply("⚠️ No hay ninguna partida activa. Usa .orcado para empezar.")
    if (!text) return m.reply("🔤 Ingresa una letra para adivinar.")

    const partida = partidas[chatId]
    const letra = text.toLowerCase()

    if (partida.letras.includes(letra)) {
      return m.reply(`⚠️ ${jugador}, ya intentaste con la letra "${letra}".`)
    }

    partida.letras.push(letra)

    if (partida.palabra.includes(letra)) {
      const oculto = ocultarPalabra(partida.palabra, partida.letras)
      if (!oculto.includes('_')) {
        m.reply(`🎉✨ ¡Victoria, ${jugador}! Has descubierto la palabra "${partida.palabra}" antes de que las sombras te atraparan 🎄🌑`)
        delete partidas[chatId]
      } else {
        m.reply(`✅ Bien hecho, ${jugador}. La palabra ahora es:\n${oculto}`)
      }
    } else {
      partida.errores++
      if (partida.errores >= ahorcadoStages.length - 1) {
        m.reply(`${ahorcadoStages[partida.errores]}\n❌ ${jugador}, has sido consumido por las sombras... La palabra era "${partida.palabra}".`)
        delete partidas[chatId]
      } else {
        m.reply(`${ahorcadoStages[partida.errores]}\n⚠️ ${jugador}, la letra "${letra}" no está. Te quedan ${ahorcadoStages.length - 1 - partida.errores} intentos.`)
      }
    }
  }
}

handler.help = ['orcado', 'letra <letra>']
handler.tags = ['game']
handler.command = ['orcado', 'ahorcado', 'letra']

export default handler
