import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'
const BASE_URL = 'https://winbu.org'
const DATA_DIR = path.join(process.cwd(), 'database', 'autoanime')
const LEGACY_DATA_DIR = path.join(process.cwd(), 'src', 'data')
const SENT_FILE = path.join(DATA_DIR, 'autoanime_winbu_sent.json')
const STATE_FILE = path.join(DATA_DIR, 'autoanime_winbu_state.json')
const LEGACY_SENT_FILE = path.join(LEGACY_DATA_DIR, 'autoanime_winbu_sent.json')
const LEGACY_STATE_FILE = path.join(LEGACY_DATA_DIR, 'autoanime_winbu_state.json')

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': BASE_URL + '/',
    'Cache-Control': 'no-cache'
}

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJsonFile(file, fallbackFile, defaultValue) {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
        if (fallbackFile && fs.existsSync(fallbackFile)) {
            const legacy = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'))
            ensureDataDir()
            fs.writeFileSync(file, JSON.stringify(legacy, null, 2))
            return legacy
        }
    } catch {}
    return defaultValue
}

function loadSent() {
    const data = readJsonFile(SENT_FILE, LEGACY_SENT_FILE, [])
    return new Set(Array.isArray(data) ? data : [])
}

function saveSent(set) {
    try {
        ensureDataDir()
        fs.writeFileSync(SENT_FILE, JSON.stringify([...set], null, 2))
    } catch {}
}

function loadState() {
    const data = readJsonFile(STATE_FILE, LEGACY_STATE_FILE, { enabled: false, groups: [], interval: 5 })
    return {
        enabled: data?.enabled === true,
        groups: Array.isArray(data?.groups) ? data.groups : [],
        interval: Number(data?.interval) || 5
    }
}

function saveState(state) {
    try {
        ensureDataDir()
        fs.writeFileSync(STATE_FILE, JSON.stringify({
            enabled: state?.enabled === true,
            groups: Array.isArray(state?.groups) ? state.groups : [],
            interval: Number(state?.interval) || 5
        }, null, 2))
    } catch {}
}

async function fetchPage(url) {
    const res = await axios.get(url, {
        headers: HEADERS,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: () => true
    })

    if (res.status < 200 || res.status >= 300) {
        throw new Error(`Winbu HTTP ${res.status}`)
    }

    return String(res.data || '')
}

