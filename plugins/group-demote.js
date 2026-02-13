var handler = async (m, { conn, usedPrefix, command, text, groupMetadata }) => {
let mentionedJid = await m.mentionedJid
let user = mentionedJid && mentionedJid.length 
  ? mentionedJid[0] 
  : m.quoted && await m.quoted.sender 
    ? await m.quoted.sender 
    : null

if (!user) 
  return conn.reply(m.chat, '《✧》 Debes mencionar al usuario que deseas degradar de administrador.', m)

try {
const groupInfo = await conn.groupMetadata(m.chat)
const participant = groupInfo.participants.find(p => 
  p.id === user || 
  p.jid === user || 
  p.lid === user || 
  p.phoneNumber === user
)

if (!participant?.admin)
  return conn.reply(m.chat, `《✧》 *@${user.split('@')[0]}* no es administrador del grupo!`, m, { mentions: [user] })

const ownerGroup = groupInfo.owner || m.chat.split('-')[0] + '@s.whatsapp.net'
if (user === ownerGroup)
  return conn.reply(m.chat, '《✧》 No puedes degradar al creador del grupo.', m)

if (user === conn.user.jid)
  return conn.reply(m.chat, '《✧》 No puedes degradar al bot de administrador.', m)

await conn.groupParticipantsUpdate(m.chat, [user], 'demote')
await conn.reply(m.chat, `✿ *@${user.split('@')[0]}* ha sido degradado de administrador del grupo!`, m, { mentions: [user] })

} catch (e) {
conn.reply(m.chat, `> Ocurrió un error inesperado al ejecutar *${usedPrefix + command}*.\n> [Error: *${e.message}*]`, m)
}}

handler.help = ['demote']
handler.tags = ['grupo']
handler.command = ['demote', 'degradar']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
