import ws from 'ws'

const handler = async (m, { conn, usedPrefix }) => {
  const subBots = [
    ...new Set(
      [
        ...global.conns
          .filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED)
          .map((conn) => conn.user.jid),
      ]
    ),
  ]

  if (global.conn?.user?.jid && !subBots.includes(global.conn.user.jid)) {
    subBots.push(global.conn.user.jid)
  }

  const chat = global.db.data.chats?.[m.chat] || {}
  const mentionedJid = m.mentionedJid
  const who = mentionedJid && mentionedJid[0] ? mentionedJid[0] : m.quoted ? m.quoted.sender : false
  
  if (!who) return conn.reply(m.chat, `❀ Por favor, menciona a un Socket para hacerlo Bot principal del grupo.`, m)
  if (!subBots.includes(who)) return conn.reply(m.chat, `ꕥ El usuario mencionado no es un Socket de: *${global.botname}*.`, m)
  if (chat.primaryBot === who) {
    return conn.reply(
      m.chat,
      `⌗ @${who.split`@`[0]} ya está como Bot primario en este grupo.`,
      m,
      { mentions: [who] }
    )
  }

  try {
    if (!global.db.data.chats[m.chat]) {
        global.db.data.chats[m.chat] = { primaryBot: who }
    } else {
        global.db.data.chats[m.chat].primaryBot = who
    }
    
    await global.db.write()
    
    conn.reply(
      m.chat,
      `✏ Se ha establecido a @${who.split`@`[0]} como Bot primario de este grupo.\n> Ahora todos los comandos de este grupo serán ejecutados por @${who.split`@`[0]}.`,
      m,
      { mentions: [who] }
    )
  } catch (e) {
    console.error(e)
    conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`,
      m
    )
  }
}

handler.help = ['setprimary']
handler.tags = ['grupo']
handler.command = ['setprimary']
handler.group = true
handler.admin = true

export default handler
