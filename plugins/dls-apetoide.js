let handler = async (m, { conn, usedPrefix, command, text }) => {
  conn.apk = conn.apk || {}

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: `⚠️ Ingresa el nombre de la aplicación que quieres buscar\n\n📌 Ejemplo:\n${usedPrefix + command} Facebook Lite`
    }, { quoted: m })
  }

  // Si el texto es número y tiene registro previo
  if (!isNaN(text) && m.sender in conn.apk) {
    const idx = parseInt(text) - 1
    let dt = conn.apk[m.sender]

    if (dt.download) return conn.sendMessage(m.chat, { text: "⏳ Ya estás descargando un archivo, espera...", ...global.rcanal }, { quoted: m })
    if (!dt.data[idx]) return conn.sendMessage(m.chat, { text: "❌ Número inválido", ...global.rcanal }, { quoted: m })

    try {
      dt.download = true
      let data = await aptoide.download(dt.data[idx].id)

      await conn.sendMessage(m.chat, {
        image: { url: data.img },
        caption: `📱 *Nombre:* ${data.appname}\n👨‍💻 *Desarrollador:* ${data.developer}`
      }, { quoted: m })

      let dl = await conn.getFile(data.link)
      await conn.sendMessage(m.chat, {
        document: dl.data,
        fileName: `${data.appname}.apk`,
        mimetype: dl.mime,
        ...global.rcanal
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      conn.sendMessage(m.chat, { text: "❌ Ocurrió un error al descargar el APK.", ...global.rcanal }, { quoted: m })
    } finally {
      dt.download = false
    }
    return
  }

  // Buscar apps
  let results = await aptoide.search(text)
  if (!results.length) {
    return conn.sendMessage(m.chat, { text: "⚠️ No se encontraron resultados para tu búsqueda."}, { quoted: m })
  }

  conn.apk[m.sender] = {
    data: results,
    download: false,
    time: setTimeout(() => delete conn.apk[m.sender], 10 * 60 * 1000)
  }

  // Mostrar botones con primeros 3 resultados
  const top3 = results.slice(0, 3)
  const buttons = top3.map((v, i) => ({
    buttonId: `${usedPrefix + command} ${i + 1}`,
    buttonText: { displayText: `${i + 1}. ${v.name}` },
    type: 1
  }))

  await conn.sendMessage(m.chat, {
    text: `> 🦞 Resultados para: *${text}*\n\nSelecciona una app para descargar el APK:`,
    footer: `📦 Mostrando top 3 de ${results.length} resultados`,
    buttons,
    headerType: 1,
    ...global.rcanal
  }, { quoted: m })
}

handler.help = ["apk"]
handler.tags = ["downloader"]
handler.command = /^apk$/i

export default handler

// Módulo Aptoide
const aptoide = {
  search: async function (query) {
    let res = await global.fetch(`https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(query)}&limit=100`)
    res = await res.json()
    if (!res.datalist?.list?.length) return []

    return res.datalist.list.map((v) => ({
      name: v.name,
      size: v.size,
      version: v.file?.vername || "N/A",
      id: v.package,
      download: v.stats?.downloads || 0
    }))
  },

  download: async function (id) {
    let res = await global.fetch(`https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(id)}&limit=1`)
    res = await res.json()
    if (!res.datalist?.list?.length) throw new Error("App no encontrada")

    const app = res.datalist.list[0]
    return {
      img: app.icon,
      developer: app.store?.name || "Desconocido",
      appname: app.name,
      link: app.file?.path
    }
  }
        }
