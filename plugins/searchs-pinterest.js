import axios from "axios";
const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = (await import("@whiskeysockets/baileys"))["default"];

async function pinterestSearchV2(query) {
  const session = await axios.get("https://www.pinterest.com/", {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept-language": "en-US,en;q=0.9"
    }
  });

  const cookies = session.headers["set-cookie"]
    ?.map(c => c.split(";")[0])
    .join("; ") || "";

  const payload = {
    options: {
      query,
      scope: "pins",
      page_size: 20,
      field_set_key: "unauth_react",
      redux_normalize_feed: true
    },
    context: {}
  };

  const res = await axios.get(
    "https://www.pinterest.com/resource/BaseSearchResource/get/",
    {
      params: {
        source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
        data: JSON.stringify(payload),
        _: Date.now()
      },
      headers: {
        "user-agent": "Mozilla/5.0",
        "x-pinterest-appstate": "active",
        "x-requested-with": "XMLHttpRequest",
        cookie: cookies,
        referer: "https://www.pinterest.com/"
      }
    }
  );

  const data = res.data?.resource_response?.data?.results || [];

  return data
    .filter(pin => pin?.images)
    .map(pin => ({
      title: pin.title || pin.grid_title || "",
      image:
        pin.images?.orig?.url ||
        pin.images?.["736x"]?.url ||
        null,
      pinUrl: `https://www.pinterest.com/pin/${pin.id}/`
    }));
}

let handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `☽ *Discípulo de las Sombras*, ingresa lo que deseas invocar desde Pinterest`,
      m
    );
  }

  await m.react("🗡️");
  conn.reply(
    m.chat,
    `☽ *Las Sombras buscan tus imágenes...* espera un momento bajo la luna`,
    m
  );

  try {
    const results = await pinterestSearchV2(text);

    if (!results.length) {
      return conn.reply(
        m.chat,
        `☽ No se encontraron resultados para "${text}"`,
        m
      );
    }

    let cards = [];
    let counter = 1;

    for (let item of results) {
      if (!item.image) continue;

      const { imageMessage } = await generateWAMessageContent(
        { image: { url: item.image } },
        { upload: conn.waUploadToServer }
      );

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
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🔗 Portal de Pinterest",
                Url: item.pinUrl,
                merchant_url: item.pinUrl
              })
            }
          ]
        })
      });
    }

    const messageContent = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
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
              carouselMessage:
                proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                  cards
                })
            })
          }
        }
      },
      { quoted: m }
    );

    await m.react("✅");
    await conn.relayMessage(m.chat, messageContent.message, {
      messageId: messageContent.key.id
    });
  } catch (e) {
    return conn.reply(
      m.chat,
      `⛔ *Las Sombras fallaron... intenta nuevamente bajo la luna*`,
      m
    );
  }
};

handler.help = ["pinterest", "pin"];
handler.tags = ["buscador"];
handler.command = ["pinterest", "pin"];

export default handler;
