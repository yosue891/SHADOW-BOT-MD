/**
 * SHADOW-BOT-MD — Anime media (GIFs de reacción desde APIs públicas)
 * ────────────────────────────────────────────────────────────────────
 * Antes los comandos de anime usaban URLs fijas (telegra.ph, catbox,
 * adofiles...) que se caen con el tiempo y dejan el comando inservible.
 *
 * Ahora cada comando pide un GIF aleatorio a APIs públicas de reacciones
 * anime, con varios proveedores de respaldo por acción, validación del
 * archivo descargado y conversión GIF → MP4 (WhatsApp necesita mp4 para
 * gifPlayback).
 *
 * Proveedores verificados (gratuitos, sin API key) y qué sirve cada uno:
 *   • gifukai     https://api.gifukai.com/<accion>          → kill, peek, lappillow, stare, pat,
 *                                                             cuddle, bite, yawn, punch… (dice el anime)
 *   • otakugifs   https://api.otakugifs.xyz/gif?reaction=   → bite, cuddle, peek, stare, pat, yawn, kiss…
 *   • nekos.best  https://nekos.best/api/v2/<endpoint>      → exige User-Agent propio (sin "Mozilla")
 *   • purrbot     https://purrbot.site/api/img/sfw/<t>/gif  → cuddle, bite, pat, kiss, hug
 *   • nekos.life  https://nekos.life/api/v2/img/<t>         → cuddle, pat, slap, hug, kiss, tickle, feed, smug
 *
 * API dedicada para "kill": gifukai /kill — solo escenas de muerte de
 * personajes de anime (devuelve el nombre del anime, ej. "Akame ga Kill!").
 *
 * Notas de APIs que NO se pudieron usar (verificado el 2026-09-20):
 *   Tenor     → "Tenor API is discontinued"
 *   Giphy     → key pública de prueba BANNED (500/403)
 *   waifu.pics→ su subdominio api.waifu.pics no resuelve (bloqueado en el entorno de pruebas)
 *   hmtai     → dominio caído (respuesta vacía)
 *   sakugabooru → sí sirve VIDEO real de anime (tags fighting/blood), pero los
 *                 clips pesan 5–20 MB y no tiene tag de "muerte", por eso no
 *                 se usa por defecto (ver más abajo SALUGA_DISPONIBLE).
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// nekos.best rechaza cualquier UA que empiece con "Mozilla/5.0 (compatible;"
// — con este UA plano sí responde.
const USER_AGENT = 'ShadowBot/1.0 (+https://github.com/yosue891/SHADOW-BOT-MD)'
const TIMEOUT_MS = 9000
const TIMEOUT_DESCARGA_MS = 20000

// ── Petición JSON con timeout ───────────────────────────────────────────────
async function pedirJson(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: ctrl.signal
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ── Proveedores ─────────────────────────────────────────────────────────────
export const proveedores = {
  async gifukai(accion) {
    const j = await pedirJson(`https://api.gifukai.com/${accion}`)
    return j?.url ? { url: j.url, anime: j.anime || null, proveedor: 'gifukai' } : null
  },
  async otakugifs(reaccion) {
    const j = await pedirJson(`https://api.otakugifs.xyz/gif?reaction=${reaccion}`)
    return j?.url ? { url: j.url, anime: null, proveedor: 'otakugifs' } : null
  },
  async nekosbest(endpoint) {
    const j = await pedirJson(`https://nekos.best/api/v2/${endpoint}`)
    const r = j?.results?.[0]
    return r?.url ? { url: r.url, anime: r.anime_name || null, proveedor: 'nekos.best' } : null
  },
  async purrbot(tipo) {
    const j = await pedirJson(`https://purrbot.site/api/img/sfw/${tipo}/gif`)
    return j?.link ? { url: j.link, anime: null, proveedor: 'purrbot' } : null
  },
  async nekoslife(tipo) {
    const j = await pedirJson(`https://nekos.life/api/v2/img/${tipo}`)
    return j?.url ? { url: j.url, anime: null, proveedor: 'nekos.life' } : null
  }
}

/**
 * API dedicada para "kill" (solo escenas de muerte de personajes de anime):
 *   GET https://api.gifukai.com/kill
 * Devuelve { action: "kill", anime: "Akame ga Kill!", url: "https://cdn.gifukai.com/kill/….gif" }
 */
export const API_KILL_DEDICADA = {
  nombre: 'gifukai /kill',
  url: 'https://api.gifukai.com/kill',
  descripcion: 'Escenas de muerte de personajes de anime (incluye el nombre del anime)'
}

