import fs from 'fs'
import path from 'path'
import { translateBatch } from './gtranslate.js'

/**
 * Traducción en caliente de todo lo que envía el bot.
 * Portado desde Akane-Assistant para Shadow-BOT-MD.
 *
 * El usuario/owner elige el idioma con `.idioma <idioma>` o `.mode <idioma>`
 * y a partir de ahí cada texto de salida se traduce antes de enviarse.
 * Todo se guarda en caché, así que un mensaje ya traducido no vuelve a pedirse a Google.
 *
 * Se respetan sin tocar: comandos (.menu), menciones (@5842...), enlaces,
 * marcadores tipo {user}, JIDs, code spans y las versalitas.
 */

const DEFAULT_LANG = 'es'
const CACHE_DIR = path.join(process.cwd(), 'database', 'i18n')
const MAX_CACHE_ENTRIES = 20000

// Claves de los payloads de WhatsApp que sí contienen texto visible
const TEXT_KEYS = new Set([
    'text',
    'caption',
    'conversation',
    'title',
    'subtitle',
    'description',
    'displayName',
    'footer',
    'buttonText',
    'displayText',
    'display_text',
    'message',
    'messageText',
    'contentText',
    'hydratedContentText',
    'hydratedTitleText',
    'hydratedFooterText',
    'note',
    'orderTitle',
    'selectedDisplayText',
    'topLine',
    'bottomLine',
    'highlightLabel'
])

const SKIP_KEYS = new Set([
    'url',
    'sourceUrl',
    'merchant_url',
    'thumbnailUrl',
    'mediaUrl',
    'jid',
    'id',
    'newsletterJid',
    'buttonParamsJson',
    'messageParamsJson',
    'data',
    'vcard',
    'mimetype',
    'fileName',
    'copy_code',
    'payload',
    'code'
])

// Claves con texto visible dentro de los JSON codificados (botones, widgets…)
const ENCODED_TEXT_KEYS = new Set([
    'text',
    'caption',
    'title',
    'subtitle',
    'description',
    'footer',
    'label',
    'display_text',
    'displayText',
    'prompt_text',
    'list_title',
    'button_title',
    'display_meeting_type',
    'display_bottom_sheet_header',
    'display_view_on_maps_cta_text',
    'display_manage_booking_cta_text',
    'location',
    'messageDisclaimerText',
    'orderTitle',
    'cells',
    'rows'
])

const ENCODED_SKIP_KEYS = new Set([
    'id',
    'url',
    'urls',
    'merchant_url',
    'booking_url',
    'booking_management_url',
    'copy_code',
    'phone_number',
    'email',
    'sourceUrl',
    'imagePreviewUrl',
    'imageHighResUrl',
    'component',
    'catalogId',
    'surfaceId',
    'response_id',
    '__typename',
    'variant',
    'fit',
    'children',
    'child',
    'display_language',
    'trusted_sources'
])

const caches = new Map() // lang -> Map(texto original -> traducción)
let dirty = new Set()
let saveTimer = null

// ── estado del idioma ────────────────────────────────────────────────────────
let currentLang = DEFAULT_LANG

function setBotLang(code) {
    currentLang = String(code || DEFAULT_LANG).toLowerCase()
    return currentLang
}

function getBotLang() {
    return currentLang
}

function isTranslationActive() {
    return Boolean(currentLang) && currentLang !== DEFAULT_LANG
}

// ── caché en disco ───────────────────────────────────────────────────────────
function cacheFile(lang) {
    return path.join(CACHE_DIR, `${lang}.json`)
}

function getCache(lang) {
    if (caches.has(lang)) return caches.get(lang)

    let data = {}
    try {
        data = JSON.parse(fs.readFileSync(cacheFile(lang), 'utf-8'))
    } catch { }

    const map = new Map(Object.entries(data))
    caches.set(lang, map)
    return map
}

function scheduleSave(lang) {
    dirty.add(lang)
    if (saveTimer) return
    saveTimer = setTimeout(() => {
        saveTimer = null
        const pending = [...dirty]
        dirty = new Set()
        for (const code of pending) {
            try {
                fs.mkdirSync(CACHE_DIR, { recursive: true })
                const map = caches.get(code)
                if (!map) continue
                const entries = [...map.entries()].slice(-MAX_CACHE_ENTRIES)
                fs.writeFileSync(cacheFile(code), JSON.stringify(Object.fromEntries(entries)), 'utf-8')
            } catch { }
        }
    }, 4000)
    if (saveTimer.unref) saveTimer.unref()
}

