import yts from 'yt-search'
import fetch from 'node-fetch'

let handler = async (m, { text, conn, usedPrefix, command }) => {
  if (!text) return conn.reply(m.chat, `🌑✦ Por favor, ingresa una búsqueda de YouTube.`, m)

  try {
    await m.react('🕸️')

    const results = await yts(text)
    const videos = results.all.filter(v => v.type === 'video')
    if (!videos.length) throw new Error('No se encontraron resultados.')

    const v = videos[0]
    const thumbBuffer = await (await fetch('https://i.postimg.cc/rFfVL8Ps/image.jpg')).buffer()

    const info = [
      `✦ *${v.title}*`,
      `❖ Canal: *${v.author.name}*`,
      `⏱ Duración: *${v.timestamp}*`,
      `🕰️ Subido: *${v.ago}*`,
      `👁️ Vistas: *${v.views.toLocaleString()}*`,
      `🔗 Enlace: ${v.url}`
    ].join('\n')

    const businessHeader = {
      key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'ShadowYT' },
      message: {
        locationMessage: {
          name: '🔍 YouTube Search',
          jpegThumbnail: thumbBuffer,
          vcard:
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            'N:;YouTube;;;\n' +
            'FN:YouTube\n' +
            'ORG:Shadow Garden\n' +
            'TITLE:\n' +
            'item1.TEL;waid=5804242773183:+58 0424-2773183\n' +
            'item1.X-ABLabel:Buscador\n' +
            'X-WA-BIZ-DESCRIPTION:Resultados de búsqueda en las sombras\n' +
            'X-WA-BIZ-NAME:YouTube Search\n' +
            'END:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    }

    await conn.sendMessage(m.chat, {
      text: `🌑✦ Resultados para: *${text}*\n\n${info}`
    }, { quoted: businessHeader })

    await m.react('✔️')
  } catch (e) {
    await m.react('✖️')
    conn.reply(m.chat, `⚠️ Error en la búsqueda:\n${e.message}`, m)
  }
}

handler.help = ['ytsearch']
handler.tags = ['buscadores']
handler.command = ['ytbuscar', 'ytsearch', 'yts']
handler.group = true
handler.coin = 12

export default handler