// ── Cadenas de proveedores por acción ───────────────────────────────────────
// Cada entrada: [nombreDelProveedor, argumento]. Se intenta en orden aleatorio
// (salvo 'kill', donde la API dedicada va primero) hasta que una responda con
// media válida. Así cada vez sale un GIF distinto.
const CADENAS = {
  // ── comandos de anime que estaban sin GIF ──
  kill:      [['gifukai', 'kill'], ['gifukai', 'punch'], ['otakugifs', 'slap']],
  cuddle:    [['gifukai', 'cuddle'], ['otakugifs', 'cuddle'], ['purrbot', 'cuddle'], ['nekoslife', 'cuddle'], ['nekosbest', 'cuddle']],
  bite:      [['gifukai', 'bite'], ['otakugifs', 'bite'], ['purrbot', 'bite'], ['nekosbest', 'bite']],
  peek:      [['gifukai', 'peek'], ['otakugifs', 'peek'], ['nekosbest', 'lurk']],
  lappillow: [['gifukai', 'lappillow'], ['nekosbest', 'lappillow'], ['otakugifs', 'nuzzle'], ['nekosbest', 'sleep']],
  stare:     [['gifukai', 'stare'], ['otakugifs', 'stare'], ['nekosbest', 'stare']],
  pat:       [['gifukai', 'pat'], ['otakugifs', 'pat'], ['purrbot', 'pat'], ['nekoslife', 'pat'], ['nekosbest', 'pat']],
  yawn:      [['gifukai', 'yawn'], ['otakugifs', 'yawn'], ['nekosbest', 'yawn']],

  // ── extra: para el resto de comandos de anime ──
  hug:       [['gifukai', 'hug'], ['otakugifs', 'hug'], ['purrbot', 'hug'], ['nekoslife', 'hug'], ['nekosbest', 'hug']],
  kiss:      [['gifukai', 'kiss'], ['otakugifs', 'kiss'], ['purrbot', 'kiss'], ['nekoslife', 'kiss']],
  slap:      [['gifukai', 'slap'], ['otakugifs', 'slap'], ['nekoslife', 'slap'], ['nekosbest', 'slap']],
  lick:      [['gifukai', 'lick'], ['otakugifs', 'lick'], ['nekosbest', 'lick']],
  poke:      [['gifukai', 'poke'], ['otakugifs', 'poke'], ['nekosbest', 'poke']],
  tickle:    [['gifukai', 'tickle'], ['otakugifs', 'tickle'], ['nekoslife', 'tickle'], ['nekosbest', 'tickle']],
  cry:       [['gifukai', 'cry'], ['otakugifs', 'cry'], ['nekosbest', 'cry']],
  dance:     [['gifukai', 'dance'], ['otakugifs', 'dance'], ['nekosbest', 'dance']],
  smile:     [['gifukai', 'smile'], ['otakugifs', 'smile'], ['nekosbest', 'smile']],
  sleep:     [['gifukai', 'sleep'], ['nekosbest', 'sleep'], ['otakugifs', 'sleep']],
  wink:      [['gifukai', 'wink'], ['otakugifs', 'wink'], ['nekosbest', 'wink']],
  nom:       [['gifukai', 'eat'], ['otakugifs', 'nom'], ['nekosbest', 'nom']],
  punch:     [['gifukai', 'punch'], ['otakugifs', 'punch']],
  hi:        [['gifukai', 'hi'], ['nekosbest', 'wave'], ['otakugifs', 'wave']],
  feed:      [['gifukai', 'feed'], ['nekoslife', 'feed'], ['nekosbest', 'feed']]
}

export const reaccionesDisponibles = Object.keys(CADENAS)

/** Mezcla una lista (para que cada llamada use un proveedor distinto). */
function mezclar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Devuelve solo la URL de la media (sin descargarla). */
export async function obtenerMediaAnime(reaccion) {
  const clave = String(reaccion || '').toLowerCase()
  const cadena = CADENAS[clave]
  if (!cadena) throw new Error(`Reacción de anime no soportada: ${reaccion}`)

  // 'kill' mantiene la API dedicada primero (solo escenas de muerte)
  const intentos = clave === 'kill'
    ? [...cadena.slice(0, 1), ...mezclar(cadena.slice(1))]
    : mezclar(cadena)

  let ultimoError = null
  for (const [nombre, argumento] of intentos) {
    try {
      const media = await proveedores[nombre](argumento)
      if (media?.url) return media
    } catch (e) {
      ultimoError = e
    }
  }
  throw new Error(`Ningún proveedor devolvió el GIF de "${clave}"${ultimoError ? ` (${ultimoError.message})` : ''}`)
}

