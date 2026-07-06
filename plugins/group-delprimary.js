import ws from 'ws'

const handler = async (m, { conn, usedPrefix }) => {
  const chat = global.db.data.chats[m.chat]

  if (!chat.primaryBot) {
    return conn.reply(m.chat, `⚠︎ No hay ningún Bot primario en este grupo.`, m)
  }

  try {
    const oldPrimary = chat.primaryBot
    chat.primaryBot = null

    conn.reply(
      m.chat, 
      `✧ Se ha eliminado el Bot primario @${oldPrimary.split`@`[0]}.\n> Ahora todos los bots vuelven a responder en este grupo.`, 
      m, 
      { mentions: [oldPrimary] }
    )
  } catch (e) {
    conn.reply(
      m.chat, 
      `⚠︎ Ocurrió un problema al intentar eliminar el Bot primario.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`, 
      m
    )
  }
}

handler.help = ['delprimary']
handler.tags = ['grupos']
handler.command = ['delprimary']
handler.group = true
handler.admin = true  

export default handler
