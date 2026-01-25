// código echo por ado si vas a usarlo no robes créditos >:v
import fetch, { FormData, Blob } from 'node-fetch'
import crypto from 'crypto'
import fs from 'fs'
import { fileTypeFromBuffer } from 'file-type'
import { generateWAMessageFromContent, getDevice } from '@whiskeysockets/baileys'
import uploadImgur from '../lib/imgurUpload.js'

const GITHUB_HARDCODED_REPO = 'UploadsAdonix/archivos'
const STYLED_THUMBNAIL = 'https://files.catbox.moe/kcpa4c.jpg'
const STYLED_SOURCE_URL = 'https://api-adonix.ultraplus.click'

const DOCUMENT_TEMPLATE = {
  url: 'https://mmg.whatsapp.net/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc',
  mimetype: 'application/pdf',
  fileSha256: '+gmvvCB6ckJSuuG3ZOzHsTBgRAukejv1nnfwGSSSS/4=',
  fileLength: '999999999999',
  pageCount: 0,
  mediaKey: 'MWO6fI223TY8T0i9onNcwNBBPldWfwp1j1FPKCiJFzw=',
  fileName: 'Choso🔥',
  fileEncSha256: 'ZS8v9tio2un1yWVOOG3lwBxiP+mNgaKPY9+wl5pEoi8=',
  directPath: '/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc'
}

const buildDocumentMessage = () => ({
  ...DOCUMENT_TEMPLATE,
  mediaKeyTimestamp: String(Math.floor(Date.now() / 1000))
})

const safeDomainFromUrl = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return 'api-adonix.ultraplus.click'
  }
}

const createStyledInteractive = ({
  mentionJids,
  externalTitle,
  bodyText,
  footerText,
  sections,
  listTitle,
  buttonTitle,
  buttons = [],
  thumbUrl = STYLED_THUMBNAIL,
  sourceUrl = STYLED_SOURCE_URL,
  limitedText,
  limitedCopyCode,
  tapDescription
}) => {
  const nativeButtons = [...buttons]

  if (sections && sections.length) {
    nativeButtons.unshift({
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: buttonTitle || 'Lista de selección',
        sections,
        has_multiple_buttons: true
      })
    })
  }

  if (!nativeButtons.length) {
    nativeButtons.push({
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text: 'Copiar contenido',
        copy_code: bodyText || '',
        has_multiple_buttons: true
      })
    })
  }

  const dividerIndices = nativeButtons.map((_, idx) => idx + 1)
  const domain = safeDomainFromUrl(sourceUrl)

  const params = {
    bottom_sheet: {
      in_thread_buttons_limit: Math.max(1, nativeButtons.length),
      divider_indices: dividerIndices,
      list_title: listTitle || 'Selecciona una opción',
      button_title: buttonTitle || 'Abrir'
    },
    tap_target_configuration: {
      title: externalTitle,
      description: tapDescription || (bodyText ? bodyText.split('\n')[0].slice(0, 80) : ''),
      canonical_url: sourceUrl,
      domain,
      button_index: 0
    }
  }

  if (limitedText) {
    params.limited_time_offer = {
      text: limitedText,
      url: sourceUrl,
      copy_code: limitedCopyCode || '',
      expiration_time: Math.floor(Date.now() / 1000) + 3600
    }
  }

  const messageParamsJson = JSON.stringify(params)

  return {
    contextInfo: {
      mentionedJid: mentionJids,
      externalAdReply: {
        title: externalTitle,
        body: '',
        thumbnailUrl: thumbUrl,
        sourceUrl,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    },
    header: {
      documentMessage: buildDocumentMessage(),
      hasMediaAttachment: true
    },
    body: {
      text: bodyText || ' '
    },
    footer: {
      text: footerText || ''
    },
    nativeFlowMessage: {
      messageParamsJson,
      buttons: nativeButtons
    }
  }
}

const sendStyledInteractive = async (conn, chatId, interactiveMessage, quoted) => {
  const content = {
    viewOnceMessage: {
      message: {
        interactiveMessage
      }
    }
  }
  const userJid = conn?.user?.id || conn?.user?.jid
  const msg = generateWAMessageFromContent(chatId, content, { userJid, quoted })
  await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id })
}

