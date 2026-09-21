/* ============================================================
   herras-zipcode.js  —  Shadow Bot MD
   ------------------------------------------------------------
   Responde a un mensaje que contenga código (o texto largo,
   un documento, una imagen/video/audio) y el bot te devuelve
   un archivo .ZIP listo para descargar.

   Uso:
     1. Responde (citar) al mensaje con el código y escribe:  >zip
     2. O escribe el comando seguido del código en el mismo mensaje:
        >zip script.py
        print("hola")
     3. Con nombre personalizado:   >zip nombre | <código citado>

   Aliases: zip, zipcode, codezip, zipc, azip, tozip, zip-code
   ============================================================ */

import AdmZip from 'adm-zip'
import { fileTypeFromBuffer } from 'file-type'

/* ---------- utilidades ---------- */

const clean = (s = '') => String(s).replace(/[^\w.\-+]+/g, '_').replace(/^_+|_+$/g, '')

const kb = (n = 0) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`)

/** extensiones que se consideran "texto/código" al responder un documento */
const TEXT_EXT = /\.(txt|js|mjs|cjs|jsx|ts|tsx|json|json5|py|php|html?|css|scss|sass|less|java|kt|c|h|cpp|hpp|cc|cs|go|rs|rb|sh|bash|zsh|bat|ps1|sql|yml|yaml|toml|ini|conf|cfg|env|xml|svg|md|markdown|csv|lua|pl|r|m|swift|dart|vue|svelte|ino)$/i

/** mapa etiqueta del bloque ``` -> extensión de archivo */
const LANG_EXT = {
  js: 'js', javascript: 'js', node: 'js', mjs: 'js', cjs: 'js', ts: 'ts', typescript: 'ts',
  jsx: 'jsx', tsx: 'tsx', json: 'json', json5: 'json5', py: 'py', python: 'py', python3: 'py',
  php: 'php', html: 'html', htm: 'html', xml: 'xml', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  java: 'java', kotlin: 'kt', kt: 'kt', c: 'c', 'c++': 'cpp', cpp: 'cpp', csharp: 'cs', cs: 'cs',
  go: 'go', golang: 'go', rust: 'rs', rs: 'rs', ruby: 'rb', rb: 'rb', bash: 'sh', sh: 'sh',
  shell: 'sh', zsh: 'sh', powershell: 'ps1', ps1: 'ps1', bat: 'bat', sql: 'sql', yaml: 'yml',
  yml: 'yml', toml: 'toml', ini: 'ini', md: 'md', markdown: 'md', lua: 'lua', perl: 'pl',
  r: 'r', swift: 'swift', dart: 'dart', vue: 'vue', svelte: 'svelte', dockerfile: 'dockerfile',
  makefile: 'makefile', txt: 'txt', text: 'txt', diff: 'diff', patch: 'patch', graphql: 'graphql',
}

/**
 * Extrae el código de un texto, entendiendo bloques ```lang ... ```
 * @returns {{code:string, lang:string, ext:string}}
 */
