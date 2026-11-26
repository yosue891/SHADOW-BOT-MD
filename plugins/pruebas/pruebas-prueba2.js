const handler = async (m, { conn }) => {
  const IMG = 'https://upload.lntrl.dev/f/beypeyg.jpg'
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
      artifacts: [
        {
          __typename: 'GenAIImagePrimitive',
          asset_query_status: 'FETCHED',
          preview_image: {
            url: IMG,
            mime_type: 'image/jpeg',
            width: 800,
            height: 450
          },
          full_image: {
            url: IMG,
            mime_type: 'image/jpeg',
            width: 1600,
            height: 900
          },
          source: {
            source_type: 'IMAGE_GEN',
            source_display_name: 'beypeyg.jpg'
          }
        }
      ]
    },
    {
      __typename: 'GenAIStepThoughtEntry',
      header: 'title',
      body: 'title + deskripsi + image',
      artifacts: [
        {
          __typename: 'GenAIImagePrimitive',
          asset_query_status: 'FETCHED',
          preview_image: {
            url: IMG,
            mime_type: 'image/jpeg',
            width: 800,
            height: 450
          },
          full_image: {
            url: IMG,
            mime_type: 'image/jpeg',
            width: 1600,
            height: 900
          },
          source: {
            source_type: 'IMAGE_GEN',
            source_display_name: 'beypeyg.jpg'
          }
        }
      ]
    },
    {
      __typename: 'GenAIStepThoughtEntry',
      header: 'title',
      body: 'title + deskripsi + image + url',
      sources: [
        {
          __typename: 'GenAIStepWebLinkSource',
          url: 'https://www.healthline.com/nutrition/coffee-benefits',
          title: 'Coffee: Health Benefits, Nutrition, and Risks — Healthline',
          favicon_url: 'https://www.healthline.com/favicon.ico'
        }
      ],
      artifacts: [
        {
          __typename: 'GenAIImagePrimitive',
          asset_query_status: 'FETCHED',
          preview_image: {
            url: IMG,
            mime_type: 'image/jpeg',
            width: 800,
            height: 450
          },
          full_image: {
            url: IMG,
            mime_type: 'image/jpeg',
            width: 1600,
            height: 900
          },
          source: {
            source_type: 'IMAGE_GEN',
            source_display_name: 'beypeyg.jpg'
          }
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

  await conn.relayMessage(
    m.chat,
    {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
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
                          __typename: 'GenAIMetadataTextPrimitive',
                          text: 'full step'
                        }
                      }
                    }
                  ],
                  embedded_screens: embeddedScreens
                })
              ).toString('base64')
            },
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: canalId,
                serverMessageId: 100,
                newsletterName: canalName
              },
              forwardedAiBotMessageInfo: {
                botJid: '259786046210223@bot'
              },
              forwardOrigin: 4,
              botMessageSharingInfo: {
                botEntryPointOrigin: 1,
                forwardScore: 4
              }
            }
          }
        }
      }
    },
    { quoted: m }
  )
}

handler.command = ['prueba2']
handler.tags = ['pruebas']
handler.help = ['prueba2']

export default handler
