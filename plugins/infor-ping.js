import speed from 'performance-now'

let handler = async (m, { conn }) => {
  let timestamp = speed()
  let userId = m.sender
  let userName = conn.getName(userId)
  let userNumber = userId.split('@')[0]
  
  // Enviamos la imagen con el texto de carga para poder editarla después
  let sentMsg = await conn.sendMessage(m.chat, { 
    image: { url: 'https://files.catbox.moe/yfdd3r.jpg' }, 
    caption: '❐ 𝐂𝐚𝐥𝐜𝐮𝐥𝐚𝐧𝐝𝐨 𝐏𝐢𝐧𝐠... 🚀' 
  }, { quoted: m })

  let latency = speed() - timestamp
  let ping = latency.toFixed(0)

  let result = `
✨ *¡𝐏𝐎𝐍𝐆!* ✨

> 🌌 *𝐓𝐢𝐞𝐦𝐩𝐨:* ${ping}𝐦𝐬
> 👤 *𝐔𝐬𝐮𝐚𝐫𝐢𝐨:* ${userName} (@${userNumber})
> 👑 *𝐃𝐮𝐞𝐧̃𝐨𝐬:* 𝐘𝐨𝐬𝐮𝐞 (𝐒𝐡𝐚𝐝𝐨𝐰) & 𝐀𝐝𝐨
> 🏎️ *𝐋𝐢𝐧𝐮𝐱 𝐒𝐩𝐞𝐞𝐝:* 𝐌𝐚́𝐱𝐢𝐦𝐚 𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝 🚀

🖥️ *𝐒𝐭𝐚𝐭𝐮𝐬:* 𝐎𝐧𝐥𝐢𝐧𝐞 
🛰️ *𝐍𝐨𝐝𝐞:* 𝐯𝟐𝟎.𝟏𝟏.𝟎
⚡ *𝐏𝐨𝐰𝐞𝐫:* 𝟏𝟎𝟎% 𝐂𝐚𝐩𝐚𝐜𝐢𝐭𝐲

*જ 𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 𝐈𝐧𝐭𝐞𝐫𝐟𝐚𝐜𝐞 🧪 𖤓*`.trim()

  // Editamos el caption de la imagen ya enviada
  await conn.sendMessage(m.chat, { 
    text: result, 
    edit: sentMsg.key, 
    mentions: [userId] 
  }, { quoted: m })
}

handler.help = ['ping']
handler.tags = ['informacion']
handler.command = ['ping', 'p']

export default handler
