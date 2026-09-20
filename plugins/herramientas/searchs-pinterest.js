import axios from "axios";
import {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} from "@whiskeysockets/baileys";

async function pinterestSearchV2(query) {
  try {
    const limit = 10;
    const apiUrl = `https://tester-web.onrender.com/api/pinterest?query=${encodeURIComponent(query)}&limit=${limit}`;

    const { data } = await axios.get(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 30000
    });

    if (!data?.status || !Array.isArray(data.results)) return [];

    return data.results
      .filter(v => v?.tipo === "imagen" && v?.descarga)
      .map((v, i) => ({
        title: v.titulo || `Imagen de Pinterest ${i + 1}`,
        author: v.autor || "Desconocido",
        likes: v.likes || "0",
        image: v.descarga,
        pinUrl: v.url || "https://pinterest.com"
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

  await conn.reply(
    m.chat,
    `☽ *Las Sombras buscan tus imágenes...* espera un momento bajo la luna`,
    m
  );

  try {
    const results = await pinterestSearchV2(text);

    if (!results.length) {
      await m.react("❌");
      return conn.reply(
        m.chat,
        `☽ No se encontraron resultados para "${text}"`,
        m
      );
    }

    const cards = [];
    let counter = 1;

    for (const item of results) {
      try {
        const media = await generateWAMessageContent(
          {
            image: {
              url: item.image
            }
          },
          {
            upload: conn.waUploadToServer
          }
        );

        cards.push({
          body: {
            text: `☽ Imagen sombría ${counter++}\n𖣔 Autor: ${item.author}\n𖣔 Likes: ${item.likes}`
          },
          footer: {
            text: "✦ Las sombras te entregan este hallazgo"
          },
          header: {
            title: item.title,
            hasMediaAttachment: true,
            imageMessage: media.imageMessage
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Ver en Pinterest",
                  url: item.pinUrl,
                  merchant_url: item.pinUrl
                })
              }
            ]
          }
        });
      } catch (err) {
        console.error("Error creando card de Pinterest:", err);
      }
    }

    if (!cards.length) {
      await m.react("❌");
      return conn.reply(
        m.chat,
        `☽ No se pudieron procesar las imágenes encontradas.`,
        m
      );
    }

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: {
                text: `📎 *Sombras encontradas para:* ${text}`
              },
              footer: {
                text: "☽ Imágenes procesadas por el Reino de las Sombras"
              },
              header: {
                hasMediaAttachment: false
              },
              carouselMessage: {
                cards
              }
            })
          }
        }
      },
      {
        quoted: m
      }
    );

    await conn.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id
    });

    await m.react("✅");
  } catch (e) {
    console.error(e);
    await m.react("❌");
    return conn.reply(
      m.chat,
      `⛔ *Las Sombras fallaron... intenta nuevamente bajo la luna*`,
      m
    );
  }
};

handler.help = ["pinterest", "pin"];
handler.tags = ["search"];
handler.command = ["pinterest", "pin"];

export default handler;
