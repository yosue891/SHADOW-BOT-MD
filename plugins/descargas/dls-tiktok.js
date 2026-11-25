import fs from 'fs'
import { generateWAMessageFromContent, generateWAMessageContent, proto } from '@whiskeysockets/baileys'

function extractTikTokUrl(text) {
  if (!text) return null
  const match = text.match(/https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:tiktok\.com|douyin\.com)\/[^\s]+/i)
  return match ? match[0] : null
}

async function resolveRedirect(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    })
    if (res.url && /tiktok\.com/i.test(res.url)) return res.url
  } catch {}
  return url
}

async function safeFetchJson(url, options = {}, timeoutMs = 6000) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ...(options.headers || {})
      }
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const text = await res.text()
    if (!text || !text.trim()) return null
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  } catch {
    return null
  }
}

async function fromTikwm(url) {
  const json = await safeFetchJson(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {}, 6000)
  if (json?.code === 0 && json?.data) {
    const d = json.data
    return {
      source: 'tikwm',
      title: d.title || 'TikTok Video',
      author: d.author?.nickname || d.author?.unique_id || 'TikTok User',
      authorId: d.author?.unique_id || '',
      cover: d.cover || null,
      video: d.play || d.wmplay || d.hdplay || null,
      music: d.music || null,
      images: Array.isArray(d.images) && d.images.length > 0 ? d.images : null,
      duration: d.duration || 0
    }
  }
  return null
}

