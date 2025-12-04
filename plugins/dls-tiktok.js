import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return m.reply(
      `*[ 🕸️ ] Has olvidado el vínculo... ¿Acaso temes revelar el portal?*\n\n*[ 🧠 ] Ejemplo:* ${usedPrefix + command} https://vm.tiktok.com/ZMkcmTCa6/`
    )
  }

  if (!args[0].match(/(https?:\/\/)?(www\.)?(vm\.|vt\.)?tiktok\.com\//)) {
    return m.reply(
      `*[ ⚠️ ] Ese enlace no pertenece al reino de TikTok. No intentes engañar a la sombra.*`
    )
  }

  try {
    await conn.reply(
      m.chat,
      '*[ ⏳ ] Invocando el arte prohibido... Preparando la transferencia dimensional...*',
      m
    )

    const tiktokData = await tiktokdl(args[0])

    if (!tiktokData || !tiktokData.data) {
      return m.reply(
        '*[ 🕳️ ] La sombra no pudo extraer el contenido. El vínculo está corrompido.*'
      )
    }

    const videoURL = tiktokData.data.play
    const videoURLWatermark = tiktokData.data.wmplay
    const shadowInfo = `*📜 Fragmento extraído:*\n> ${tiktokData.data.title}`

    if (videoURL || videoURLWatermark) {
      await conn.sendFile(
        m.chat,
        videoURL,
        'shadow_tiktok.mp4',
        '*`TRANSMISIÓN COMPLETADA - ARCHIVO DE LAS SOMBRAS`*' + `\n\n${shadowInfo}`,
        m
      )
    } else {
      return m.reply(
        '*[ ❌ ] La sombra ha fallado. No se pudo completar la invocación.*'
      )
    }
  } catch (error1) {
    conn.reply(
      m.chat,
      `*[ 🩸 ] Error detectado: ${error1}*\n*Las sombras no perdonan los errores...*`,
      m
    )
  }
}

handler.help = ['tiktok']
handler.tags = ['descargas']
// 👇 Usa array en vez de regex
handler.command = ['tt', 'tiktok']

export default handler

async function tiktokdl(url) {
  let tikwm = `https://www.tikwm.com/api/?url=${url}&hd=1`
  let response = await (await fetch(tikwm)).json()
  return response
          }
