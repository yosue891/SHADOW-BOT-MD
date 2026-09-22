import ws from "ws"
import axios from "axios"
import { generateWAMessageContent, generateWAMessageFromContent, getAdditionalNode, proto } from '@whiskeysockets/baileys'

const IMAGEN_CARRUSEL = "https://files.catbox.moe/mwhyfm.jpg"
const CANAL_OFICIAL = "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
const MAX_SUBBOTS = 20
const TARJETAS_POR_MENSAJE = 10
const MEDIA_TIMEOUT_MS = 15000

function convertirMsADiasHorasMinutosSegundos(ms) {
  const segundos = Math.floor(Math.max(0, Number(ms) || 0) / 1000)
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

function normalizarJid(user) {
  // Baileys puede entregar id con sufijo de dispositivo y sin user.jid.
  for (const value of [user?.jid, user?.id]) {
    if (typeof value !== 'string') continue
    const match = /^(\d+)(?::\d+)?@(s\.whatsapp\.net|c\.us|lid)$/.exec(value)
    if (match) return `${match[1]}@${match[2] === 'c.us' ? 's.whatsapp.net' : match[2]}`
  }
  return null
}

function estaAbierto(sock) {
  const socket = sock?.ws
  const state = socket?.socket?.readyState ?? socket?.readyState
  // OPEN, no simplemente distinto de CLOSED: excluye CONNECTING y CLOSING.
  return state != null ? state === ws.OPEN : socket?.isOpen === true
}

async function conTiempoLimite(promise, ms) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

const handler = async (m, { conn, usedPrefix = '.' }) => {
  const principalJid = normalizarJid(global.conn?.user)
  const vistos = new Set()
  // Solo leer el registro: este comando no modifica ni desconecta sesiones.
  const conectados = (Array.isArray(global.conns) ? global.conns : []).flatMap(sock => {
    const jid = normalizarJid(sock?.user)
    if (!jid || !estaAbierto(sock) || jid === principalJid || vistos.has(jid)) return []
    vistos.add(jid)
    const inicio = Number(sock.uptime)
    return [{
      jid,
      number: jid.endsWith('@s.whatsapp.net') ? jid.split('@')[0] : null,
      name: String(sock.user.name || `Sub-Bot ${vistos.size}`).slice(0, 100),
      uptime: Number.isFinite(inicio) && inicio > 0
        ? convertirMsADiasHorasMinutosSegundos(Date.now() - inicio)
        : 'No disponible',
    }]
  })

  const resumen = `🌴 *Sub-Bots conectados: ${conectados.length}/${MAX_SUBBOTS}*`
  if (!conectados.length) {
    return m.reply(`${resumen}\n\nNo hay Sub-Bots activos ahora mismo.\nUsa \`${usedPrefix}code\` o \`${usedPrefix}qr\` para vincular uno.`)
  }

  // Un relay resuelto no garantiza que WhatsApp dibuje el carrusel.
  // El conteo debe llegar ANTES de descargar/subir medios o enviar tarjetas.
  await m.reply(resumen)

  const describir = (bot, i) => [
    `🪴 Sub-Bot ${i + 1}`,
    `🌱 Nombre: ${bot.name}`,
    bot.number ? `🔢 https://wa.me/${bot.number}` : `🔢 ID: ${bot.jid}`,
    `🍄 Uptime: ${bot.uptime}`,
  ].join('\n')

  const enviarLista = async (desde = 0) => {
    for (let offset = desde; offset < conectados.length; offset += TARJETAS_POR_MENSAJE) {
      const lista = conectados.slice(offset, offset + TARJETAS_POR_MENSAJE)
        .map((bot, i) => describir(bot, offset + i)).join('\n\n')
      await m.reply(`📋 *Lista de Sub-Bots conectados*\n\n${lista}`)
    }
  }

  let enviados = 0
  try {
    // Una descarga y una subida para todas las tarjetas, ambas acotadas.
    // Si no hay imagen válida, la lista de texto es más fiable que un carrusel sin medios.
    let imageMessage
    try {
      const { data } = await axios.get(IMAGEN_CARRUSEL, {
        responseType: 'arraybuffer',
        timeout: MEDIA_TIMEOUT_MS,
        maxContentLength: 5 * 1024 * 1024,
      })
      const contenido = await conTiempoLimite(generateWAMessageContent(
        { image: Buffer.from(data) },
        { upload: conn.waUploadToServer, mediaUploadTimeoutMs: MEDIA_TIMEOUT_MS }
      ), MEDIA_TIMEOUT_MS)
      imageMessage = contenido.imageMessage
    } catch (error) {
      console.warn('[bots] No se pudo preparar la imagen:', error?.message || error)
    }
    if (!imageMessage) return await enviarLista()

    // Evitar un carrusel enorme: conservar el total real y dividir las tarjetas.
    for (let offset = 0; offset < conectados.length; offset += TARJETAS_POR_MENSAJE) {
      const lote = conectados.slice(offset, offset + TARJETAS_POR_MENSAJE)
      const cards = lote.map((bot, i) => ({
        body: { text: describir(bot, offset + i) },
        footer: { text: '✨ Usa el botón para interactuar' },
        header: { title: bot.name, hasMediaAttachment: true, imageMessage },
        nativeFlowMessage: {
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: 'Ser Sub-Bot', id: `${usedPrefix}code` }),
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({ display_text: 'Canal Oficial', url: CANAL_OFICIAL, merchant_url: CANAL_OFICIAL }),
            },
          ],
        },
      }))
      const content = {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: {
              body: { text: `${resumen}\nMostrando ${offset + 1}–${offset + lote.length}` },
              footer: { text: 'Selecciona un Sub-Bot del carrusel 🌿' },
              header: { hasMediaAttachment: false },
              carouselMessage: { cards, messageVersion: 1, carouselCardType: 1 },
            },
          },
        },
      }
      const validationError = proto.Message.verify(content)
      if (validationError) throw new Error(`Carrusel inválido: ${validationError}`)
      const messageContent = generateWAMessageFromContent(m.chat, proto.Message.fromObject(content), {
        quoted: m,
        userJid: normalizarJid(conn.user) || undefined,
      })
      if (!messageContent?.message || !messageContent?.key?.id) {
        throw new Error('No se pudo generar el mensaje del carrusel')
      }
      await conTiempoLimite(conn.relayMessage(m.chat, messageContent.message, {
        messageId: messageContent.key.id,
        // El detector del Baileys incluido solo reconoce nativeFlowMessage en
        // la raíz, no dentro de carouselMessage.cards. Añadir sus nodos aquí.
        additionalNodes: getAdditionalNode('interactive'),
      }), MEDIA_TIMEOUT_MS)
      enviados += lote.length
    }
    // Conservar la lista en texto de main incluso si relayMessage se resuelve:
    // WhatsApp puede aceptar el envío y no dibujar el carrusel en el cliente.
    await enviarLista()
  } catch (error) {
    console.warn('[bots] No se pudo enviar el carrusel:', error?.message || error)
    await m.reply('⚠︎ No pude enviar el carrusel completo. Te dejo la lista pendiente:')
    await enviarLista(enviados)
  }
}

handler.tags = ["socket"]
handler.help = ["bots"]
handler.command = ["botlist", "listbots", "bots"]

export { convertirMsADiasHorasMinutosSegundos, MAX_SUBBOTS, CANAL_OFICIAL, IMAGEN_CARRUSEL }
export default handler
