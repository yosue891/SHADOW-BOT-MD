import axios from 'axios'
import fs from 'fs'

const SHADOW_ACTIVE = true 
const chatStatus = {}

let handler = m => m
handler.all = async function (m, { conn }) {
  let user = global.db.data.users[m.sender]
  let chat = global.db.data.chats[m.chat]

  m.isBot =
    m.id.startsWith('BAE5') && m.id.length === 16 ||
    m.id.startsWith('3EB0') && (m.id.length === 12 || m.id.length === 20 || m.id.length === 22) ||
    m.id.startsWith('B24E') && m.id.length === 20
  if (m.isBot) return

  const prefixRegex = new RegExp('^[' + (opts['prefix'] || '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')
  if (prefixRegex.test(m.text)) return true
  if (m.sender.includes('bot') || m.sender.includes('Bot')) return true

  const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : []
  const triggered = mentioned.includes(this.user.jid) || (m.quoted && m.quoted.sender === this.user.jid)

  if (triggered && SHADOW_ACTIVE) {
    if (m.text?.match(/menu|estado|serbot|jadibot|video|audio|piedra|papel|tijera/i)) return true

    const now = Date.now()
    if (!chatStatus[m.chat]) {
      chatStatus[m.chat] = { firstMsg: now, lastMsg: now, isResting: false }
    }

    let status = chatStatus[m.chat]

    if (status.isResting) {
      if (now - status.lastMsg > 5 * 60 * 1000) {
        status.isResting = false
        status.firstMsg = now 
      } else {
        return 
      }
    }

    if (now - status.firstMsg > 4 * 60 * 1000) {
      status.isResting = true
      status.lastMsg = now
      return 
    }

    const estiloShadow = `Tu nombre es Shadow-BOT-MD y eres un asistente personal avanzado. 
Eres el líder en las sombras, inspirado en "The Eminence in Shadow". 
Si te preguntan quién eres, responde que eres Shadow-BOT-MD, un asistente personal creado por Yosue. 
Hablas con elegancia y misterio. No eres una IA común, eres la eminencia en las sombras. 
Usa emojis como: 🌑⚔️💜🔥✨.`

    try {
      await this.sendPresenceUpdate('composing', m.chat)

      const prompt = encodeURIComponent(estiloShadow + "\nUsuario: " + m.text + "\nShadow:")
      const url = `https://api-gohan.onrender.com/ai/gemini?text=${prompt}`

      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      })

      const result = data?.result?.text || "Las sombras no tienen respuesta ahora..."

      if (result.trim().length > 0) {
        await this.reply(m.chat, result.trim(), m)
        status.lastMsg = Date.now() 

        const keywords = ['sombra', 'oscuro', 'poder', 'dominio', 'misterio', 'atomic']
        const lowerRes = result.toLowerCase()
        const sendSticker = keywords.some(w => lowerRes.includes(w))

        if (sendSticker) {
          const stickers = [
            './media/stickers/shadow-cool.webp',
            './media/stickers/shadow-power.webp',
            './media/stickers/shadow-laugh.webp'
          ]
          const path = stickers[Math.floor(Math.random() * stickers.length)]
          if (fs.existsSync(path)) {
            await this.sendFile(m.chat, path, 'sticker.webp', '', m, { asSticker: true })
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  return true
}

export default handler
