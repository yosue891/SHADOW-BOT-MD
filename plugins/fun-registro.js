import fetch from 'node-fetch'

let handler = async (m, { conn, usedPrefix }) => {
  const thumbBuffer = await (await fetch('https://iili.io/fXp3swb.jpg')).buffer()

  const fkontak = {
    key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'Shadow' },
    message: {
      locationMessage: {
        name: 'Registro requerido',
        jpegThumbnail: thumbBuffer,
        vcard:
          'BEGIN:VCARD\nVERSION:3.0\nN:;Shadow;;;\nFN:Shadow\nORG:Shadow Garden\nitem1.TEL;waid=584242773183:+58 424 2773183\nitem1.X-ABLabel:Shadow\nEND:VCARD'
      }
    },
    participant: '0@s.whatsapp.net'
  }

  const productMessage = {
    product: {
      productImage: { url: 'https://files.catbox.moe/n3bg2n.jpg' },
      productId: '999999999999999',
      title: 'REGISTRO',
      description: 'Registro requerido',
      currencyCode: 'USD',
      priceAmount1000: '0',
      retailerId: 1677,
      url: `https://wa.me/584242773183`,
      productImageCount: 1
    },
    businessOwnerJid: '584242773183@s.whatsapp.net',
    caption: `
╭─「 *Registro Requerido* 」
│
│𔓕 Hola *${m.pushName || 'usuario'}*
│𔓕 Para usar el bot necesitas registrarte
│𔓕 Comando: \`${usedPrefix}reg nombre.edad\`
│𔓕 Ejemplo: \`${usedPrefix}reg shadow.18\`
│
╰─「 *Shadow Garden* 」`.trim(),
    footer: '🌌 Shadow Bot',
    interactiveButtons: [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '📝 Registrarse',
          id: `${usedPrefix}reg`
        })
      },
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: '👑 Creador',
          url: 'https://wa.me/584242773183'
        })
      }
    ],
    mentions: [m.sender],
    contextInfo: {
      externalAdReply: {
        showAdAttribution: true,
        title: 'Shadow • Sistema de Registro',
        body: 'Registro uwu',
        mediaType: 1,
        thumbnailUrl: 'https://files.catbox.moe/n3bg2n.jpg',
        sourceUrl: 'https://wa.me/584242773183'
      }
    }
  }

  await conn.sendMessage(m.chat, productMessage, { quoted: fkontak })
}

handler.command = ['registro', 'regmenu', 'reginfo']
handler.tags = ['info']

export default handler
