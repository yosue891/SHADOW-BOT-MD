const handler = async (m, { conn }) => {
    const msg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        title: "",
                        hasMediaAttachment: false
                    },
                    body: {
                        text: "texto2"
                    },
                    footer: {
                        text: "Shadow Bot — MLS"
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_code",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Ver código",
                                    title: "Código en Python",
                                    code: `key: {
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
  from: '120363423514187718@g.us',
  sender: '276995896258574@lid',
  pushName: 'Manuel VG',
  body: '.ver'`
                                })
                            }
                        ],
                        messageParamsJson: ""
                    }
                }
            }
        }
    }

    await conn.relayMessage(m.chat, msg, { messageId: m.key.id })
}

handler.help = ['mls']
handler.tags = ['main']
handler.command = ['mls']

export default handler
