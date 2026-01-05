import { proposals, proposalTimers, marriages, clearProposalTimer, tag } from './marry.js'

const responseHandler = async (m, { conn, args, command }) => {
  const userId = m.sender

  // ⚡ Detectar botones
  const selected = m?.message?.buttonsResponseMessage?.selectedButtonId || m.selectedButtonId
  if (selected) {
    const [cmd, proposerId] = selected.split('|')
    command = cmd
    args = [proposerId]
  }

  // ✅ ACEPTAR
  if (command === 'aceptar') {
    const proposer = args[0]
    if (!proposer || proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes una propuesta pendiente de esa persona.', m)

    marriages[userId] = proposer
    marriages[proposer] = userId
    delete proposals[proposer]
    clearProposalTimer(proposer)

    return conn.reply(m.chat, `💒 『☽』 Las sombras han sellado el pacto.\n${tag(userId)} y ${tag(proposer)} ahora están oficialmente casados.`, m, { mentions: [userId, proposer] })
  }

  // ❌ RECHAZAR
  if (command === 'rechazar') {
    const proposer = args[0]
    if (!proposer || proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes una propuesta pendiente de esa persona.', m)

    delete proposals[proposer]
    clearProposalTimer(proposer)

    return conn.reply(m.chat, `💔 『☽』 ${tag(userId)} ha rechazado la propuesta de ${tag(proposer)}.`, m, { mentions: [userId, proposer] })
  }
}

responseHandler.command = ['aceptar', 'rechazar']
responseHandler.group = true
export default responseHandler
