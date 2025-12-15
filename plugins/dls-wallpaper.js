import { wallpaper, wallpaperv2 } from '@bochilteam/scraper'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return m.reply(
      `🎭 Falta tu búsqueda, sombra...\n` +
      `Ejemplos:\n` +
      `• ${usedPrefix}wp eminence in shadow\n` +
      `• ${usedPrefix}wallpaper Navidad\n` +
      `• ${usedPrefix}wallpaper2 anime`
    )
  }

  try {
    const src = /2$/.test(command) ? wallpaperv2 : wallpaper
    const res = await src(text.trim())
    if (!res || !res.length) {
      return m.reply(`❄️ La sombra no halló imágenes para: "${text}". Intenta con otra palabra.`)
    }

    const img = res[Math.floor(Math.random() * res.length)]

    await conn.sendButton(
      m.chat,
      `❄️✨ La sombra sonríe entre luces festivas...\n🔎 Búsqueda: *${text}*`,
      `⚔️ Shadow-BOT-MD • Panel navideño 🎄`,
      img,
      [
        ['🔄 Siguiente sombra', `${usedPrefix}${command} ${text}`],
        ['🎄 Pinterest navideño', `#pinterest ${text}`],
        ['👻 Google sombrío', `#image ${text}`]
      ],
      null,
      null,
      fkontak
    )
  } catch (e) {
    await conn.reply(
      m.chat,
      `⚠️ La sombra encontró un error...\n` +
      `#report ${usedPrefix}${command}\n` +
      `🎄 Intenta de nuevo bajo las luces festivas.`,
      m
    )
    console.log(`❗ Error en comando ${usedPrefix}${command}`, e)
    handler.limit = false
  }
}

handler.help = [
  'wallpaper <query>',
  'wallpaper2 <query>',
  'wp <query>'
]
handler.tags = ['downloader']

// Registro como array para evitar “comando no existe”
handler.command = ['wp', 'wallpaper', 'wallpaper2']

handler.register = true
handler.limit = 1
handler.level = 3

export default handler
