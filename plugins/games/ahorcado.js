const activeGames = new Map()

const words = [
  'PERRO', 'GATO', 'COMPUTADORA', 'WHATSAPP', 'JAVASCRIPT',
  'PROGRAMACION', 'CELULAR', 'BOTELLA', 'TECLADO', 'PANTALLA',
  'INTERNET', 'ELEFANTE', 'UNIVERSO', 'GALAXIA', 'ASTRONAUTA',
  'TELEVISOR', 'VEHICULO', 'GUITARRA', 'MURCIELAGO', 'VIDEOJUEGO',
  'BIBLIOTECA', 'AEROPUERTO', 'RESTAURANTE', 'HELICOPTERO',
  'CHOCOLATE', 'ESTUDIANTE', 'DINOSAURIO', 'MARIPOSA',
  'COCODRILO', 'PARAGUAS', 'PINGÜINO', 'BICICLETA',
  'ROMPECABEZAS', 'TIBURON', 'TORTUGA', 'UNICORNIO'
]

const drawings = [
`  +---+
  |   |
      |
      |
      |
      |
=========`,
`  +---+
  |   |
  O   |
      |
      |
      |
=========`,
`  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`
]

function displayWord(word, guessed) {
  return [...word]
    .map(letter => guessed.has(letter) ? letter : '_')
    .join(' ')
}

function resetTimeout(conn, chat, game) {
  clearTimeout(game.timeout)

  game.timeout = setTimeout(async () => {
    if (activeGames.get(chat) !== game) return

    activeGames.delete(chat)

    try {
      await conn.reply(
        chat,
        `⏳ *Partida cancelada por inactividad.*\n` +
        `La palabra era: *${game.word}*`,
        null
      )
    } catch (error) {
      console.error('[AHORCADO] Error en timeout:', error)
    }
  }, 60000)
}

function gameStatus(game, title) {
  return (
    `${title}\n\n` +
    `${displayWord(game.word, game.guessed)}\n\n` +
    `*Errores:* ${game.errors}/6\n` +
    `\`\`\`${drawings[game.errors]}\`\`\``
  )
}

let handler = async (m, { conn }) => {
  const currentGame = activeGames.get(m.chat)

  if (currentGame) {
    return conn.reply(
      m.chat,
      `🙄 *Ya hay una partida en este grupo.*\n\n` +
      `*Palabra:* ${displayWord(
        currentGame.word,
        currentGame.guessed
      )}\n` +
      `*Errores:* ${currentGame.errors}/6\n\n` +
      `Envía una sola letra para jugar.`,
      m
    )
  }

  const game = {
    word: words[Math.floor(Math.random() * words.length)],
    guessed: new Set(),
    errors: 0,
    timeout: null
  }

  activeGames.set(m.chat, game)
  resetTimeout(conn, m.chat, game)

  return conn.reply(
    m.chat,
    `🎮 *EL AHORCADO* 🎮\n\n` +
    `Adivina la palabra enviando una sola letra.\n\n` +
    `*Palabra:* ${displayWord(game.word, game.guessed)}\n` +
    `*Errores permitidos:* 6\n\n` +
    `\`\`\`${drawings[0]}\`\`\`\n\n` +
    `_Se cancelará después de 60 segundos sin jugar._`,
    m
  )
}

handler.before = async function (m, { conn }) {
  const game = activeGames.get(m.chat)

  if (!game || !m.text || m.fromMe) return false

  const guess = m.text.trim().toUpperCase()

  if (!/^[A-ZÁÉÍÓÚÜÑ]$/.test(guess)) return false

  if (game.guessed.has(guess)) {
    await conn.reply(
      m.chat,
      `🙄 Ya intentaron la letra *${guess}*.`,
      m
    )

    return true
  }

  game.guessed.add(guess)
  resetTimeout(conn, m.chat, game)

  if (game.word.includes(guess)) {
    const completed =
      !displayWord(game.word, game.guessed).includes('_')

    if (completed) {
      clearTimeout(game.timeout)
      activeGames.delete(m.chat)

      const user = global.db.data.users[m.sender]
      user.coin = Number(user.coin) || 0
      user.coin += 100

      await conn.sendMessage(
        m.chat,
        {
          text:
            `🎉 *¡Felicidades @${m.sender.split('@')[0]}!*\n\n` +
            `La palabra era: *${game.word}*\n` +
            `🎁 Ganaste *100 ${global.moneda || 'coins'}*.`,
          mentions: [m.sender]
        },
        { quoted: m }
      )

      return true
    }

    await conn.reply(
      m.chat,
      gameStatus(game, '✅ *¡Letra correcta!*'),
      m
    )

    return true
  }

  game.errors++

  if (game.errors >= 6) {
    const user = global.db.data.users[m.sender]
    user.coin = Number(user.coin) || 0

    if (user.coin >= 50) {
      user.coin -= 50
      game.errors = 5

      await conn.sendMessage(
        m.chat,
        {
          text:
            `❤️ *¡VIDA EXTRA!*\n\n` +
            `@${m.sender.split('@')[0]} gastó ` +
            `*50 ${global.moneda || 'coins'}* para salvar la partida.\n\n` +
            `${displayWord(game.word, game.guessed)}\n\n` +
            `*Errores:* 5/6\n` +
            `\`\`\`${drawings[5]}\`\`\``,
          mentions: [m.sender]
        },
        { quoted: m }
      )

      return true
    }

    clearTimeout(game.timeout)
    activeGames.delete(m.chat)

    await conn.reply(
      m.chat,
      `💀 *¡GAME OVER!*\n\n` +
      `La palabra era: *${game.word}*\n\n` +
      `\`\`\`${drawings[6]}\`\`\``,
      m
    )

    return true
  }

  await conn.reply(
    m.chat,
    gameStatus(game, '❌ *¡Letra incorrecta!*'),
    m
  )

  return true
}

handler.help = ['ahorcado', 'pene']
handler.tags = ['game']
handler.command = /^(ahorcado|hangman)$/i
handler.group = true
handler.register = true

export default handler
