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

// ── Logging (para ver en consola por qué falla si algo falla) ──────────────
const PREFIJO = '[anime-media]'
const registrar = (...a) => console.log(PREFIJO, ...a)
const advertir = (...a) => console.warn(PREFIJO, ...a)

// ── fetch universal ────────────────────────────────────────────────────────
// Node 18+ trae fetch global. En Node viejo (16/17) usamos node-fetch, que ya
// es dependencia del bot. Así los comandos NO caen a texto por falta de fetch.
let _fetch = null
async function obtenerFetch() {
  if (_fetch) return _fetch
  if (typeof globalThis.fetch === 'function') {
    _fetch = globalThis.fetch.bind(globalThis)
    return _fetch
  }
  try {
    const mod = await import('node-fetch')
    _fetch = mod.default || mod
    advertir('fetch global no disponible: usando node-fetch')
    return _fetch
  } catch { /* sigue */ }
  try {
    const { fetch: f } = await import('undici')
    _fetch = f
    advertir('fetch global no disponible: usando undici')
    return _fetch
  } catch { /* sigue */ }
  throw new Error('Este Node no tiene fetch. Actualiza a Node 18+ o instala node-fetch (npm install).')
}

// Si está en 1, se salta la conversión local con ffmpeg y manda la URL directo
// (útil para servidores sin ffmpeg: WhatsApp convierte el GIF en sus servidores).
const MODO_URL = process.env.SHADOW_ANIME_URL_MODE === '1'

