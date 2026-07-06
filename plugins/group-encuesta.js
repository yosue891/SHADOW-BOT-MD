let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const emojiShadow = "🌑"
  const emojiChristmas = "🎄"

  // Validaciones
  if (!args[0]) throw `${emojiShadow} En las sombras no hay nada...\n${emojiChristmas} Ingresa un texto para iniciar la *Encuesta Navideña del Shadow*.\n\n📌 Ejemplo:\n*${usedPrefix + command}* Pizza|Hamburguesa|Tacos`
  if (!text.includes('|')) throw `${emojiChristmas} Divide las opciones con *|* para que el poder de las sombras las revele.\n\n📌 Ejemplo:\n*${usedPrefix + command}* Nieve|Regalos|Sombras`

  // Procesar opciones
  let opciones = []
  let partes = text.split('|')
  for (let i = 0; i < partes.length; i++) {
    opciones.push([`${emojiShadow} ${partes[i].trim()} ${emojiChristmas}`])
  }

  // Título de la encuesta con estilo Shadow + Navidad
  let titulo = `🌑 Encuesta de las Sombras ${emojiChristmas}\n\n` +
               `👾 *The Eminence in Shadow* se mezcla con la magia navideña...\n` +
               `✨ Elige con cuidado, cada opción refleja tu destino.`

  // Enviar encuesta
  return conn.sendPoll(m.chat, titulo, opciones, m)
}

// Ayuda y configuración
handler.help = ['encuesta <opción1|opción2|...>']
handler.tags = ['grupos']
handler.command = ['poll', 'encuesta', 'shadowpoll']
handler.group = true

export default handler
