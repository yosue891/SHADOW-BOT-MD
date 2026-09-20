const handler = async (m, { conn }) => {

  await conn.relayMessage(m.chat, {
messageContextInfo: {
    deviceListMetadataVersion: 2,
    botMetadata: {
      messageDisclaimerText: "Contenido Completo de Meta Ai"
    }
  },
  botForwardedMessage: {
    message: {
      richResponseMessage: {
        submessages: [],
        messageType: 1,
        unifiedResponse: {
          data: Buffer.from(JSON.stringify({
              response_id: 'BAE5' + Math.random().toString(36).substring(2, 15).toUpperCase(),
            sections: [
              {
                view_model: {
                  primitive: {
                    text: "# Texto",
                    __typename: "GenAIMarkdownTextUXPrimitive"
                  },
                  __typename: "GenAISingleLayoutViewModel"
                }
              },
                {
                view_model: {
                  primitive: {
                    text: `
---`,
                    __typename: "GenAIMarkdownTextUXPrimitive"
                  },
                  __typename: "GenAISingleLayoutViewModel"
                }
              },
              {
                view_model: {
                  primitive: {
                    title: "Producto",
                    brand: "Contacto",
                    price: "S/100",
                    sale_price: "S/50",
                    product_url: "https://wa.me/p/25697885489797403/51900373696",
                    image: {
                      url: "https://iili.io/K030s44.jpg"
                    },
                    additional_images: [
                      {
                        url: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/additional_image_1.png"
                      }
                    ],
                    __typename: "GenAIProductItemCardPrimitive"
                  },
                  __typename: "GenAISingleLayoutViewModel"
                }
              },
              {
                view_model: {
                  primitive: {
                    text: `
---`,
                    __typename: "GenAIMarkdownTextUXPrimitive"
                  },
                  __typename: "GenAISingleLayoutViewModel"
                }
              },
              {
                view_model: {
                  primitives: [
                    {
                      title: "Producto",
                      brand: "Contacto",
                      price: "S/100",
                      sale_price: "S/50",
                      product_url: "https://wa.me/p/25697885489797403/51900373696",
                      image: {
                        url: "https://iili.io/K030s44.jpg"
                      },
                      additional_images: [
                        {
                          url: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/additional_image_1.png"
                        }
                      ],
                      __typename: "GenAIProductItemCardPrimitive"
                    },
                    {
                      title: "Producto",
                      brand: "Contacto",
                      price: "S/100",
                      sale_price: "S/50",
                      product_url: "https://wa.me/p/25697885489797403/51900373696",
                      image: {
                        url: "https://iili.io/K030s44.jpg"
                      },
                      additional_images: [
                        {
                          url: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/additional_image_1.png"
                        }
                      ],
                      __typename: "GenAIProductItemCardPrimitive"
                    }
                  ],
                  __typename: "GenAIHScrollLayoutViewModel"
                }
              }
            ]
          })).toString('base64')
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

}

handler.command = ['prodz']
export default handler
