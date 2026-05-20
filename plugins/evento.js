// plugins/evento.js
// Comando: .evento
// Envía un evento de WhatsApp sin necesidad de parámetros.

const handler = async (m, { conn }) => {
  await conn.sendMessage(
    m.chat,
    {
      eventMessage: {
        name: '🎉 Community Meetup',
        description: 'Join us for the monthly meetup!',
        startTime: Date.now() + 86400000, // mañana
        endTime: Date.now() + 90000000,   // un poco después
        location: {
          name: 'Jakarta',
          degreesLatitude: -6.2,
          degreesLongitude: 106.8
        }
      }
    },
    { quoted: m }
  )
}

handler.help = ['evento']
handler.tags = ['tools']
handler.command = /^(evento|event)$/i
handler.register = true

export default handler
