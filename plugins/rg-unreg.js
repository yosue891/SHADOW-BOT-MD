/**
 * ⋆｡˚☁︎｡⋆｡˚☽˚｡⋆ ✦ 𝑷𝒂𝒄𝒕𝒐 𝑫𝒊𝒔𝒐𝒍𝒗𝒊𝒅𝒐 ✦⋆｡˚☁︎｡⋆｡˚☽˚｡⋆
 *
 * 𝐓𝐡𝐞 𝐄𝐦𝐢𝐧𝐞𝐧𝐜𝐞 𝐢𝐧 𝐒𝐡𝐚𝐝𝐨𝐰: 𝑬𝒍 𝑹𝒆𝒕𝒊𝒓𝒐 𝒅𝒆 𝒍𝒂 𝑶𝒔𝒄𝒖𝒓𝒊𝒅𝒂𝒅
 *
 * "Cuando el vínculo se rompe, el alma regresa al vacío..."
 */

import db from '../lib/database.js'

let handler = async function (m, { conn, usedPrefix, command}) {
  const user = global.db.data.users[m.sender]
  const name = user.name || 'Invocador'

  if (!user.registered) {
    return m.reply(`『☽』 ${name}-kun... no hay pacto que romper. Tu alma aún no ha sido marcada por las sombras.`)
}

  // ✧ Disolver el pacto
  user.name = ''
  user.age = 0
  user.regTime = 0
  user.registered = false

  // ✧ Reacción sombría
  await m.react('🌒')

  // ✧ Mensaje de despedida
  const mensajeDespedida = `
╭─「 ☠️ 𝑷𝒂𝒄𝒕𝒐 𝑫𝒊𝒔𝒐𝒍𝒗𝒊𝒅𝒐 ☠️ 」─╮
│
│ ✧ *Nombre:* ${name}
│ ✧ *Estado:* Eliminado de la base de datos
│ ✧ *Destino:* Regreso al vacío
│
├─ "Tu vínculo con el Reino Shadow ha sido roto..."
│ 🕳️ El poder oculto ya no te pertenece.
│
╰─「 𝑬𝒎𝒊𝒏𝒆𝒏𝒄𝒆 𝒊𝒏 𝑺𝒉𝒂𝒅𝒐𝒘 」─╯
`.trim()

  await conn.sendMessage(m.chat, { text: mensajeDespedida}, { quoted: m})
}

handler.help = ['unreg']
handler.tags = ['rg']
handler.command = ['unreg', 'unregister', 'eliminar', 'borrar']

export default handler
