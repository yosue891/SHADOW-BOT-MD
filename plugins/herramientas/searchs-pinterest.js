import axios from "axios";

const NYX_PIN_URL = "https://nyxdlapi.vercel.app/api/search/pinterest";
const NYX_API_KEY = "nyx_41yhfMefym8Jf09qN400MX9Xopw_ERDN";

async function pinterestSearchV2(query) {
  try {
    const limit = 10;

    const { data } = await axios.get(NYX_PIN_URL, {
      params: { q: query, query, limit, apikey: NYX_API_KEY },
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 30000
    });

    const list = data?.result?.results || data?.results;

    if (!data?.status || !Array.isArray(list)) return [];

    return list
      .filter(v => (!v?.tipo || /imagen|image/i.test(v.tipo)) && (v?.descarga || v?.image || v?.download))
      .slice(0, limit)
      .map((v, i) => ({
        title: v.titulo || `Imagen de Pinterest ${i + 1}`,
        author: v.autor || "Desconocido",
        likes: v.likes || "0",
        image: v.descarga || v.image || v.download,
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

    const album = results.map((item, i) => {
      const head = i === 0 ? `📎 *Sombras encontradas para:* ${text}\n\n` : "";
      const foot = i === results.length - 1 ? `\n☽ Imágenes procesadas por el Reino de las Sombras` : "";

      return {
        image: { url: item.image },
        caption: `${head}☽ Imagen sombría ${i + 1}\n𖣔 Título: ${item.title}\n𖣔 Autor: ${item.author}\n𖣔 Likes: ${item.likes}\n𖣔 Pinterest: ${item.pinUrl}\n\n✦ Las sombras te entregan este hallazgo${foot}`
      };
    });

    try {
      if (album.length === 1) {
        await conn.sendMessage(m.chat, album[0], { quoted: m });
      } else {
        await conn.sendMessage(m.chat, { album }, { quoted: m });
      }
    } catch {
      for (const item of album) {
        await conn.sendMessage(m.chat, item, { quoted: m });
      }
    }

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
