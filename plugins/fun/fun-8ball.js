let handler = async (m, { args, text, usedPrefix, command }) => {
  if (!text) return m.reply(`🎃🦇 *Oráculo de Ultratumba del Destino* 🦇🎃\n\nUsa el comando así:\n${usedPrefix}${command} ¿seré millonario?\n\nHaz tu pregunta y los espíritus de Halloween responderán...`)

  await m.react('🎃')

  const pregunta = text.toLowerCase()
  let respuesta = Math.random() < 0.5 ? '🎃✨ Sí, los espíritus de las sombras lo confirman...' : '🌑🕸️ No, el destino se oculta en la noche de brujas...'

  if (pregunta.includes('gay') || pregunta.includes('homo') || pregunta.includes('bisexual')) {
    respuesta = '🦇🕯️ Sí, las brujas y estrellas confirman tu camino...'
  } else if (pregunta.includes('hetero') || pregunta.includes('heterosexual')) {
    respuesta = '🕯️🎃 No, las sombras niegan ese camino...'
  }

  await m.reply(
`🎭 *Pregunta ritual:* ${text}
🎃🔮 *Respuesta del Oráculo:* ${respuesta}

🦇✨ *El aquelarre de Shadow Garden observa en silencio...*`
  )
}

handler.help = ['8ball <pregunta>']
handler.tags = ['fun']
handler.command = ['8ball', 'shadowball', 'naviball']

export default handler