async function getOngoingAnimeList() {
    const html = await fetchPage(`${BASE_URL}/`)
    const $ = cheerio.load(html)
    const list = []
    const seen = new Set()

    function pushAnime(item) {
        const a = $(item).find('a.ml-mask').first().length
            ? $(item).find('a.ml-mask').first()
            : $(item).find('a[href*="/anime/"]').first()
        const href = a.attr('href') || ''
        const title = (
            a.attr('title') ||
            $(item).find('.judul').first().text() ||
            $(item).find('.mli-info .judul').first().text() ||
            $(item).find('img').attr('alt') ||
            ''
        ).replace(/\s+/g, ' ').trim()

        if (!href || !title || !href.includes('/anime/')) return

        const normalUrl = new URL(href, BASE_URL).href
        if (seen.has(normalUrl)) return
        seen.add(normalUrl)

        const imgEl = $(item).find('img').first()
        const cover = imgEl.attr('data-original') || imgEl.attr('data-src') || imgEl.attr('src') || ''
        const episode = ($(item).find('.mli-episode').first().text() || '').replace(/\s+/g, ' ').trim()
        const timeText = ($(item).find('.mli-waktu').first().text() || '').replace(/\s+/g, ' ').trim()

        list.push({
            title,
            url: normalUrl,
            slug: normalUrl.split('/anime/')[1]?.replace(/\//g, '') || '',
            cover: cover ? new URL(cover, BASE_URL).href : '',
            episode,
            timeText
        })
    }

    $('.movies-list-wrap').each((_, section) => {
        const sectionTitle = (
            $(section).find('.list-title h2').attr('title') ||
            $(section).find('.list-title h2').text() ||
            $(section).find('.list-title').text() ||
            ''
        ).toLowerCase()

        const isAnimeSection =
            sectionTitle.includes('anime') ||
            sectionTitle.includes('donghua') ||
            sectionTitle.includes('terbaru') ||
            sectionTitle.includes('recent')

        if (!isAnimeSection) return
        $(section).find('.ml-item').each((__, item) => pushAnime(item))
    })

    // Fallback si Winbu cambia títulos de secciones pero conserva tarjetas /anime/
    if (list.length === 0) {
        $('.ml-item').each((_, item) => pushAnime(item))
    }

    return list
}

async function getLatestEpisodeLink(animeUrl) {
    const html = await fetchPage(animeUrl)
    const $ = cheerio.load(html)
    const candidates = []

    $('a[href*="episode"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (!href) return
        const text = ($(el).text() || '').replace(/\s+/g, ' ').trim()
        const fullUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href
        const epMatch = text.match(/episode\s*(\d+)/i) || text.match(/ep\s*(\d+)/i) || fullUrl.match(/episode[_-]?(\d+)/i)
        const number = epMatch ? epMatch[1] : null
        candidates.push({
            number: number || 'Latest',
            text: text || (number ? `Episode ${number}` : 'Episode terbaru'),
            url: fullUrl,
            score: number ? Number(number) : 0,
            isSpecial: /spesial|special/i.test(text + ' ' + fullUrl)
        })
    })

    if (!candidates.length) return null

    candidates.sort((a, b) => {
        if (a.isSpecial !== b.isSpecial) return a.isSpecial ? 1 : -1
        return b.score - a.score
    })

    return candidates[0]
}

async function getEpisodeTime(episodeUrl) {
    try {
        const html = await fetchPage(episodeUrl)
        const $ = cheerio.load(html)

        const metaTime = $('meta[property="article:published_time"]').attr('content')
        if (metaTime) return metaTime

        const timeEl = $('time')
        if (timeEl.length) {
            const dt = timeEl.attr('datetime')
            if (dt) return dt
            const txt = timeEl.text().trim()
            if (txt) return txt
        }

        const dateText = ($('.post-date').text() || $('.entry-date').text() || $('.published').text()).trim()
        if (dateText) return dateText

        const bodyText = $('body').text()
        const match = bodyText.match(/(\d+)\s+(hours?|days?|minutes?|seconds?)\s+ago/i)
        if (match) return match[0]

        return null
    } catch {
        return null
    }
}

function parseRelativeTimeToHours(timeStr) {
    if (!timeStr) return null

    const text = String(timeStr).toLowerCase().trim()

    if (text.match(/^\d{4}-\d{2}-\d{2}T/)) {
        const pubDate = new Date(timeStr)
        if (!isNaN(pubDate)) return (Date.now() - pubDate) / (1000 * 60 * 60)
    }

    const regex = /(\d+)\s+(hour|hours|day|days|minute|minutes|second|seconds|jam|hari|menit|detik|bulan|month|months)\b/i
    const match = text.match(regex)
    if (match) {
        const value = parseInt(match[1])
        const unit = match[2].toLowerCase()
        if (['hour', 'hours', 'jam'].includes(unit)) return value
        if (['day', 'days', 'hari'].includes(unit)) return value * 24
        if (['minute', 'minutes', 'menit'].includes(unit)) return value / 60
        if (['second', 'seconds', 'detik'].includes(unit)) return value / 3600
        if (['month', 'months', 'bulan'].includes(unit)) return value * 24 * 30
    }

    const timestamp = Date.parse(timeStr)
    if (!isNaN(timestamp)) return (Date.now() - timestamp) / (1000 * 60 * 60)

    return null
}

