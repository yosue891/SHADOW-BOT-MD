import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'
import { resolverObjetivo, nombreSeguro, resolveToRealJid, jidParaTag } from '../../lib/anime-mention.js'
import { enviarReaccionAnime } from '../../lib/anime-media.js'

// Videos del matrimonio (tipo GIF)
const PROPOSE_VIDEO = 'https://u.pone.rs/cbytrubz.mp4' // video de la propuesta con botones
const ACCEPT_VIDEOS = [
  'https://u.pone.rs/cbytrubz.mp4',
  'https://u.pone.rs/anlnteir.mp4',
  'https://u.pone.rs/juruzpxb.mp4',
  'https://u.pone.rs/fgacpkse.mp4'
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const num = (jid) => String(jid || '').split('@')[0].replace(/[^0-9]/g, '')
// Token de mención (@userpart): el cliente lo pinta como tag con el nombre
const part = (jid) => String(jid || '').split('@')[0]

/**
 * Envía un mensaje interactivo con video tipo GIF en el header + botones
 * quick_reply + menciones (via contextInfo del InteractiveMessage).
 */
async function sendVideoButtons(conn, m, { video, text, footer, buttons, mentions = [] }) {
  let headerMedia = {}
  try {
    const media = await prepareWAMessageMedia(
      { video: { url: video }, gifPlayback: true },
      { upload: conn.waUploadToServer }
    )
    if (media?.videoMessage) headerMedia.videoMessage = media.videoMessage
  } catch (e) {
    console.error('[marry] no se pudo preparar el video:', e?.message)
  }

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({ text }),
          footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
          header: proto.Message.InteractiveMessage.Header.create({
            title: '💍 Propuesta de matrimonio',
            hasMediaAttachment: !!headerMedia.videoMessage,
            ...headerMedia
          }),
          contextInfo: { mentionedJid: mentions },
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: buttons.map(([label, id]) => ({
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: label, id })
            }))
          })
        })
      }
    }
  }, { quoted: m, userJid: conn.user.id })

  return conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

