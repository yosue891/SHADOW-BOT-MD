import * as crypto from 'crypto'
import pkg from '@whiskeysockets/baileys'
const { generateMessageID } = pkg

const handler = async (m, { conn }) => {

  const reelItems = [
    {
      title: "Gian Pool",
      profileIconUrl: "https://cdn.russellxz.click/37046e86.jpg",
      thumbnailUrl: "https://iili.io/KTnEx7S.jpg", 
      videoUrl: ""
    }
  ]

  const sources = [
    {
      provider: 1,
      thumbnailCdnUrl: "",
      sourceProviderUrl: "https://www.google.com",
      sourceQuery: "",
      faviconCdnUrl: "https://external-content.duckduckgo.com/ip3/www.google.com.ico",
      citationNumber: 1,
      sourceTitle: "Google"
    }
  ]

  const submessages = [
    {
      messageType: 2,
      messageText: "Mira este link de Google:\n\n{{IE_0}}¹{{/IE_0}} Google"
    },
    {
      messageType: 9,
      contentItemsMetadata: {
        contentType: 1,
        itemsMetadata: reelItems.map(item => ({
          reelItem: {
            title: item.title,
            profileIconUrl: item.profileIconUrl,
            thumbnailUrl: item.thumbnailUrl,
            videoUrl: item.videoUrl
          }
        }))
      }
    }
  ]

  const unifiedResponseData = {
    response_id: crypto.randomUUID(),
    sections: [
      {
        view_model: {
          primitive: {
            text: "Mira este link de Google:\n\n{{IE_0}}¹{{/IE_0}} Google",
            inline_entities: [
              {
                key: "IE_0",
                metadata: {
                  reference_id: 1,
                  reference_url: "https://www.google.com",
                  reference_title: "Google",
                  reference_display_name: "google.com",
                  sources: [{
                    source_type: "THIRD_PARTY",
                    source_display_name: "google.com",
                    source_subtitle: "",
                    source_url: "https://www.google.com"
                  }],
                  __typename: "GenAISearchCitationItem"
                }
              }
            ],
            __typename: "GenAIMarkdownTextUXPrimitive"
          },
          __typename: "GenAISingleLayoutViewModel"
        }
      },
      {
        view_model: {
          primitives: reelItems.map((item, idx) => ({
            reels_url: item.videoUrl,
            thumbnail_url: item.thumbnailUrl,
            creator: item.title,
            avatar_url: item.profileIconUrl,
            reels_title: `Reel ${idx + 1}`,
            likes_count: 1500 + idx * 200,
            shares_count: 50 + idx * 10,
            view_count: 10000 + idx * 1000,
            reel_source: "IG",
            is_verified: true,
            __typename: "GenAIReelPrimitive"
          })),
          __typename: "GenAIHScrollLayoutViewModel"
        }
      },
      {
        view_model: {
          primitive: {
            sources: sources.map(s => ({
              source_type: "THIRD_PARTY",
              source_display_name: s.sourceTitle,
              source_subtitle: new URL(s.sourceProviderUrl).hostname.replace('www.', ''),
              source_url: s.sourceProviderUrl,
              favicon: {
                url: s.faviconCdnUrl || s.thumbnailCdnUrl,
                mime_type: "image/x-icon",
                width: 16,
                height: 16
              }
            })),
            search_engine: "BING",
            facepile_favicons: [],
            __typename: "GenAISearchResultPrimitive"
          },
          __typename: "GenAISingleLayoutViewModel"
        }
      }
    ]
  }

  await conn.relayMessage(m.chat, {
    messageContextInfo: {
      threadId: [],
      messageSecret: crypto.randomBytes(32).toString('base64'),
      botMetadata: {
        richResponseSourcesMetadata: { sources }
      }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          submessages: submessages,
          messageType: 1,
          unifiedResponse: {
            data: Buffer.from(JSON.stringify(unifiedResponseData)).toString('base64')
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: "867051314767696@bot"
            },
            forwardOrigin: 4
          }
        }
      }
    }
  }, {})
        await m.react?.('✅')
}

handler.command = ['reels']
export default handler
