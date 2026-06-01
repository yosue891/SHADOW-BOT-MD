import fetch from 'node-fetch'

let handler = async (m, { conn }) => {
  await m.react('👑') 
  let list = [
    {
      displayName: ' Shadow Creator ',
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:Shadow Master
TEL;type=CELL;waid=584242773183:+58 424-2773183
TEL;type=CELL;waid=50493732693:+504 9373-2693
END:VCARD`
    }
  ]

  const canalInfo = {
    title: '⚔️ Canal Oficial de SHADOW ⚔️',
    body: 'Sumérgete en las sombras. Únete al canal oficial.',
    thumbnailUrl: 'https://cdn.adoolab.xyz/dl/5ac25528.jpg',
    sourceUrl: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O',
    mediaType: 1,
    renderLargerThumbnail: true
  }

  await conn.sendMessage(
    m.chat,
    {
      contacts: {
        displayName: `${list.length} Contacto`,
        contacts: list
      },
      contextInfo: {
        externalAdReply: canalInfo
      }
    },
    { quoted: m }
  )

  let txt = `┏━━━━━━━━━━━━━━━━━━━┓
🌑⚔️ *I N F O  D E L  C R E A D O R* ⚔️🌑
┗━━━━━━━━━━━━━━━━━━━┛

> ⚔️ 𝗦𝗛𝗔𝗗𝗢𝗪 𝗠𝗔𝗦𝗧𝗘𝗥 ⚔️  
> 🌌 El estratega oculto tras las líneas del código

📡 𝗖𝗔𝗡𝗔𝗟 𝗢𝗙𝗜𝗖𝗜𝗔𝗟:  
https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O

📱 𝗖𝗢𝗡𝗧𝗔𝗖𝗧𝗢𝗦 𝗗𝗘 𝗟𝗔 𝗢𝗥𝗚𝗔𝗡𝗜𝗭𝗔𝗖𝗜𝗢́𝗡:  
👑 Creador Principal: +58 424-2773183 (Yosue)  
⚔️ Segundo creador:   +504 9827-3976 (ado)

✦ *SHADOW-BOT-MD* — El poder no se muestra... se oculta en las sombras ✦`

  await conn.sendMessage(
    m.chat,
    {
      text: txt,
      ...rcanal
    },
    { quoted: m }
  )
}

handler.help = ['owner', 'creador']
handler.tags = ['info']
handler.command = ['owner', 'creator', 'creador', 'dueño']

export default handler
