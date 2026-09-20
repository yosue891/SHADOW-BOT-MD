let handler = async (m, { conn }) => {
  const meta = await conn.groupMetadata(m.chat)
  await m.reply(JSON.stringify(meta, null, 2))
}

handler.help = ['getmeta']
handler.tags = ['owner']
handler.command = /^getmeta$/i
handler.group = true

export default handler
