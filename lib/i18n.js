import fs from 'fs'
import path from 'path'
import { translateBatch } from './gtranslate.js'

/**
 * Traducción en caliente de todo lo que envía el bot.
 * Optimizado para Shadow-BOT-MD con soporte para fuentes decorativas
 * (Small Caps, Math Bold, Sans, Italic, Fullwidth), persistencia en disco y
 * protección estricta de comandos, URLs, menciones y tokens.
 */

const DEFAULT_LANG = 'es'
const CACHE_DIR = path.join(process.cwd(), 'database', 'i18n')
const CONFIG_FILE = path.join(CACHE_DIR, 'config.json')
const MAX_CACHE_ENTRIES = 25000

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
    'code',
    'productImage'
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

// ── carga y guardado de idioma activo en disco ────────────────────────────────
function loadActiveLang() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
            if (raw && typeof raw.lang === 'string' && raw.lang.trim()) {
                return raw.lang.trim().toLowerCase()
            }
        }
    } catch { }
    return DEFAULT_LANG
}

let currentLang = loadActiveLang()

function setBotLang(code) {
    currentLang = String(code || DEFAULT_LANG).toLowerCase().trim()
    try {
        fs.mkdirSync(CACHE_DIR, { recursive: true })
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ lang: currentLang }, null, 2), 'utf-8')
    } catch { }
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

// ── conversión de tipografías estilizadas para que Google las entienda ────────
const SMALL_CAPS_MAP = {
    'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f', 'ɢ': 'g', 'ʜ': 'h',
    'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l', 'ᴍ': 'm', 'ɴ': 'n', 'ᴏ': 'o', 'ᴘ': 'p',
    'ǫ': 'q', 'ʀ': 'r', 'ꜱ': 's', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'x': 'x',
    'ʏ': 'y', 'ᴢ': 'z'
}

export function unstyleFancyText(text) {
    if (typeof text !== 'string') return text

    // 1. Fullwidth forms (U+FF01 - U+FF5E)
    let s = text.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))

    // 2. Small caps (versalitas)
    s = s.replace(/[ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡʏᴢ]/gu, (ch) => SMALL_CAPS_MAP[ch] || ch)

    // 3. Circled letters (Ⓐ-Ⓩ, ⓐ-ⓩ)
    s = s.replace(/[\u24B6-\u24CF]/gu, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x24B6 + 65))
    s = s.replace(/[\u24D0-\u24E9]/gu, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x24D0 + 97))

    // 4. Mathematical Alphanumeric Symbols (U+1D400 - U+1D7FF)
    s = s.replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => {
        const cp = ch.codePointAt(0)
        // Bold serif (A-Z, a-z)
        if (cp >= 0x1D400 && cp <= 0x1D419) return String.fromCharCode(cp - 0x1D400 + 65)
        if (cp >= 0x1D41A && cp <= 0x1D433) return String.fromCharCode(cp - 0x1D41A + 97)
        // Italic (A-Z, a-z)
        if (cp >= 0x1D434 && cp <= 0x1D44D) return String.fromCharCode(cp - 0x1D434 + 65)
        if (cp >= 0x1D44E && cp <= 0x1D467) return String.fromCharCode(cp - 0x1D44E + 97)
        // Bold italic (A-Z, a-z)
        if (cp >= 0x1D468 && cp <= 0x1D481) return String.fromCharCode(cp - 0x1D468 + 65)
        if (cp >= 0x1D482 && cp <= 0x1D49B) return String.fromCharCode(cp - 0x1D482 + 97)
        // Script / Bold Script
        if (cp >= 0x1D49C && cp <= 0x1D4B5) return String.fromCharCode(cp - 0x1D49C + 65)
        if (cp >= 0x1D4B6 && cp <= 0x1D4CF) return String.fromCharCode(cp - 0x1D4B6 + 97)
        if (cp >= 0x1D4D0 && cp <= 0x1D4E9) return String.fromCharCode(cp - 0x1D4D0 + 65)
        if (cp >= 0x1D4EA && cp <= 0x1D503) return String.fromCharCode(cp - 0x1D4EA + 97)
        // Fraktur / Bold Fraktur
        if (cp >= 0x1D504 && cp <= 0x1D51D) return String.fromCharCode(cp - 0x1D504 + 65)
        if (cp >= 0x1D51E && cp <= 0x1D537) return String.fromCharCode(cp - 0x1D51E + 97)
        if (cp >= 0x1D56C && cp <= 0x1D585) return String.fromCharCode(cp - 0x1D56C + 65)
        if (cp >= 0x1D586 && cp <= 0x1D59F) return String.fromCharCode(cp - 0x1D586 + 97)
        // Double-struck
        if (cp >= 0x1D538 && cp <= 0x1D551) return String.fromCharCode(cp - 0x1D538 + 65)
        if (cp >= 0x1D552 && cp <= 0x1D56B) return String.fromCharCode(cp - 0x1D552 + 97)
        // Sans-serif
        if (cp >= 0x1D5A0 && cp <= 0x1D5B9) return String.fromCharCode(cp - 0x1D5A0 + 65)
        if (cp >= 0x1D5BA && cp <= 0x1D5D3) return String.fromCharCode(cp - 0x1D5BA + 97)
        // Sans-serif bold
        if (cp >= 0x1D5D4 && cp <= 0x1D5ED) return String.fromCharCode(cp - 0x1D5D4 + 65)
        if (cp >= 0x1D5EE && cp <= 0x1D607) return String.fromCharCode(cp - 0x1D5EE + 97)
        // Sans-serif italic / bold italic
        if (cp >= 0x1D608 && cp <= 0x1D621) return String.fromCharCode(cp - 0x1D608 + 65)
        if (cp >= 0x1D622 && cp <= 0x1D63B) return String.fromCharCode(cp - 0x1D622 + 97)
        if (cp >= 0x1D63C && cp <= 0x1D655) return String.fromCharCode(cp - 0x1D63C + 65)
        if (cp >= 0x1D656 && cp <= 0x1D66F) return String.fromCharCode(cp - 0x1D656 + 97)
        // Monospace
        if (cp >= 0x1D670 && cp <= 0x1D689) return String.fromCharCode(cp - 0x1D670 + 65)
        if (cp >= 0x1D68A && cp <= 0x1D6A3) return String.fromCharCode(cp - 0x1D68A + 97)
        // Digits
        if (cp >= 0x1D7CE && cp <= 0x1D7D7) return String.fromCharCode(cp - 0x1D7CE + 48)
        if (cp >= 0x1D7D8 && cp <= 0x1D7E1) return String.fromCharCode(cp - 0x1D7D8 + 48)
        if (cp >= 0x1D7E2 && cp <= 0x1D7EB) return String.fromCharCode(cp - 0x1D7E2 + 48)
        if (cp >= 0x1D7EC && cp <= 0x1D7F5) return String.fromCharCode(cp - 0x1D7EC + 48)
        if (cp >= 0x1D7F6 && cp <= 0x1D7FF) return String.fromCharCode(cp - 0x1D7F6 + 48)
        return ch
    })

    return s
}

