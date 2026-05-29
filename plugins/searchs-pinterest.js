import axios from 'axios'
const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = (await import("@whiskeysockets/baileys"))["default"];

let handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.reply(m.chat, `☽ *Discípulo de las Sombras*, ingresa lo que deseas invocar desde Pinterest`, m);
  }

  let query = text + " hd";
  await m.react("🗡️");
  conn.reply(m.chat, `☽ *Las Sombras buscan tus imágenes...* espera un momento bajo la luna`);

  try {
    const url = `https://api.kyuurzy.site/api/search/pinterest?apiKey=kzm-qfVxheXd-WioQZqHq&query=${encodeURIComponent(query)}`
    const { data } = await axios.get(url)

    if (!data || !data.results || data.results.length === 0) {
      return conn.reply(m.chat, `☽ No se encontraron resultados para "${text}"`, m);
    }

    const validResults = data.results.filter(p => p.image);
    if (validResults.length === 0) {
      return conn.reply(m.chat, `☽ No se encontraron imágenes válidas para "${text}"`, m);
    }

    let cards = [];
    let counter = 1;

    for (let item of validResults) {
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
          title: item.title || "",
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
      });
    }

    const messageContent = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({
              text: `📎 *Sombras encontradas para:* ${query}`
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
    }, { quoted: m });

    await m.react("✅");
    await conn.relayMessage(m.chat, messageContent.message, {
      messageId: messageContent.key.id
    });

  } catch (error) {
    console.error(error);
    return conn.reply(
      m.chat,
      `⛔ *Las Sombras fallaron... inténtalo más tarde bajo la luna* 🌌`,
      m
    );
  }
};

handler.help = ["pinterest", "pin"];
handler.tags = ["buscador"];
handler.command = ["pinterest", "pin"];

export default handler;
