let handler = async (m, { conn, text }) => {
    if (!text) return m.reply('🌌⚠️ *Las sombras exigen que menciones a un usuario con @tag.*')

    let who
    if (m.isGroup) who = m.mentionedJid[0]
    else who = m.chat
    if (!who) return m.reply('🌌⚠️ *Debes invocar a un usuario con @tag.*')

    let users = global.db.data.users
    if (!users[who]) users[who] = {}

    users[who].banned = false

    await conn.sendMessage(
        m.chat,
        {
            text: `🎄🌌 *El alma de @${who.split('@')[0]} ha sido liberada por el Shadow Garden.*\n\n❄️ En esta navidad, las cadenas de la oscuridad se han roto...`,
            contextInfo: {
                forwardingScore: 200,
                isForwarded: false,
                mentionedJid: [who],
                externalAdReply: {
                    showAdAttribution: false,
                    title: `👑 Shadow Garden ☘︎`,
                    body: `✨ Las sombras también saben conceder libertad bajo la nieve.`,
                    mediaType: 2,
                    sourceUrl: global.redes || '',
                    thumbnail: global.icons || null
                }
            }
        },
        { quoted: m }
    )
}

handler.help = ['unbanuser <@tag>']
handler.command = ['unbanuser']
handler.tags = ['owner']
handler.rowner = true

export default handler
