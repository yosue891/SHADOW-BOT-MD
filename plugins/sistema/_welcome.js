import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { WAMessageStubType } from '@whiskeysockets/baileys'
import { renderWelcomeCard, renderGoodbyeCard } from '../../lib/welcome-card.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const canalId = global.channelRD?.id || '120363403739366547@newsletter'
const canalName = global.channelRD?.name || 'SHADOW-BOT'
const BACKGROUND = 'https://u.pone.rs/glqjtzaj.jpg'
const LOCAL_BG = path.join(__dirname, '..', '..', 'lib', 'welcome-bg.jpg')
const LOCAL_AVATAR = path.join(__dirname, '..', '..', 'lib', 'catalogo.jpg')
const LOCAL_WELCOME_AUDIO = path.join(__dirname, '..', '..', 'lib', 'welcome.m4a')
const LOCAL_GOODBYE_AUDIO = path.join(__dirname, '..', '..', 'lib', 'goodbye.m4a')
const AUDIO_WELCOME = 'https://u.pone.rs/cznldzjp.mp3'
const AUDIO_GOODBYE = 'https://u.pone.rs/yehaores.mp3'

const recentWelcomeEvents = global.__recentWelcomeEvents || (global.__recentWelcomeEvents = new Map())

function extractUserId(rawUser, groupMetadata) {
  if (!rawUser) return null
  let id = ''

  if (typeof rawUser === 'object' && rawUser !== null) {
    id = rawUser.phoneNumber || rawUser.phone_number || rawUser.pn || rawUser.id || rawUser.jid || rawUser.lid || ''
  } else if (typeof rawUser === 'string') {
    const trimmed = rawUser.trim()
    if (trimmed === '[object Object]') return null
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        id = parsed.phoneNumber || parsed.phone_number || parsed.pn || parsed.id || parsed.jid || parsed.lid || trimmed
      } catch {
        id = trimmed
      }
    } else {
      id = trimmed
    }
  }

  if (!id || typeof id !== 'string') return null
  if (id === '[object Object]') return null

  // Si viene en formato LID, buscar si coincide con algún participante del grupo o en caché
  if (id.endsWith('@lid')) {
    if (groupMetadata?.participants) {
      const match = groupMetadata.participants.find((p) => p.lid === id || p.id === id)
      if (match && match.id && !match.id.endsWith('@lid')) {
        id = match.id
      } else if (match && (match.phoneNumber || match.phone_number || match.pn)) {
        const num = (match.phoneNumber || match.phone_number || match.pn).replace(/\D/g, '')
        id = `${num}@s.whatsapp.net`
      }
    }
    const cachedReal = global.__shadowLidCache?.get(id)
    if (cachedReal && !cachedReal.endsWith('@lid')) {
      id = cachedReal
    }
  }

  const cleanNum = id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (cleanNum && !id.endsWith('@lid')) {
    return `${cleanNum}@s.whatsapp.net`
  }
  return id.includes('@') ? id : `${id}@s.whatsapp.net`
}

export async function generarBienvenida({ conn, userId, groupMetadata, chat }) {
  const targetNumber = (userId || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '') || (userId || '').split('@')[0] || 'usuario'
  const username = `@${targetNumber}`
  const groupName = groupMetadata?.subject || 'el Grupo'

  let profileUrl = null
  try {
    profileUrl = await conn.profilePictureUrl(userId, 'image')
  } catch (e) {
    profileUrl = fs.existsSync(LOCAL_AVATAR) ? LOCAL_AVATAR : null
  }

  const participantsCount = groupMetadata?.participants?.length || 0
  const groupSize = participantsCount + 1

  let imageSource
  try {
    imageSource = await renderWelcomeCard({
      backgroundUrl: BACKGROUND,
      avatarUrl: profileUrl,
      title: 'Bienvenido',
      username,
      groupName,
      footerLine: `#${groupSize}`
    })
  } catch (err) {
    console.error('[WELCOME] Falló el render de tarjeta, usando fondo de respaldo:', err.message)
    imageSource = fs.existsSync(LOCAL_BG) ? fs.readFileSync(LOCAL_BG) : { url: BACKGROUND }
  }

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const desc = groupMetadata?.desc?.toString() || 'Sin descripción'
  const defaultWelcome = '¡Bienvenido/a a las sombras! Que tu estancia sea legendaria.'

  const hasCustomWelcome = !!(chat?.sWelcome?.trim() || chat?.sBienvenida?.trim())
  const rawWelcome = hasCustomWelcome ? (chat.sWelcome || chat.sBienvenida) : defaultWelcome

  const mensaje = rawWelcome
    .replace(/@{usuario}/gi, `${username}`)
    .replace(/{usuario}/gi, `${username}`)
    .replace(/{user}/gi, `${username}`)
    .replace(/{grupo}/gi, `*${groupName}*`)
    .replace(/{group}/gi, `*${groupName}*`)
    .replace(/{desc}/gi, `${desc}`)
    .replace(/{miembros}/gi, `${groupSize}`)
    .replace(/{fecha}/gi, `${fecha}`)

  let caption
  if (hasCustomWelcome) {
    caption = mensaje
  } else {
    const formattedMensaje = mensaje.split('\n').join('\n> ')
    caption = `> ── ⚔️ *SHADOW GARDEN* ⚔️ ──
> ​
> 🗡️ *UN NUEVO CONTRATISTA DESPIERTA*
> ​
> ◈ 👤 *Recluta:* ${username}
> ◈ 🏰 *Sector:* *${groupName}*
> ◈ 👥 *Fuerza total:* ${groupSize} unidades reunidas
> ◈ 📜 *Mensaje:* ${formattedMensaje}
> ◈ ⏳ *Registro:* ${fecha}
> ​
> ⛓️ _« I am atomic... The eminence in shadow. »_`
  }

  return { imageSource, caption, mentions: [userId], hasCustom: hasCustomWelcome }
}

