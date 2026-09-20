// 💫 Sopa de Letras Shadow Garden + Navidad
let juegos = {} // almacena partidas activas por chat

function generarSopaDeLetras(palabras) {
  const size = 12
  let grid = Array.from({ length: size }, () => Array(size).fill(' '))
  
  // Insertar palabras horizontalmente (simplificado)
  palabras.forEach((p, idx) => {
    if (idx < size) {
      for (let i = 0; i < p.length && i < size; i++) {
        grid[idx][i] = p[i].toUpperCase()
      }
    }
  })
  
  // Rellenar espacios vacíos con letras aleatorias
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === ' ') {
        grid[r][c] = letras[Math.floor(Math.random() * letras.length)]
      }
    }
  }
  
  return grid.map(row => row.join(' ')).join('\n')
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

  if (command === 'sopa' || command === 'sopadeletras' || command === 'shadowgame') {
    const sopa = generarSopaDeLetras(palabras)
    juegos[chatId] = { jugador, palabras, inicio: Date.now() }

    await m.reply(
`🌑🎄 *Sopa de Letras del Shadow Garden* 🎄🌑
👤 Jugador: ${jugador}
⏳ Tiempo máximo: 10 minutos

Palabras a encontrar: ${palabras.join(', ')}

${sopa}

✨ Busca las palabras antes de que las sombras festivas consuman la Navidad...`
    )

    // Advertencia a los 5 minutos
    setTimeout(() => {
      if (juegos[chatId]) {
        m.reply(`⚠️ ${juegos[chatId].jugador}, han pasado 5 minutos... las sombras festivas se acercan 🎄🌑`)
      }
    }, 5 * 60 * 1000)

    // Advertencia a los 9 minutos
    setTimeout(() => {
      if (juegos[chatId]) {
        m.reply(`⏳ ${juegos[chatId].jugador}, solo queda 1 minuto... ¡apresúrate antes de que la Navidad se pierda en las sombras! ❄️`)
      }
    }, 9 * 60 * 1000)

    // Fin del tiempo a los 10 minutos
    setTimeout(() => {
      if (juegos[chatId]) {
        m.reply(`❌ Tiempo agotado, ${juegos[chatId].jugador}... las sombras han sellado tu destino 🎭🌑`)
        delete juegos[chatId]
      }
    }, 10 * 60 * 1000)
  }

  // Resolver partida
  if (command === 'resolver') {
    if (!juegos[chatId]) return m.reply("⚠️ No hay ninguna sopa activa en este chat.")
    if (!text) return m.reply("🧩 Ingresa las palabras que encontraste separadas por comas.")

    const encontradas = text.split(',').map(p => p.trim().toLowerCase())
    const faltantes = juegos[chatId].palabras.filter(p => !encontradas.includes(p))

    if (faltantes.length === 0) {
      m.reply(`🎉✨ ¡Victoria, ${juegos[chatId].jugador}! Has encontrado todas las palabras del Shadow Garden antes de que las sombras te atraparan 🎄🌑`)
      delete juegos[chatId]
    } else {
      m.reply(`🔮 ${juegos[chatId].jugador}, aún faltan palabras por descubrir: ${faltantes.join(', ')}`)
    }
  }
}

handler.help = ['sopa', 'resolver <palabras>']
handler.tags = ['game']
handler.command = ['sopa', 'sopadeletras', 'shadowgame', 'resolver']

export default handler
