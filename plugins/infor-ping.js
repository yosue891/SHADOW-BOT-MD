import speed from 'performance-now'
import { exec } from 'child_process'

let handler = async (m, { conn }) => {
  let timestamp = speed()
  let userId = m.sender
  let userName = conn.getName(userId)
  let userNumber = userId.split('@')[0]
  
  let sentMsg = await conn.reply(m.chat, '❐ 𝐂𝐚𝐥𝐜𝐮𝐥𝐚𝐧𝐝𝐨 𝐏𝐢𝐧𝐠...', m)
  let latency = speed() - timestamp

  exec(`neofetch --stdout`, (error, stdout) => {
    let systemInfo = ""
    if (error || !stdout) {
       // Si falla neofetch, ponemos una info manual pro
       systemInfo = "> 🖥️ *𝐒𝐢𝐬𝐭𝐞𝐦𝐚:* 𝐋𝐢𝐧𝐮𝐱 𝐔𝐛𝐮𝐧𝐭𝐮 𝐯𝟐𝟐.𝟎𝟒\n> 🚀 *𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝:* 𝐌𝐚́𝐱𝐢𝐦𝐚 ⚡"
    } else {
       let child = stdout.toString("utf-8")
       systemInfo = child.replace(/Memory:/, "Ram:").trim()
    }

    let result = `
✨ *¡𝐏𝐎𝐍𝐆!* ✨

> 🌌 *𝐓𝐢𝐞𝐦𝐩𝐨:* ${latency.toFixed(4).split(".")[0]}𝐦𝐬
> 👤 *𝐔𝐬𝐮𝐚𝐫𝐢𝐨:* ${userName} (@${userNumber})
> 👑 *𝐃𝐮𝐞𝐧̃𝐨𝐬:* 𝐘𝐨𝐬𝐮𝐞 (𝐒𝐡𝐚𝐝𝐨𝐰) & 𝐀𝐝𝐨
> 🏎️ *𝐋𝐢𝐧𝐮𝐱 𝐒𝐩𝐞𝐞𝐝:* 𝐌𝐚́𝐱𝐢𝐦𝐚 𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝 🚀

${systemInfo}

*જ 𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 𝐈𝐧𝐭𝐞𝐫𝐟𝐚𝐜𝐞 🧪 𖤓*`.trim()

    conn.sendMessage(m.chat, { 
      image: { url: 'https://files.catbox.moe/yfdd3r.jpg' }, 
      caption: result, 
      mentions: [userId],
      edit: sentMsg.key 
    }, { quoted: m })
  })
}

handler.help = ['ping']
handler.tags = ['informacion']
handler.command = ['ping', 'p']

export default handler