export async function generarDespedida({ conn, userId, groupMetadata, chat }) {
  const targetNumber = (userId || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '') || (userId || '').split('@')[0] || 'usuario'
  const username = `@${targetNumber}`
  const groupName = groupMetadata?.subject || 'el Grupo'

  let profileUrl = null
  try {
    profileUrl = await conn.profilePictureUrl(userId, 'image')
  } catch (e) {
    profileUrl = fs.existsSync(LOCAL_AVATAR) ? LOCAL_AVATAR : null
  }

  const participantsCount = groupMetadata?.participants?.length || 1
  const groupSize = Math.max(participantsCount - 1, 0)

  let imageSource
  try {
    imageSource = await renderGoodbyeCard({
      backgroundUrl: BACKGROUND,
      avatarUrl: profileUrl,
      title: 'Adiós',
      username,
      groupName,
      footerLine: `Quedan ${groupSize}`
    })
  } catch (err) {
    console.error('[WELCOME] Falló el render de tarjeta, usando fondo de respaldo:', err.message)
    imageSource = fs.existsSync(LOCAL_BG) ? fs.readFileSync(LOCAL_BG) : { url: BACKGROUND }
  }

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const desc = groupMetadata?.desc?.toString() || 'Sin descripción'
  const defaultBye = 'Ha abandonado la orden. Que las sombras guíen su nuevo camino.'

  const hasCustomBye = !!(chat?.sBye?.trim() || chat?.sGoodbye?.trim() || chat?.sDespedida?.trim())
  const rawBye = hasCustomBye ? (chat.sBye || chat.sGoodbye || chat.sDespedida) : defaultBye

  const mensaje = rawBye
    .replace(/@{usuario}/gi, `${username}`)
    .replace(/{usuario}/gi, `${username}`)
    .replace(/{user}/gi, `${username}`)
    .replace(/{grupo}/gi, `*${groupName}*`)
    .replace(/{group}/gi, `*${groupName}*`)
    .replace(/{desc}/gi, `*${desc}*`)
    .replace(/{miembros}/gi, `${groupSize}`)
    .replace(/{fecha}/gi, `${fecha}`)

  let caption
  if (hasCustomBye) {
    caption = mensaje
  } else {
    const formattedMensaje = mensaje.split('\n').join('\n> ')
    caption = `> ── ⚔️ *SHADOW GARDEN* ⚔️ ──
> ​
> 🥀 *UNA SOMBRA SE HA DESVANECIDO*
> ​
> ◈ 👤 *Identificación:* ${username}
> ◈ 🏰 *Sector:* *${groupName}*
> ◈ 👥 *Fuerza restante:* ${groupSize} unidades
> ◈ 📜 *Mensaje:* ${formattedMensaje}
> ◈ ⏳ *Registro:* ${fecha}
> ​
> ⛓️ _« La oscuridad ha borrado todo su rastro. »_`
  }

  return { imageSource, caption, mentions: [userId], hasCustom: hasCustomBye }
}