async function getDownloadLink(episodeUrl) {
    const { data } = await axios.get(episodeUrl, {
        headers: HEADERS,
        timeout: 30000,
        validateStatus: () => true
    })
    if (!data) return null

    const $ = cheerio.load(data)
    const downloadLinks = []

    $('.download-eps ul li, .download-eps li').each((_, el) => {
        const quality = ($(el).find('strong').first().text() || $(el).find('b').first().text() || '').trim()
        if (!quality) return
        const links = []
        $(el).find('span a, a').each((__, linkEl) => {
            const provider = $(linkEl).text().replace(/\s+/g, ' ').trim()
            const href = $(linkEl).attr('href')
            if (provider && href && /^https?:\/\//i.test(href)) links.push({ provider, url: href })
        })
        if (links.length > 0) downloadLinks.push({ quality, links })
    })

    if (downloadLinks.length === 0) return null

    const qualityPriority = ['720p', '1080p', '480p', '360p']
    downloadLinks.sort((a, b) => {
        const getPriority = (q) => {
            const match = q.match(/(\d{3,4}p)/i)
            if (!match) return 999
            const idx = qualityPriority.indexOf(match[1].toLowerCase())
            return idx === -1 ? 999 : idx
        }
        return getPriority(a.quality) - getPriority(b.quality)
    })

    const providerPriority = [
        'pixeldrain',
        'gofile',
        'megaup',
        'mega',
        'mp4upload',
        'vidhide',
        'filedon'
    ]

    for (const item of downloadLinks) {
        const selected = [...item.links].sort((a, b) => {
            const ap = providerPriority.findIndex(p => (a.provider + a.url).toLowerCase().includes(p))
            const bp = providerPriority.findIndex(p => (b.provider + b.url).toLowerCase().includes(p))
            return (ap === -1 ? 999 : ap) - (bp === -1 ? 999 : bp)
        })[0]

        if (selected) {
            const qualityMatch = item.quality.match(/(\d{3,4}p)/i)
            return {
                host: selected.provider || 'Download',
                url: selected.url,
                quality: qualityMatch ? qualityMatch[1] : item.quality || 'Unknown'
            }
        }
    }

    return null
}

function resolveDownloadPageUrl(rawUrl) {
    const id = (rawUrl.match(/pixeldrain\.(?:com|net)\/(?:u|d|api\/file)\/([a-zA-Z0-9]+)/i) || [])[1]
    if (id) return `https://pixeldrain.com/u/${id}`
    return rawUrl
}

async function formatSize(b) {
    if (!b) return '0 B'
    const i = Math.floor(Math.log(b) / Math.log(1024))
    return (b / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i]
}

async function notifyAndSend(sock, groupIds, linkObj, meta) {
    const pageUrl = resolveDownloadPageUrl(linkObj.url)

    let coverBuffer = null
    if (meta.cover) {
        try {
            const res = await axios.get(meta.cover, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: HEADERS
            })
            coverBuffer = Buffer.from(res.data)
        } catch (e) {
            console.log(`[AutoAnime-Winbu] ⚠️ Cover falló: ${e.message}`)
        }
    }

    const caption =
        `*¡ACTUALIZACIÓN DE ANIME! ✨*\n\n` +
        `📺 Título: *${meta.title}*\n` +
        `🎞️ Episodio: ${meta.episode}\n` +
        `📊 Calidad: *${linkObj.quality}*\n` +
        `🔗 Servidor: *${linkObj.host || 'Download'}*`

    for (const gid of groupIds) {
        try {
            const msgPayload = coverBuffer
                ? { image: coverBuffer, caption, footer: 'Haz clic en el botón de abajo para descargar el video 👇' }
                : { text: caption, footer: 'Haz clic en el botón de abajo para descargar el video 👇' }

            await sock.sendMessage(gid, {
                ...msgPayload,
                interactiveButtons: [
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: `Descargar ${linkObj.quality}`,
                            url: pageUrl,
                            merchant_url: pageUrl
                        })
                    }
                ]
            })
            console.log(`[AutoAnime-Winbu] ✅ Notified ${gid}: ${meta.title} ${meta.episode}`)
            await new Promise(r => setTimeout(r, 3000))
        } catch (e) {
            console.error(`[AutoAnime-Winbu] ❌ Send error ${gid}:`, e.message)
        }
    }
}

