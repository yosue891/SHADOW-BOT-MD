import { proposals, marriages, clearProposalTimer, tag } from './marry.js'

const responseHandler = async (m, { conn }) => {
  const userId = m.sender
  const selected = m?.message?.buttonsResponseMessage?.selectedButtonId
  if (!selected) return

  const [cmd, proposerId] = selected.split('|')

  if (cmd === 'aceptar') {
    if (!proposerId || proposals[proposerId] !== userId) {
      return conn.reply(m.chat, '⚠️ No tienes una propuesta pendiente de esa persona.', m)
    }
    marriages[userId] = proposerId
    marriages[proposerId] = userId
    delete proposals[proposerId]
    clearProposalTimer(proposerId)
    return conn.reply(m.chat, `💒 『☽』 Las sombras han sellado el pacto.\n${tag(userId)} y ${tag(proposerId)} ahora están oficialmente casados.`, m, { mentions: [userId, proposerId] })
  }

  if (cmd === 'rechazar') {
    if (!proposerId || proposals[proposerId] !== userId) {
      return conn.reply(m.chat, '⚠️ No tienes una propuesta pendiente de esa persona.', m)
    }
    delete proposals[proposerId]
    clearProposalTimer(proposerId)
    return conn.reply(m.chat, `💔 『☽』 ${tag(userId)} ha rechazado la propuesta de ${tag(proposerId)}.`, m, { mentions: [userId, proposerId] })
  }
}

responseHandler.command = ['aceptar', 'rechazar']
responseHandler.group = true
export default responseHandler
