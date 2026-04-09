const handler = async (m, { conn }) => {
  const codeContent = `key: {
    remoteJid: '120363423514187718@g.us',
    remoteJidAlt: undefined,
    fromMe: false,
    id: 'A55710042BA2828678DF2B26299FE371',
    participant: '276995896258574@lid',
    participantAlt: '51928616320@s.whatsapp.net',
    addressingMode: 'lid'
  },
  message: Message {
    extendedTextMessage: ExtendedTextMessage {
      text: '.ver',
      contextInfo: ContextInfo {
        stanzaId: 'SUKI236A27D55592C20C',
        participant: '261181826699458@lid',
        quotedMessage: Message { conversation: 'HTML_CODE_CONTENT...' }
      }
    }
  }`

  await conn.sendMessage(m.chat, {
    text: 'texto2',
    contextInfo: {
      // Esto genera la tarjeta de "Ver código"
      externalAdReply: {
        title: 'Código en Python',
        body: 'Ver código',
        mediaType: 1,
        previewType: 0,
        showAdAttribution: false,
        renderLargerThumbnail: false,
        thumbnailUrl: 'https://files.catbox.moe/wfd0ze.jpg', 
        sourceUrl: 'https://whatsapp.com'
      },
      // Forzamos la estructura de citado para que aparezca el cuadro gris
      stanzaId: 'SUKI236A27D55592C20C',
      participant: '261181826699458@lid',
      quotedMessage: {
        buttonsMessage: {
          contentText: codeContent,
          footerText: 'Shadow Bot',
          buttons: [],
          headerType: 1
        }
      }
    }
  }, { quoted: m })
}

handler.help = ['mls']
handler.tags = ['main']
handler.command = ['mls']

export default handler
