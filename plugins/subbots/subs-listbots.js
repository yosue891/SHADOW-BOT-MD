import ws from "ws"
import axios from "axios"
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const handler = async (m, { conn, command, usedPrefix }) => {
  try {
    const users = [
      global.conn.user.jid,
      ...new Set(
        global.conns
          .filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED)
          .map((conn) => conn.user.jid)
      )
    ]

    function convertirMsADiasHorasMinutosSegundos(ms) {
      const segundos = Math.floor(ms / 1000)
      const minutos = Math.floor(segundos / 60)
      const horas = Math.floor(minutos / 60)
      const días = Math.floor(horas / 24)
      const segRest = segundos % 60
      const minRest = minutos % 60
      const horasRest = horas % 24
      let resultado = ""
      if (días) resultado += `${días}d `
      if (horasRest) resultado += `${horasRest}h `
      if (minRest) resultado += `${minRest}m `
      if (segRest) resultado += `${segRest}s`
      return resultado.trim() || 'menos de 1s'
    }

    const subBotsActivos = users.filter(jid => jid !== global.conn.user.jid)

    let cards = []
    let counter = 1

    for (let botJid of subBotsActivos) {
      const v = global.conns.find((conn) => conn.user.jid === botJid)
      const uptime = v?.uptime ? convertirMsADiasHorasMinutosSegundos(Date.now() - v.uptime) : "Activo desde ahora"
      const mention = botJid.replace(/[^0-9]/g, '')
      const botNumber = botJid.split('@')[0]
      const botName = v?.user?.name || `Sub-Bot ${counter}`

      const imageBuffer = (await axios.get("https://files.catbox.moe/mwhyfm.jpg", { responseType: 'arraybuffer' })).data
      const { imageMessage } = await generateWAMessageContent({ image: imageBuffer }, { upload: conn.waUploadToServer })

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: `🪴 Sub-Bot ${counter}\n🌱 Nombre: ${botName}\n🍄 Uptime: ${uptime}` }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "✨ Usa el botón para interactuar" }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: `ID: wa.me/${botNumber}?text=.menu`, hasMediaAttachment: true, imageMessage }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: "Ser Sub-Bot",
                id: ".code"
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
      counter++
    }

    const messageContent = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({ text: `🌴 Subbots activos: ${subBotsActivos.length}/20` }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: "Selecciona un Sub-Bot del carrusel 🌿" }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
          })
        }
      }
    }, { quoted: m })

    await conn.relayMessage(m.chat, messageContent.message, { messageId: messageContent.key.id })

  } catch (error) {
    m.reply(`⚠︎ ¡Ups! Algo falló.\n> Contacta al administrador si el problema persiste.\n\nDetalle técnico: ${error.message}`)
  }
}

handler.tags = ["socket"]
handler.help = ["botlist"]
handler.command = ["botlist", "listbots", "bots"]

export default handler
