import ws from "ws"
import axios from "axios"
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const IMAGEN_CARRUSEL = "https://files.catbox.moe/mwhyfm.jpg"
const CANAL_OFICIAL = "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
const MAX_SUBBOTS = 20

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

const handler = async (m, { conn, usedPrefix }) => {
  // global.conns solo lo inicializan subs-conexion.js y subs-darcode.js.
  // Si nadie los usó todavía, no existe y esto revienta.
  if (!Array.isArray(global.conns)) global.conns = []

  const botPrincipal = global.conn?.user?.jid || global.conn?.user?.id
  if (!botPrincipal) {
    return m.reply([
      `🤖 *El bot todavía no está vinculado.*`,
      ``,
      `No puedo listar los Sub-Bots porque la sesión principal no está iniciada.`,
      `Reinicia el bot y escanea el código QR.`,
    ].join('\n'))
  }

  const conectados = global.conns.filter(
    (c) => c?.user && c?.ws?.socket && c.ws.socket.readyState !== ws.CLOSED
  )

  /* ── Sin Sub-Bots: el carrusel no puede ir vacío ──
   * WhatsApp descarta en silencio un carrusel sin tarjetas, así que antes
   * esto no enviaba absolutamente nada. Ahora avisa y explica cómo crear uno. */
  if (!conectados.length) {
    return m.reply([
      `🤖 *No hay Sub-Bots activos ahora mismo.*`,
      ``,
      `El carrusel aparece cuando hay al menos un Sub-Bot conectado.`,
      ``,
      `*¿Cómo creo uno?*`,
      `• \`${usedPrefix}code\` → te da un código para vincular otro número`,
      `• \`${usedPrefix}qr\` → te da el QR para escanearlo`,
      ``,
      `Cuando conectes uno, vuelve a usar \`${usedPrefix}bots\` y vas a ver el carrusel. 🌿`,
    ].join('\n'))
  }

  // Una sola descarga y una sola subida para todas las tarjetas.
  // Antes se bajaba la misma imagen una vez por Sub-Bot.
  let imageMessage = null
  try {
    const { data: imageBuffer } = await axios.get(IMAGEN_CARRUSEL, {
      responseType: 'arraybuffer',
      timeout: 20000,
    })
    const contenido = await generateWAMessageContent(
      { image: imageBuffer },
      { upload: conn.waUploadToServer }
    )
    imageMessage = contenido.imageMessage
  } catch {
    imageMessage = null // el carrusel igual sirve sin imagen
  }

  const cards = conectados.map((v, i) => {
    const botJid = v.user.jid
    const botNumber = botJid.split('@')[0]
    const uptime = v.uptime
      ? convertirMsADiasHorasMinutosSegundos(Date.now() - v.uptime)
      : "Activo desde ahora"
    const botName = v.user?.name || `Sub-Bot ${i + 1}`

    const botones = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: "Ser Sub-Bot", id: `${usedPrefix}code` }),
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({ display_text: "Canal Oficial", url: CANAL_OFICIAL }),
      },
    ]

    const header = {
      title: `ID: wa.me/${botNumber}?text=.menu`,
      hasMediaAttachment: Boolean(imageMessage),
    }
    if (imageMessage) header.imageMessage = imageMessage

    return {
      body: proto.Message.InteractiveMessage.Body.fromObject({
        text: `🪴 Sub-Bot ${i + 1}\n🌱 Nombre: ${botName}\n🍄 Uptime: ${uptime}`,
      }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({
        text: "✨ Usa el botón para interactuar",
      }),
      header: proto.Message.InteractiveMessage.Header.fromObject(header),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: botones }),
    }
  })

  // Lista de respaldo: si el carrusel no se puede enviar, al menos llega esto.
  const textoRespaldo = [
    `🌴 *Sub-Bots activos: ${conectados.length}/${MAX_SUBBOTS}*`,
    ``,
    ...conectados.map((v, i) => {
      const uptime = v.uptime
        ? convertirMsADiasHorasMinutosSegundos(Date.now() - v.uptime)
        : "Activo desde ahora"
      return `🪴 *${i + 1}. ${v.user?.name || `Sub-Bot ${i + 1}`}*\n🔢 wa.me/${v.user.jid.split('@')[0]}?text=.menu\n🍄 Uptime: ${uptime}`
    }),
    ``,
    `Selecciona un Sub-Bot del carrusel 🌿`,
  ].join('\n')

  try {
    const messageContent = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({
              text: `🌴 Subbots activos: ${conectados.length}/${MAX_SUBBOTS}`,
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: "Selecciona un Sub-Bot del carrusel 🌿",
            }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards }),
          }),
        },
      },
    }, { quoted: m })

    await conn.relayMessage(m.chat, messageContent.message, { messageId: messageContent.key.id })
  } catch (error) {
    // Si el carrusel falla (versión de WhatsApp, imagen, etc.) mandamos la lista.
    await m.reply(`⚠︎ No pude mostrar el carrusel (${error?.message || 'error desconocido'}).\n\nTe dejo la lista:\n\n${textoRespaldo}`)
  }
}

handler.tags = ["socket"]
handler.help = ["bots"]
handler.command = ["botlist", "listbots", "bots"]

export { convertirMsADiasHorasMinutosSegundos, MAX_SUBBOTS, CANAL_OFICIAL, IMAGEN_CARRUSEL }
export default handler
