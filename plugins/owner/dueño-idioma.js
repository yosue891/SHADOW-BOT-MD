import { getLanguages, translate } from '../../lib/gtranslate.js'
import {
  setBotLang,
  getBotLang,
  DEFAULT_LANG,
  cacheStats
} from '../../lib/i18n.js'

const RESET_WORDS = ['off', 'no', 'reset', 'normal', 'original', 'español', 'espanol', 'desactivar']

const COUNTRY_AND_LANG_ALIASES = {
  // Japón
  japon: 'ja',
  japan: 'ja',
  japanese: 'ja',
  japones: 'ja',
  jp: 'ja',
  ja: 'ja',

  // Inglés
  ingles: 'en',
  english: 'en',
  inglaterra: 'en',
  eeuu: 'en',
  usa: 'en',
  uk: 'en',
  us: 'en',
  en: 'en',

  // Español
  espanol: 'es',
  spanish: 'es',
  espana: 'es',
  mexico: 'es',
  colombia: 'es',
  peru: 'es',
  argentina: 'es',
  chile: 'es',
  es: 'es',

  // Francés
  frances: 'fr',
  french: 'fr',
  francia: 'fr',
  france: 'fr',
  fr: 'fr',

  // Alemán
  aleman: 'de',
  german: 'de',
  alemania: 'de',
  germany: 'de',
  de: 'de',
  ger: 'de',

  // Portugués
  portugues: 'pt',
  portuguese: 'pt',
  portugal: 'pt',
  brasil: 'pt',
  brazil: 'pt',
  pt: 'pt',
  br: 'pt',

  // Ruso
  ruso: 'ru',
  russian: 'ru',
  rusia: 'ru',
  russia: 'ru',
  ru: 'ru',

  // Italiano
  italiano: 'it',
  italian: 'it',
  italia: 'it',
  italy: 'it',
  it: 'it',

  // Chino
  chino: 'zh-CN',
  chinese: 'zh-CN',
  china: 'zh-CN',
  zh: 'zh-CN',
  cn: 'zh-CN',

  // Coreano
  coreano: 'ko',
  korean: 'ko',
  corea: 'ko',
  korea: 'ko',
  ko: 'ko',
  kr: 'ko',

  // Árabe
  arabe: 'ar',
  arabic: 'ar',
  egipto: 'ar',
  arabia: 'ar',
  ar: 'ar',

  // Hindi
  hindi: 'hi',
  india: 'hi',
  hi: 'hi',
  in: 'hi',

  // Indonesio
  indonesio: 'id',
  indonesian: 'id',
  indonesia: 'id',
  id: 'id',

  // Turco
  turco: 'tr',
  turkish: 'tr',
  turquia: 'tr',
  turkey: 'tr',
  tr: 'tr',

  // Holandés / Neerlandés
  holandes: 'nl',
  neerlandes: 'nl',
  dutch: 'nl',
  holanda: 'nl',
  nl: 'nl',

  // Polaco
  polaco: 'pl',
  polish: 'pl',
  polonia: 'pl',
  poland: 'pl',
  pl: 'pl',

  // Griego
  griego: 'el',
  greek: 'el',
  grecia: 'el',
  greece: 'el',
  el: 'el',
  gr: 'el',

  // Sueco
  sueco: 'sv',
  swedish: 'sv',
  suecia: 'sv',
  sweden: 'sv',
  sv: 'sv',
  se: 'sv',

  // Ucraniano
  ucraniano: 'uk',
  ukrainian: 'uk',
  ucrania: 'uk',
  ukraine: 'uk',
  ua: 'uk',

  // Vietnamita
  vietnamita: 'vi',
  vietnamese: 'vi',
  vietnam: 'vi',
  vi: 'vi',
  vn: 'vi',

  // Tailandés
  tailandes: 'th',
  thai: 'th',
  tailandia: 'th',
  thailand: 'th',
  th: 'th',

  // Tagalo / Filipino
  tagalo: 'tl',
  filipino: 'tl',
  filipinas: 'tl',
  philippines: 'tl',
  tl: 'tl',
  ph: 'tl'
}

/** Quita acentos y pasa a minúsculas para comparar nombres de idioma */
function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/** Encuentra el idioma por alias común, código (ja) o por nombre (japonés, ingles) */
function findLanguage(input, languages) {
  const query = normalize(input)
  if (!query) return null

  // 1. Alias directo de país o variación común (ej. "japon" -> "ja")
  if (COUNTRY_AND_LANG_ALIASES[query]) {
    const code = COUNTRY_AND_LANG_ALIASES[query]
    return { code, name: languages[code] || code }
  }

  // 2. Coincidencia por código directo
  if (languages[query] && query !== 'auto') {
    return { code: query, name: languages[query] }
  }

  // 3. Coincidencia exacta por nombre
  for (const [code, name] of Object.entries(languages)) {
    if (code === 'auto') continue
    if (normalize(name) === query) return { code, name }
  }

  // 4. Coincidencia parcial por prefijo: "ingl" -> "inglés"
  const partial = Object.entries(languages).filter(
    ([code, name]) => code !== 'auto' && normalize(name).startsWith(query)
  )
  if (partial.length === 1) return { code: partial[0][0], name: partial[0][1] }
  if (partial.length > 1) return { multiple: partial.slice(0, 8) }

  // 5. Coincidencia que contenga la palabra
  const contains = Object.entries(languages).filter(
    ([code, name]) => code !== 'auto' && normalize(name).includes(query)
  )
  if (contains.length === 1) return { code: contains[0][0], name: contains[0][1] }
  if (contains.length > 1) return { multiple: contains.slice(0, 8) }

  return null
}

