import { addCoins, removeCoins, hasCoins } from '../../nucleo/coinsDB.js'
import { fixLid } from '../../nucleo/message.js'

const activeAhorcados = new Map()
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const ahorcadoDrawings = [
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

const words = [
  'PERRO', 'GATO', 'COMPUTADORA', 'WHATSAPP', 'JAVASCRIPT',
  'PROGRAMACION', 'CELULAR', 'BOTELLA', 'TECLADO', 'PANTALLA',
  'INTERNET', 'ELEFANTE', 'UNIVERSO', 'GALAXIA', 'ASTRONAUTA',
  'TELEVISOR', 'VEHICULO', 'GUITARRA', 'MURCIELAGO', 'VIDEOJUEGO',
  'ABRAZADERA', 'BIBLIOTECA', 'AEROPUERTO', 'RESTAURANTE',
  'HELICOPTERO', 'CHOCOLATE', 'ESTUDIANTE', 'DESAYUNO',
  'FOTOGRAFIA', 'ZAPATILLA', 'ENCICLOPEDIA', 'AERODINAMICA',
  'FOTOSINTESIS', 'HIPOPOTAMO', 'CALEFACCION', 'REFRIGERADOR',
  'MICROONDAS', 'LABORATORIO', 'ASTRONOMIA', 'MATEMATICAS',
  'LITERATURA', 'ARQUITECTURA', 'KINESIOLOGIA', 'CONSTELACION',
  'ELECTROMAGNETISMO', 'REVOLUCION', 'INDEPENDENCIA',
  'PALEONTOLOGIA', 'CONSTITUCION', 'DEMOCRACIA', 'CIBERSEGURIDAD',
  'INTELIGENCIA', 'METABOLISMO', 'BIODIVERSIDAD', 'ECOSISTEMA',
  'ATMOSFERA', 'TEMPERATURA', 'SUPERNOVA', 'TERREMOTO', 'TSUNAMI',
  'AERODESLIZADOR', 'PARACAIDISMO', 'MARIPOSA', 'DINOSAURIO',
  'CARAMELO', 'COCODRILO', 'LAMPARA', 'PARAGUAS', 'SEMAFORO',
  'VOLEIBOL', 'ATLETISMO', 'CAMPAMENTO', 'BRUJULA', 'CALENDARIO',
  'MANDARINA', 'SOMBRERO', 'PINGÜINO', 'RELAMPAGO', 'CAMISETA',
  'BICICLETA', 'ALMOHADA', 'CANGREJO', 'DELFINES', 'ESMERALDA',
  'SERPIENTE', 'LABERINTO', 'MANZANA', 'NARANJAS', 'DURAZNO',
  'SANDWICH', 'ROMPECABEZAS', 'TIBURON', 'TORTUGA', 'UNICORNIO',
  'ESPERANZA', 'AVENTURA', 'CABALLERO', 'CASCABEL', 'ESCOPETA',
  'HORMIGUERO', 'LEOPARDO'
]

function getDisplayWord(word, guessed) {
  return word
    .split('')
    .map(letter => guessed.has(letter) ? letter : '_')
    .join(' ')
}

function ensureUser(sender) {
  const users = globalThis.db?.data?.users

  if (users && !users[sender]) {
    users[sender] = {
      coins: 0,
      exp: 0
    }
  }
}

function resetGameTimeout(conn, chat, game) {
  clearTimeout(game.timeout)

  game.timeout = setTimeout(async () => {
    // Evita que un temporizador viejo elimine una partida nueva
    if (activeAhorcados.get(chat) !== game) return

    activeAhorcados.delete(chat)

    try {
      await conn.sendMessage(chat, {
        text:
          `⏳ *Juego de Ahorcado cancelado por inactividad.*\n` +
          `La palabra era: *${game.word}*`
      })
    } catch (error) {
      console.error('[AHORCADO] Error al cancelar la partida:', error)
    }
  }, 60000)
}

/*
 * Interceptor ejecutado con cada mensaje.
 * Solo actúa cuando existe una partida y el mensaje es una letra.
 */
const before = async (m, { conn }) => {
  try {
    if (!m?.chat || m.fromMe || m.isBaileys) return false

    const game = activeAhorcados.get(m.chat)
    if (!game) return false

    const guess = String(m.text || '').trim().toUpperCase()

    // También acepta Ñ, vocales acentuadas y Ü
    if (!/^[A-ZÁÉÍÓÚÜÑ]$/.test(guess)) return false

    let sender = m.sender

    try {
      sender = await fixLid(conn, {
        key: m.key,
        chat: m.chat,
        fromMe: m.fromMe
      }) || m.sender
    } catch {
      sender = m.sender
    }

    if (game.guessed.has(guess)) {
      await conn.reply(
        m.chat,
        `🙄 Ya intentaste la letra *${guess}*. Prueba con otra.`,
        m
      )

      return true
    }

    game.guessed.add(guess)
    resetGameTimeout(conn, m.chat, game)

    const currentDisplay = getDisplayWord(game.word, game.guessed)

    if (game.word.includes(guess)) {
      const completed = !currentDisplay.includes('_')

      if (completed) {
        clearTimeout(game.timeout)
        activeAhorcados.delete(m.chat)

        ensureUser(sender)
        addCoins(sender, 100)

        await conn.sendPresenceUpdate('composing', m.chat)
        await delay(1000)

        await conn.sendMessage(
          m.chat,
          {
            text:
              `🎉 *¡Felicidades @${sender.split('@')[0]}!* 🎉\n\n` +
              `Acertaste la palabra: *${game.word}*\n` +
              `🎁 *Has ganado 100 Coins.*`,
            mentions: [sender]
          },
          { quoted: m }
        )

        return true
      }

      await conn.reply(
        m.chat,
        `✅ *¡Letra correcta!*\n\n` +
        `${currentDisplay}\n\n` +
        `*Errores:* ${game.errors}/6\n` +
        `\`\`\`${ahorcadoDrawings[game.errors]}\`\`\``,
        m
      )

      return true
    }

    game.errors++

    if (game.errors >= 6) {
      ensureUser(sender)

      const extraLifeCost = 50

      if (hasCoins(sender, extraLifeCost)) {
        removeCoins(sender, extraLifeCost)
        game.errors = 5

        await conn.sendPresenceUpdate('composing', m.chat)
        await delay(1000)

        await conn.sendMessage(
          m.chat,
          {
            text:
              `❤️ *¡VIDA EXTRA CONSUMIDA!*\n\n` +
              `@${sender.split('@')[0]} gastó *${extraLifeCost} Coins* ` +
              `para evitar el Game Over.\n\n` +
              `${currentDisplay}\n\n` +
              `*Errores:* 5/6\n` +
              `\`\`\`${ahorcadoDrawings[5]}\`\`\``,
            mentions: [sender]
          },
          { quoted: m }
        )

        return true
      }

      clearTimeout(game.timeout)
      activeAhorcados.delete(m.chat)

      await conn.sendPresenceUpdate('composing', m.chat)
      await delay(1000)

      await conn.reply(
        m.chat,
        `💀 *¡GAME OVER!* 💀\n\n` +
        `El ahorcado se completó y nadie tenía Coins suficientes ` +
        `para una vida extra.\n\n` +
        `La palabra era: *${game.word}*\n\n` +
        `\`\`\`${ahorcadoDrawings[6]}\`\`\``,
        m
      )

      return true
    }

    await conn.reply(
      m.chat,
      `❌ *¡Letra incorrecta!*\n\n` +
      `${currentDisplay}\n\n` +
      `*Errores:* ${game.errors}/6\n` +
      `\`\`\`${ahorcadoDrawings[game.errors]}\`\`\``,
      m
    )

    return true
  } catch (error) {
    console.error('[AHORCADO] Error procesando una letra:', error)
    return false
  }
}

var handler = async (m, { conn }) => {
  try {
    const existingGame = activeAhorcados.get(m.chat)

    if (existingGame) {
      return conn.reply(
        m.chat,
        `🙄 *Ya hay una partida de Ahorcado en curso.*\n\n` +
        `*Palabra:* ${getDisplayWord(
          existingGame.word,
          existingGame.guessed
        )}\n` +
        `*Errores:* ${existingGame.errors}/6\n\n` +
        `Envía una sola letra para jugar.`,
        m
      )
    }

    const randomWord = words[Math.floor(Math.random() * words.length)]

    const game = {
      word: randomWord,
      guessed: new Set(),
      errors: 0,
      timeout: null
    }

    activeAhorcados.set(m.chat, game)
    resetGameTimeout(conn, m.chat, game)

    const initialDisplay = getDisplayWord(randomWord, game.guessed)

    const text =
      `🎮 *EL AHORCADO* 🎮\n\n` +
      `Adivina la palabra oculta enviando una sola letra.\n\n` +
      `*Palabra:* ${initialDisplay}\n` +
      `*Errores permitidos:* 6\n\n` +
      `\`\`\`${ahorcadoDrawings[0]}\`\`\`\n\n` +
      `_La partida se cancelará después de 60 segundos sin jugar._`

    await conn.reply(m.chat, text, m)
  } catch (error) {
    console.error('[AHORCADO] Error al iniciar la partida:', error)
    await conn.reply(
      m.chat,
      '🙄 *Todo explotó intentando crear el Ahorcado.*',
      m
    )
  }
}

handler.before = before
handler.help = ['ahorcado', 'hangman']
handler.tags = ['game']
handler.command = /^(ahorcado|hangman)$/i

export { activeAhorcados }
export default handler
