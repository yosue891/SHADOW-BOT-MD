/**
 * SHADOW-BOT-MD — Anime media (GIFs de reacción desde APIs públicas)
 * ────────────────────────────────────────────────────────────────────
 * Antes los comandos de anime usaban URLs fijas (telegra.ph, catbox,
 * adofiles...) que se caen con el tiempo y dejan el comando inservible.
 *
 * Este helper pide un GIF ALEATORIO a APIs públicas de reacciones anime,
 * con varios proveedores de respaldo, valida que la descarga sea media
 * real y la entrega lista para WhatsApp (video + gifPlayback).
 *
 * Proveedores (gratuitos, sin API key):
 *   • gifukai     https://api.gifukai.com/<accion>         (kill, peek, lappillow, stare…)
 *   • otakugifs   https://api.otakugifs.xyz/gif?reaction=  (bite, cuddle, pat, yawn, nuzzle…)
 *   • nekos.best  https://nekos.best/api/v2/<endpoint>     (cuddle, bite, stare, yawn…)
 *   • purrbot     https://purrbot.site/api/img/sfw/<t>/gif (cuddle, pat, hug, bite…)
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const USER_AGENT = 'Mozilla/5.0 (compatible; ShadowBot-MD/1.0; +https://github.com/yosue891/SHADOW-BOT-MD)'
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
const proveedores = {
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
  }
}

/**
 * Reacciones disponibles → proveedores en orden de preferencia.
 * Se prueban en orden hasta que uno devuelva media válida.
 */
const REACCIONES = {
  // ── comandos de anime que se quedaron sin GIFs ──
  kill:      [() => proveedores.gifukai('kill'), () => proveedores.otakugifs('punch')],
  cuddle:    [() => proveedores.otakugifs('cuddle'), () => proveedores.nekosbest('cuddle'), () => proveedores.purrbot('cuddle'), () => proveedores.gifukai('cuddle')],
  bite:      [() => proveedores.otakugifs('bite'), () => proveedores.nekosbest('bite'), () => proveedores.purrbot('bite'), () => proveedores.gifukai('bite')],
  peek:      [() => proveedores.otakugifs('peek'), () => proveedores.gifukai('peek'), () => proveedores.nekosbest('lurk')],
  lappillow: [() => proveedores.gifukai('lappillow'), () => proveedores.otakugifs('nuzzle'), () => proveedores.nekosbest('sleep')],
  stare:     [() => proveedores.otakugifs('stare'), () => proveedores.nekosbest('stare'), () => proveedores.gifukai('stare')],
  pat:       [() => proveedores.otakugifs('pat'), () => proveedores.nekosbest('pat'), () => proveedores.purrbot('pat'), () => proveedores.gifukai('pat')],
  yawn:      [() => proveedores.otakugifs('yawn'), () => proveedores.nekosbest('yawn'), () => proveedores.gifukai('yawn')],

  // ── extra: para reutilizar en el resto de comandos de anime ──
  hug:       [() => proveedores.otakugifs('hug'), () => proveedores.purrbot('hug'), () => proveedores.gifukai('hug'), () => proveedores.nekosbest('cuddle')],
  kiss:      [() => proveedores.otakugifs('kiss'), () => proveedores.purrbot('kiss'), () => proveedores.gifukai('kiss')],
  slap:      [() => proveedores.otakugifs('slap'), () => proveedores.gifukai('slap'), () => proveedores.nekosbest('slap')],
  lick:      [() => proveedores.otakugifs('lick'), () => proveedores.nekosbest('lick'), () => proveedores.gifukai('lick')],
  poke:      [() => proveedores.otakugifs('poke'), () => proveedores.nekosbest('poke'), () => proveedores.gifukai('poke')],
  tickle:    [() => proveedores.otakugifs('tickle'), () => proveedores.nekosbest('tickle'), () => proveedores.gifukai('tickle')],
  cry:       [() => proveedores.otakugifs('cry'), () => proveedores.nekosbest('cry'), () => proveedores.gifukai('cry')],
  dance:     [() => proveedores.otakugifs('dance'), () => proveedores.nekosbest('dance'), () => proveedores.gifukai('dance')],
  smile:     [() => proveedores.otakugifs('smile'), () => proveedores.nekosbest('smile'), () => proveedores.gifukai('smile')],
  sleep:     [() => proveedores.otakugifs('sleep'), () => proveedores.nekosbest('sleep'), () => proveedores.gifukai('sleep')],
  wink:      [() => proveedores.otakugifs('wink'), () => proveedores.nekosbest('wink'), () => proveedores.gifukai('wink')],
  nom:       [() => proveedores.otakugifs('nom'), () => proveedores.nekosbest('nom'), () => proveedores.gifukai('eat')],
  punch:     [() => proveedores.otakugifs('punch'), () => proveedores.gifukai('punch')],
  hi:        [() => proveedores.gifukai('hi'), () => proveedores.nekosbest('wave'), () => proveedores.otakugifs('wave')]
}

export const reaccionesDisponibles = Object.keys(REACCIONES)

/** Devuelve solo la URL de la media (sin descargarla). */
export async function obtenerMediaAnime(reaccion) {
  const clave = String(reaccion || '').toLowerCase()
  const lista = REACCIONES[clave]
  if (!lista) throw new Error(`Reacción de anime no soportada: ${reaccion}`)
  let ultimoError = null
  for (const intento of lista) {
    try {
      const media = await intento()
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

/** Verifica que el buffer sea de verdad una imagen/video (no una página HTML de error). */
function esMediaValida(buffer) {
  if (!buffer || buffer.length < 512) return false
  const ascii = buffer.subarray(0, 12).toString('ascii')
  if (ascii.startsWith('GIF8')) return 'gif'                        // GIF87a / GIF89a
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
  const lista = REACCIONES[clave]
  if (!lista) throw new Error(`Reacción de anime no soportada: ${reaccion}`)

  const errores = []
  for (const intento of lista) {
    try {
      const media = await intento()
      if (!media?.url) continue
      const { buffer } = await descargarCrudo(media.url)
      const formato = esMediaValida(buffer)
      if (!formato) throw new Error('respuesta no válida (no es imagen/video)')
      const video = formato === 'gif' ? await gifAMp4(buffer) : buffer
      return { video, anime: media.anime, proveedor: media.proveedor, url: media.url }
    } catch (e) {
      errores.push(`${intento.name || 'proveedor'}: ${e.message}`)
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

export default { obtenerMediaAnime, descargarMedia, descargarReaccionAnime, enviarReaccionAnime, gifAMp4, reaccionesDisponibles }