function buildLanguageList(languages, current) {
  const entries = Object.entries(languages).filter(([code]) => code !== 'auto')
  const lines = entries.map(
    ([code, name]) => `${code === current ? '▸ 🎃' : '◦'} \`${code}\` — ${name}`
  )

  return (
    `🌐 *ɪᴅɪᴏᴍᴀs ᴅɪsᴘᴏɴɪʙʟᴇs • ꜱʜᴀᴅᴏᴡ ɢᴀʀᴅᴇɴ*\n\n` +
    `> 🕯️ Idioma actual: *${languages[current] || current}* (\`${current}\`)\n` +
    `> 🦇 Total: *${entries.length}* idiomas\n\n` +
    `${lines.join('\n')}`
  )
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const rawJid = conn.user?.jid || conn.user?.id || conn.user?.lid || ''
  const cleanJid = String(rawJid).replace(/:\d+@/, '@')

  const saveLangToDb = (langCode) => {
    if (!global.db?.data?.settings) global.db.data.settings = {}
    global.db.data.settings.botLang = langCode
    if (rawJid) {
      if (!global.db.data.settings[rawJid]) global.db.data.settings[rawJid] = {}
      global.db.data.settings[rawJid].botLang = langCode
    }
    if (cleanJid && cleanJid !== rawJid) {
      if (!global.db.data.settings[cleanJid]) global.db.data.settings[cleanJid] = {}
      global.db.data.settings[cleanJid].botLang = langCode
    }
    try {
      if (typeof global.db?.write === 'function') global.db.write().catch(() => {})
    } catch { }
  }

  const input = (args || []).join(' ').trim()
  const current = getBotLang() || DEFAULT_LANG

  let languages
  try {
    languages = await getLanguages()
  } catch (error) {
    return m.reply(
      `❌ *No se pudo obtener la lista de idiomas*\n\n> ${String(error?.message || error).slice(0, 200)}`
    )
  }

  // ── Sin argumentos: mostrar lista de idiomas ──────────────────────────────
  if (!input) {
    await m.react('🌐')
    const list = buildLanguageList(languages, current)
    const ayuda =
      `\n\n╭── 🎃 *ᴄóᴍᴏ ᴜsᴀʀ* 🦇 ──╮\n` +
      `│ 🕯️ \`${usedPrefix + command} japon\` — traduce el bot al japonés\n` +
      `│ 🕯️ \`${usedPrefix + command} ingles\` — traduce el bot al inglés\n` +
      `│ 🕯️ \`${usedPrefix + command} ja\` — también sirve el código directo\n` +
      `│ 🕯️ \`${usedPrefix + command} off\` — vuelve al español original\n` +
      `╰─────────────────────╯`

    const full = list + ayuda
    if (full.length <= 4000) return m.reply(full)

    const mitad = Math.ceil(list.length / 2)
    const corte = list.lastIndexOf('\n', mitad)
    await m.reply(list.slice(0, corte))
    return m.reply(list.slice(corte) + ayuda)
  }

  // ── Volver al idioma original ──────────────────────────────────────────────
  if (RESET_WORDS.includes(normalize(input))) {
    saveLangToDb(DEFAULT_LANG)
    setBotLang(DEFAULT_LANG)
    await m.react('🎃')
    return m.reply(
      `✅ *ɪᴅɪᴏᴍᴀ ʀᴇsᴛᴀᴜʀᴀᴅᴏ*\n\n` +
      `> El bot vuelve a manifestarse en *español* 🎃\n` +
      `> Traducción en caliente desactivada.`
    )
  }

  // ── Buscar y cambiar idioma ────────────────────────────────────────────────
  const found = findLanguage(input, languages)

  if (!found) {
    await m.react('❌')
    return m.reply(
      `❌ *ɪᴅɪᴏᴍᴀ ɴᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ*\n\n` +
      `> No se reconoció \`${input}\` en los grimorios.\n` +
      `> Escribe \`${usedPrefix + command}\` para ver la lista completa de idiomas.`
    )
  }

  if (found.multiple) {
    await m.react('🤔')
    return m.reply(
      `🤔 *¿A cuál de estos te refieres?*\n\n` +
      found.multiple.map(([code, name]) => `◦ \`${usedPrefix + command} ${code}\` — ${name}`).join('\n')
    )
  }

  saveLangToDb(found.code)
  setBotLang(found.code)
  await m.react('🎃')

  // Mensaje de confirmación traducido al idioma elegido
  let confirmacion = `El bot ahora responde en ${found.name}. Todos los mensajes se traducirán automáticamente en las sombras.`
  try {
    confirmacion = await translate(confirmacion, found.code, DEFAULT_LANG)
  } catch { }

  const stats = cacheStats(found.code)

  return m.reply(
    `✅ *ɪᴅɪᴏᴍᴀ ᴄᴀᴍʙɪᴀᴅᴏ • ꜱʜᴀᴅᴏᴡ ɢᴀʀᴅᴇɴ*\n\n` +
    `╭── 🎃 *${String(found.name).toUpperCase()}* 🦇 ──╮\n` +
    `│ 🔤 Código: \`${found.code}\`\n` +
    `│ 💾 En caché: \`${stats.entries}\` frases\n` +
    `│ ↩️ Restaurar: \`${usedPrefix + command} off\`\n` +
    `╰────────────────────────╯\n\n` +
    `> ${confirmacion}`
  )
}

handler.help = ['mode <idioma>', 'idioma <idioma>', 'lang <idioma>', 'setlang <idioma>']
handler.tags = ['owner', 'ajustes']
handler.command = ['mode', 'idioma', 'language', 'lang', 'setlang']
handler.owner = true

export default handler
