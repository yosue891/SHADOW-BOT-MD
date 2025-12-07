let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const emojiShadow = "🌑"
  const emojiChristmas = "🎄"

  // Validaciones con mensajes visibles
  if (!args[0]) {
    return m.reply(
      `${emojiShadow} En las sombras no hay nada...\n${emojiChristmas} Ingresa un texto para iniciar la *Encuesta Navideña del Shadow*.\n\n📌 Ejemplo:\n*${usedPrefix + command}* Pizza|Hamburguesa|Tacos`
    )
  }
  if (!text.includes('|')) {
    return m.reply(
      `${emojiChristmas} Divide las opciones con *|* para que el poder de las sombras las revele.\n\n📌 Ejemplo:\n*${usedPrefix + command}* Nieve|Regalos|Sombras`
    )
  }

  // Procesar opciones
  let opciones = []
  let partes = text.split('|')
  for (let i = 0; i < partes.length; i++) {
    opciones.push(partes[i].trim())
  }

  // Título de la encuesta con estilo Shadow + Navidad
  let titulo = `🌑 Encuesta de las Sombras ${emojiChristmas}\n\n` +
               `👾 *The Eminence in Shadow* se mezcla con la magia navideña...\n` +
               `✨ Elige con cuidado, cada opción refleja tu destino.`

  // Enviar encuesta (usando sendMessage con tipo poll)
  await conn.sendMessage(m.chat, {
    poll: {
      name: titulo,
      values: opciones,
      selectableCount: 1
    }
  }, { quoted: m })
}

// Ayuda y configuración
handler.help = ['encuesta <opción1|opción2|...>']
handler.tags = ['grupo']
handler.command = ['poll', 'encuesta', 'shadowpoll']
handler.group = true

export default handler
