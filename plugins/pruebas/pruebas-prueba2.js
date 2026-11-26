import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

const handler = async (m, { conn }) => {
  const RESPONSE_ID = 'popio steps'

  const stepEntries = [
    {
      __typename: 'GenAIStepThoughtEntry',
      header: 'title'
    },
    {
      __typename: 'GenAIStepThoughtEntry',
      header: 'title',
      body: 'deskripsi'
    },
    {
      __typename: 'GenAIStepThoughtEntry',
      header: 'title',
      body: 'title + deskripsi + url',
      sources: [
        {
          __typename: 'GenAIStepWebLinkSource',
          url: 'https://en.wikipedia.org/wiki/Coffee',
          title: 'Coffee — Wikipedia',
          favicon_url: 'https://en.wikipedia.org/static/images/icons/wikipedia.png'
        },
        {
          __typename: 'GenAIStepWebLinkSource',
          url: 'https://github.com',
          title: 'GitHub',
          favicon_url: 'https://github.githubassets.com/favicons/favicon.png'
        }
      ]
    },
    {
      __typename: 'GenAIStepThoughtEntry',
      header: 'title',
      body: 'title + deskripsi'
    },
    {
      __typename: 'GenAIStepThoughtEntry',
      header: 'title',
      body: 'title + deskripsi'
    },
    {
      __typename: 'GenAIStepThoughtEntry',
      header: 'title',
      body: 'title + deskripsi + url',
      sources: [
        {
          __typename: 'GenAIStepWebLinkSource',
          url: 'https://www.healthline.com/nutrition/coffee-benefits',
          title: 'Coffee: Health Benefits, Nutrition, and Risks — Healthline',
          favicon_url: 'https://www.healthline.com/favicon.ico'
        }
      ]
    }
  ]

  const embeddedScreens = [
    {
      __typename: 'FOAUnifiedResponseEmbeddedScreen',
      title: 'Thoughts',
      content: [
        {
          __typename: 'FOAEmbeddedScreenContentTabbed',
          tabs: [
            {
              __typename: 'FOAUnifiedResponseTab',
              id: 'steps',
              tab_header: 'Steps',
              sections: [],
              step_entries: stepEntries
            }
          ]
        }
      ]
    }
  ]

  const canalId = global.idcanal || global.channelRD?.id || '120363403739366547@newsletter'
  const canalName = global.channelRD?.name || 'SHADOW-BOT'

  const payload = {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            {
              messageType: 2,
              messageText: 'full step'
            }
          ],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                __typename: 'GenAIUnifiedResponse',
                response_id: RESPONSE_ID,
                sections: [
                  {
                    __typename: 'GenAIUnifiedResponseSection',
                    view_model: {
                      __typename: 'GenAISingleLayoutViewModel',
                      primitive: {
                        __typename: 'GenAIBotProgressStatusPrimitive',
                        title: 'full step',
                        is_in_progress: true,
                        icon: 'THINKING'
                      }
                    }
                  }
                ],
                embedded_screens: embeddedScreens
              })
            ).toString('base64')
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: canalId,
              serverMessageId: 100,
              newsletterName: canalName
            },
            forwardedAiBotMessageInfo: {
              botJid: '0@bot'
            },
            forwardOrigin: 4
          }
        }
      }
    }
  }

  try {
    const userJid = conn.user?.id || conn.authState?.creds?.me?.id
    const msg = generateWAMessageFromContent(m.chat, payload, {
      userJid,
      quoted: m
    })
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  } catch {
    await conn.relayMessage(m.chat, payload, { quoted: m })
  }
}

handler.command = ['prueba2']
handler.tags = ['pruebas']
handler.help = ['prueba2']

export default handler
