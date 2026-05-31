import axios from "axios";
const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = (await import("@whiskeysockets/baileys"))["default"];

async function pinterestSearchV2(query) {
  try {
    const limit = 10;
    const apiUrl = `https://tester-web.onrender.com/api/pinterest?query=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await axios.get(apiUrl);
    
    if (!res.data || !res.data.status || !res.data.results) return [];
    
    return res.data.results.map(result => ({
      title: result.titulo || "Sin título",
      image: result.descarga || null,
      pinUrl: result.url || ""
    }));
  } catch (error) {
    console.error("Error al consultar la API de Pinterest:", error);
    return [];
  }
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
                display_text: "Ver en Pinterest",
                url: item.pinUrl || "https://pinterest.com",
                merchant_url: "https://pinterest.com"
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
    console.error(e);
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
