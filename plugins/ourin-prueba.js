import axios from "axios";
import { ButtonV2 } from "../../src/lib/ourin-builder.js";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import te from "../../src/lib/ourin-error.js";

const THUMBNAIL_URL = "https://c.termai.cc/i117/ZKqHH.jpg";

const pluginConfig = {
  name: "prueba",
  alias: ["testbutton", "buttonv2test"],
  category: "tools",
  description: "Enviar una prueba de ButtonV2 con lista, botón y miniatura",
  usage: ".prueba",
  example: ".prueba",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function isImageBuffer(buffer, contentType = "") {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (/^image\//i.test(String(contentType))) return true;

  return (
    buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    buffer.subarray(0, 4).toString("ascii") === "RIFF" ||
    buffer.subarray(0, 6).toString("ascii") === "GIF89a" ||
    buffer.subarray(0, 6).toString("ascii") === "GIF87a"
  );
}

async function getThumbnail() {
  try {
    const { data, headers } = await axios.get(THUMBNAIL_URL, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: () => true,
    });

    const buffer = Buffer.from(data || []);
    if (isImageBuffer(buffer, headers?.["content-type"])) return buffer;
  } catch (error) {
    console.error("[prueba] thumbnail download error:", error?.message || error);
  }

  return getAssetBuffer("ourin") || getAssetBuffer("ourin2") || null;
}

function getSelectParams(prefix = ".") {
  return {
    title: "Pilih Opsi",
    sections: [
      {
        title: "baris ke 1",
        rows: [
          { title: "opsi 1", description: "desc", id: `${prefix}prueba opsi1` },
          { title: "opsi 2", description: "desc", id: `${prefix}prueba opsi2` },
        ],
      },
      {
        title: "baris ke 2",
        rows: [
          { title: "opsi 3", description: "desc", id: `${prefix}prueba opsi3` },
          { title: "opsi 4", description: "desc", id: `${prefix}prueba opsi4` },
        ],
      },
    ],
  };
}

async function sendFallback(sock, m, thumbnail) {
  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify(getSelectParams(m.prefix || ".")),
    },
    {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "owner",
        id: `${m.prefix || "."}owner`,
      }),
    },
  ];

  const payload = {
    caption: "body text",
    footer: "footer text",
    title: "title",
    subtitle: "subtitle",
    interactiveButtons: buttons,
    contextInfo: saluranCtx(),
  };

  if (thumbnail) payload.image = thumbnail;
  else payload.text = "*title*\n_subtitle_\n\nbody text\n\nfooter text";

  return sock.sendMessage(m.chat, payload, { quoted: m });
}

async function handler(m, { sock }) {
  const option = (m.args || []).join(" ").trim();
  if (option) {
    return m.reply(`✅ Opción recibida: *${option}*`);
  }

  await m.react("🕕");

  try {
    const thumbnail = await getThumbnail();
    const builder = new ButtonV2(sock)
      .setTitle("title")
      .setSubtitle("subtitle")
      .setBody("body text")
      .setFooter("footer text")
      .setContextInfo(saluranCtx())
      .addRawButton({
        buttonId: "test",
        buttonText: { displayText: "pilihan" },
        type: 1,
        nativeFlowInfo: {
          name: "single_select",
          paramsJson: JSON.stringify(getSelectParams(m.prefix || ".")),
        },
      })
      .addButton("owner", `${m.prefix || "."}owner`);

    if (thumbnail) builder.setThumbnail(thumbnail);

    try {
      await builder.send(m.chat, { quoted: m });
    } catch (error) {
      console.error("[prueba] ButtonV2 failed, using fallback:", error?.message || error);
      await sendFallback(sock, m, thumbnail);
    }

    await m.react("✅");
  } catch (error) {
    console.error("[prueba] error:", error?.message || error);
    await m.react("☢");
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
