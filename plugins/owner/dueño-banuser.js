let handler = async (m, { conn, text }) => {
    if (!text) return m.reply('🌌⚠️ *Las sombras exigen que menciones a un usuario con @tag.*')

    let who
    if (m.isGroup) who = m.mentionedJid[0]
    else who = m.chat
    if (!who) return m.reply('🌌⚠️ *Debes invocar a un usuario con @tag.*')

    let users = global.db.data.users
    if (!users[who]) users[who] = {}

    users[who].banned = true

    await conn.sendMessage(
        m.chat,
        {
            text: `🎄🌌 *El alma de @${who.split('@')[0]} ha sido marcada por el Shadow Garden.*\n\n❄️ Su destino ha sido sellado en esta fría navidad...`,
            contextInfo: {
                forwardingScore: 200,
                isForwarded: false,
                mentionedJid: [who]
            }
        },
        { quoted: m }
    )
}

handler.help = ['banuser <@tag>']
handler.command = ['banuser']
handler.tags = ['owner']
handler.rowner = true

export default handler
