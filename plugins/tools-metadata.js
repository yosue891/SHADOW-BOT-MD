let handler = async (m, { conn }) => {
  const meta = {
    sender: m.sender,
    fromMe: m.fromMe,
    chat: m.chat,
    isGroup: m.isGroup,
    participant: m.participant || null,
    remoteJid: m.key?.remoteJid,
    fromMe_key: m.key?.fromMe,
    connUser: { jid: conn.user?.jid, id: conn.user?.id, lid: conn.user?.lid },
    authMe: conn.authState?.creds?.me,
    chatEntry: conn.chats?.[m.chat] ? { id: conn.chats[m.chat].id, lid: conn.chats[m.chat].lid } : null
  }
  console.log('[METADATA]', JSON.stringify(meta, null, 2))
  await m.reply('Metadata enviada a consola. Revisa la terminal.')
}
handler.help = ['metadata']
handler.tags = ['tools']
handler.command = ['metadata', 'meta', 'dump']
export default handler
