import fetch from 'node-fetch'

const imagen1 = 'https://files.catbox.moe/7sc3os.jpg'

var handler = async (m, { conn }) => {
  let who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender

  let pp
  try {
    pp = await conn.profilePictureUrl(who, 'image')
  } catch {
    pp = imagen1
  }

  let user = global.db.data.users[who]
  if (!user) {
    global.db.data.users[who] = {
      registered: false,
      regTime: -1,
      age: 0
    }
    user = global.db.data.users[who]
  }

  let { registered } = user
  let username = await conn.getName(who)

  // Frases estilo Shadow navideñas
  const frasesShadow = [
    'Las sombras celebran en silencio, pero su poder nunca se apaga 🎄',
    'El invierno cubre la luz, pero las sombras siguen vigilando ❄️',
    'La navidad también pertenece al reino oculto 🌌',
    'Quien abraza sus sombras, encuentra la verdadera calma ✨',
    'Las sombras no descansan, ni siquiera en fiestas 🎁'
  ]
  const fraseElegida = frasesShadow[Math.floor(Math.random() * frasesShadow.length)]

  // Animación inicial estilo bot cargando
  let animacion = `
〘 *Shadow Bot — Sistema en Carga* 〙🎄

🎅 Preparando archivos secretos...
❄️ Sincronizando con el Reino Oculto...
🎁 Activando protocolos navideños...

✨✨✨ 𝙲𝙰𝚁𝙶𝙰 𝙲𝙾𝙼𝙿𝙻𝙴𝚃𝙰 ✨✨✨

*El archivo de las sombras ha sido abierto...*
`.trim()

  await conn.sendMessage(m.chat, { text: animacion }, { quoted: m })

  // Imagen pequeña estilo WhatsApp Business
  const thumbBuffer = await (await fetch(imagen1)).buffer()
  const fkontak = {
    key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'Shadow' },
    message: {
      locationMessage: {
        name: '📍 Shadow Bot — Perfil 🎄',
        jpegThumbnail: thumbBuffer,
        vcard:
          'BEGIN:VCARD\nVERSION:3.0\nN:;Shadow;;;\nFN:Shadow\nORG:Shadow Garden\nitem1.TEL;waid=584242773183:+58 424 2773183\nitem1.X-ABLabel:Shadow\nEND:VCARD'
      }
    },
    participant: '0@s.whatsapp.net'
  }

  // Mensaje principal
  let perfilMsg = `
『 ＡＲＣＨＩＶＯ ＳＯＭＢＲＡ 』🎄

🎅 *Portador:* ${username}
🆔 *Identificador:* @${who.replace(/@.+/, '')}
📜 *Registrado:* ${registered ? '✅ Sí' : '❌ No'}

✨ *Frase de las sombras:*
"${fraseElegida}"
`.trim()

  await conn.sendMessage(
    m.chat,
    {
      image: { url: pp },
      caption: perfilMsg,
      mentions: [who],
      footer: 'Shadow Bot — Perfil',
      buttons: [
        {
          buttonId: 'menu',
          buttonText: { displayText: '🎄 Volver al Menú 🎄' },
          type: 1
        }
      ],
      headerType: 4
    },
    { quoted: fkontak }
  )
}

handler.help = ['profile']
handler.register = true
handler.group = true
handler.tags = ['rg']
handler.command = ['profile', 'perfil']
export default handler
