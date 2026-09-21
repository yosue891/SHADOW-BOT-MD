export async function before(m, { conn }) {
  try {
    const canales = [global.idcanal || '120363403739366547@newsletter', global.idcanal2 || '120363403739366547@newsletter']
    const channelRD = global.channelRD || { id: canales[0], name: 'SHADOW-BOT-MD' }

    global.rcanal = {
      contextInfo: {
        isForwarded: true,
        forwardingScore: 1,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelRD.id,
          serverMessageId: 100,
          newsletterName: channelRD.name,
        },
        matchedText: ""
      }
    }

  } catch (e) {
    console.log('Error al generar rcanal:', e)
  }
}
