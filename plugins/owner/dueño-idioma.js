import { getLanguages, translate } from '../../lib/gtranslate.js'
import {
  setBotLang,
  getBotLang,
  DEFAULT_LANG,
  cacheStats
} from '../../lib/i18n.js'

const RESET_WORDS = ['off', 'no', 'reset', 'normal', 'original', 'español', 'espanol']

/** Quita acentos y pasa a minúsculas para comparar nombres de idioma */
function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/** Encuentra el idioma por código (en) o por nombre (inglés, ingles, english) */
function findLanguage(input, languages) {
  const query = normalize(input)
  if (!query) return null

  if (languages[query] && query !== 'auto') {
    return { code: query, name: languages[query] }
  }

  for (const [code, name] of Object.entries(languages)) {
    if (code === 'auto') continue
    if (normalize(name) === query) return { code, name }
  }

  // coincidencia parcial: "ingl" -> "inglés"
  const partial = Object.entries(languages).filter(
    ([code, name]) => code !== 'auto' && normalize(name).startsWith(query)
  )
  if (partial.length === 1) return { code: partial[0][0], name: partial[0][1] }
  if (partial.length > 1) return { multiple: partial.slice(0, 8) }

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

let handler = async (m, { conn, args, usedPrefix, command, isOwner, isROwner }) => {
  const rawJid = conn.user?.jid || conn.user?.id || conn.user?.lid || ''
  const botJid = String(rawJid).replace(/:\d+@/, '@')
  const getSettings = () => {
    if (!global.db?.data?.settings) global.db.data.settings = {}
    if (botJid) {
      if (!global.db.data.settings[botJid]) global.db.data.settings[botJid] = {}
      return global.db.data.settings[botJid]
    }
    return global.db.data.settings
  }
  const persist = () => {
    try {
      if (typeof global.db?.write === 'function') global.db.write().catch(() => {})
    } catch {}
  }

  const s = getSettings()
  const input = (args || []).join(' ').trim()
  const current = s.botLang || global.db?.data?.settings?.botLang || getBotLang() || DEFAULT_LANG

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
      `│ 🕯️ \`${usedPrefix + command} ingles\` — traduce el bot al inglés\n` +
      `│ 🕯️ \`${usedPrefix + command} en\` — también sirve el código de idioma\n` +
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
    s.botLang = DEFAULT_LANG
    if (global.db?.data?.settings) global.db.data.settings.botLang = DEFAULT_LANG
    persist()
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

  s.botLang = found.code
  if (global.db?.data?.settings) global.db.data.settings.botLang = found.code
  persist()
  setBotLang(found.code)
  await m.react('🎃')

  // Mensaje de confirmación traducido al idioma elegido
  let confirmacion = `El bot ahora responde en ${found.name}. Todos los mensajes se traducirán automáticamente en las sombras.`
  try {
    confirmacion = await translate(confirmacion, found.code, DEFAULT_LANG)
  } catch {}

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
