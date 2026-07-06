import axios from "axios"
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const handler = async (m, { conn }) => {
  try {
    const creators = [
      {
        name: "Yosue",
        role: "Owner Principal",
        number: "584242773183",
        image: "https://adofiles.vercel.app/dl/a1fbe517.jpg",
        description: "Creador principal y encargado del desarrollo general.\n\n🌐 GitHub: github.com/yosue-dev\n📸 Instagram: @yosue.fx"
      },
      {
        name: "Ado",
        role: "Segundo Creador Principal",
        number: "50498273976",
        image: "https://adofiles.vercel.app/dl/68799b5b.jpg",
        description: "Co-creador y encargado de la optimización y soporte del proyecto.\n\n🌐 GitHub: github.com/ado-hub\n🌍 Web: adofiles.com"
      },
      {
        name: "Gabriel",
        role: "Desarrollador",
        number: "584248272650",
        image: "https://adofiles.vercel.app/dl/0b4c0d1e.jpg",
        description: "Soporte técnico y desarrollador de funciones avanzadas.\n\n🌐 GitHub: github.com/gabriel-dev\n💬 Discord: gabriel#0001"
      }
    ]

    let cards = []
    const fallbackImage = "https://files.catbox.moe/mwhyfm.jpg"

    for (let creator of creators) {
      let imageBuffer
      try {
        imageBuffer = (await axios.get(creator.image, { responseType: 'arraybuffer' })).data
      } catch {
        imageBuffer = (await axios.get(fallbackImage, { responseType: 'arraybuffer' })).data
      }

      const { imageMessage } = await generateWAMessageContent({ image: imageBuffer }, { upload: conn.waUploadToServer })

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({ 
          text: `Desarrollador: ${creator.name}\nRol: ${creator.role}\n\n${creator.description}` 
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ 
          text: "error404 project" 
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ 
          title: creator.name, 
          hasMediaAttachment: true, 
          imageMessage 
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: `Chatear con ${creator.name}`,
                url: `https://wa.me/${creator.number}?text=Hola+${creator.name},+vengo+desde+el+bot.`
              })
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "Canal Oficial",
                url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
              })
            }
          ]
        })
      })
    }

    const messageContent = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({ 
              text: "Presentamos al equipo oficial de desarrollo detrás de este proyecto." 
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({ 
              text: "Desliza para ver a los creadores" 
            }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
          })
        }
      }
    }, { quoted: m })

    await conn.relayMessage(m.chat, messageContent.message, { messageId: messageContent.key.id })

  } catch (error) {
    m.reply(`¡Ups! Algo falló.\n\nDetalle técnico: ${error.message}`)
  }
}

handler.tags = ["main"]
handler.help = ["owner"]
handler.command = /^(owner|creators|creadores|owners|desarrolladores)$/i

export default handler
