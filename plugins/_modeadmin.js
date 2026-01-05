let handler = async (m, { conn, usedPrefix, command, isAdmin, isROwner }) => {
    if (!m.isGroup) {
        await m.react('❌')
        return m.reply('> ⓘ Este comando solo funciona en grupos.')
    }

    // Solo admins o el creador pueden usar este comando
    if (!isAdmin && !isROwner) {
        await m.react('🚫')
        return m.reply('> ⓘ Solo los administradores pueden usar este comando.')
    }

    let chat = global.db.data.chats[m.chat]
    let args = m.text.trim().split(' ').slice(1)
    let action = args[0]?.toLowerCase()

    if (!action || (action !== 'on' && action !== 'off')) {
        let status = chat.adminmode ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'
        await m.react('ℹ️')
        return m.reply(`╭─「 🛡️ *MODO ADMIN* 🛡️ 」
│ 
│ 📊 Estado actual: ${status}
│ 
│ 💡 *Uso del comando:*
│ ├ ${usedPrefix}admin on
│ └ ${usedPrefix}admin off
│ 
│ 📝 *Descripción:*
│ Cuando está ACTIVADO, el bot solo
│ responderá a mensajes de administradores
│ en este grupo.
╰─◉`.trim())
    }

    if (action === 'on') {
        if (chat.adminmode) {
            await m.react('ℹ️')
            return m.reply('> ⓘ El modo *Admin* ya está activado en este grupo.')
        }
        chat.adminmode = true
        await m.react('✅')
        m.reply(`╭─「 🛡️ *MODO ADMIN ACTIVADO* 🛡️ 」
│ 
│ ✅ *Configuración aplicada:*
│ ├ El bot ahora solo responderá
│ └ a los administradores del grupo.
│ 
│ 🔒 *Modo exclusivo activado*
│ 📍 Grupo: ${m.chat}
╰─◉`.trim())

    } else if (action === 'off') {
        if (!chat.adminmode) {
            await m.react('ℹ️')
            return m.reply('> ⓘ El modo *Admin* ya está desactivado en este grupo.')
        }
        chat.adminmode = false
        await m.react('✅')
        m.reply(`╭─「 🛡️ *MODO ADMIN DESACTIVADO* 🛡️ 」
│ 
│ ✅ *Configuración aplicada:*
│ ├ El bot ahora responderá
│ └ a todos los usuarios.
│ 
│ 🔓 *Modo exclusivo desactivado*
│ 📍 Grupo: ${m.chat}
╰─◉`.trim())
    }
}

handler.help = ['admin on', 'admin off']
handler.tags = ['group']
handler.command = /^(admin)$/i
handler.group = true
handler.admin = true

export default handler
