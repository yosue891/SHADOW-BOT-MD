import axios from 'axios'
const SPOTIFY_API = 'https://dlapixy.vercel.app/api/downloads/spotify'
function detailOf(e) {
const st = e?.response?.status
const body = e?.response?.data
const msg = typeof body === 'string'
? body
: (body?.error || body?.message || (body ? JSON.stringify(body) : ''))
const parts = []
if (st) parts.push(HTTP ${st})
parts.push(msg ? String(msg).slice(0, 200) : (e?.message || 'Error desconocido'))
return parts.join(': ')
}
async function fetchSpotify(text) {
let lastErr
for (const key of ['url', 'q', 'query']) {
try {
const { data } = await axios.get(SPOTIFY_API, {
params: { [key]: text },
timeout: 60000
})
const isSuccess = data?.status === true || data?.ok === true
const info = data?.data || data
const files = Array.isArray(info?.files) ? info.files : []
if (isSuccess && (files.some(f => f?.url) || info?.downloadUrl || info?.url)) {
return info
}
lastErr = new Error(data?.error || data?.message || 'La API no devolvió audio')
} catch (err) {
lastErr = err
const st = err?.response?.status
if (!st || st >= 500 || st === 401 || st === 403 || st === 429) throw err
}
}
throw lastErr
}
async function sendAudio(conn, m, file) {
const url = file?.url || file
const mimetype = file?.mimeType || 'audio/mpeg'
try {
await conn.sendMessage(
m.chat,
{ audio: { url }, mimetype },
{ quoted: m }
)
} catch {
const r = await axios.get(url, {
responseType: 'arraybuffer',
timeout: 120000,
maxContentLength: 100 * 1024 * 1024
})
await conn.sendMessage(
m.chat,
{ audio: Buffer.from(r.data), mimetype },
{ quoted: m }
)
}
}
let handler = async (m, { conn, command, text, usedPrefix }) => {
if (!text) {
return conn.reply(
m.chat,
🌕⚔️ Invoca música desde *Spotify*.\n\n +
Ejemplos:\n> *${usedPrefix + command}* shape of you\n> *${usedPrefix + command}* [https://open.spotify.com/track/123456789](https://open.spotify.com/track/123456789),
m
)
}
await m.react('🕓')
let stage = 'consulta a la API'
try {
const result = await fetchSpotify(text)
const files = Array.isArray(result?.files) ? result.files : []
const file = files.find(f => f?.kind === 'audio' && f?.url) || files.find(f => f?.url) || result?.downloadUrl || result?.url
if (!file) throw new Error('No se encontró un enlace de audio válido')
const titulo = result.title || result.metadata?.title || 'Sin título'
const miniatura = result.thumbnail || result.metadata?.cover
const mensaje = 🎵 *Título:* ${titulo}\n🌑 Refinado en las sombras
stage = 'envío de la portada'
if (miniatura) {
try {
await conn.sendMessage(
m.chat,
{ image: { url: miniatura }, caption: mensaje },
{ quoted: m }
)
} catch (e) {
console.error('Error enviando la portada:', e)
await conn.reply(m.chat, mensaje, m)
}
} else {
await conn.reply(m.chat, mensaje, m)
}
stage = 'envío del audio'
await sendAudio(conn, m, file)
await m.react('✅')
} catch (error) {
console.error([spotify] ${stage}:, error?.response?.status, error?.response?.data || error)
await m.react('❌')
conn.reply(
m.chat,
🕷️ El ritual falló... no pude procesar tu solicitud.\n\n🜸 Etapa: ${stage}\n🜸 Detalles: ${detailOf(error)},
m
)
}
}
handler.help = ['spotify <nombre|url>']
handler.tags = ['descargas']
handler.command = /^(spotify|spdl)$/i
handler.register = true
export default handler
