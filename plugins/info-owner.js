import fetch from 'node-fetch'
import PhoneNumber from 'awesome-phonenumber'

let handler = async (m, { conn }) => {
  await m.react('👑')

  const canalInfo = {
    showAdAttribution: true,
    title: '⚔️ Canal Oficial de SHADOW ⚔️',
    body: 'Sumérgete en las sombras. Únete al canal oficial.',
    thumbnailUrl: 'https://files.catbox.moe/iq1skp.jpg',
    sourceUrl: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O',
    mediaType: 1,
    renderLargerThumbnail: true
  }

  const numbers = [
    { num: '584242773183', name: '👑 Creador Principal (Yosue)', note: 'Shadow Master, mente detrás del reino.' },
    { num: '50493732693',  name: '⚔️ Segundo Creador (ado)',   note: 'Estratega de las Sombras.' },
    { num: '5491124918653', name: '🕯️ Tercer Creador (Fede)',  note: 'Arquitecto del código oculto.' }
  ]

  const generateVCard = ({ number, name, org, email, region, website, note }) => {
    const phone = PhoneNumber('+' + number)
    const intl = phone.getNumber('international') || '+' + number
    const clean = (text) => String(text).replace(/\n/g, '\\n').trim()

    return `
BEGIN:VCARD
VERSION:3.0
FN:${clean(name)}
ORG:${clean(org)}
TEL;type=CELL;waid=${number}:${intl}
EMAIL:${clean(email)}
ADR:;;${clean(region)};;;;
URL:${clean(website)}
NOTE:${clean(note)}
END:VCARD`.trim()
  }

  // Generar la lista de contactos
  const contactList = numbers.map(c => ({
    displayName: c.name,
    vcard: generateVCard({
      number: c.num,
      name: c.name,
      org: typeof dev !== 'undefined' ? dev : 'Shadow-BOT-MD',
      email: 'shadow@example.com',
      region: 'Shadow Realm',
      website: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O',
      note: c.note
    })
  }))

  await conn.sendMessage(
    m.chat,
    {
      contacts: {
        displayName: 'Contactos del Reino Shadow',
        contacts: contactList
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
⚔️ Segundo creador: +504 9373-2693 (ado)  
🕯️ Tercer Creador: +54 9 11-2491-8653 (Fede)

✦ *SHADOW-BOT-MD* — El poder no se muestra... se oculta en las sombras ✦`

  await conn.sendMessage(
    m.chat,
    {
      text: txt,
      contextInfo: {
        externalAdReply: canalInfo
      },
      ...rcanal
    },
    { quoted: m }
  )
}

handler.help = ['owner', 'creador']
handler.tags = ['info']
handler.command = ['owner', 'creator', 'creador', 'dueño']

export default handler