// ── Petición JSON con timeout ───────────────────────────────────────────────
async function pedirJson(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const hacerFetch = await obtenerFetch()
    const res = await hacerFetch(url, {
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
  feed:      [['gifukai', 'feed'], ['nekoslife', 'feed'], ['nekosbest', 'feed']],

  // ── comandos migrados de URLs fijas a APIs ──
  happy:     [['gifukai', 'happy'], ['otakugifs', 'happy'], ['nekosbest', 'happy']],
  laugh:     [['gifukai', 'laugh'], ['otakugifs', 'laugh'], ['nekosbest', 'laugh']],
  pout:      [['gifukai', 'pout'], ['otakugifs', 'pout'], ['nekosbest', 'pout']],
  sad:       [['otakugifs', 'sad'], ['gifukai', 'cry'], ['nekosbest', 'cry']],
  love:      [['otakugifs', 'love'], ['gifukai', 'blush'], ['nekosbest', 'blush']],
  seduce:    [['gifukai', 'smug'], ['otakugifs', 'smug'], ['nekosbest', 'smug']],
  kisscheek: [['gifukai', 'kiss?type=cheek'], ['nekosbest', 'peck'], ['otakugifs', 'airkiss']],
  sip:       [['gifukai', 'sip'], ['nekosbest', 'sip'], ['gifukai', 'blush']],
  preg:      [['gifukai', 'carry'], ['nekosbest', 'carry'], ['gifukai', 'feed'], ['nekosbest', 'feed']]
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

/**
 * Orden de proveedores a intentar para una acción. 'kill' mantiene la API
 * dedicada primero (solo escenas de muerte); el resto se sortea.
 */
export function intentosPara(reaccion) {
  const clave = String(reaccion || '').toLowerCase()
  const cadena = CADENAS[clave]
  if (!cadena) throw new Error(`Reacción de anime no soportada: ${reaccion}`)
  return clave === 'kill'
    ? [...cadena.slice(0, 1), ...mezclar(cadena.slice(1))]
    : mezclar(cadena)
}

/** Devuelve solo la URL de la media (sin descargarla). */
export async function obtenerMediaAnime(reaccion) {
  const clave = String(reaccion || '').toLowerCase()
  const intentos = intentosPara(clave)

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
    const hacerFetch = await obtenerFetch()
    const res = await hacerFetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: ctrl.signal })
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
let ffmpegFunciona = null

/** Ejecuta "ffmpeg -version" y devuelve la versión, o null si no arranca. */
function probarFfmpeg(ruta) {
  return new Promise((resolve) => {
    let salida = ''
    let proc
    try {
      proc = spawn(ruta, ['-version'])
    } catch { return resolve(null) }
    proc.stdout?.on('data', (d) => { salida += d.toString() })
    proc.on('error', () => resolve(null))
    proc.on('close', (code) => {
      if (code === 0) resolve((salida.match(/ffmpeg version (\S+)/) || [])[1] || 'ok')
      else resolve(null)
    })
  })
}

/** Rutas candidatas de ffmpeg, en orden de preferencia. */
async function candidatosFfmpeg() {
  const lista = []
  if (process.env.SHADOW_FFMPEG) lista.push(process.env.SHADOW_FFMPEG)
  try {
    const mod = await import('@ffmpeg-installer/ffmpeg')
    const p = mod?.default?.path || mod?.path
    if (p) lista.push(p)
  } catch { /* sin ffmpeg del repo */ }
  lista.push('ffmpeg')
  return [...new Set(lista)]
}

/**
 * Encuentra un ffmpeg que REALMENTE se ejecute. npm bloquea el script
 * postinstall de @ffmpeg-installer (el que hace chmod +x), así que el binario
 * puede quedar sin permiso de ejecución: en ese caso se le da el permiso aquí
 * y, si aun así no arranca, se usa el ffmpeg del sistema.
 */
async function resolverFfmpeg() {
  if (rutaFfmpeg) return rutaFfmpeg
  for (const candidato of await candidatosFfmpeg()) {
    let version = await probarFfmpeg(candidato)
    if (!version && candidato !== 'ffmpeg') {
      try {
        const st = await fs.stat(candidato)
        if (!(st.mode & 0o111)) {
          await fs.chmod(candidato, st.mode | 0o755)
          version = await probarFfmpeg(candidato)
          if (version) registrar('permiso de ejecución aplicado a:', candidato)
        }
      } catch { /* no se pudo leer/permutar: probamos el siguiente */ }
    }
    if (version) {
      rutaFfmpeg = candidato
      registrar('ffmpeg OK:', candidato, version)
      return rutaFfmpeg
    }
    advertir('ffmpeg no ejecutable:', candidato)
  }
  advertir('⚠ ningún ffmpeg disponible: los GIF no se pueden convertir a MP4')
  return null
}

/** Comprueba que ffmpeg realmente se pueda ejecutar (ruta + versión). */
export async function comprobarFfmpeg() {
  if (ffmpegFunciona !== null) return ffmpegFunciona
  const ruta = await resolverFfmpeg()
  ffmpegFunciona = ruta ? await probarFfmpeg(ruta) : null
  if (!ffmpegFunciona) advertir('⚠ ffmpeg NO disponible: los GIF se enviarán por URL (sin convertir) o como texto')
  return ffmpegFunciona
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
  const ruta = await resolverFfmpeg()
  if (!ruta) throw new Error('ffmpeg no disponible para convertir el GIF a MP4')
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
  const intentos = intentosPara(clave)

  const errores = []
  for (const [nombre, argumento] of intentos) {
    try {
      const media = await proveedores[nombre](argumento)
      if (!media?.url) continue
      const { buffer } = await descargarCrudo(media.url)
      const formato = esMediaValida(buffer)
      if (!formato) throw new Error('respuesta no válida (no es imagen/video)')
      const video = formato === 'gif' ? await gifAMp4(buffer) : buffer
      registrar(`${clave} ← ${media.proveedor} (${Math.round(buffer.length / 1024)} KB → mp4)`)
      return { video, anime: media.anime, proveedor: media.proveedor, url: media.url }
    } catch (e) {
      errores.push(`${nombre}: ${e.message}`)
      advertir(`proveedor ${nombre} falló para ${clave}: ${e.message}`)
    }
  }
  throw new Error(`No se pudo obtener el GIF de "${clave}" (${errores.join(' | ') || 'sin proveedores'})`)
}

/**
 * Envía una reacción de anime al chat como GIF (video + gifPlayback).
 * Muestra el nombre del anime cuando la API lo informa.
 */
export async function enviarReaccionAnime(conn, m, { reaccion, caption = '', mentions = [] } = {}) {
  const clave = String(reaccion || '').toLowerCase()
  const intentos = intentosPara(clave)
  const puedeConvertir = !MODO_URL && Boolean(await comprobarFfmpeg())

  // Descarga el primer GIF/MP4 válido probando proveedores en orden.
  let media = null, buffer = null, formato = null
  for (const [nombre, argumento] of intentos) {
    try {
      const r = await proveedores[nombre](argumento)
      if (!r?.url) continue
      const descarga = await descargarCrudo(r.url)
      const f = esMediaValida(descarga.buffer)
      if (!f) throw new Error('respuesta no válida (no es imagen/video)')
      media = r; buffer = descarga.buffer; formato = f
      break
    } catch (e) {
      advertir(`proveedor ${nombre} falló para ${clave}: ${e.message}`)
    }
  }
  if (!media) throw new Error(`Ningún proveedor devolvió el GIF de "${clave}"`)

  const texto = media.anime ? `${caption}\n\n> 🎬 *${media.anime}*` : caption

  // Validación de envío (por qué antes solo llegaba texto):
  //  - Un GIF rotulado como video/mp4 SIN convertir lo rompe en WhatsApp.
  //  - Un JPG/PNG rotulado como video/mp4 también lo rompe.
  // Por eso cada formato se envía con su tipo correcto, con fallbacks.
  if (formato === 'gif' && puedeConvertir) {
    try {
      const video = await gifAMp4(buffer)
      registrar(`enviando ${clave} convertido (${media.proveedor})`)
      try {
        return await conn.sendMessage(
          m.chat,
          { video, gifPlayback: true, mimetype: 'video/mp4', caption: texto, mentions },
          { quoted: m }
        )
      } catch (e) {
        advertir(`envío como video de ${clave} falló: ${e.message} → reintento como GIF`)
      }
    } catch (e) {
      advertir(`conversión de ${clave} falló: ${e.message} → se envía como GIF`)
    }
  } else if (formato === 'mp4') {
    // Ya es MP4 (p. ej. sakugabooru): se manda como video con loop de GIF.
    registrar(`enviando ${clave} en mp4 (${media.proveedor})`)
    try {
      return await conn.sendMessage(
        m.chat,
        { video: buffer, gifPlayback: true, mimetype: 'video/mp4', caption: texto, mentions },
        { quoted: m }
      )
    } catch (e) {
      advertir(`envío mp4 de ${clave} falló: ${e.message} → reintento sin gifPlayback`)
      return await conn.sendMessage(
        m.chat,
        { video: buffer, mimetype: 'video/mp4', caption: texto, mentions },
        { quoted: m }
      )
    }
  } else if (formato === 'jpg' || formato === 'png' || formato === 'webp') {
    // Imagen estática: NUNCA como video/mp4 (eso dejaba solo el texto).
    const mime = formato === 'png' ? 'image/png' : formato === 'jpg' ? 'image/jpeg' : 'image/webp'
    registrar(`enviando ${clave} como imagen ${formato} (${media.proveedor})`)
    return await conn.sendMessage(
      m.chat,
      { image: buffer, mimetype: mime, caption: texto, mentions },
      { quoted: m }
    )
  }

  registrar(`enviando ${clave} como GIF animado (${media.proveedor})`)
  return await conn.sendMessage(
    m.chat,
    { image: buffer, mimetype: 'image/gif', caption: texto, mentions },
    { quoted: m }
  )
}

/**
 * Diagnóstico para usar desde el bot: comprueba fetch, ffmpeg y cada API.
 * Devuelve un objeto con el informe listo para enviar por WhatsApp.
 */
export async function diagnosticar(acciones = ['kill', 'sip', 'cuddle', 'bite', 'peek', 'lappillow', 'stare', 'pat', 'yawn']) {
  const lineas = []
  const detalle = []
  let fallos = 0

  lineas.push(`🖥️ *Node:* ${process.version}`)
  try {
    await obtenerFetch()
    lineas.push(`🌐 *fetch:* ${typeof globalThis.fetch === 'function' ? 'global ✅' : 'node-fetch ✅'}`)
  } catch (e) {
    lineas.push(`🌐 *fetch:* ❌ ${e.message}`)
    fallos++
  }
const ff = await comprobarFfmpeg()
  lineas.push(`🎞️ *ffmpeg:* ${ff ? '✅ ' + ff : '❌ no ejecutable → los comandos mandarán el GIF animado (sin MP4)'}`)
  lineas.push(`🔧 *modo:* ${MODO_URL ? 'solo URL (SHADOW_ANIME_URL_MODE=1)' : 'convirtiendo a MP4'}`)
  lineas.push('')
  lineas.push('*APIs por acción:*')

  for (const accion of acciones) {
    try {
      const m = await obtenerMediaAnime(accion)
      detalle.push(`✅ ${accion} → ${m.proveedor}${m.anime ? ' · ' + m.anime : ''}`)
    } catch (e) {
      fallos++
      detalle.push(`❌ ${accion} → ${e.message.slice(0, 70)}`)
    }
  }
  lineas.push(...detalle)
  return { texto: lineas.join('\n'), fallos, acciones: acciones.length }
}

export default { obtenerMediaAnime, descargarMedia, descargarReaccionAnime, enviarReaccionAnime, gifAMp4, esMediaValida, proveedores, reaccionesDisponibles, API_KILL_DEDICADA, diagnosticar, comprobarFfmpeg }
