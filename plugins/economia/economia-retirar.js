let handler = async (m, { args, usedPrefix, command }) => {
    const chat = global.db.data.chats[m.chat]
    if (!chat.economy && m.isGroup) {
        return m.reply(
            `《✦》Los comandos de *Economía* están desactivados en este grupo.\n\n` +
            `Un administrador puede activarlos con:\n` +
            `» *${usedPrefix}economy on*`
        )
    }

    let user = global.db.data.users[m.sender]
    const currency = global.currency || "¥"

    if (!args[0]) {
        return m.reply(
            `❀ Ingresa la cantidad de ${currency} que deseas retirar.\n\n` +
            `Ejemplo:\n` +
            `» ${usedPrefix + command} 25000\n` +
            `» ${usedPrefix + command} all`
        )
    }

    if (args[0].toLowerCase() === 'all') {
        let count = user.bank
        if (count <= 0) return m.reply(`ꕥ No tienes ${currency} en el banco.`)

        user.bank -= count
        user.coin += count

        return m.reply(
            `❀ Retiraste *${currency}${count.toLocaleString()}* del banco.\n` +
            `Ahora puedes usarlo… pero también pueden robártelo.`
        )
    }

    if (isNaN(args[0])) {
        return m.reply(
            `ꕥ Debes retirar una cantidad válida.\n\n` +
            `Ejemplo:\n` +
            `» ${usedPrefix + command} 25000\n` +
            `» ${usedPrefix + command} all`
        )
    }

    let count = parseInt(args[0])

    if (user.bank <= 0) return m.reply(`ꕥ No tienes suficientes ${currency} en el banco.`)
    if (user.bank < count) {
        return m.reply(
            `ꕥ Solo tienes *${currency}${user.bank.toLocaleString()}* en el banco.`
        )
    }

    user.bank -= count
    user.coin += count

    return m.reply(
        `❀ Retiraste *${currency}${count.toLocaleString()}* del banco.\n` +
        `Ahora podrás usarlo… pero también podrán robártelo.`
    )
}

handler.help = ['retirar']
handler.tags = ['rpg']
handler.command = ['withdraw', 'retirar', 'with']
handler.group = true

export default handler