const handler = async (m, { conn, command, usedPrefix, text, args, participants, groupMetadata }) => {
  const users = global.db.data.users
  const rcanal = typeof global.rcanal !== 'undefined' ? global.rcanal : {}
  const ctx = { conn, participants, groupMetadata, text, args }

  // Resuelve LIDs → JID real y devuelve variantes para buscar en la DB
  const resolveJid = (jid) => resolveToRealJid(jid, conn, participants, groupMetadata) || jid
  const jidVars = (...jids) => [...new Set(jids.filter(Boolean))]
  const marryOf = (uid, ...variants) => {
    for (const j of jidVars(uid, ...variants)) {
      const v = users[j]?.marry
      if (v) return v
    }
    return ''
  }

  const userId = resolveJid(m.sender)

  if (!users[userId]) users[userId] = {}

  if (command === 'divorce' || command === 'divorciarse') {
    const partnerRaw = marryOf(userId, m.sender)

    if (!partnerRaw) {
      return conn.sendMessage(
        m.chat,
        { text: '💔 No estás casado con nadie en el Reino de las Sombras.', ...rcanal },
        { quoted: m }
      )
    }

    const partnerId = resolveJid(partnerRaw)
    const partnerTag = jidParaTag(partnerId, conn, participants, groupMetadata)
    const partnerName = await nombreSeguro(conn, partnerId)

    await conn.sendButton(
      m.chat,
      `¿Estás seguro de que quieres romper tu pacto con *${partnerName}* @${part(partnerTag)}?`,
      'Shadow Garden',
      null,
      [
        ['SÍ, DIVORCIARME', `${usedPrefix}confirmdivorce`],
        ['NO', `${usedPrefix}canceldivorce`]
      ],
      null,
      null,
      m,
      { mentions: [partnerTag] }
    )

    return
  }

  if (command === 'confirmdivorce') {
    const partnerRaw = marryOf(userId, m.sender)
    if (!partnerRaw) return

    const partnerId = resolveJid(partnerRaw)

    // Limpiar ambos lados (variantes raw y resuelta por compatibilidad)
    for (const j of jidVars(userId, m.sender)) {
      if (users[j]) users[j].marry = ''
    }
    for (const j of jidVars(partnerId, partnerRaw)) {
      if (users[j]) users[j].marry = ''
    }

    const name1 = await nombreSeguro(conn, userId)
    const name2 = await nombreSeguro(conn, partnerId)
    const userTagDiv = jidParaTag(userId, conn, participants, groupMetadata)
    const partnerTagDiv = jidParaTag(partnerId, conn, participants, groupMetadata)

    return conn.sendMessage(
      m.chat,
      {
        text: `💔 El pacto se ha roto.\n\n*${name1}* @${part(userTagDiv)} y *${name2}* @${part(partnerTagDiv)} ya no están unidos.`,
        mentions: [userTagDiv, partnerTagDiv],
        ...rcanal
      },
      { quoted: m }
    )
  }

  if (command === 'marry' || command === 'casarse') {
    // Resuelve: mención → citado → número escrito (maneja LIDs correctamente)
    const { who, via } = await resolverObjetivo(m, ctx)

    if (via === 'self') {
      return conn.sendMessage(
        m.chat,
        {
          text: '💍 Menciona o responde a la persona con la que quieres sellar el pacto.',
          ...rcanal
        },
        { quoted: m }
      )
    }

    const partnerId = resolveJid(who)

    if (num(partnerId) === num(userId)) {
      return m.reply('🌌 No puedes casarte con tu propia sombra.')
    }

    if (!users[partnerId]) users[partnerId] = {}

    const nameSuitor = await nombreSeguro(conn, userId)
    const nameTarget = await nombreSeguro(conn, partnerId)
    // JIDs en el formato que el grupo usa (LID en grupos LID): así el
    // cliente pinta el tag con el nombre en vez de mostrar el LID crudo
    const userTag = jidParaTag(userId, conn, participants, groupMetadata)
    const partnerTag = jidParaTag(partnerId, conn, participants, groupMetadata)

    if (marryOf(userId, m.sender)) {
      const current = resolveJid(marryOf(userId, m.sender))
      const currentTag = jidParaTag(current, conn, participants, groupMetadata)
      const currentName = await nombreSeguro(conn, current)
      return conn.sendMessage(
        m.chat,
        {
          text: `⚠️ Ya estás casado con *${currentName}* @${part(currentTag)}.`,
          mentions: [currentTag],
          ...rcanal
        },
        { quoted: m }
      )
    }

    if (marryOf(partnerId, who)) {
      return conn.sendMessage(
        m.chat,
        {
          text: `⚠️ *${nameTarget}* @${part(partnerTag)} ya tiene un pacto con alguien más.`,
          mentions: [partnerTag],
          ...rcanal
        },
        { quoted: m }
      )
    }

    // Propuesta con video tipo GIF + botones + tags con nombre
    // (mentionedJid con el JID del grupo → el cliente renderiza @nombre)
    await sendVideoButtons(conn, m, {
      video: PROPOSE_VIDEO,
      text: `💒 *${nameSuitor}* @${part(userTag)} le propone matrimonio eterno a *${nameTarget}* @${part(partnerTag)}.\n\n¿Aceptas sellar este pacto, ${nameTarget}? 💍`,
      footer: 'Tienes 50 segundos.',
      buttons: [
        ['ACEPTAR 💍', `${usedPrefix}acceptmarry ${userId}`],
        ['RECHAZAR ❌', `${usedPrefix}declinemarry ${userId}`]
      ],
      mentions: [userTag, partnerTag]
    })

    setTimeout(async () => {
      if (users[userId] && !users[userId].marry) {
        const nameSuitor2 = await nombreSeguro(conn, userId)
        const userTagExp = jidParaTag(userId, conn, participants, groupMetadata)
        conn.sendMessage(
          m.chat,
          {
            text: `🥀 *${nameSuitor2}* @${part(userTagExp)}, te han dejado plantado... El tiempo expiró.`,
            mentions: [userTagExp],
            ...rcanal
          },
          { quoted: m }
        )
      }
    }, 50000)

    return
  }

  if (command === 'acceptmarry') {
    const suitorRaw =
      text?.split(' ')[0] ||
      m.quoted?.sender ||
      m.message?.extendedTextMessage?.contextInfo?.participant

    if (!suitorRaw) return

    const suitorId = resolveJid(suitorRaw)

    if (!users[suitorId]) users[suitorId] = {}

    if (marryOf(userId, m.sender) || marryOf(suitorId, suitorRaw)) {
      return m.reply('⚠️ Uno de los dos ya está casado.')
    }

    users[userId].marry = suitorId
    users[suitorId].marry = userId

    const nameSuitor = await nombreSeguro(conn, suitorId)
    const nameTarget = await nombreSeguro(conn, userId)
    const suitorTag = jidParaTag(suitorId, conn, participants, groupMetadata)
    const userTag = jidParaTag(userId, conn, participants, groupMetadata)

    // Video tipo GIF aleatorio al aceptar
    return conn.sendMessage(
      m.chat,
      {
        video: { url: pick(ACCEPT_VIDEOS) },
        gifPlayback: true,
        caption: `💒 『☽』 Las sombras han sellado el pacto.\n\n*${nameSuitor}* @${part(suitorTag)} y *${nameTarget}* @${part(userTag)} ahora están casados.\n\n🎉🥳 *¡VIVAN LOS NOVIOSSS NJD!*`,
        mentions: [suitorTag, userTag],
        ...rcanal
      },
      { quoted: m }
    )
  }

  if (command === 'declinemarry') {
    const suitorRaw =
      text?.split(' ')[0] ||
      m.quoted?.sender ||
      m.message?.extendedTextMessage?.contextInfo?.participant

    if (!suitorRaw) return

    const suitorId = resolveJid(suitorRaw)

    const nameSuitor = await nombreSeguro(conn, suitorId)
    const nameTarget = await nombreSeguro(conn, userId)
    const suitorTag = jidParaTag(suitorId, conn, participants, groupMetadata)
    const userTag = jidParaTag(userId, conn, participants, groupMetadata)
    const caption = `💔 *${nameTarget}* @${part(userTag)} ha rechazado a *${nameSuitor}* @${part(suitorTag)} en el altar.`

    // Usa los GIFs del sistema sad (mismo que el comando #sad)
    try {
      await enviarReaccionAnime(conn, m, { reaccion: 'sad', caption, mentions: [suitorTag, userTag] })
    } catch (e) {
      console.error('[marry] no se pudo enviar el GIF sad:', e?.message)
      await conn.sendMessage(
        m.chat,
        { text: caption, mentions: [suitorTag, userTag], ...rcanal },
        { quoted: m }
      )
    }

    return
  }
}

handler.help = ['marry @tag', 'divorce']
handler.tags = ['fun']
handler.command = [
  'marry',
  'casarse',
  'divorce',
  'divorciarse',
  'confirmdivorce',
  'acceptmarry',
  'declinemarry'
]

handler.group = true

export default handler