// ── protección de las partes que no se traducen ──────────────────────────────
const PROTECT_PATTERNS = [
    /https?:\/\/\S+/g,                       // enlaces
    /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g,          // correos
    /\d{6,}@\S+/g,                           // JIDs
    /@\d{5,}/g,                              // menciones
    /`[^`\n]{1,120}`/g,                      // code spans
    /\{[a-zA-Z_]{2,20}\}/g,                  // marcadores {user}
    /%[a-zA-Z_]{2,20}%/g,                    // marcadores %user%
    /(?<![\w.])[.!#/][a-zA-Z][\w-]{1,20}/g   // comandos: .menu, /play
]

const TOKEN_PREFIX = 'ZQ'
const TOKEN_SUFFIX = 'QZ'
const TOKEN_RE = /ZQ\s*(\d+)\s*QZ/g

const SMALL_EXCLUSIVE = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀᴛᴜᴠᴡʏᴢǫ'
const SMALL_RUN = new RegExp(`[${SMALL_EXCLUSIVE}][${SMALL_EXCLUSIVE}sqxáéíóúüñ ]*`, 'gu')

function protect(text) {
    const tokens = []
    let out = text

    // las versalitas decorativas se dejan tal cual
    out = out.replace(SMALL_RUN, (match) => {
        const trimmed = match.replace(/\s+$/, '')
        const rest = match.slice(trimmed.length)
        tokens.push(trimmed)
        return `${TOKEN_PREFIX}${tokens.length - 1}${TOKEN_SUFFIX}${rest}`
    })

    for (const re of PROTECT_PATTERNS) {
        out = out.replace(re, (match) => {
            tokens.push(match)
            return `${TOKEN_PREFIX}${tokens.length - 1}${TOKEN_SUFFIX}`
        })
    }

    return { out, tokens }
}

function restore(text, tokens) {
    return String(text).replace(TOKEN_RE, (m, i) => tokens[Number(i)] ?? m)
}

/** ¿Merece la pena traducir esta cadena? */
function shouldTranslate(text) {
    if (typeof text !== 'string') return false
    const value = text.trim()
    if (value.length < 2 || value.length > 3000) return false
    if (!/[a-záéíóúüñ]{2,}/i.test(value)) return false // sin letras reales
    if (/^[\s\W\d]+$/.test(value)) return false        // solo símbolos o números
    return true
}

// ── traducción de textos ─────────────────────────────────────────────────────
async function translateStrings(values, lang) {
    const cache = getCache(lang)
    const prepared = values.map((v) => protect(v))
    const pending = []
    const pendingIndex = []

    prepared.forEach((p, i) => {
        if (!cache.has(p.out)) {
            pending.push(p.out)
            pendingIndex.push(i)
        }
    })

    if (pending.length) {
        try {
            for (let i = 0; i < pending.length; i += 20) {
                const chunk = pending.slice(i, i + 20)
                const result = await translateBatch(chunk, lang, DEFAULT_LANG)
                chunk.forEach((src, k) => {
                    const dst = result[k]
                    if (dst) cache.set(src, dst)
                })
            }
            scheduleSave(lang)
        } catch (error) {
            console.error('[i18n] fallo al traducir:', error?.message || error)
        }
    }

    return prepared.map((p) => restore(cache.get(p.out) || p.out, p.tokens))
}

/** Traduce un texto suelto al idioma activo del bot */
async function translateOutgoing(text, lang = currentLang) {
    if (!lang || lang === DEFAULT_LANG) return text
    if (!shouldTranslate(text)) return text
    const [result] = await translateStrings([text], lang)
    return result || text
}

/** Trocea un HTML y registra solo los nodos de texto (nunca el <style>) */
function htmlSlots(html, push) {
    const parts = String(html).split(/(<[^>]+>)/)
    let inStyle = false

    parts.forEach((part, index) => {
        if (part.startsWith('<')) {
            if (/^<style/i.test(part)) inStyle = true
            else if (/^<\/style/i.test(part)) inStyle = false
            return
        }
        if (inStyle || !shouldTranslate(part)) return
        push({
            value: part,
            apply: (translated) => {
                parts[index] = translated
            }
        })
    })

    return () => parts.join('')
}

/** Recorre un objeto (ya decodificado) y registra los textos visibles */
function collectFromObject(node, push, parentKey = null) {
    if (!node) return
    if (Buffer.isBuffer(node) || node instanceof Uint8Array) return

    if (Array.isArray(node)) {
        node.forEach((child, i) => {
            if (typeof child === 'string') {
                if (ENCODED_TEXT_KEYS.has(parentKey) && shouldTranslate(child)) {
                    push({ value: child, apply: (t) => { node[i] = t } })
                }
            } else {
                collectFromObject(child, push, parentKey)
            }
        })
        return
    }

    if (typeof node !== 'object') return

    for (const [key, value] of Object.entries(node)) {
        if (ENCODED_SKIP_KEYS.has(key)) continue

        if (typeof value === 'string') {
            if (key === 'payload' && /<[a-z]/i.test(value)) {
                const rebuild = htmlSlots(value, push)
                push({ finalize: () => { node[key] = rebuild() } })
                continue
            }
            if (ENCODED_TEXT_KEYS.has(key) && shouldTranslate(value)) {
                push({ value, apply: (t) => { node[key] = t } })
            }
        } else {
            collectFromObject(value, push, key)
        }
    }
}

/**
 * Recorre el contenido de un mensaje de WhatsApp y traduce los campos de texto
 * visibles. Además abre los contenidos codificados que usan los mensajes
 * enriquecidos: unifiedResponse (base64), bloksWidget y los *ParamsJson de los
 * botones, para que también salgan en el idioma elegido.
 */
async function translateContent(content, lang = currentLang) {
    if (!lang || lang === DEFAULT_LANG) return content
    if (!content || typeof content !== 'object') return content

    const slots = []
    const finalizers = []
    const push = (slot) => {
        if (slot.finalize) finalizers.push(slot.finalize)
        else slots.push(slot)
    }

    const walk = (node, key) => {
        if (!node || typeof node === 'number' || typeof node === 'boolean') return
        if (Buffer.isBuffer(node) || node instanceof Uint8Array) return

        if (Array.isArray(node)) {
            node.forEach((child, i) => {
                if (typeof child === 'string') {
                    if (TEXT_KEYS.has(key) && shouldTranslate(child)) {
                        push({ value: child, apply: (t) => { node[i] = t } })
                    }
                    return
                }
                walk(child, key)
            })
            return
        }

        if (typeof node !== 'object') return

        for (const [k, v] of Object.entries(node)) {
            if (typeof v === 'string') {
                if (k === 'buttonParamsJson' || k === 'messageParamsJson') {
                    try {
                        const parsed = JSON.parse(v)
                        collectFromObject(parsed, push)
                        finalizers.push(() => { node[k] = JSON.stringify(parsed) })
                    } catch { }
                    continue
                }

                if (k === 'data' && v.length > 32 && /^[A-Za-z0-9+/=]+$/.test(v)) {
                    try {
                        const parsed = JSON.parse(Buffer.from(v, 'base64').toString('utf-8'))
                        collectFromObject(parsed, push)
                        finalizers.push(() => {
                            node[k] = Buffer.from(JSON.stringify(parsed)).toString('base64')
                        })
                    } catch { }
                    continue
                }

                if (k === 'data' && v.trim().startsWith('{')) {
                    try {
                        const parsed = JSON.parse(v)
                        collectFromObject(parsed, push)
                        finalizers.push(() => { node[k] = JSON.stringify(parsed) })
                    } catch { }
                    continue
                }

                if (SKIP_KEYS.has(k)) continue
                if (TEXT_KEYS.has(k) && shouldTranslate(v)) {
                    push({ value: v, apply: (t) => { node[k] = t } })
                }
            } else {
                walk(v, k)
            }
        }
    }

    walk(content, null)
    if (!slots.length) {
        finalizers.forEach((fn) => fn())
        return content
    }

    const translated = await translateStrings(slots.map((s) => s.value), lang)
    slots.forEach((slot, i) => {
        if (translated[i]) slot.apply(translated[i])
    })
    finalizers.forEach((fn) => fn())

    return content
}

/** Estadísticas de la caché (para el comando .idioma / .mode) */
function cacheStats(lang = currentLang) {
    const map = caches.get(lang)
    return { lang, entries: map ? map.size : 0 }
}

export {
    DEFAULT_LANG,
    setBotLang,
    getBotLang,
    isTranslationActive,
    translateOutgoing,
    translateContent,
    translateStrings,
    cacheStats
}
