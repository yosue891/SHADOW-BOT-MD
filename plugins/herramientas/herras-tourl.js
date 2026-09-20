// Tourl de Ourin (ourinv3) adaptado al sistema de plugins de Shadow-BOT-MD.
// Sube el media respondido a TODOS los hosts y devuelve los enlaces.
import FormData from "form-data"
import fetch from "node-fetch"
import mime from "mime-types"
import { fileTypeFromBuffer } from "file-type"
import { downloadMediaMessage, getContentType, generateWAMessageFromContent, proto, generateWAMessage } from "@whiskeysockets/baileys"
import uploadImage from "../../lib/imgdrop.js"

const termaiKey = "AIzaBj7z2z3xBjsk"
const termaiDomain = "https://c.termai.cc"

async function detectExt(buffer, fallback = "bin") {
  try {
    const type = await fileTypeFromBuffer(buffer)
    return type?.ext || fallback
  } catch {
    return fallback
  }
}

async function uploadToCatbox(buffer, filename) {
  const form = new FormData()
  form.append("reqtype", "fileupload")
  form.append("fileToUpload", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })

  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 30000,
  })

  if (!res.ok) throw new Error("Catbox falló")
  const url = await res.text()
  if (!url.startsWith("http")) throw new Error("Invalid response")
  return { host: "Catbox", url, expires: "Permanent" }
}

async function uploadToLitterbox(buffer, filename) {
  const form = new FormData()
  form.append("reqtype", "fileupload")
  form.append("time", "72h")
  form.append("fileToUpload", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })

  const res = await fetch(
    "https://litterbox.catbox.moe/resources/internals/api.php",
    {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
      timeout: 30000,
    },
  )

  if (!res.ok) throw new Error("Litterbox falló")
  const url = await res.text()
  if (!url.startsWith("http")) throw new Error("Invalid response")
  return { host: "Litterbox", url, expires: "72 horas" }
}

async function uploadTo0x0_alt(buffer, filename) {
  const form = new FormData()
  form.append("file", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })

  const res = await fetch("https://0x0.st", {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 30000,
  })

  if (!res.ok) throw new Error("Uguu falló")
  const data = await res.json()
  if (!data?.data?.url) throw new Error("Invalid response")

  return { host: "Uguu", url: data.files[0].url, expires: "60 minutos" }
}

async function uploadToImgDrop(buffer, filename) {
  const data = await uploadImage(buffer, filename)
  if (!data.status || !data.url) throw new Error("ImgDrop falló")
  return { host: "ImgDrop", url: data.url, expires: "Unknown" }
}

async function uploadToQuax(buffer, filename) {
  const form = new FormData()
  form.append("file", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })

  const res = await fetch("https://qu.ax/upload.php", {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 60000,
  })

  if (!res.ok) throw new Error("Qu.ax falló")
  const data = await res.json()

  if (!data?.success || !Array.isArray(data.files) || !data.files[0]?.url) {
    throw new Error("Invalid response")
  }

  return { host: "Qu.ax", url: data.files[0].url, expires: "Permanent" }
}

async function uploadToTermai(buffer) {
  const ext = await detectExt(buffer, "bin")
  const form = new FormData()
  form.append("file", buffer, { filename: `file.${ext}` })

  const res = await fetch(`${termaiDomain}/api/upload?key=${termaiKey}`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 120000,
  })

  if (!res.ok) throw new Error("Termai falló")
  const data = await res.json()

  if (!data?.status || !data?.path) {
    throw new Error("Invalid response")
  }

  return { host: "Termai", url: data.path, expires: "Unknown" }
}

async function uploadToPone(buffer, filename) {
  const form = new FormData()
  form.append("files[]", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })

  const res = await fetch("https://pone.rs/upload.php", {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
      "accept": "*/*",
      "origin": "https://pone.rs",
      "referer": "https://pone.rs/",
    },
    timeout: 60000,
  })

  if (!res.ok) throw new Error("Pone falló")
  const data = await res.json()
  const url = data?.files?.[0]?.url?.replaceAll("\\/", "/") || null
  if (!data?.success || !url) throw new Error("Invalid response")
  return { host: "Pone", url, expires: "Permanent" }
}

