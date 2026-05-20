// plugins/evento.js

const handler = async (m, { conn, args }) => {
  const nombre = args[0] || '🎉 Evento Especial'
  const descripcion =
    args.slice(1).join(' ') || 'Únete a nuestro evento exclusivo.'

  // Inicio: mañana
  const startTime = Date.now() + 24 * 60 * 60 * 1000

  // Fin: 1 hora después
  const endTime = startTime + 60 * 60 * 1000

  await conn.sendMessage(
    m.chat,
    {
      eventMessage: {
        name: nombre,
        description: descripcion,
        startTime,
        endTime,
        location: {
          name: 'Belmont, Virginia',
          degreesLatitude: 39.0000,
          degreesLongitude: -77.5300
        }
      }
    },
    { quoted: m }
  )
}

handler.help = ['evento [nombre] [descripción]']
handler.tags = ['tools']

// Detecta comandos como .evento, !evento, /evento, etc.
handler.command = /^(evento|event)$/i

// Si tu bot usa estas propiedades, ayudan a que el plugin se cargue bien
handler.register = true

export default handler
