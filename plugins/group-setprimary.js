import ws from 'ws'

const handler = async (m, { conn }) => {
  const subBots = [...new Set([...global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map((conn) => conn.user.jid)])]

  if (global.conn?.user?.jid && !subBots.includes(global.conn.user.jid)) {
    subBots.push(global.conn.user.jid)
  }

  const chat = global.db.data.chats[m.chat]
  const mentionedJid = await m.mentionedJid
  const who = mentionedJid[0] ? mentionedJid[0] : m.quoted ? await m.quoted.sender : false

  if (!who) return conn.reply(m.chat, `❀ *Por favor, menciona al Saiyan (o Sub-Saiyan) o responde a un mensaje suyo para seleccionarlo como dios supremo.*`, m)

  if (!subBots.includes(who)) return conn.reply(m.chat, `ꕥ *El usuario indicado no es un Bot activo del sistema.*`, m)

  if (chat.primaryBot === who) {
    return conn.reply(m.chat, `➜ @${who.split`@`[0]} *ya está configurado como el Bot Principal aquí.*`, m, { mentions: [who] });
  }

  try {
    chat.primaryBot = who
    conn.reply(m.chat, `✰ *¡CONFIGURACIÓN ACTUALIZADA!* ✰\n\n➜ *Nuevo Shadow supremo:* @${who.split`@`[0]}\n> A partir de ahora, los comandos en este grupo serán ejecutados preferentemente por este * Shadow bot*.`, m, { mentions: [who] })
  } catch (e) {
    conn.reply(m.chat, `⚠︎ *Ocurrió un error inesperado:*\n> ${e.message}`, m)
  }
}

handler.help = ['setprimary']
handler.tags = ['grupos']
handler.command = ['setprimary']
handler.group = true
handler.admin = true

export default handler