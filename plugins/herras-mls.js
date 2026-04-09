const handler = async (m, { conn }) => {
    const code = `key: {
    remoteJid: '120363423514187718@g.us',
    id: 'A55710042BA2828678DF2B26299FE371',
    participant: '276995896258574@lid'
  },
  message: Message {
    extendedTextMessage: ExtendedTextMessage {
      text: '.ver',
      contextInfo: {
        stanzaId: 'SUKI236A27D55592C20C',
        participant: '261181826699458@lid'
      }
    }
  }`

    const msg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: "texto2" },
                    footer: { text: "Shadow Bot — MLS" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_code",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Ver código",
                                    title: "Código en Python",
                                    code: code
                                })
                            }
                        ]
                    },
                    contextInfo: {
                        // Forzamos el ID que pasaste en la estructura
                        stanzaId: 'SUKI236A27D55592C20C',
                        participant: '261181826699458@lid',
                        quotedMessage: {
                            conversation: ".mls"
                        }
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
