import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const owners = global.owner.map(v => v[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  if (!owners.includes(m.sender)) {
    return conn.reply(m.chat, `❌ Este es un arte prohibido reservado solo para los Maestros de la Organización.`, m)
  }

  const query = text?.trim()

  if (!query) {
    return conn.reply(
      m.chat,
      `╭┈┈⬡「 🔍 *ᴛɪᴋᴛᴏᴋ sᴇᴀʀᴄʜ* 」\n` +
      `┃\n` +
      `┃ ⚜︎ ᴜsᴏ: \`${usedPrefix + command} <búsqueda>\`\n` +
      `┃\n` +
      `╰┈┈⬡\n\n` +
      `> Invocación incompleta. Ejemplo: ${usedPrefix + command} anime edit`,
      m
    )
  }

  await m.react('🔍')

  try {
    const res = await axios.get(`https://labs.shannzx.xyz/api/v1/tiktok?query=${encodeURIComponent(query)}`, {
      timeout: 30000
    })

    if (!res.data?.status || !res.data?.result || res.data.result.length === 0) {
      await m.react('❌')
      return conn.reply(m.chat, `❌ Las sombras no encontraron ningún video para: ${query}`, m)
    }

    const videos = res.data.result
    const videoRandom = videos[Math.floor(Math.random() * videos.length)].video

    await conn.sendMessage(m.chat, {
      video: { url: videoRandom },
      mimetype: 'video/mp4',
      ptv: true
    }, { quoted: m })

    await m.react('🔥')

  } catch (error) {
    await m.react('❌')
    return conn.reply(m.chat, `❌ *Fallo en la búsqueda de las sombras*\n\n> ${error.message}`, m)
  }
}

handler.help = ['ptvsearch']
handler.tags = ['search']
handler.command = ['ptvsearch', 'ptvs']
handler.register = true

export default handler
