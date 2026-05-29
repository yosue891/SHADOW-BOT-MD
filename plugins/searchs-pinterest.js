import axios from 'axios';
const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = (await import("@whiskeysockets/baileys"))["default"];

async function getSession() {
  const res = await fetch("https://id.pinterest.com/", {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
      "accept-language": "en-US,en;q=0.9"
    }
  })
  const raw = res.headers.getSetCookie?.() || []
  const cookies = raw.map(c => c.split(";")[0]).join("; ")
  const csrf = raw.find(c => c.startsWith("csrftoken="))?.match(/csrftoken=([^;]+)/)?.[1] || ""
  return { cookies, csrf }
}

async function pinterestSearch(query, options = {}) {
  const { limit = 5, scope = "pins", bookmark = null } = options
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
      "accept": "application/json, text/javascript, */*, q=0.01",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
      "referer": `https://id.pinterest.com${sourceUrl}`,
      "x-requested-with": "XMLHttpRequest",
      "x-app-version": "6d51d5a",
      "x-pinterest-appstate": "active",
      "x-pinterest-pws-handler": "www/search/[scope].js",
      "x-pinterest-source-url": sourceUrl,
      ...(session.csrf ? { "x-csrftoken": session.csrf } : {}),
      ...(session.cookies ? { "cookie": session.cookies } : {})
    }
  })

  if (!res.ok) return { results: [], bookmark: null, error: `HTTP ${res.status}` }

  const json = await res.json().catch(() => null)
  const payload = json?.resource_response?.data
  if (!payload) return { results: [], bookmark: null, error: "no data" }

  const arr = Array.isArray(payload) ? payload : payload.results || []

  const mapPin = (pin) => ({
    title: pin.title || pin.grid_title || "",
    image: pin.images?.orig?.url || pin.images?.["736x"]?.url || null,
    video: pin.videos?.video_list?.V_HLSV4?.url
      || pin.videos?.video_list?.V_EXP7?.url
      || pin.videos?.video_list?.V_720P?.url
      || null,
    username: pin.pinner?.username || null,
    fullName: pin.pinner?.full_name || null,
    pinUrl: `https://id.pinterest.com/pin/${pin.id}/`
  })

  return {
    query,
    count: arr.length,
    bookmark: payload.bookmark || null,
    results: arr.filter(x => x?.id).map(mapPin)
  }
}

let handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.reply(m.chat, `☽ *Discípulo de las Sombras*, ingresa lo que deseas invocar desde Pinterest`, m);
  }

  let query = text + " hd";
  await m.react("🗡️");
  conn.reply(m.chat, `☽ *Las Sombras buscan tus imágenes...* espera un momento bajo la luna`);

  try {
    const searchResult = await pinterestSearch(query, { limit: 10, scope: "pins" });
    if (!searchResult || !searchResult.results || searchResult.results.length === 0) {
      return conn.reply(m.chat, `☽ No se encontraron resultados para "${text}"`, m);
    }

    const validResults = searchResult.results.filter(p => p.image);
    if (validResults.length === 0) {
      return conn.reply(m.chat, `☽ No se encontraron imágenes válidas para "${text}"`, m);
    }

    let cards = [];
    let counter = 1;

    for (let item of validResults) {
      const { imageMessage } = await generateWAMessageContent({ image: { url: item.image } }, { upload: conn.waUploadToServer });
      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: `☽ Imagen sombría ${counter++}` }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "✦ *Las sombras te entregan este hallazgo*" }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: item.title, hasMediaAttachment: true, imageMessage }),
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
      });
    }

    const messageContent = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({ text: `📎 *Sombras encontradas para:* ${query}` }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: "☽ *Imágenes procesadas por el Reino de las Sombras*" }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
          })
          
        }
      }
    }, { quoted: m });

    await m.react("✅");
    await conn.relayMessage(m.chat, messageContent.message, { messageId: messageContent.key.id });
  } catch (error) {
    console.error(error);
    return conn.reply(m.chat, `⛔ *Las Sombras fallaron... inténtalo más tarde bajo la luna* 🌌`, m);
  }
};

handler.help = ["pinterest", "pin"];
handler.tags = ["buscador"];
handler.command = ["pinterest", "pin"];

export default handler;