// ── Descarga y validación ───────────────────────────────────────────────────
async function descargarCrudo(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_DESCARGA_MS)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, tipo: res.headers.get('content-type') || '' }
  } finally {
    clearTimeout(timer)
  }
}

/** Verifica que el buffer sea de verdad imagen/video (no una página HTML de error). */
export function esMediaValida(buffer) {
  if (!buffer || buffer.length < 512) return false
  const ascii = buffer.subarray(0, 12).toString('ascii')
  if (ascii.startsWith('GIF8')) return 'gif'                                 // GIF87a / GIF89a
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp'
  if (ascii.slice(4, 8) === 'ftyp') return 'mp4'
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg'
  if (buffer[0] === 0x89 && ascii.slice(1, 4) === 'PNG') return 'png'
  return false
}

// ── Conversión a MP4 (WhatsApp necesita mp4 para gifPlayback) ───────────────
let rutaFfmpeg = null
async function resolverFfmpeg() {
  if (rutaFfmpeg) return rutaFfmpeg
  try {
    const mod = await import('@ffmpeg-installer/ffmpeg')
    rutaFfmpeg = mod?.default?.path || mod?.path || 'ffmpeg'
  } catch {
    rutaFfmpeg = 'ffmpeg'
  }
  return rutaFfmpeg
}

function ejecutarFfmpeg(entrada, salida) {
  return new Promise((resolve, reject) => {
    const proc = spawn(rutaFfmpeg, [
      '-y',
      '-i', entrada,
      '-movflags', 'faststart',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-an',
      salida
    ])
    proc.on('error', reject)
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg salió con código ${code}`))))
  })
}

/** Convierte un GIF descargado a MP4. */
export async function gifAMp4(buffer) {
  await resolverFfmpeg()
  const base = join(tmpdir(), `shadow-anime-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const entrada = `${base}.gif`
  const salida = `${base}.mp4`
  try {
    await fs.writeFile(entrada, buffer)
    await ejecutarFfmpeg(entrada, salida)
    return await fs.readFile(salida)
  } finally {
    await fs.unlink(entrada).catch(() => {})
    await fs.unlink(salida).catch(() => {})
  }
}

/** Descarga una URL y la devuelve lista para WhatsApp (convierte GIF → MP4). */
export async function descargarMedia(url) {
  const { buffer } = await descargarCrudo(url)
  const formato = esMediaValida(buffer)
  if (!formato) throw new Error('El archivo descargado no es una imagen/video válido')
  if (formato === 'gif') return gifAMp4(buffer)
  return buffer
}

/**
 * Pide la reacción, la descarga y la convierte a MP4.
 * Si un proveedor devuelve algo inválido, pasa al siguiente.
 * @returns {Promise<{video: Buffer, anime: string|null, proveedor: string, url: string}>}
 */
export async function descargarReaccionAnime(reaccion) {
  const clave = String(reaccion || '').toLowerCase()
  const cadena = CADENAS[clave]
  if (!cadena) throw new Error(`Reacción de anime no soportada: ${reaccion}`)

  const intentos = clave === 'kill'
    ? [...cadena.slice(0, 1), ...mezclar(cadena.slice(1))]
    : mezclar(cadena)

  const errores = []
  for (const [nombre, argumento] of intentos) {
    try {
      const media = await proveedores[nombre](argumento)
      if (!media?.url) continue
      const { buffer } = await descargarCrudo(media.url)
      const formato = esMediaValida(buffer)
      if (!formato) throw new Error('respuesta no válida (no es imagen/video)')
      const video = formato === 'gif' ? await gifAMp4(buffer) : buffer
      return { video, anime: media.anime, proveedor: media.proveedor, url: media.url }
    } catch (e) {
      errores.push(`${nombre}: ${e.message}`)
    }
  }
  throw new Error(`No se pudo obtener el GIF de "${clave}" (${errores.join(' | ') || 'sin proveedores'})`)
}

/**
 * Envía una reacción de anime al chat como GIF (video + gifPlayback).
 * Muestra el nombre del anime cuando la API lo informa.
 */
export async function enviarReaccionAnime(conn, m, { reaccion, caption = '', mentions = [] } = {}) {
  const { video, anime } = await descargarReaccionAnime(reaccion)
  const texto = anime ? `${caption}\n\n> 🎬 *${anime}*` : caption
  return conn.sendMessage(
    m.chat,
    { video, gifPlayback: true, caption: texto, mentions },
    { quoted: m }
  )
}

export default { obtenerMediaAnime, descargarMedia, descargarReaccionAnime, enviarReaccionAnime, gifAMp4, esMediaValida, proveedores, reaccionesDisponibles, API_KILL_DEDICADA }