async function makeFkontak() {
  try {
    const res = await fetch('https://i.postimg.cc/rFfVL8Ps/image.jpg')
    const thumb2 = Buffer.from(await res.arrayBuffer())
    return {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
      message: { locationMessage: { name: 'Tourl', jpegThumbnail: thumb2 } },
      participant: '0@s.whatsapp.net'
    }
  } catch {
    return null
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`
}

async function uploadGitHub(filename, base64Content) {
  const token = process.env.GITHUB_TOKEN || global.GITHUB_TOKEN || GITHUB_HARDCODED_TOKEN
  const repo = process.env.GITHUB_REPO || global.GITHUB_REPO || GITHUB_HARDCODED_REPO
  if (!token) throw new Error('Falta GITHUB_TOKEN')
  const path = `images/${filename}`
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'upload-bot' },
    body: JSON.stringify({ message: `upload ${filename}`, content: base64Content })
  })
  const data = await res.json()
  if (data?.content?.download_url) return data.content.download_url
  throw new Error(data?.message || 'Fallo al subir a GitHub')
}

async function uploadCatbox(buffer, ext, mime) {
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  const randomBytes = crypto.randomBytes(5).toString('hex')
  form.append('fileToUpload', new Blob([buffer], { type: mime || 'application/octet-stream' }), `${randomBytes}.${ext || 'bin'}`)
  const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form })
  return (await res.text()).trim()
}

async function uploadPostImages(buffer, ext, mime) {
  const form = new FormData()
  form.append('optsize', '0')
  form.append('expire', '0')
  form.append('numfiles', '1')
  form.append('upload_session', String(Math.random()))
  form.append('file', new Blob([buffer], { type: mime || 'image/jpeg' }), `${Date.now()}.${ext || 'jpg'}`)
  const res = await fetch('https://postimages.org/json/rr', { method: 'POST', body: form })
  const json = await res.json().catch(async () => ({ raw: await res.text() }))
  return json?.url || json?.images?.[0]?.url || null
}

async function uploadLitterbox(buffer, ext, mime) {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mime || 'application/octet-stream' }), `upload.${ext || 'bin'}`)
  form.append('time', '24h')
  const res = await fetch('https://api.alvianuxio.eu.org/uploader/litterbox', { method: 'POST', body: form })
  const text = await res.text()
  try { const j = JSON.parse(text); return j.url || j.data?.url || null } catch { return /https?:\/\/[\w./-]+/i.test(text) ? text.trim() : null }
}

async function uploadTmpFiles(buffer, ext, mime) {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mime || 'application/octet-stream' }), `upload.${ext || 'bin'}`)
  const res = await fetch('https://api.alvianuxio.eu.org/uploader/tmpfiles', { method: 'POST', body: form })
  const text = await res.text()
  try { const j = JSON.parse(text); return j.url || j.data?.url || j.link || null } catch { return /https?:\/\/[\w./-]+/i.test(text) ? text.trim() : null }
}

async function uploadFreeImageHost(buffer, ext, mime) {
  const form = new FormData()
  form.append('key', '6d207e02198a847aa98d0a2a901485a5')
  form.append('action', 'upload')
  form.append('source', new Blob([buffer], { type: mime || 'image/jpeg' }), `upload.${ext || 'jpg'}`)
  const res = await fetch('https://freeimage.host/api/1/upload', { method: 'POST', body: form })
  const j = await res.json().catch(async () => ({ raw: await res.text() }))
  return j?.image?.url || j?.data?.image?.url || null
}

async function uploadServiceByName(name, buffer, ext, mime) {
  switch ((name || '').toLowerCase()) {
    case 'github': {
      const fname = `${crypto.randomBytes(6).toString('hex')}.${ext || 'bin'}`
      const content = Buffer.from(buffer).toString('base64')
      return await uploadGitHub(fname, content)
    }
    case 'catbox': return await uploadCatbox(buffer, ext, mime)
    case 'postimages': return await uploadPostImages(buffer, ext, mime)
    case 'litterbox': return await uploadLitterbox(buffer, ext, mime)
    case 'tmpfiles': return await uploadTmpFiles(buffer, ext, mime)
    case 'freeimagehost': return await uploadFreeImageHost(buffer, ext, mime)
    case 'imgur': {
      const tmpPath = `./tmp/${crypto.randomBytes(6).toString('hex')}.${ext || 'bin'}`
      await fs.promises.writeFile(tmpPath, buffer)
      try {
        const url = await uploadImgur(tmpPath)
        return url
      } finally {
        try { await fs.promises.unlink(tmpPath) } catch {}
      }
    }
    default: throw new Error('Servicio no soportado')
  }
}

const SERVICE_LIST = [
  { key: 'github', label: 'GitHub' },
  { key: 'catbox', label: 'Catbox' },
  { key: 'postimages', label: 'PostImages' },
  { key: 'litterbox', label: 'Litterbox (24h)' },
  { key: 'tmpfiles', label: 'TmpFiles' },
  { key: 'freeimagehost', label: 'FreeImageHost' },
  { key: 'imgur', label: 'Imgur' },
  { key: 'all', label: 'Todos los servicios' }
]

async function sendChooser(m, conn, usedPrefix) {
  let fkontak = await makeFkontak()
  if (!fkontak) fkontak = m
  try {
    const device = await getDevice(m.key.id)
    if (device !== 'desktop' && device !== 'web') {
      const rows = SERVICE_LIST.map((service, index) => ({
        title: `${index + 1}. ${service.label}`,
        description: service.key === 'all' ? 'Subir a todos los servicios disponibles' : `Subir archivo a ${service.label}`,
        id: `${usedPrefix}tourl ${service.key}`
      }))

      const sections = [
        {
          title: 'Opciones disponibles',
          highlight_label: '📤',
          rows
        }
      ]

      const buttons = [
        {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: 'Abrir panel',
            url: STYLED_SOURCE_URL,
            has_multiple_buttons: true
          })
        },
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: 'Copiar comando',
            copy_code: `${usedPrefix}tourl`,
            has_multiple_buttons: true
          })
        }
      ]

      const interactiveMessage = createStyledInteractive({
        mentionJids: [m.sender],
        externalTitle: '🐢 Tourl Selector',
        bodyText: 'Selecciona el servicio al que deseas subir tu archivo.',
        footerText: `${global.dev || ''}`.trim() || 'Selecciona una opción',
        sections,
        listTitle: 'Servicios Tourl',
        buttonTitle: 'Abrir lista',
        buttons,
        limitedText: 'CDN 🌲',
        limitedCopyCode: 'Ado,yosue',
        tapDescription: 'Sube tus archivos con un estilo interactivo.'
      })

      await sendStyledInteractive(conn, m.chat, interactiveMessage, fkontak)
      return true
    }
  } catch {}
  const list = SERVICE_LIST.map(s => `• ${usedPrefix}tourl ${s.key}`).join('\n')
  await conn.sendMessage(m.chat, { text: `Elige el servicio de subida:\n\n${list}` }, { quoted: fkontak })
  return true
}

const tourSessions = new Map()

async function doUpload(m, conn, serviceKey) {
  const sessKey = m.chat + ':' + m.sender
  let fromCache = tourSessions.get(sessKey)
  let buffer, mime
  if (fromCache && fromCache.buffer) {
    buffer = fromCache.buffer
    mime = fromCache.mime || ''
  } else {
    const q = m.quoted ? (m.quoted.msg || m.quoted) : m
    mime = (q.mimetype || q.mediaType || q.mtype || '').toString().toLowerCase()
    if (!/image|video|audio|sticker|document/.test(mime)) {
      await conn.reply(m.chat, 'Responde a una imagen / video / audio / documento', m)
      return true
    }
    buffer = await q.download()
  }
  if (!buffer || !buffer.length) { await conn.reply(m.chat, 'No se pudo descargar el archivo', m); return true }
  const sizeBytes = buffer.length
  if (sizeBytes > 1024 * 1024 * 1024) { await conn.reply(m.chat, 'El archivo supera 1GB', m); return true }
  const humanSize = formatBytes(sizeBytes)
  const typeInfo = await fileTypeFromBuffer(buffer) || {}
  const { ext, mime: realMime } = typeInfo

  let results = []
  if ((serviceKey || '').toLowerCase() === 'all') {
    for (const svc of SERVICE_LIST.filter(s => s.key !== 'all')) {
      try {
        const url = await uploadServiceByName(svc.key, buffer, ext, realMime)
        if (url) results.push({ name: svc.label, url, size: humanSize })
      } catch {}
    }
  } else {
    const pick = SERVICE_LIST.find(s => s.key === (serviceKey || '').toLowerCase())
    if (!pick) { await conn.reply(m.chat, 'Servicio inválido', m); return true }
    try {
      const url = await uploadServiceByName(pick.key, buffer, ext, realMime)
      if (url) results.push({ name: pick.label, url, size: humanSize })
    } catch (e) { await conn.reply(m.chat, `Error: ${e.message}`, m); return true }
  }

  if (!results.length) { await conn.reply(m.chat, 'No se obtuvo ninguna URL', m); return true }

  let txt = '乂  L I N K S - E N L A C E S 乂\n\n'
  for (const r of results) {
    txt += `*${r.name}*\n• Enlace: ${r.url}\n• Tamaño: ${r.size}\n\n`
  }

  let fkontak = await makeFkontak()
  if (!fkontak) fkontak = m

  const buttons = results.map(r => ({
    name: 'cta_copy',
    buttonParamsJson: JSON.stringify({
      display_text: `Copiar ${r.name}`,
      copy_code: r.url,
      has_multiple_buttons: true
    })
  }))

  const linkRows = results.map((r, index) => ({
    title: `${index + 1}. ${r.name}`,
    description: r.url,
    id: `tourl_link::${Buffer.from(r.url).toString('base64')}`
  }))

  const sections = linkRows.length
    ? [
        {
          title: 'Enlaces disponibles',
          highlight_label: '📎',
          rows: linkRows
        }
      ]
    : []

  const firstUrl = results[0]?.url || STYLED_SOURCE_URL

  const interactiveMessage = createStyledInteractive({
    mentionJids: [m.sender],
    externalTitle: '📥 Enlaces generados',
    bodyText: txt,
    footerText: 'Selecciona un enlace o copia con los botones.',
    sections,
    listTitle: 'Lista de enlaces',
    buttonTitle: 'Ver enlaces',
    buttons,
    thumbUrl: STYLED_THUMBNAIL,
    sourceUrl: firstUrl,
    limitedText: 'Enlace destacado',
    limitedCopyCode: firstUrl,
    tapDescription: 'Descargas listas para compartir.'
  })

  await sendStyledInteractive(conn, m.chat, interactiveMessage, fkontak)
  try { tourSessions.delete(sessKey) } catch {}
  return true
}

let handler = async (m, { conn, args, usedPrefix }) => {
  const service = (args[0] || '').toLowerCase()
  if (!service) {
    const q = m.quoted ? (m.quoted.msg || m.quoted) : m
    const mime = (q.mimetype || q.mediaType || q.mtype || '').toString().toLowerCase()
    if (!/image|video|audio|sticker|document/.test(mime)) {
      await conn.reply(m.chat, 'Responde a una imagen / video / audio / documento', m)
      return true
    }
    const buffer = await q.download()
    if (!buffer || !buffer.length) { await conn.reply(m.chat, 'No se pudo descargar el archivo', m); return true }
    const sessKey = m.chat + ':' + m.sender
    tourSessions.set(sessKey, { buffer, mime, ts: Date.now() })
    return sendChooser(m, conn, usedPrefix)
  }
  return doUpload(m, conn, service)
}

handler.help = ['tourl [servicio]']
handler.tags = ['tools']
handler.command = ['tourl', 'upload']

handler.before = async function (m, { conn, usedPrefix }) {
  try {
    const msg = m.message || {}
    let selectedId = null
    const irm = msg.interactiveResponseMessage
    if (!selectedId && irm?.nativeFlowResponseMessage) {
      try {
        const params = JSON.parse(irm.nativeFlowResponseMessage.paramsJson || '{}')
        if (typeof params.id === 'string') selectedId = params.id
        if (!selectedId && typeof params.selectedId === 'string') selectedId = params.selectedId
        if (!selectedId && typeof params.rowId === 'string') selectedId = params.rowId
      } catch {}
    }
    const lrm = msg.listResponseMessage
    if (!selectedId && lrm?.singleSelectReply?.selectedRowId) selectedId = lrm.singleSelectReply.selectedRowId
    const brm = msg.buttonsResponseMessage
    if (!selectedId && brm?.selectedButtonId) selectedId = brm.selectedButtonId
    if (!selectedId) return false

    const mTourl = /\btourl\b\s+(github|catbox|postimages|litterbox|tmpfiles|freeimagehost|all)/i.exec(selectedId)
    if (mTourl) {
      return await doUpload(m, conn, mTourl[1].toLowerCase())
    }
    const linkMatch = /^tourl_link::(.+)/.exec(selectedId)
    if (linkMatch) {
      try {
        const decoded = Buffer.from(linkMatch[1], 'base64').toString('utf-8')
        if (/^https?:\/\//i.test(decoded)) {
          await conn.reply(m.chat, decoded, m)
          return true
        }
      } catch {}
    }
    return false
  } catch { return false }
}

export default handler
