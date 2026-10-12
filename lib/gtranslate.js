import axios from 'axios'

/**
 * Scraper de Google Translate (endpoints públicos, sin API key).
 * Portado de Akane-Assistant para traducción en caliente y comandos de idioma.
 */

const UA =
    'Mozilla/5.0 (Linux; Android 11; G51 Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/152.0.7977.64 Mobile Safari/537.36'

const HEADERS = { 'User-Agent': UA, Referer: 'https://translate.google.com/' }

let languageCache = null
let languageCacheTime = 0
const LANGUAGE_TTL = 12 * 60 * 60 * 1000 // 12 horas

/** Lista de idiomas disponibles: { código: nombre } */
async function getLanguages(hl = 'es') {
    if (languageCache && Date.now() - languageCacheTime < LANGUAGE_TTL) {
        return languageCache
    }

    const { data } = await axios.get('https://translate.google.com/translate_a/l', {
        params: { client: 'dict-chrome-ex', hl },
        headers: HEADERS,
        timeout: 20000
    })

    const langs = data?.tl
    if (!langs || typeof langs !== 'object') {
        throw new Error('No se pudo obtener la lista de idiomas')
    }

    languageCache = langs
    languageCacheTime = Date.now()
    return langs
}

/** Traduce un texto suelto */
async function translate(text, target, source = 'auto') {
    if (!text || !String(text).trim()) return String(text ?? '')

    try {
        const { data } = await axios.get('https://translate.google.com/translate_a/single', {
            params: { client: 'dict-chrome-ex', sl: source, tl: target, dt: 't', q: text },
            headers: HEADERS,
            timeout: 25000
        })

        if (Array.isArray(data) && Array.isArray(data[0])) {
            return data[0].map((seg) => seg[0]).filter(Boolean).join('')
        }
    } catch { }

    // Respaldo: endpoint de clients5 (admite varios textos por petición)
    const [result] = await translateBatch([text], target, source)
    if (result == null) throw new Error('Respuesta inesperada de Google Translate')
    return result
}

/**
 * Traduce varios textos en una sola petición (mucho más rápido).
 * Devuelve un array del mismo tamaño que la entrada.
 */
async function translateBatch(texts = [], target, source = 'auto') {
    const list = texts.map((t) => String(t ?? ''))
    if (!list.length) return []

    const query = list.map((t) => 'q=' + encodeURIComponent(t)).join('&')
    const url =
        `https://clients5.google.com/translate_a/t?client=dict-chrome-ex` +
        `&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&${query}`

    const { data } = await axios.get(url, { headers: HEADERS, timeout: 30000 })

    // Con un solo texto la respuesta es ["traducción","idioma"]
    if (list.length === 1) {
        if (typeof data === 'string') return [data]
        if (Array.isArray(data) && typeof data[0] === 'string') return [data[0]]
        if (Array.isArray(data) && Array.isArray(data[0])) return [data[0][0]]
        return [list[0]]
    }

    if (!Array.isArray(data)) return list
    return data.map((item, i) => {
        if (typeof item === 'string') return item
        if (Array.isArray(item)) return item[0] ?? list[i]
        return list[i]
    })
}

/** Traduce el mismo texto a varios idiomas (o a todos) */
async function translateToAll(text, { source = 'auto', limit = 10, codes = null } = {}) {
    const languages = await getLanguages()
    let list = codes || Object.keys(languages).filter((c) => c !== 'auto')
    if (limit) list = list.slice(0, limit)

    const results = []
    for (const code of list) {
        try {
            const translated = await translate(text, code, source)
            results.push({ code, name: languages[code] || code, translated })
        } catch (error) {
            results.push({ code, name: languages[code] || code, error: error?.message || String(error) })
        }
    }
    return results
}

export { getLanguages, translate, translateBatch, translateToAll }
