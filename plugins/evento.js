// plugins/evento.js
// Comando: .evento
// Basado exactamente en la estructura de la documentación oficial de Baileys.

const handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, {
    eventMessage: {
      name: '🎉 Community Meetup',
      description: 'Join us for the monthly meetup!',
      startTime: Date.now() + 86400000,
      endTime: Date.now() + 90000000,
      location: {
        name: 'Jakarta',
        degreesLatitude: -6.2,
        degreesLongitude: 106.8
      }
    }
  })
}

handler.help = ['evento']
handler.tags = ['tools']
handler.command = ['evento', 'event']

export default handler
