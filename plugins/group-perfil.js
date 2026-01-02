import fetch from 'node-fetch'

const imagen1 = 'https://files.catbox.moe/7sc3os.jpg'

var handler = async (m, { conn, usedPrefix }) => {
  // ✅ Capturamos el JID desde el botón si existe
  const idBtn = m?.message?.buttonsResponseMessage?.selectedButtonId || ''
  const fromBtn = idBtn.split(' ')[1]
  const who = (fromBtn && fromBtn.includes('@s.whatsapp.net'))
    ? fromBtn
    : m.mentionedJid?.[0] || m.quoted?.sender || m.sender

  let username = await conn.getName(who)

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

  const frasesShadow = [
    'Las sombras celebran en silencio, pero su poder nunca se apaga 🎄',
    'El invierno cubre la luz, pero las sombras siguen vigilando ❄️',
    'La navidad también pertenece al reino oculto 🌌',
    'Quien abraza sus sombras, encuentra la verdadera calma ✨',
    'Las sombras no descansan, ni siquiera en fiestas 🎁'
  ]
  const fraseElegida = frasesShadow[Math.floor(Math.random() * frasesShadow.length)]

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
    pp,
    [
      ['👑 Creadores 💗', '#owner'],
      ['☘️ Volver al Menú', `${usedPrefix}menu`]
    ],
    null,
    [[bot, 'https://github.com/yosue891/SHADOW-BOT-MD.git']],
    fkontak
  )
}

handler.help = ['perfil']
handler.tags = ['rg']
handler.command = ['perfil', 'profile']
export default handler
