import fetch from 'node-fetch'

let handler = async (m, { conn }) => {
  await m.react('🎅') // reacción navideña

  // Lista de contactos estilo Shadow Garden
  let list = [
    {
      displayName: ' Shadow Creator ',
      vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Shadow Master\nTEL;type=CELL;waid=584242773183:+58 424-2773183\nTEL;type=CELL;waid=50493732693:+504 9373-2693\nEND:VCARD`
    }
  ]

  const canalInfo = {
    title: '⚔️🎄 Canal Oficial de SHADOW 🎄⚔️',
    body: 'Sumérgete en las sombras festivas. Únete al canal oficial.',
    thumbnailUrl: 'https://files.catbox.moe/tpcpmj.jpg',
    sourceUrl: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O',
    mediaType: 1,
    renderLargerThumbnail: true
  }

  // Enviar contacto con preview
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

  // Mensaje decorado estilo The Eminence in Shadow con toque navideño
  let txt = `┏━━━━━━━━━━━━━━━━━━━┓
🌑🎄 *I N F O  D E L  C R E A D O R* 🎄🌑
┗━━━━━━━━━━━━━━━━━━━┛

> ⚔️ 𝗦𝗛𝗔𝗗𝗢𝗪 𝗠𝗔𝗦𝗧𝗘𝗥 ⚔️  
> 😉 El estratega oculto tras las líneas del código

📡 𝗖𝗔𝗡𝗔𝗟 𝗢𝗙𝗜𝗖𝗜𝗔𝗟:  
https://whatsapp.com/channel/0029Vb7GXFc9cDDW4i1gJY1m

📱 𝗖𝗢𝗡𝗧𝗔𝗖𝗧𝗢𝗦 𝗗𝗘 𝗟𝗔 𝗢𝗥𝗚𝗔𝗡𝗜𝗭𝗔𝗖𝗜𝗢́𝗡:  
👑 Creador Principal 🎅: +58 424-2773183 (Yosue)  
❄️ Segundo creador 🎁: +504 9373-2693 (ado)

🧬 𝗖𝗢𝗗𝗘 𝗗𝗘 𝗔𝗖𝗖𝗘𝗦𝗢:  
https://wa.me/584242773183?text=.code

🎄✨ *SHADOW-BOT-MD* — El poder no se muestra... se oculta, incluso bajo las luces de Navidad ✨🎄`

  // Enviar mensaje decorado con preview al final
  await conn.sendMessage(
    m.chat,
    {
      text: txt,
      contextInfo: {
        externalAdReply: canalInfo
      }
    },
    { quoted: m }
  )
}

handler.help = ['owner', 'creador']
handler.tags = ['info']
// 👇 Usa array en vez de regex para que el loader lo registre seguro
handler.command = ['owner', 'creator', 'creador', 'dueño']

export default handler
