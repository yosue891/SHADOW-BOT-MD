let handler = async (m, { conn }) => {
  const meta = {
    sender: m.sender,
    fromMe: m.fromMe,
    chat: m.chat,
    isGroup: m.isGroup,
    participant: m.participant,
    key: m.key,
    message: m.message ? Object.keys(m.message) : null,
    messageStubType: m.messageStubType,
    messageStubParameters: m.messageStubParameters,
    senderVerification: m.message?.senderKeyDistributionMessage,
    contextInfo: m.message?.extendedTextMessage?.contextInfo || m.message?.conversation ? null : m.message,
    connUser: { jid: conn.user?.jid, id: conn.user?.id, lid: conn.user?.lid, name: conn.user?.name },
    authState: { me: conn.authState?.creds?.me },
    chatEntry: conn.chats?.[m.chat] ? { id: conn.chats[m.chat].id, lid: conn.chats[m.chat].lid, name: conn.chats[m.chat].name } : null,
    rawMessage: JSON.stringify(m, null, 2).substring(0, 3000)
  }
  console.log('[METADATA-COMPLETO]', JSON.stringify(meta, null, 2))
  await m.reply(JSON.stringify(meta, null, 2))
}
handler.help = ['metadata']
handler.tags = ['tools']
handler.command = ['metadata', 'meta', 'dump']
export default handler
