import axios from 'axios'
const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = (await import("@whiskeysockets/baileys"))["default"];

async function getSession() {
  const res = await fetch("https://id.pinterest.com/", {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept-language": "en-US,en;q=0.9"
    }
  })
  const raw = res.headers.getSetCookie?.() || []
  const cookies = raw.map(c => c.split(";")[0]).join("; ")
  const csrf = raw.find(c => c.startsWith("csrftoken="))?.match(/csrftoken=([^;]+)/)?.[1] || ""
  return { cookies, csrf }
}

async function pinterestSearch(query, options = {}) {
  const { limit = 10, scope = "pins", bookmark = null } = options
  const session = await getSession()

  const data = {
    options: {
      query,
      scope,
      page_size: limit,
      refine_search_with_filters: true,
      ...(bookmark ? { bookmarks: [bookmark] } : {})
    },
    context: {}
  }

  const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(query)}`
  const url = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(data))}&_=${Date.now()}`

  const res = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "Mozilla/5.0",
      "referer": `https://id.pinterest.com${sourceUrl}`,
      ...(session.csrf ? { "x-csrftoken": session.csrf } : {}),
      ...(session.cookies ? { "cookie": session.cookies } : {})
    }
  })

  const json = await res.json().catch(() => null)
  const payload = json?.resource_response?.data
  if (!payload) return { results: [] }

  const arr = Array.isArray(payload) ? payload : payload.results || []

  const mapPin = (pin) => ({
    title: pin.title || pin.grid_title || "",
    image: pin.images?.orig?.url || pin.images?.["736x"]?.url || null,
    username: pin.pinner?.username || null,
    fullName: pin.pinner?.full_name || null,
    pinUrl: `https://id.pinterest.com/pin/${pin.id}/`
  })

  return {
    results: arr.filter(x => x?.id).map(mapPin)
  }
}

let handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.reply(m.chat, `☽ *Discípulo de las Sombras*, ingresa lo que deseas invocar desde Pinterest`, m);
  }

  await m.react("🗡️");
  conn.reply(m.chat, `☽ *Las Sombras buscan tus imágenes...* espera un momento bajo la luna`);

  try {
    const searchResult = await pinterestSearch(text, { limit: 10, scope: "pins" })

    if (!searchResult.results.length) {
      return conn.reply(m.chat, `☽ No se encontraron resultados para "${text}"`, m);
    }

    const validResults = searchResult.results.filter(p => p.image)
    if (!validResults.length) {
      return conn.reply(m.chat, `☽ No se encontraron imágenes válidas para "${text}"`, m);
    }

    let cards = []
    let counter = 1

    for (let item of validResults) {
      const { imageMessage } = await generateWAMessageContent(
        { image: { url: item.image } },
        { upload: conn.waUploadToServer }
      )

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `☽ Imagen sombría ${counter++}`
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: "✦ *Las sombras te entregan este hallazgo*"
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: item.title,
          hasMediaAttachment: true,
          imageMessage
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "🔗 Portal de Pinterest",
              Url: item.pinUrl,
              merchant_url: item.pinUrl
            })
          }]
        })
      })
    }

    const messageContent = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({
              text: `📎 *Sombras encontradas para:* ${text}`
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: "☽ *Imágenes procesadas por el Reino de las Sombras*"
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              hasMediaAttachment: false
            }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
              cards
            })
          })
        }
      }
    }, { quoted: m })

    await m.react("✅")
    await conn.relayMessage(m.chat, messageContent.message, {
      messageId: messageContent.key.id
    })

  } catch (e) {
    return conn.reply(m.chat, `⛔ *Las Sombras fallaron...*`, m);
  }
}

handler.help = ["pinterest", "pin"]
handler.tags = ["buscador"]
handler.command = ["pinterest", "pin"]

export default handler