async function uploadToKappa(buffer, filename) {
  const form = new FormData()
  form.append("file", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })

  const res = await fetch("https://kappa.lol/api/upload", {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
      "Accept": "*/*",
      "Origin": "https://kappa.lol",
      "Referer": "https://kappa.lol/",
    },
    timeout: 60000,
  })

  if (!res.ok) throw new Error("Kappa falló")
  const raw = await res.text()
  const data = JSON.parse(raw)
  const url = data?.link || null
  if (!url) throw new Error("Invalid response")
  return { host: "Kappa", url, expires: "Permanent" }
}

async function uploadToUploadEe(buffer, filename) {
  const ext = (filename.match(/\.([^.]+)$/) || [])[1] || "bin"
  const imageExts = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "avif"]
  const isImage = imageExts.includes(ext.toLowerCase())
  const category = isImage ? "cat_picture" : "cat_file"

  await fetch("https://www.upload.ee/?", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    },
    timeout: 30000,
  })

  const rnd = Date.now()
  const idRes = await fetch(`https://www.upload.ee/ubr_link_upload.php?rnd_id=${rnd}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
      "Referer": "https://www.upload.ee/?",
    },
    timeout: 30000,
  })

  const idBody = await idRes.text()
  const idMatch = idBody.match(/startUpload\("([^"]+)"/)
  if (!idMatch) throw new Error("Upload ID tidak ditemukan")
  const uploadId = idMatch[1]

  const form = new FormData()
  form.append("upfile_0", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })
  form.append("link", "")
  form.append("email", "")
  form.append("category", category)
  form.append("big_resize", "none")
  form.append("small_resize", "120x90")

  const uploadUrl = `https://www.upload.ee/cgi-bin/ubr_upload.pl?X-Progress-ID=${uploadId}&upload_id=${uploadId}`
  await fetch(uploadUrl, {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
      "Origin": "https://www.upload.ee",
      "Referer": "https://www.upload.ee/?",
    },
    timeout: 120000,
  })

  const finishedRes = await fetch(`https://www.upload.ee/?page=finished&upload_id=${uploadId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
      "Referer": uploadUrl,
    },
    timeout: 30000,
  })

  const html = await finishedRes.text()
  const srcMatch = html.match(/id=["']file_src["'][^>]*value=["']([^"']+)["']/i)
  const viewMatch = html.match(/View file:\s*<br\s*\/?>\s*<a href=["']?([^"'>\s]+)["']?/i)
  const rawUrl = srcMatch?.[1] || viewMatch?.[1] || null
  if (!rawUrl) throw new Error("Upload.ee gagal")

  let resultUrl = rawUrl.replaceAll("&amp;", "&").replaceAll("&quot;", '"')
  if (isImage) resultUrl = resultUrl.replace("/files/", "/image/").replace(/\.html$/, "")

  return { host: "Upload.ee", url: resultUrl, expires: "Permanent" }
}

async function uploadToLeopard(buffer, filename) {
  const uploadPage = "https://leopard.hosting.pecon.us/upload.php"

  await fetch(uploadPage, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    },
    timeout: 30000,
  })

  const form = new FormData()
  form.append("uploadContent", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })
  form.append("password", "")
  form.append("showname", "yes")

  const res = await fetch(uploadPage, {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
      "Origin": "https://leopard.hosting.pecon.us",
      "Referer": uploadPage,
    },
    timeout: 120000,
  })

  const html = await res.text()
  const match = html.match(/Download link:\s*<a href=([^>\s]+)>/i)
  const url = match?.[1] || null
  if (!url) throw new Error("Leopard falló")
  return { host: "Leopard", url, expires: "Permanent" }
}

async function uploadToUguu(buffer, filename) {
  const form = new FormData()
  form.append("files[]", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })

  const res = await fetch("https://uguu.se/upload.php", {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "accept": "*/*",
      "origin": "https://uguu.se",
      "referer": "https://uguu.se/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    },
    timeout: 120000,
  })

  if (!res.ok) throw new Error("Uguu falló")
  const data = await res.json()
  const url = data?.files?.[0]?.url || null
  if (!data?.success || !url) throw new Error("Invalid response")
  return { host: "Uguu", url, expires: "48 horas" }
}

async function uploadTo8upload(buffer, filename) {
  await fetch("https://8upload.com/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    },
    timeout: 30000,
  })

  const form = new FormData()
  form.append("images[]", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })

  const res = await fetch("https://8upload.com/upload/mt/", {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "accept": "application/json, text/javascript, */*; q=0.01",
      "origin": "https://8upload.com",
      "referer": "https://8upload.com/",
      "x-requested-with": "XMLHttpRequest",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    },
    timeout: 120000,
  })

  let html = await res.text()
  const uploadPath = (typeof html === "string" && html.trim().startsWith("/uploads/"))
    ? html.trim()
    : (html.match(/\/uploads\/[a-zA-Z0-9]+/) || [])[0] || null

  if (uploadPath) {
    const previewRes = await fetch(`https://8upload.com${uploadPath}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
        "Referer": "https://8upload.com/",
      },
      timeout: 30000,
    })
    html = await previewRes.text()
  }

  const urlMatch = (html || "").match(/https:\/\/i\.8upload\.com\/image\/[^'"<>\s]+/)
  const url = urlMatch?.[0] || null
  if (!url) throw new Error("8upload falló")
  return { host: "8upload", url, expires: "Permanent" }
}

async function uploadToTop4top(buffer, filename) {
  const initRes = await fetch("https://top4top.io/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    },
    timeout: 30000,
  })

  const initHtml = await initRes.text()
  const sidMatch = initHtml.match(/name=["']sid["'][^>]*value=["']([^"']+)["']/i)
  const sid = sidMatch?.[1] || ""

  const form = new FormData()
  if (sid) form.append("sid", sid)
  form.append("file_0_", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })
  for (let i = 1; i <= 9; i++) form.append(`file_${i}_`, "")
  form.append("submitr", "[ رفع الملفات ]")
  for (let i = 0; i <= 9; i++) form.append(`file_${i}_`, "")

  const res = await fetch("https://top4top.io/index.php", {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "origin": "https://top4top.io",
      "referer": "https://top4top.io/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    },
    timeout: 120000,
  })

  const html = await res.text()
  const urlMatch = html.match(/https:\/\/[^'"<>\s]*\/p_[^'"<>\s]*/)
  const inputMatch = html.match(/value=["'](https:\/\/[^'"]*\/p_[^'"]*)['"]/i)
  const url = inputMatch?.[1] || urlMatch?.[0] || null
  if (!url) throw new Error("Top4top falló")
  return { host: "Top4top", url, expires: "Permanent" }
}

async function uploadToTmpFiles(buffer, filename) {
  const form = new FormData()
  form.append("file", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  })
  form.append("expire", "21600")

  const res = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "accept": "application/json",
      "user-agent": "Mozilla/5.0",
    },
    timeout: 120000,
  })

  if (!res.ok) throw new Error("TmpFiles falló")
  const data = await res.json()
  const url = data?.data?.url || null
  if (data?.status !== "success" || !url) throw new Error("Invalid response")
  return { host: "TmpFiles", url, expires: "6 horas" }
}

const UPLOADERS = [
  { name: "ImgDrop", fn: uploadToImgDrop },
  { name: "Catbox", fn: uploadToCatbox },
  { name: "Litterbox", fn: uploadToLitterbox },
  { name: "Pone", fn: uploadToPone },
  { name: "Kappa", fn: uploadToKappa },
  { name: "Uguu", fn: uploadToUguu },
  { name: "TmpFiles", fn: uploadToTmpFiles },
  { name: "Upload.ee", fn: uploadToUploadEe },
  { name: "8upload", fn: uploadTo8upload },
  { name: "Top4top", fn: uploadToTop4top },
  { name: "Leopard", fn: uploadToLeopard },
  { name: "0x0_Backup", fn: uploadTo0x0_alt },
  { name: "Qu.ax", fn: uploadToQuax },
  { name: "Termai", fn: uploadToTermai },
]

function getFileExtension(mimetype) {
  const mimeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/mp4": "m4a",
    "application/pdf": "pdf",
    "application/zip": "zip",
  }
  return mimeMap[mimetype] || "bin"
}

let handler = async (m, { conn, usedPrefix, command }) => {
  let media = null
  let mimetype = null
  let filename = "file"

  const hasQuoted = m.quoted && m.quoted.message && Object.keys(m.quoted.message).length

  if (hasQuoted) {
    const type = getContentType(m.quoted.message)
    if (!type || type === "conversation" || type === "extendedTextMessage") {
      return m.reply("⚠️ Responde a un archivo (imagen / video / audio / documento).")
    }

    try {
      try { media = await m.quoted.download() } catch { media = null }
      if (!media || !media.length) {
        media = await downloadMediaMessage(
          { key: m.quoted.key, message: m.quoted.message },
          "buffer",
          {},
        )
      }
      const content = m.quoted.message[type]
      mimetype = content?.mimetype || "application/octet-stream"
      filename = content?.fileName || `file.${getFileExtension(mimetype)}`
    } catch (e) {
      console.error(`Error en ${usedPrefix + command}:`, e)
      return m.reply("❌ No se pudo descargar el archivo. Inténtalo de nuevo.")
    }
  } else if (m.message) {
    const type = getContentType(m.message)
    if (!type || type === "conversation" || type === "extendedTextMessage") {
      let txt = `📤 *MEDIA UPLOADER* 📤\n\n`
      txt += `Hola! ¿Necesitas un link para tu media? Puedo subirla a varios servidores gratis.\n\n`
      txt += `*Cómo usar:*\n`
      txt += `👉 Envía un media con el caption \`${usedPrefix + command}\`\n`
      txt += `👉 O responde un media existente con \`${usedPrefix + command}\``
      return m.reply(txt)
    }

    try {
      try { media = await m.download() } catch { media = null }
      if (!media || !media.length) {
        media = await downloadMediaMessage(
          { key: m.key, message: m.message },
          "buffer",
          {},
        )
      }
      const content = m.message[type]
      mimetype = content?.mimetype || "application/octet-stream"
      filename = content?.fileName || `file.${getFileExtension(mimetype)}`
    } catch (e) {
      console.error(`Error en ${usedPrefix + command}:`, e)
      return m.reply("❌ No se pudo descargar el archivo. Inténtalo de nuevo.")
    }
  }

  if (!media || media.length === 0) {
    return m.reply("❌ No pude leer el media. Intenta enviarla de nuevo.")
  }

  try { await m.react("🕕") } catch {}

  const results = []
  const failed = []

  for (const uploader of UPLOADERS) {
    try {
      const result = await uploader.fn(media, filename)
      results.push(result)
    } catch (e) {
      failed.push(uploader.name)
    }
  }

  if (results.length === 0) {
    try { await m.react("❌") } catch {}
    return m.reply(`❌ Todos los servidores fallaron al subir.\n\n> Fallaron: ${failed.join(", ")}`)
  }

  let text = `🚀 *¡SUBIDA EXITOSA!* 🚀\n\n`
  text += `Tu media ya está en la nube. Elige el link y cópialo con los botones de abajo ✨\n\n`

  let contentTxt = ""
  results.forEach((r, i) => {
    const status = r.expires === "Permanent" ? "∞ Permanente" : r.expires
    contentTxt += `☁️ *Servidor :* ${r.host}\n`
    contentTxt += `⏳ *Expira :* ${status}\n`
    contentTxt += `🔗 *Link :*\n`
    contentTxt += `${r.url}`
    if (i < results.length - 1) contentTxt += `\n\n`
  })

  text += contentTxt.split("\n").map(line => `${line}`).join("\n")

  if (failed.length > 0) {
    text += `\n\n⚠️ _Fallaron algunos servidores: ${failed.join(", ")}_`
  }

  try {
    let headerMedia = null
    if (mimetype.startsWith('image') || mimetype.startsWith('video')) {
      const preMsg = await generateWAMessage(m.chat, {
        [mimetype.startsWith('image') ? 'image' : 'video']: media
      }, { userJid: conn.user.id })
      headerMedia = mimetype.startsWith('image') ?
        { imageMessage: preMsg.message.imageMessage } :
        { videoMessage: preMsg.message.videoMessage }
    }

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create({ text: text }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: global.dev || 'SHADOW-BOT-MD' }),
            header: proto.Message.InteractiveMessage.Header.create({
              title: "T O U R L",
              hasMediaAttachment: !!headerMedia,
              ...headerMedia
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons: results.slice(0, 5).map((r, i) => ({
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: `📋 Copiar Link ${r.host}`,
                  id: `copy_${i}`,
                  copy_code: r.url
                })
              }))
            })
          })
        }
      }
    }, { quoted: m })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  } catch (err) {
    await m.reply(text)
  }

  try { await m.react("✅") } catch {}
}

handler.help = ['tourl (responde a un archivo)']
handler.tags = ['tools']
handler.command = ['tourl', 'upload', 'url']

export default handler
export { UPLOADERS }
