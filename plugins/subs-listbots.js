/*
	* Create By Fede Uchiha 
	* GitHub https://github.com/the-xyzz
	* Whatsapp: https://whatsapp.com/channel/0029VbBG4i2GE56rSgXsqw2W
*/

import ws from "ws"
import axios from "axios"
import { generateWAMessageContent, generateWAMessageFromContent, proto} from '@whiskeysockets/baileys'

const handler = async (m, { conn, command, usedPrefix}) => {
  try {
    const users = [
      global.conn.user.jid,
...new Set(
        global.conns
.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState!== ws.CLOSED)
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

    const subBotsActivos = users
.filter(jid => jid!== global.conn.user.jid)
.map((botJid, index) => {
        const v = global.conns.find((conn) => conn.user.jid === botJid)
        const uptime = v?.uptime? convertirMsADiasHorasMinutosSegundos(Date.now() - v.uptime): "Activo desde ahora"
        const mention = botJid.replace(/[^0-9]/g, '')
        const botNumber = botJid.split('@')[0]
        const botName = v?.user?.name || `Sub-Bot ${index + 1}`

        return `\`🪴 Shadow Sub-Bots\`  *[ ${index + 1} ]*

🌿 Tag:: @${mention}
🌴 ID:: wa.me/${botNumber}?text=.menu
🌱 Bot:: ${botName}
🍄 Uptime:: ${uptime}
────────────────`
}).join("\n")

    const countSubBotsActivos = users.length - 1

    const message = `\`🌴 Subbots activos:\` *${countSubBotsActivos}/20*\n\n${subBotsActivos}`

    const mentionList = users.filter(jid => jid!== global.conn.user.jid)

    const imageBuffer = (await axios.get("https://files.catbox.moe/1iurgf.jpg", { responseType: 'arraybuffer'})).data

    const { imageMessage} = await generateWAMessageContent({ image: imageBuffer}, { upload: conn.waUploadToServer});

    const interactiveButtons = [
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
    ];

    const messageParamsJson = JSON.stringify({});

    const interactiveMessage = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2},
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: { text: message.trim()},
            footer: { text: "¡Usa el botón para ser Sub-Bots!"},
            header: {
              hasMediaAttachment: true,
              imageMessage
            },
            nativeFlowMessage: {
              buttons: interactiveButtons,
              messageParamsJson
            },
            contextInfo: {
                mentionedJid: mentionList
            }
          })
        }
      }
    }, { quoted: m});
    
    await conn.relayMessage(m.chat, interactiveMessage.message, { messageId: interactiveMessage.key.id});


} catch (error) {
    m.reply(`⚠︎ ¡Ups! Algo falló.\n> Por favor, contacta al administrador si el problema persiste.\n\nDetalle técnico: ${error.message}`)
}
}

handler.tags = ["serbot"]
handler.help = ["botlist"]
handler.command = ["botlist", "listbots", "bots"]

export default handler
