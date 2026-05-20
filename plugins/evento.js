// plugins/evento.js
// Comando: .evento
// Compatible con bots tipo Gawr Gura Bot / Senku Bot (ESM)

const handler = async (m, { conn, text }) => {
  // Formato:
  // .evento Nombre del evento | Descripción del evento
  // Ejemplo:
  // .evento 🎉 Reunión Mensual | Únete mañana a las 7 PM

  let nombre = '🎉 Evento Especial'
  let descripcion = 'Únete a nuestro evento exclusivo.'

  if (text) {
    const partes = text.split('|')
    if (partes[0]) nombre = partes[0].trim()
    if (partes[1]) descripcion = partes[1].trim()
  }

  // Inicio: mañana
  const startTime = Date.now() + 24 * 60 * 60 * 1000

  // Fin: 1 hora después
  const endTime = startTime + 60 * 60 * 1000

  // IMPORTANTE:
  // Algunos clientes de WhatsApp solo muestran correctamente los eventos
  // cuando se envían como mensaje nativo sin texto adicional.

  await conn.sendMessage(
    m.chat,
    {
      eventMessage: {
        name: nombre,
        description: descripcion,
        startTime,
        endTime,
        location: {
          name: 'Evento Virtual',
          degreesLatitude: 4.7110,     // Bogotá
          degreesLongitude: -74.0721
        }
      }
    },
    { quoted: m }
  )
}

handler.help = ['evento <nombre> | <descripción>']
handler.tags = ['tools']
handler.command = ['evento', 'event']
handler.register = true

export default handler