let handler = m => m
handler.before = async function (m, { conn, participants, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return !0

  const chat = global.db?.data?.chats?.[m.chat]
  if (chat && chat.welcome === false) return !0

  const botNum = (conn.user?.jid || conn.user?.id || '').split('@')[0].split(':')[0].replace(/\D/g, '')
  const primaryBot = chat?.primaryBot
  if (primaryBot) {
    const primaryNum = primaryBot.split('@')[0].split(':')[0].replace(/\D/g, '')
    if (botNum && primaryNum && botNum !== primaryNum) return !1
  }

  if (!groupMetadata?.subject && m.isGroup) {
    try {
      groupMetadata = await conn.groupMetadata(m.chat).catch(() => ({}))
    } catch {}
  }

  let rawUsers = Array.isArray(m.messageStubParameters)
    ? m.messageStubParameters
    : (m.messageStubParameters ? [m.messageStubParameters] : [])

  if (!rawUsers.length) {
    const fallbackUser = m.participant || m.key?.participant || m.sender
    if (fallbackUser && fallbackUser !== m.chat) {
      rawUsers = [fallbackUser]
    }
  }

  if (!rawUsers.length) return !0

  const rawStub = m.messageStubType
  const stubNum = Number(rawStub)
  const stubName = typeof rawStub === 'string' ? rawStub : (WAMessageStubType[rawStub] || '')

  const isAdd = (
    stubNum === 27 ||
    stubNum === 31 ||
    stubNum === 71 ||
    stubName === 'GROUP_PARTICIPANT_ADD' ||
    stubName === 'GROUP_PARTICIPANT_INVITE' ||
    stubName === 'GROUP_PARTICIPANT_ADD_REQUEST_JOIN'
  )

  const isRemove = (
    stubNum === 28 ||
    stubNum === 32 ||
    stubName === 'GROUP_PARTICIPANT_REMOVE' ||
    stubName === 'GROUP_PARTICIPANT_LEAVE'
  )

  if (!isAdd && !isRemove) return !0

  const now = Date.now()
  if (recentWelcomeEvents.size > 200) {
    for (const [key, timestamp] of recentWelcomeEvents.entries()) {
      if (now - timestamp > 45000) recentWelcomeEvents.delete(key)
    }
  }

  for (const rawUser of rawUsers) {
    const userId = extractUserId(rawUser, groupMetadata)
    if (!userId) continue

    const userNum = userId.split('@')[0].split(':')[0].replace(/\D/g, '')
    if (botNum && userNum && botNum === userNum) {
      console.log(`[WELCOME] Ignorando evento para el propio bot (${userId})`)
      continue
    }

    const actionKey = isAdd ? 'add' : 'remove'
    const dedupeKey = `${m.chat}:${userId}:${actionKey}`
    const lastTimestamp = recentWelcomeEvents.get(dedupeKey)
    if (lastTimestamp && (now - lastTimestamp) < 15000) {
      console.log(`[WELCOME] Ignorando evento duplicado (${actionKey}) para ${userId} en ${m.chat}`)
      continue
    }
    recentWelcomeEvents.set(dedupeKey, now)

    console.log(`[WELCOME] Evento ${actionKey} stub=${m.messageStubType} en ${m.chat} para ${userId}`)

    const activeCanalId = global.channelRD?.id || global.idcanal || canalId
    const activeCanalName = global.channelRD?.name || global.botname || canalName

    const contextInfo = {
      mentionedJid: [userId],
      isForwarded: true,
      forwardingScore: 1,
      forwardedNewsletterMessageInfo: {
        newsletterJid: activeCanalId,
        serverMessageId: 100,
        newsletterName: activeCanalName
      }
    }

    const rawBotName = global.botname || global.author || 'Shadow-BOT-MD'
    const ownerJid = conn.user?.jid
      ? (conn.user.jid.split('@')[0].split(':')[0] + '@s.whatsapp.net')
      : (global.owner?.[0]?.[0] ? `${global.owner[0][0]}@s.whatsapp.net` : '584242773183@s.whatsapp.net')

    const thumb = fs.existsSync(LOCAL_AVATAR)
      ? fs.readFileSync(LOCAL_AVATAR)
      : (Buffer.isBuffer(global.catalogo) ? global.catalogo : null)

    const fkontak = {
      key: {
        participants: '0@s.whatsapp.net',
        remoteJid: 'status@broadcast',
        fromMe: false,
        id: 'ShadowGardenCatalog'
      },
      message: {
        productMessage: {
          product: {
            productImage: thumb ? {
              mimetype: 'image/jpeg',
              jpegThumbnail: thumb
            } : undefined,
            title: isAdd ? '⚔️ BIENVENIDO A SHADOW GARDEN ⚔️' : '🥀 DESPEDIDA DE SHADOW GARDEN 🥀',
            description: isAdd ? 'Recluta de la Orden de las Sombras' : 'Una sombra ha abandonado el aquelarre',
            currencyCode: 'USD',
            priceAmount1000: '0',
            retailerId: 'ShadowGarden',
            productImageCount: 1
          },
          businessOwnerJid: ownerJid
        }
      }
    }

    const sendWelcomeMessage = async ({ imageSource, caption, mentions, isAddAction }) => {
      let sent = false
      const mediaImg = Buffer.isBuffer(imageSource)
        ? imageSource
        : (imageSource?.url ? { url: imageSource.url } : (fs.existsSync(LOCAL_BG) ? fs.readFileSync(LOCAL_BG) : { url: BACKGROUND }))

      // Nivel 1: Envío mediante mensaje de producto/catálogo (formato idéntico al catálogo de ping)
      try {
        await conn.sendMessage(
          m.chat,
          {
            product: {
              productImage: mediaImg,
              productId: isAddAction ? 'welcome-001' : 'goodbye-001',
              title: isAddAction ? '⚔️ BIENVENIDO A SHADOW GARDEN ⚔️' : '🥀 DESPEDIDA DE SHADOW GARDEN 🥀',
              description: isAddAction ? 'Recluta de la Orden de las Sombras' : 'Una sombra ha abandonado el aquelarre',
              currencyCode: 'USD',
              priceAmount1000: '0',
              retailerId: '1677',
              url: 'https://github.com/yosue891/SHADOW-BOT-MD',
              productImageCount: 1
            },
            businessOwnerJid: ownerJid,
            body: caption,
            caption,
            mentions,
            contextInfo
          },
          { quoted: fkontak }
        )
        sent = true
      } catch (errProd) {
        console.warn('[WELCOME] Falló formato producto catálogo, intentando imagen estándar:', errProd?.message || errProd)
      }

      // Nivel 2: Envío de imagen estándar con contextInfo de canal y quoted de catálogo
      if (!sent) {
        try {
          await conn.sendMessage(
            m.chat,
            {
              image: mediaImg,
              caption,
              mentions,
              contextInfo
            },
            { quoted: fkontak }
          )
          sent = true
        } catch (imgErr) {
          console.warn('[WELCOME] Falló el envío de imagen, enviando texto:', imgErr?.message || imgErr)
        }
      }

      // Nivel 3: Respaldo final a texto con contextInfo de canal y quoted de catálogo
      if (!sent) {
        await conn.sendMessage(
          m.chat,
          {
            text: caption,
            mentions,
            contextInfo
          },
          { quoted: fkontak }
        )
      }
    }

    const sendWelcomeAudio = async (isAddAction) => {
      const localPath = isAddAction ? LOCAL_WELCOME_AUDIO : LOCAL_GOODBYE_AUDIO
      const remoteUrl = isAddAction ? AUDIO_WELCOME : AUDIO_GOODBYE
      const audioSource = fs.existsSync(localPath) ? fs.readFileSync(localPath) : { url: remoteUrl }
      const fileName = isAddAction ? 'welcome.m4a' : 'goodbye.m4a'

      try {
        await conn.sendMessage(
          m.chat,
          {
            audio: audioSource,
            mimetype: 'audio/mp4',
            fileName,
            ptt: true,
            contextInfo
          },
          { quoted: fkontak }
        )
        console.log(`[WELCOME] Audio PTT (${isAddAction ? 'bienvenida' : 'despedida'}) enviado con éxito a ${m.chat}`)
      } catch (errAudio) {
        console.warn(`[WELCOME] Error enviando audio PTT de ${isAddAction ? 'bienvenida' : 'despedida'}:`, errAudio?.message || errAudio)
        try {
          await conn.sendMessage(
            m.chat,
            {
              audio: { url: remoteUrl },
              mimetype: 'audio/mp4',
              fileName,
              ptt: true,
              contextInfo
            },
            { quoted: fkontak }
          )
        } catch {}
      }
    }

    if (isAdd) {
      try {
        const { imageSource, caption, mentions } = await generarBienvenida({ conn, userId, groupMetadata, chat })
        await sendWelcomeMessage({ imageSource, caption, mentions, isAddAction: true })
        console.log('[WELCOME] Bienvenida enviada con éxito a', userId)
        await sendWelcomeAudio(true)
      } catch (err) {
        console.error('[WELCOME PLUGIN] Error enviando bienvenida:', err)
      }
    } else if (isRemove) {
      try {
        const { imageSource, caption, mentions } = await generarDespedida({ conn, userId, groupMetadata, chat })
        await sendWelcomeMessage({ imageSource, caption, mentions, isAddAction: false })
        console.log('[WELCOME] Despedida enviada con éxito a', userId)
        await sendWelcomeAudio(false)
      } catch (err) {
        console.error('[WELCOME PLUGIN] Error enviando despedida:', err)
      }
    }
  }

  return !0
}

export default handler
