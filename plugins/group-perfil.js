import fetch from 'node-fetch'

const media = 'https://files.catbox.moe/lcn1kw.mp4'

var handler = async (m, { conn }) => {
  let who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
  let username = await conn.getName(who)

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

  await conn.sendMessage(m.chat, { text: animacion, ...rcanal }, { quoted: m })

  // Texto principal estilo Shadow navideño
  let str = `🎄✨ 『 ＡＲＣＨＩＶＯ ＳＯＭＢＲＡ 』 ✨🎄

🎅 *Portador:* ${username}
🆔 *Identificador:* @${who.replace(/@.+/, '')}
📜 *Registrado:* ${registered ? '✅ Sí' : '❌ No'}

✨ *Frase de las sombras:*
"${fraseElegida}"

┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
🌌 *Shadow-BOT-MD* — La sombra también celebra la Navidad UwU 🎁
`

  const wm = (typeof global !== 'undefined' && global.wm) ? global.wm : 'Shadow-BOT-MD ⚔️'
  const bot = 'Shadow-BOT-MD ⚔️'

  let fkontak = {
    key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
    message: {
      contactMessage: {
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
      }
    },
    participant: '0@s.whatsapp.net'
  }

  await conn.sendButton(
    m.chat,
    str,
    wm,
    media,
    [
      ['👑 Creadores 💗', '#owner'],
      ['☘️ Volver al Menú', '/menu']
    ],
    null,
    [[bot, 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O']],
    fkontak
  )
}

handler.help = ['profile']
handler.register = true
handler.group = true
handler.tags = ['rg']
handler.command = ['profile', 'perfil']
export default handler