async function fromSsstik(url) {
  try {
    const pageRes = await fetch('https://ssstik.io/en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(4000)
    })
    const html = await pageRes.text()
    const tt = (html.match(/tt:'([^']+)'/) || html.match(/s_tt\s*=\s*'([^']+)'/))?.[1]
    if (!tt) return null

    const postRes = await fetch('https://ssstik.io/abc?url=dl', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'hx-request': 'true',
        'hx-target': 'target',
        'hx-current-url': 'https://ssstik.io/en',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: new URLSearchParams({ id: url, locale: 'en', tt }),
      signal: AbortSignal.timeout(6000)
    })
    const dlHtml = await postRes.text()
    const videoUrl = dlHtml.match(/href=\"([^\"]+)\"[^>]*class=\"[^\"]*without_watermark[^\"]*\"/)?.[1]
      || dlHtml.match(/href=\"(https?:\/\/[^\"]*tik-cdn[^\"]*)\"/)?.[1]
      || dlHtml.match(/<a[^>]+href=\"([^\"]+)\"[^>]*download/i)?.[1]

    const slideUrls = [...dlHtml.matchAll(/<a[^>]+href=\"([^\"]+)\"[^>]*>/gi)]
      .map(m => m[1])
      .filter(u => u.includes('download') || u.includes('tikcdn'))

    const titleMatch = dlHtml.match(/<p class=\"maintext\">([^<]+)<\/p>/)

    if (videoUrl || slideUrls.length > 0) {
      return {
        source: 'ssstik',
        title: titleMatch ? titleMatch[1].trim() : 'TikTok Video',
        author: 'TikTok User',
        authorId: '',
        cover: null,
        video: videoUrl || null,
        music: null,
        images: slideUrls.length > 0 ? slideUrls : null,
        duration: 0
      }
    }
  } catch {}
  return null
}

async function fromNyx(url) {
  const json = await safeFetchJson(
    `https://nyxdlapi.vercel.app/api/downloads/tiktok?url=${encodeURIComponent(url)}&apikey=nyx_41yhfMefym8Jf09qN400MX9Xopw_ERDN`,
    {},
    8000
  )
  if (json?.status && json?.result) {
    const r = json.result
    return {
      source: 'nyx',
      title: r.title || 'TikTok Video',
      author: r.author || r.username || 'TikTok User',
      authorId: r.username || '',
      cover: r.cover || null,
      video: r.downloadNoWatermark || r.download || r.video || r.play || null,
      music: r.music || null,
      images: Array.isArray(r.images) && r.images.length > 0 ? r.images : null,
      duration: r.duration || 0
    }
  }
  return null
}

async function tiktokdl(rawUrl) {
  const isShort = /(?:vm|vt|t)\.tiktok\.com/i.test(rawUrl)
  const resolvedUrl = isShort ? await resolveRedirect(rawUrl) : rawUrl

  const results = await Promise.allSettled([
    fromTikwm(resolvedUrl),
    fromSsstik(resolvedUrl)
  ])
  const found = results.map(r => r.value).find(v => v && (v.video || (v.images && v.images.length)))
  if (found) return found

  const resNyx = await fromNyx(resolvedUrl)
  if (resNyx && (resNyx.video || (resNyx.images && resNyx.images.length))) return resNyx

  if (isShort && resolvedUrl !== rawUrl) {
    const rawResults = await Promise.allSettled([
      fromTikwm(rawUrl),
      fromSsstik(rawUrl)
    ])
    const rawFound = rawResults.map(r => r.value).find(v => v && (v.video || (v.images && v.images.length)))
    if (rawFound) return rawFound
  }

  return null
}

var handler = async (m, { conn, args, usedPrefix, command }) => {
  const textInput = (args && args.length) ? args.join(' ') : ''
  const matchedUrl = extractTikTokUrl(textInput)

  if (!matchedUrl) {
    return m.reply(
      `🎃 [ 🕸️ ] Has olvidado el enlace de TikTok... ¿Acaso temes revelar el portal?\n\n[ 🦇 ] Ejemplo: ${usedPrefix + command} https://www.tiktok.com/@tiktok/video/7413042588074200326`
    )
  }

  try {
    if (m.react) await m.react('🎃')
    await conn.reply(
      m.chat,
      '🎃 [ ⏳ ] Invocando el video en las sombras de Halloween... Preparando transferencia dimensional... 🦇',
      m
    )

    const tiktokData = await tiktokdl(matchedUrl)

    if (!tiktokData || (!tiktokData.video && (!tiktokData.images || !tiktokData.images.length))) {
      if (m.react) await m.react('✖️')
      return m.reply(
        '🎃 [ 🕳️ ] La sombra no pudo extraer el video. El vínculo está maldito, es privado o fue eliminado.'
      )
    }

    let shadowInfo = `🎃📜 Fragmento extraído:\n> ${tiktokData.title || 'Sin título'}`
    if (tiktokData.author && tiktokData.author !== 'TikTok User') {
      shadowInfo += `\n👤 Autor: ${tiktokData.author}`
    }

    // Caso 1: Publicación de diapositivas / fotos de TikTok
    if (tiktokData.images && tiktokData.images.length > 0) {
      const images = tiktokData.images.slice(0, 10)
      for (let i = 0; i < images.length; i++) {
        const caption = i === 0
          ? `🎃🦇 TRANSMISIÓN DE IMÁGENES COMPLETADA 🦇🎃\n\n${shadowInfo}\n\n📸 Foto [${i + 1}/${images.length}]`
          : `📸 Foto [${i + 1}/${images.length}]`
        await conn.sendMessage(m.chat, { image: { url: images[i] }, caption }, { quoted: m })
      }
      if (tiktokData.music) {
        await conn.sendMessage(m.chat, {
          audio: { url: tiktokData.music },
          mimetype: 'audio/mp4',
          fileName: 'tiktok_audio.mp4'
        }, { quoted: m })
      }
      if (m.react) await m.react('✔️')
      return
    }

    // Caso 2: Video de TikTok
    const videoURL = tiktokData.video
    let sent = false

    // Intento con mensaje interactivo de Halloween y botones
    try {
      let thumbBuffer = null
      if (fs.existsSync('./imgs.jpg')) {
        thumbBuffer = fs.readFileSync('./imgs.jpg')
      } else if (fs.existsSync('./lib/catalogo.jpg')) {
        thumbBuffer = fs.readFileSync('./lib/catalogo.jpg')
      }

      const businessHeader = {
        key: { remoteJid: m.chat, participant: '0@s.whatsapp.net', fromMe: false, id: 'ShadowHeader' },
        message: {
          locationMessage: {
            name: '🎃 TikTok • Halloween 🦇',
            jpegThumbnail: thumbBuffer || Buffer.alloc(0),
            vcard:
              'BEGIN:VCARD\n' +
              'VERSION:3.0\n' +
              'N:;Shadow;;;\n' +
              'FN:Shadow\n' +
              'ORG:Shadow Garden Halloween\n' +
              'TITLE:\n' +
              'item1.TEL;waid=5804242773183:+58 0424-2773183\n' +
              'item1.X-ABLabel:Shadow\n' +
              'X-WA-BIZ-DESCRIPTION:Archivo invocado desde el Aquelarre de las Sombras\n' +
              'X-WA-BIZ-NAME:Shadow Garden\n' +
              'END:VCARD'
          }
        },
        participant: '0@s.whatsapp.net'
      }

      const media = await generateWAMessageContent({
        video: { url: videoURL },
        caption: '🎃🦇 TRANSMISIÓN DE ULTRATUMBA COMPLETADA 🦇🎃\n\n' + shadowInfo
      }, { upload: conn.waUploadToServer, jid: m.chat })

      const msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: { text: 'TRANSMISIÓN COMPLETADA - ARCHIVO DE LAS SOMBRAS\n\n' + shadowInfo },
              footer: { text: '⚔️ Shadow Garden' },
              header: {
                hasMediaAttachment: true,
                videoMessage: media.videoMessage
              },
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                messageParamsJson: '',
                buttons: [
                  {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                      display_text: 'Copiar',
                      copy_code: '*I LOVE yosue Shadow-Bot uwu*'
                    })
                  },
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: 'Abrir TikTok',
                      url: matchedUrl,
                      merchant_url: matchedUrl
                    })
                  }
                ]
              }),
              contextInfo: {
                mentionedJid: [m.sender],
                isForwarded: false
              }
            })
          }
        }
      }, {
        quoted: businessHeader,
        userJid: conn.user?.jid || conn.user?.id,
        upload: conn.waUploadToServer
      })

      const additionalNodes = [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: [
                {
                  tag: 'native_flow',
                  attrs: { v: '9', name: 'mixed' },
                  content: []
                }
              ]
            }
          ]
        }
      ]

      await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id, additionalNodes })
      sent = true
    } catch (relayErr) {
      console.warn('[TIKTOK RELAY WARNING, usando envío directo]:', relayErr?.message)
    }

    // Respaldo de envío directo si el mensaje interactivo falla
    if (!sent) {
      const standardCaption = `🎃🦇 TRANSMISIÓN DE ULTRATUMBA COMPLETADA 🦇🎃\n\n${shadowInfo}\n\n⚔️ *Shadow Garden*`
      try {
        await conn.sendMessage(m.chat, {
          video: { url: videoURL },
          caption: standardCaption,
          mimetype: 'video/mp4'
        }, { quoted: m })
      } catch (errUrl) {
        console.warn('[TIKTOK URL SEND ERROR, descargando buffer]:', errUrl?.message)
        const bufRes = await fetch(videoURL, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(60000)
        })
        const buffer = Buffer.from(await bufRes.arrayBuffer())
        await conn.sendMessage(m.chat, {
          video: buffer,
          caption: standardCaption,
          mimetype: 'video/mp4'
        }, { quoted: m })
      }
    }

    if (m.react) await m.react('✔️')
  } catch (error1) {
    console.error('[TIKTOK ERROR]:', error1)
    if (m.react) await m.react('✖️')
    await conn.reply(
      m.chat,
      `[ 🩸 ] Error detectado: ${error1?.message || error1}\nLas sombras no perdonan los errores...`,
      m
    )
  }
}

handler.help = ['tiktok']
handler.tags = ['descargas']
handler.command = ['tt', 'tiktok']

export default handler
