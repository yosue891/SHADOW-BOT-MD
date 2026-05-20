// plugins/evento.js

const handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, {
    pollResultMessage: {
      name: '🎉 Evento de la Comunidad',
      pollVotes: [
        { optionName: '📅 Asistir', optionVoteCount: 42 },
        { optionName: '❌ No puedo', optionVoteCount: 38 },
        { optionName: '🤔 Tal vez', optionVoteCount: 25 }
      ]
    }
  })
}

handler.help = ['evento']
handler.tags = ['tools']
handler.command = /^(evento|event)$/i

export default handler
