import axios from "axios"
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const handler = async (m, { conn }) => {
  try {
    await m.react("👑")

    const creators = [
      {
        name: "Yosue",
        role: "Owner Principal",
        number: "584242773183",
        image: "https://i.ibb.co/3NfYh9k/default-avatar.png",
        description: "Creador principal y encargado del desarrollo general.\n\n🌐 GitHub: github.com/yosue891\n📢 Canal: https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
        btnLabel: "Canal de Yosue",
        btnUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
      },
      {
        name: "Ado",
        role: "Segundo Creador Principal",
        number: "50498273976",
        image: "https://i.ibb.co/3NfYh9k/default-avatar.png",
        description: "Co-creador y encargado de la optimización y soporte del proyecto.\n\n🌐 GitHub: github.com/ado-hub\n📢 Canal: https://whatsapp.com/channel/0029VbD5h6s0AgWBpfCQlw2P\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
        btnLabel: "Canal de Ado",
        btnUrl: "https://whatsapp.com/channel/0029VbD5h6s0AgWBpfCQlw2P"
      },
      {
        name: "Gabriel",
        role: "Desarrollador",
        number: "584248272650",
        image: "https://i.ibb.co/3NfYh9k/default-avatar.png",
        description: "Soporte técnico y desarrollador de funciones avanzadas.\n\n💬 Grupo: https://chat.whatsapp.com/GNZoTT5MKYe6yJtfCdCqoO\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
        btnLabel: "Grupo de Ventas/Sorteos",
        btnUrl: "https://chat.whatsapp.com/GNZoTT5MKYe6yJtfCdCqoO"
      }
    ]

    let cards = []
    const fallbackImage = "https://files.catbox.moe/mwhyfm.jpg"

    for (let creator of creators) {
      let imageBuffer
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);
        imageBuffer = (await axios.get(creator.image, { responseType: 'arraybuffer', signal: controller.signal })).data
      } catch {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);
        imageBuffer = (await axios.get(fallbackImage, { responseType: 'arraybuffer', signal: controller.signal })).data
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
                display_text: creator.btnLabel,
                url: creator.btnUrl
              })
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "Repositorio GitHub",
                url: "https://github.com/yosue891/SHADOW-BOT-MD.git"
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

    await conn.sendMessage(m.chat, { 
      text: "Estos son los creadores y desarrolladores más destacados en Shadow-BOT-MD si hay algún error o falla no olvides en reportarlo por alguno de nosotros (y nada de estar escribiendo a media noche por qué no te vamos a contestar)" 
    }, { quoted: m })

  } catch (error) {
    m.reply(`¡Ups! Algo falló.\n\nDetalle técnico: ${error.message}`)
  }
}

handler.tags = ["main"]
handler.help = ["owner"]
handler.command = /^(owner|creators|creadores|owners|desarrolladores)$/i

export default handler
