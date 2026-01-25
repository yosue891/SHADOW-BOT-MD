import fetch from "node-fetch"
import yts from "yt-search"
import { spawn } from "child_process"
import fs from "fs"

const handler = async (m, { conn, text, command }) => {
  try {
    if (!text) return m.reply('▶️ Escribe el nombre o link del video')

    await m.react('🎶')

    const match = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/)
    const query = match ? `https://youtu.be/${match[1]}` : text

    const search = await yts(query)
    const video = search.videos[0]
    if (!video) throw 'No se encontró nada'

    const { title, url, thumbnail, timestamp, views, ago, author } = video

    const smallImg = await fetch("https://i.postimg.cc/rFfVL8Ps/image.jpg")
    const smallThumb = Buffer.from(await smallImg.arrayBuffer())

    const businessHeader = {
      key: { fromMe: false, participant: "0@s.whatsapp.net" },
      message: {
        locationMessage: {
          name: `『 ${title} 』`,
          jpegThumbnail: smallThumb
        }
      }
    }

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: `❄️ *Título:* ☃️ ${title}
> ▶️ *Canal:* ${author.name || 'Desconocido'}
> 💫 *Vistas:* ${formatViews(views)}
> ⏳ *Duración:* ${timestamp}
> ✨ *Publicado:* ${ago}
> 🌐 *Link:* ${url}`
    }, { quoted: businessHeader })

    const isAudio = ['play', 'audio'].includes(command)
    const formato = isAudio ? '128k' : '480p'

    await m.react(isAudio ? '🎧' : '🎬')

    const data = await yt.convert(url, formato)
    const fileName = yt.sanitize(data.filename || title)

    const r = await fetch(data.url)
    const buffer = Buffer.from(await r.arrayBuffer())

    if (isAudio) {
      await conn.sendMessage(
        m.chat,
        { audio: buffer, mimetype: 'audio/mpeg', fileName: `${fileName}.mp3` },
        { quoted: businessHeader }
      )
    } else {
      const fixed = await faststart(buffer)
      await conn.sendMessage(
        m.chat,
        { video: fixed, mimetype: 'video/mp4', fileName: `${fileName}.mp4` },
        { quoted: businessHeader }
      )
    }

    await m.react('✔️')

  } catch (e) {
    console.error(e)
    await m.react('❌')
    m.reply('⚠️ Error al descargar')
  }
}

handler.command = ['play', 'audio', 'video', 'play2']
handler.help = handler.command
handler.tags = ['download']
export default handler

function formatViews(v) {
  if (!v) return 'N/A'
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toString()
}

const yt = {
  static: Object.freeze({
    baseUrl: 'https://cnv.cx',
    headers: {
      'accept-encoding': 'gzip, deflate, br, zstd',
      'origin': 'https://frame.y2meta-uk.com',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }
  }),

  resolvePayload(link, f) {
    const tipo = f.endsWith('k') ? 'mp3' : 'mp4'
    return {
      link,
      format: tipo,
      audioBitrate: tipo === 'mp3' ? f.replace('k', '') : '128',
      videoQuality: tipo === 'mp4' ? f.replace('p', '') : '480',
      filenameStyle: 'pretty',
      vCodec: 'h264'
    }
  },

  sanitize(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  },

  async getKey() {
    const r = await fetch(this.static.baseUrl + '/v2/sanity/key', {
      headers: this.static.headers
    })
    const j = await r.json()
    if (!j?.key) throw 'Key inválida'
    return j.key
  },

  async convert(url, f) {
    const key = await this.getKey()
    const payload = this.resolvePayload(url, f)

    const r = await fetch(this.static.baseUrl + '/v2/converter', {
      method: 'POST',
      headers: { ...this.static.headers, key },
      body: new URLSearchParams(payload)
    })

    const j = await r.json()
    if (!j?.url) throw 'No se pudo convertir'
    return j
  }
}

async function faststart(buffer) {
  const i = `./in_${Date.now()}.mp4`
  const o = `./out_${Date.now()}.mp4`
  fs.writeFileSync(i, buffer)

  const run = args =>
    new Promise((res, rej) => {
      spawn('ffmpeg', args)
        .on('close', c => (c === 0 ? res() : rej()))
    })

  try {
    await run(['-y', '-i', i, '-c', 'copy', '-movflags', '+faststart', o])
  } catch {
    await run([
      '-y', '-i', i,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      o
    ])
  }

  const out = fs.readFileSync(o)
  fs.unlinkSync(i)
  fs.unlinkSync(o)
  return out
      }
