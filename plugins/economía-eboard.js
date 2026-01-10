let handler = async (m, { conn, args }) => {

    const currency = 'Coins'  

    if (!db.data.chats[m.chat]) db.data.chats[m.chat] = {}

    if (!db.data.chats[m.chat].economy && m.isGroup) {
        return m.reply(`《✦》Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con:\n» *${usedPrefix}economy on*`)
    }

    const users = Object.entries(global.db.data.users).map(([jid, data]) => ({
        jid,
        ...data
    }))

    const sorted = users.sort((a, b) => ((b.coin || 0) + (b.bank || 0)) - ((a.coin || 0) + (a.bank || 0)))

    const totalPages = Math.ceil(sorted.length / 10)
    const page = Math.max(1, Math.min(parseInt(args[0]) || 1, totalPages))
    const startIndex = (page - 1) * 10
    const endIndex = startIndex + 10

    let text = `「✿」Los usuarios con más *${currency}* son:\n\n`

    const slice = sorted.slice(startIndex, endIndex)

    for (let i = 0; i < slice.length; i++) {
        const { jid, coin, bank } = slice[i]
        const total = (coin || 0) + (bank || 0)

        let name = global.db.data.users[jid]?.name?.trim()
        if (!name) {
            name = await conn.getName(jid).catch(() => jid.split('@')[0])
        }

        text += `❐ ${startIndex + i + 1} » *${name}:*\n`
        text += `\t\t Total→ *¥${total.toLocaleString()} ${currency}*\n`
    }

    text += `\n> ꕥ Página *${page}* de *${totalPages}*`

    await conn.reply(m.chat, text.trim(), m, { mentions: slice.map(u => u.jid) })
}

handler.help = ['baltop']
handler.tags = ['economia']
handler.command = ['baltop', 'eboard', 'economyboard']
handler.group = true

export default handler
