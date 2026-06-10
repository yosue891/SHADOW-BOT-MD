import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys"

export async function before(m, { conn, usedPrefix }) {
  if (!m.isGroup) return
  if (!m.messageStubType) return

  const who = m.messageStubParameters?.[0]
  if (!who) return

  const taguser = `@${who.split('@')[0]}`
  const botname = global.author || 'Shadow Bot'

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
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botname}\nORG:${botname};\nTEL;type=CELL;type=VOICE;waid=0:+0\nEND:VCARD`
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
      '&desc=Evita+no+ser+espulsado' +
      `&profile=${encodeURIComponent(profile)}` +
      '&background=https%3A%2F%2Fraw.githubusercontent.com%2FEl-brayan502%2Fimg%2Fupload%2Fuploads%2F837853-1770608354526.jpg'

    const media = await prepareWAMessageMedia({ image: { url: welcomeImg } }, { upload: conn.waUploadToServer })

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: {
              text: `*Bienvenido/a al reino de las sombras*\n\n> Usuario: ${taguser}\n> Miembros totales: ${totalMembers}\n> Fecha: ${date}`.trim()
            },
            footer: {
              text: `© ${botname} · Welcome`
            },
            header: {
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "👤 Registrarme",
                    id: `${usedPrefix}reg user.19`
                  })
                }
              ]
            }
          }
        }
      },
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2
      },
      contextInfo: {
        mentionedJid: [who]
      }
    }, { quoted: fkontak })

    await conn.relayMessage(m.chat, msg.message, {})
  }

  if (m.messageStubType === 28 || m.messageStubType === 32) {
    const goodbyeImg =
      'https://api.ryuu-dev.offc.my.id/tools/WelcomeLeave?' +
      'title=Se+fue+del+grupo' +
      '&desc=gracias+a+dios+se+fue' +
      `&profile=${encodeURIComponent(profile)}` +
      '&background=https%3A%2F%2Fraw.githubusercontent.com%2FEl-brayan502%2Fimg%2Fupload%2Fuploads%2Ff1daa4-1770608515673.jpg'

    const media = await prepareWAMessageMedia({ image: { url: goodbyeImg } }, { upload: conn.waUploadToServer })

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: {
              text: `> Usuario: ${taguser}\n> Fecha: ${date}\n*se retira del reino de las sombras.*`.trim()
            },
            footer: {
              text: `© ${botname} · Goodbye`
            },
            header: {
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "👤 Registrarme",
                    id: `${usedPrefix}reg user.19`
                  })
                }
              ]
            }
          }
        }
      },
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2
      },
      contextInfo: {
        mentionedJid: [who]
      }
    }, { quoted: fkontak })

    await conn.relayMessage(m.chat, msg.message, {})
  }
}
