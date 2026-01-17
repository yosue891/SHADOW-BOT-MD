import fetch from 'node-fetch'
import FormData from 'form-data'

async function uploadShadow(buffer) {
  const form = new FormData()
  form.append('file', buffer, 'image.jpg')

  const res = await fetch('https://api.imgbb.com/1/upload?key=3a8c9e3e7c1b6c1f0c8b7d9e2f1a4b5c', {
    method: 'POST',
    body: form
  })

  const json = await res.json()
  return json?.data?.url || null
}

let handler = async (m, { conn }) => {
  try {
    const q = m.quoted || m
    const mime = q.mimetype || q.msg?.mimetype || ''

    if (!mime) {
      return m.reply(`🌑✨ *En las sombras no puedo mejorar nada...*  
Envía o responde a una *imagen* para invocar el poder del Shadow Garden.`)
    }

    if (!/image\/(jpe?g|png)/.test(mime)) {
      return m.reply(`🕸️ *Formato prohibido detectado.*  
Solo acepto JPG o PNG para refinar en las sombras.`)
    }

    await m.reply(`🌫️ *Invocando el poder del Shadow Garden...*  
Tu imagen está siendo mejorada uwu`)

    const media = await q.download()
    const link = await uploadShadow(media)

    if (!link) {
      return m.reply('🩸 *Algo perturbó el ritual...*  
No pude subir la imagen.')
    }

    const apiUrl = `https://api-killua.vercel.app/api/tools/hd?imgurl=${encodeURIComponent(link)}`
    const res = await fetch(apiUrl)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const buffer = await res.buffer()

    if (buffer.length < 5000) {
      throw new Error("La API devolvió un archivo inválido")
    }

    const caption =
`🌑 𖤐 𝙎𝙃𝘼𝘿𝙊𝙒 𝙂𝘼𝙍𝘿𝙀𝙉 — 𝙃𝘿 𝙐𝙋𝙎𝘾𝘼𝙇𝙀𝙍 𖤐

🜸 *Estado ›* Refinada en las sombras  
🜲 *Proceso ›* IA del Shadow Garden  
🜵 *Solicitado por ›* ${m.pushName || 'Un miembro anónimo'}  
🜹 *Canal ›* ${global.rcanal || 'No definido uwu'}`.trim()

    await conn.sendMessage(
      m.chat,
      { image: buffer, caption },
      { quoted: m }
    )

  } catch (err) {
    console.error('[HD Error]', err)
    await m.reply(`🕷️ *El ritual falló...*  
No pude mejorar tu imagen.`)
  }
}

handler.help = ['hd', 'upscale', 'remini']
handler.tags = ['tools']
handler.command = ['hd', 'upscale', 'remini']
handler.group = false
handler.premium = false

export default handler
