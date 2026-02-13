import { gotScraping } from 'got-scraping'
import { fileTypeFromBuffer } from 'file-type'

class ITTCracker {
    constructor() {
        this.baseUrl = 'https://imagetotextconverter.net'
        this.apiUrl = 'https://itt2.imagetotextconverter.net'
        this._jwt = null
        this._jwtExpiry = 0
        this._bypassReferers = [
            '/handwriting-to-text',
            '/image-translator',
            '/image-compressor',
            '/reverse-image-search',
            '/jpg-to-pdf',
            '/png-to-pdf'
        ]
        this._currentReferer = 0
        this.UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }

    _upd() {
        return Date.now().toString()
    }

    _getBypassReferer() {
        return `${this.baseUrl}${this._bypassReferers[this._currentReferer % this._bypassReferers.length]}`
    }

    _rotateReferer() {
        this._currentReferer++
    }

    async getJwt() {
        const now = Math.floor(Date.now() / 1000)
        if (this._jwt && this._jwtExpiry > now + 10) return this._jwt

        const res = await gotScraping({
            url: `${this.baseUrl}/gen-ref-jwt?upd=${this._upd()}`,
            method: 'POST',
            headers: {
                'User-Agent': this.UA,
                'Referer': this._getBypassReferer(),
                'Origin': this.baseUrl,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            json: { method: 'V2' }
        })

        const data = JSON.parse(res.body)

        if (!data?.result?.token) {
            this._rotateReferer()
            return this.getJwt()
        }

        this._jwt = data.result.token

        const payload = JSON.parse(
            Buffer.from(this._jwt.split('.')[1], 'base64url').toString()
        )

        this._jwtExpiry = payload.exp
        return this._jwt
    }

    async ocrBase64(base64Image, ext = 'png') {
        const jwt = await this.getJwt()

        const res = await gotScraping({
            url: `${this.apiUrl}/file-to-text/?upd=${this._upd()}`,
            method: 'POST',
            headers: {
                'User-Agent': this.UA,
                'Referer': this._getBypassReferer(),
                'Origin': this.baseUrl,
                'Authorization': `Bearer ${jwt}`,
                'JVer': 'JwtV2',
                'Content-Type': 'application/json'
            },
            json: {
                ext,
                tool_user: 'web',
                base64_image: base64Image
            }
        })

        const data = JSON.parse(res.body)

        if (data.code !== 200) {
            throw new Error('El servidor OCR cambió o bloqueó la petición')
        }

        return data.response?.data || ''
    }
}

let handler = async (m, { usedPrefix, command, conn }) => {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!/image\/(png|jpe?g|gif|bmp|webp)/.test(mime)) {
        return m.reply(
`⚠️ *Discípulo de las Sombras…*
Responde a una imagen para extraer el texto oculto.

Ejemplo:
${usedPrefix + command}`
        )
    }

    try {
        await m.react('⏳')

        // 🔥 Descarga compatible con cualquier base
        let buffer

        if (typeof q.download === 'function') {
            buffer = await q.download()
        } else if (typeof conn?.downloadMediaMessage === 'function') {
            buffer = await conn.downloadMediaMessage(q)
        }

        if (!buffer) {
            return m.reply('❌ *Las Sombras no pudieron obtener la imagen.*')
        }

        const ft = await fileTypeFromBuffer(buffer)
        const ext = ft?.ext || 'png'
        const base64 = buffer.toString('base64')

        const cracker = new ITTCracker()
        const text = await cracker.ocrBase64(base64, ext)

        if (!text.trim()) {
            return m.reply('⚠️ *Ni siquiera las Sombras encontraron texto en esta imagen.*')
        }

        await m.reply(
`🌑 *Shadow Extraction Complete…*

📝 *Texto Revelado por las Sombras:*
${text.trim()}

⚔️ *Shadow Garden siempre observa…*`
        )

        await m.react('✅')

    } catch (e) {
        console.error(e)
        m.reply(`❌ *Un error ha perturbado las Sombras:* ${e.message}`)
    }
}

handler.help = ['ocr', 'totext']
handler.tags = ['tools']
handler.command = ['ocr', 'totext', 'imagetotext']

export default handler