// ── protección de las partes que no se traducen ──────────────────────────────
const PROTECT_PATTERNS = [
    /https?:\/\/\S+/g,                       // enlaces web
    /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g,          // correos electrónicos
    /\d{6,}@\S+/g,                           // JIDs
    /@\d{5,}/g,                              // menciones WhatsApp (@5842...)
    /\{[a-zA-Z_]{2,20}\}/g,                  // marcadores de plantilla {user}
    /%[a-zA-Z_]{2,20}%/g,                    // marcadores de plantilla %user%
    /(?<![\w.])[.!#/][a-zA-Z][\w-]{1,20}/g   // comandos: .menu, .ping, #help
]

const TOKEN_PREFIX = 'ZQ'
const TOKEN_SUFFIX = 'QZ'
const TOKEN_RE = /ZQ\s*(\d+)\s*QZ/g

function protect(text) {
    const tokens = []
    let out = String(text || '')

    // Proteger patrones intocables primero
    for (const re of PROTECT_PATTERNS) {
        out = out.replace(re, (match) => {
            tokens.push(match)
            return `${TOKEN_PREFIX}${tokens.length - 1}${TOKEN_SUFFIX}`
        })
    }

    // Desestilizar letras matemáticas y versalitas para que Google Translate
    // las reconozca como vocabulario válido y las traduzca con precisión
    out = unstyleFancyText(out)

    return { out, tokens }
}

function restore(text, tokens) {
    return String(text).replace(TOKEN_RE, (m, i) => tokens[Number(i)] ?? m)
}

/** ¿Merece la pena traducir esta cadena? */
function shouldTranslate(text) {
    if (typeof text !== 'string') return false
    const raw = text.trim()
    if (raw.length < 2 || raw.length > 5000) return false
    const unstyled = unstyleFancyText(raw)
    if (!/[a-záéíóúüñ]{2,}/i.test(unstyled)) return false // sin letras legibles
    if (/^[\s\W\d]+$/.test(unstyled)) return false       // solo símbolos o números
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
    if (content.__i18nDone) return content

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
        content.__i18nDone = true
        return content
    }

    const translated = await translateStrings(slots.map((s) => s.value), lang)
    slots.forEach((slot, i) => {
        if (translated[i]) slot.apply(translated[i])
    })
    finalizers.forEach((fn) => fn())

    content.__i18nDone = true
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