export function extractCode(raw = '') {
  const text = String(raw).replace(/\r\n/g, '\n')
  const fence = /```([a-zA-Z0-9+#._-]*)\s*\n([\s\S]*?)```/.exec(text)

  if (fence) {
    const tag = (fence[1] || '').toLowerCase().trim()
    const code = fence[2].replace(/\s+$/, '')
    return { code, lang: tag || 'texto', ext: LANG_EXT[tag] || 'txt' }
  }

  // sin bloque: quita las ``` sueltas que a veces deja WhatsApp
  const code = text.replace(/```[a-zA-Z0-9+#._-]*\s*/g, '').replace(/\s+$/, '')
  return { code, lang: 'texto', ext: 'txt' }
}

/** infiere extensión a partir del nombre de archivo de un documento citado */
export function extFromName(name = '') {
  const m = /\.([a-z0-9]{1,8})$/i.exec(String(name).trim())
  if (!m) return null
  const e = m[1].toLowerCase()
  if (['js', 'py', 'java', 'rb'].includes(e)) return e
  if (['sh', 'php', 'json', 'txt', 'html', 'css'].includes(e)) return e
  return e.length <= 5 ? e : null
}

/* ---------- handler ---------- */

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const quoted = m.quoted || null

  if (!quoted && !text?.trim()) {
    return conn.reply(
      m.chat,
      `🗜️ *ZIP de código*

Responde a un mensaje con código o texto largo y escribe:
• \`${usedPrefix}${command}\`

También puedes:
• Pegar el código en el mismo mensaje → \`${usedPrefix}${command} index.js\\nconsole.log(1)\`
• Darle un nombre → \`${usedPrefix}${command} nombre \\| ...código citado...\`
• Responder a un documento, imagen, video o audio y convertirlo en \`.zip\`

_Aliases: zip · zipcode · codezip · azip · tozip_`,
      m,
    )
  }

  /* --- argumentos opcionales: "nombre | resto del texto" --- */
  let argText = text || ''
  let customName = ''
  let customExt = ''
  if (argText.includes('|')) {
    const [first, ...rest] = argText.split('|')
    const rawName = clean(first)
    const dot = rawName.lastIndexOf('.')
    const maybeExt = dot > 0 ? rawName.slice(dot + 1) : ''
    // si el "nombre" trae extensión reconocible, se respeta (bot.py -> bot + py)
    if (maybeExt && maybeExt.length <= 5 && (LANG_EXT[maybeExt.toLowerCase()] || extFromName(`x.${maybeExt}`))) {
      customName = rawName.slice(0, dot)
      customExt = maybeExt.toLowerCase()
    } else {
      customName = rawName
    }
    argText = rest.join('|')
  }

  let fileName = ''
  let fileExt = 'txt'
  let buffer = null
  let info = ''
  let isCode = false

  try {
    /* 1) ¿hay un documento citado? (archivo enviado como documento) */
    const qDoc = quoted?.msg?.documentMessage
    const qDocName = qDoc?.fileName || quoted?.filename || ''

    /* 2) ¿hay una media citada? (imagen / video / audio / sticker) */
    const qMime = quoted?.mimetype || quoted?.msg?.mimetype || ''
    const hasMedia = !!quoted && /^(image|video|audio|application\/ogg|sticker)/i.test(qMime) && !qDoc

    if (qDoc || hasMedia) {
      await m.react?.('🗜️')
      // simple.js elimina quoted.download cuando no hay media (línea ~2281)
      if (typeof quoted.download !== 'function') throw new Error('no puedo descargar el mensaje citado (media expirada o no disponible)')
      buffer = await quoted.download()

      if (qDoc) {
        const base = clean(qDocName.split('.').slice(0, -1).join('.')) || 'archivo'
        fileName = `${base}.zip`
        info = `📄 Documento: \`${qDocName}\``
      } else {
        const detected = await fileTypeFromBuffer(buffer).catch(() => null)
        fileExt = customExt || detected?.ext || (qMime.split('/')[1] || 'bin').split(';')[0]
        fileName = `${clean(customName || 'media')}.zip`
        info = `🎞️ Media: \`${fileExt}\``
      }

      if (!buffer?.length) throw new Error('el archivo citado llegó vacío')
      buffer = zipEntries([{ name: qDocName || `archivo.${fileExt}`, data: buffer }])
    } else {
      /* 3) texto: el del mensaje citado o el escrito junto al comando */
      // en Baileys: quoted.text (conversation/extendedText), quoted.caption (imagen/video)
      let raw = quoted?.text || quoted?.caption || quoted?.msg?.text || ''
      if (argText.trim()) raw = raw ? `${raw}\n${argText}` : argText

      if (!raw.trim()) {
        await m.react?.('❓')
        return conn.reply(
          m.chat,
          `🤔 El mensaje citado no tiene texto que pueda comprimir.\n\n> Responde a un mensaje con código, o pega el código después del comando:\n\`${usedPrefix}${command} index.js\\nconsole.log("hola")\``,
          m,
        )
      }

      const parsed = extractCode(raw)
      const code = parsed.code.trim()

      if (code.length < 40) {
        await m.react?.('❓')
        return conn.reply(
          m.chat,
          `🤔 Eso es muy corto para un \`.zip\` (${code.length} caracteres).\n\n> Cita un mensaje con código más largo, o usa \`${usedPrefix}${command}\` pegando el código completo.`,
          m,
        )
      }

      // ¿el usuario indicó un nombre con extensión? ej: "zip script.py"
      const named = argText.trim().split(/\s+/)[0] || ''
      const namedExt = extFromName(named)
      const baseName = namedExt ? named.split('.').slice(0, -1).join('.') : named

      // 1º extensión dada por el usuario, 2º la del bloque ```lang, 3º .txt
      fileExt = customExt || (parsed.ext !== 'txt' ? parsed.ext : null) || namedExt || fileExt

      const base = clean(customName || baseName || 'codigo')
      const lines = code.split('\n').length
      const entryName = `${base}.${fileExt}`

      isCode = true
      fileName = `${base}.zip`
      buffer = zipEntries([{ name: entryName, data: Buffer.from(code, 'utf8') }])
      info = `📝 \`${entryName}\` · ${lines} líneas · ${kb(Buffer.byteLength(code))}`
    }

    /* --- entrega --- */
    await conn.sendFile(m.chat, buffer, fileName, `🗜️ *Listo*\n\n${info}\n📦 ${kb(buffer.length)} comprimido`, m, false, {
      mimetype: 'application/zip',
      asDocument: true,
    })
    await m.react?.('✅')
  } catch (e) {
    console.error('[herras-zipcode]', e)
    await m.react?.('❌')
    return conn.reply(m.chat, `❌ No pude crear el ZIP.\n\n🪵 ${e?.message || e}`, m)
  }
}

/** arma el .zip en memoria y devuelve el Buffer */
function zipEntries(entries) {
  const zip = new AdmZip()
  for (const e of entries) zip.addFile(e.name, Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8'))
  return zip.toBuffer()
}

handler.help = ['zip <responder código>']
handler.tags = ['tools']
handler.command = ['zip', 'zipcode', 'codezip', 'zipc', 'azip', 'tozip', 'zip-code']
handler.limit = false

export default handler
