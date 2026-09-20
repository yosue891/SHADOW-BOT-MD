const handler = async (m, { conn }) => {
  conn.tebaklagu = conn.tebaklagu || {}
  const id = m.chat

  // Si no hay juego activo en este chat
  if (!(id in conn.tebaklagu)) {
    return conn.reply(m.chat, '👻 No hay un juego activo de canciones ahora mismo.', m)
  }

  const json = conn.tebaklagu[id][1]
  const answer = (json.jawaban || '').trim()
  const artist = json.artist || 'Desconocido'

  const hint = createHint(answer)
  const wordCount = answer.split(/\s+/).filter(Boolean).length
  const letterCount = answer.replace(/\s/g, '').length

  const hintMessage = `
┏━━━━━━━━━━━━━━┓
🎄 PISTA DE LAS SOMBRAS 🎄
┗━━━━━━━━━━━━━━┛

🎵 ${hint}

🎤 Artista: ${artist}
📝 Palabras: ${wordCount}
📏 Letras: ${letterCount}

💡 Las vocales están visibles; descubre las consonantes.
`.trim()

  await conn.reply(m.chat, hintMessage, m)
}

// Registro del comando (elige una de estas dos opciones):

// Opción A: Array de comandos (más robusto con loaders)
handler.help = ['pista', 'hint']
handler.tags = ['game']
handler.command = ['pista', 'hint']

// Opción B: Regex agrupado correctamente
// handler.help = ['pista', 'hint']
// handler.tags = ['game']
// handler.command = /^(pista|hint)$/i

export default handler

function createHint(text) {
  return text
    .split('')
    .map(char => {
      if (/[aeiouáéíóúüAEIOUÁÉÍÓÚÜ\s'-]/.test(char)) return char // deja vocales y espacios
      if (/[a-zA-ZñÑ]/.test(char)) return '◉' // oculta consonantes
      return char // mantiene números y símbolos
    })
    .join('')
    }