let autoInterval = null
let isRunning = false
let globalSock = null

async function runCheck(sockOverride = null) {
    if (sockOverride) globalSock = sockOverride
    const activeSock = sockOverride || globalSock
    const state = loadState()
    const groups = state.groups || []
    const summary = { checked: 0, sent: 0, skipped: 0, noLink: 0, errors: 0 }

    if (groups.length === 0) {
        console.log('[AutoAnime-Winbu] ⚠️ No hay grupos objetivo configurados')
        return summary
    }

    const sent = loadSent()
    console.log(`[AutoAnime-Winbu] 🔍 Check: ${new Date().toLocaleString('id-ID')}`)

    const animeList = await getOngoingAnimeList()

    if (animeList.length === 0) {
        console.log('[AutoAnime-Winbu] No hay anime')
        return summary
    }

    for (const anime of animeList) {
        summary.checked++
        try {
            const episodeData = await getLatestEpisodeLink(anime.url)
            if (!episodeData) {
                summary.noLink++
                continue
            }

            const episodeKey = `${anime.slug}-${episodeData.number}`
            if (sent.has(episodeKey)) {
                summary.skipped++
                continue
            }

            const timeStr = anime.timeText || await getEpisodeTime(episodeData.url)
            if (timeStr) {
                const hours = parseRelativeTimeToHours(timeStr)
                if (hours !== null && hours >= 24) {
                    sent.add(episodeKey)
                    saveSent(sent)
                    summary.skipped++
                    continue
                }
            }

            const linkObj = await getDownloadLink(episodeData.url)
            if (!linkObj) {
                console.log(`[AutoAnime-Winbu] ⚠️ Sin link de descarga: ${anime.title} ${episodeData.text}`)
                summary.noLink++
                continue
            }

            if (!activeSock) throw new Error('Socket no disponible para enviar notificaciones')

            await notifyAndSend(activeSock, groups, linkObj, {
                title: anime.title,
                episode: episodeData.text,
                cover: anime.cover || ''
            })

            sent.add(episodeKey)
            saveSent(sent)
            summary.sent++
            await new Promise(r => setTimeout(r, 5000))
        } catch (e) {
            summary.errors++
            console.error(`[AutoAnime-Winbu] ❌ Error ${anime.title}:`, e.message)
        }
    }

    console.log(`[AutoAnime-Winbu] ✅ Verificación completada | ${JSON.stringify(summary)}`)
    return summary
}

function startAutoCheck(sock, intervalMinutes = 5) {
    if (autoInterval) clearInterval(autoInterval)
    globalSock = sock
    isRunning = true

    const ms = intervalMinutes * 60 * 1000
    runCheck(sock).catch(e => console.error('[AutoAnime-Winbu]', e.message))
    autoInterval = setInterval(() => {
        runCheck(sock).catch(e => console.error('[AutoAnime-Winbu]', e.message))
    }, ms)

    if (autoInterval.unref) autoInterval.unref()
}

function stopAutoCheck() {
    if (autoInterval) clearInterval(autoInterval)
    autoInterval = null
    isRunning = false
}

function initAutoStart(sock) {
    const state = loadState()
    if (!state.enabled) return
    console.log('[AutoAnime-Winbu] 🔄 Restauración automática habilitada')
    startAutoCheck(sock, state.interval || 5)
}

export { loadSent, saveSent, loadState, saveState, getOngoingAnimeList, getLatestEpisodeLink, getDownloadLink, notifyAndSend, startAutoCheck, stopAutoCheck, initAutoStart, runCheck, isRunning, formatSize }