import { join } from 'path'
import { promises as fs } from 'fs'
import { exec } from 'child_process'

const handler = async (m, { conn }) => {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || ''

    if (!/video/.test(mime)) return m.reply('✨ *Shadow Garden — Análisis*\n\n❌ Responde a un video para extraer su audio.')

    await m.react("⏳")

    try {
        const videoBuffer = await q.download()
        if (!videoBuffer) throw new Error('No se pudo obtener el buffer del video.')

        const tempDir = join(process.cwd(), './tmp')
        if (!fs.stat(tempDir).catch(() => false)) await fs.mkdir(tempDir, { recursive: true })

        const tempVideo = join(tempDir, `${Date.now()}.mp4`)
        const tempAudio = join(tempDir, `${Date.now()}.mp3`)

        await fs.writeFile(tempVideo, videoBuffer)

        exec(`ffmpeg -i ${tempVideo} -vn -ar 44100 -ac 2 -b:a 192k ${tempAudio}`, async (err) => {
            if (err) {
                console.error(err)
                await fs.unlink(tempVideo).catch(() => {})
                return m.reply('❌ Error en la conversión de audio.')
            }

            const audioBuffer = await fs.readFile(tempAudio)
            
            await conn.sendMessage(m.chat, { 
                audio: audioBuffer, 
                mimetype: 'audio/mpeg', 
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: 'Shadow Garden - Audio Extractor',
                        body: 'Audio extraído con éxito 🌌',
                        thumbnailUrl: 'https://i.ibb.co/fdjQ3zng/dec97605db05.jpg',
                        sourceUrl: global.redes,
                        mediaType: 1,
                        showAdAttribution: true
                    }
                }
            }, { quoted: m })

            await fs.unlink(tempVideo).catch(() => {})
            await fs.unlink(tempAudio).catch(() => {})
            await m.react("✅")
        })

    } catch (e) {
        console.error(e)
        m.reply('❌ Fallo al procesar el archivo: ' + e.message)
    }
}

handler.help = ['audivd']
handler.tags = ['convertidor']
handler.command = ['audivd']
handler.register = true

export default handler
