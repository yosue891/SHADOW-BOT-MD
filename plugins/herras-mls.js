const handler = async (m, { conn }) => {
  const codeContent = `key: {
    remoteJid: '120363423514187718@g.us',
    remoteJidAlt: undefined,
    fromMe: false,
    id: 'A54F66F85457C83E39DD96F8167074CF',
    participant: '276995896258574@lid',
    participantAlt: '51928616320@s.whatsapp.net',
    addressingMode: 'lid'
  },
  message: Message {
    extendedTextMessage: ExtendedTextMessage {
      text: '.ver',
      contextInfo: ContextInfo {
        stanzaId: 'SUKIB9B1F886466F7EFF',
        participant: '261181826699458@lid',
        quotedMessage: Message { conversation: '\\ntexto2' }
      }
    }
  },
  id: 'A54F66F85457C83E39DD96F8167074CF',
  chat: '120363423514187718@g.us',
  sender: '276995896258574@lid',
  pushName: 'Manuel VG',
  body: '.ver'`

  await conn.sendMessage(m.chat, {
    text: 'texto2',
    contextInfo: {
      externalAdReply: {
        title: 'Código en Python',
        body: 'Ver código',
        mediaType: 1,
        previewType: 0,
        showAdAttribution: true,
        renderLargerThumbnail: false,
        sourceUrl: 'https://whatsapp.com',
        thumbnailUrl: 'https://files.catbox.moe/wfd0ze.jpg' // Tu logo de Shadow
      },
      // Aquí metemos la estructura de quoted que pasaste
      stanzaId: 'SUKIB9B1F886466F7EFF',
      participant: '261181826699458@lid',
      quotedMessage: {
        conversation: codeContent
      }
    }
  }, { quoted: m })
}

handler.help = ['mls']
handler.tags = ['main']
handler.command = ['mls']

export default handler
