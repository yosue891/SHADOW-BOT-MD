export async function before(m, { conn, usedPrefix }) {
  if (!m.isGroup) return
  if (!m.messageStubType) return

  const who = m.messageStubParameters?.[0]
  if (!who) return

  const taguser = `@${who.split('@')[0]}`
  const botname = global.author

  const metadata = await conn.groupMetadata(m.chat)
  const totalMembers = metadata.participants.length
  const date = new Date().toLocaleDateString('es-ES')

  const fkontak = {
    key: {
      participants: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
      fromMe: false,
      id: 'shadow-bot'
    },
    message: {
      contactMessage: {
        displayName: botname,
        vcard: `BEGIN:VCARD
VERSION:3.0
FN:${botname}
ORG:${botname};
TEL;type=CELL;type=VOICE;waid=0:+0
END:VCARD`
      }
    }
  }

  let profile
  try {
    profile = await conn.profilePictureUrl(who, 'image')
  } catch {
    profile = 'https://i.imgur.com/JP52fdP.png'
  }

  if (m.messageStubType === 27) {
    const welcomeImg =
      'https://api.ryuu-dev.offc.my.id/tools/WelcomeLeave?' +
      'title=Bienvenido+al+grupo' +
      '&desc=Evita+no+ser+expulsado' +
      `&profile=${encodeURIComponent(profile)}` +
      '&background=https%3A%2F%2Fraw.githubusercontent.com%2FEl-brayan502%2Fimg%2Fupload%2Fuploads%2F837853-1770608354526.jpg'

    await conn.sendMessage(
      m.chat,
      {
        image: { url: welcomeImg },
        caption: `
*Bienvenido/a al reino de las sombras*

> Usuario: ${taguser}
> Miembros totales: ${totalMembers}
> Fecha: ${date}
`.trim(),
        footer: `© ${botname} · Welcome`,
        buttons: [
          {
            buttonId: `${usedPrefix}reg user.19`,
            buttonText: { displayText: '👤 Registrarme' },
            type: 1
          }
        ],
        mentions: [who]
      },
      { quoted: fkontak }
    )
  }

  if (m.messageStubType === 28 || m.messageStubType === 32) {
    const goodbyeImg =
      'https://api.ryuu-dev.offc.my.id/tools/WelcomeLeave?' +
      'title=Se+fue+del+grupo' +
      '&desc=gracias+a+dios+se+fue' +
      `&profile=${encodeURIComponent(profile)}` +
      '&background=https%3A%2F%2Fraw.githubusercontent.com%2FEl-brayan502%2Fimg%2Fupload%2Fuploads%2Ff1daa4-1770608515673.jpg'

    await conn.sendMessage(
      m.chat,
      {
        image: { url: goodbyeImg },
        caption: `
> Usuario: ${taguser}
> Fecha: ${date}
*se retira del reino de las sombras.*
`.trim(),
        footer: `© ${botname} · Goodbye`,
        buttons: [
          {
            buttonId: `${usedPrefix}reg user.19`,
            buttonText: { displayText: '👤 Registrarme' },
            type: 1
          }
        ],
        mentions: [who]
      },
      { quoted: fkontak }
    )
  }
      }
