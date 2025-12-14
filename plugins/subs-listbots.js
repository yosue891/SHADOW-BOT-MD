import ws from "ws"
import axios from "axios"

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

        return `\`🪴 Subbot\`  *[ ${index + 1} ]*

🌿 Tag:: @${mention}
🌴 ID:: wa.me/${botNumber}?text=.menu
🌱 Bot:: ${botName}
🍄 Uptime:: ${uptime}
────────────────`
}).join("\n")

    const countSubBotsActivos = users.length - 1

    const message = `\`🌴 Subbots activos:\` *${countSubBotsActivos}/20*

${subBotsActivos}`

    const mentionList = users.filter(jid => jid!== global.conn.user.jid)

    const imageBuffer = (await axios.get("https://files.catbox.moe/1iurgf.jpg", { responseType: 'arraybuffer'})).data

    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption: message,
      footer: "¡Únete a nuestro canal para más novedades!",
      buttons: [
        {
          buttonId: "canal_oficial",
          buttonText: { displayText: "Canal Oficial"},
          type: 1
}
      ],
      headerType: 4,
      contextInfo: {
        mentionedJid: mentionList
}
}, { quoted: m})

} catch (error) {
    m.reply(`⚠︎ ¡Ups! Algo falló.\n> Por favor, contacta al administrador si el problema persiste.\n\nDetalle técnico: ${error.message}`)
}
}

handler.tags = ["serbot"]
handler.help = ["botlist"]
handler.command = ["botlist", "listbots", "listbot", "bots", "sockets", "socket"]

export default handler
