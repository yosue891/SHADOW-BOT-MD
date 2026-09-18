/**
 * Plugin: prueba24 — Menú interactivo con botones nativos + carrusel
 * Réplica del comando .menu interactivo (botones nativos de WhatsApp con
 * nativeFlowMessage quick_reply + dashboard a2ui via bloksWidget "im_a2ui"),
 * enviado con sock.relayMessage igual que los demás menús del bot.
 * También envía un audio de bienvenida: el MISMO del .allmenu
 * (ourin-mp3 → ffmpeg libopus 48k → temp OGG → {url} + ptt:true), que ya
 * reproduce en WhatsApp.
 */

import fs from "node:fs";
import path from "node:path";
import te from "../../src/lib/ourin-error.js";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import config from "../../config.js";

/* Imágenes de carrusel (reels) del catálogo — debajo de la imagen del menú */
const REEL_CAROUSEL_IMAGES = [
  "https://u.pone.rs/zeeyxbzy.jpg",
  "https://u.pone.rs/rgecouzz.jpg",
  "https://u.pone.rs/qxyejmcy.jpg",
  "https://u.pone.rs/yhkdbkxt.jpg",
];

const BOT_NAME = config.bot?.name || "Kana-Assistant";
const DEV_NAME = config.bot?.developer || config.owner?.name || "yosue";
const PREFIX = config.command?.prefix || ">";

const pluginConfig = {
  name: "prueba24",
  alias: ["p24", "kuromenu", "menuinteractivo", "prueba24audio"],
  category: "tools",
  description: "Menú interactivo con botones nativos (quick_reply) + dashboard a2ui y audio de bienvenida (el mismo del .allmenu)",
  usage: ".prueba24",
  example: ".prueba24",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const RELAY_TIMEOUT_MS = 25000;

function randomHex(bytes) {
  const b = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) b[i] = Math.floor(Math.random() * 256);
  return b.toString("hex");
}

/* Construye el payload del menú interactivo. senderKeyDistributionMessage se
 * omite (lo inyecta Baileys con la clave correcta de la sesión/grupo). */
function buildMenuPayload(m, messageId) {
  const widgetUuid = randomHex(16); // 32 hex

  const widgetData = JSON.stringify({
    version: "v0.9",
    createSurface: {
      surfaceId: "starcore-widget=" + widgetUuid,
      catalogId: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
      components: [
        { id: "root", component: "Column", children: ["card_4"] },
        { id: "image_0", component: "Image", url: "https://u.pone.rs/ljbkessg.jpg", variant: "header", fit: "cover" },
        { id: "gal_0", component: "Image", url: REEL_CAROUSEL_IMAGES[0], variant: "smallFeature", fit: "cover" },
        { id: "gal_1", component: "Image", url: REEL_CAROUSEL_IMAGES[1], variant: "smallFeature", fit: "cover" },
        { id: "gal_2", component: "Image", url: REEL_CAROUSEL_IMAGES[2], variant: "smallFeature", fit: "cover" },
        { id: "gal_3", component: "Image", url: REEL_CAROUSEL_IMAGES[3], variant: "smallFeature", fit: "cover" },
        { id: "gallery_0", component: "List", direction: "horizontal", children: ["gal_0", "gal_1", "gal_2", "gal_3"] },
        { id: "text_1", component: "Text", text: `✨ ${BOT_NAME} DASHBOARD`, variant: "body" },
        {
          id: "text_2",
          component: "Text",
          text:
            `⛩️ Konnichiwa! (こんにちは 🌸)\nHai, ${BOT_NAME}! Selamat datang di menu utama.\n\n🤖 Bot Name : ${BOT_NAME}\n👑 Owner    : ${DEV_NAME}\n🏷️ Version  : 1.1\n⏱️ Uptime   : 2h 22m 43s\n📌 Prefix   : [ ${PREFIX} ]\n\n💡 Ketik ${PREFIX}menu <nama_kategori> atau tekan tombol kategori di bawah.`,
          variant: "caption",
        },
        { id: "column_3", component: "Column", children: ["image_0", "gallery_0", "text_1", "text_2"] },
        { id: "card_4", component: "Card", child: "column_3" },
      ],
    },
  });

  return {
    messageContextInfo: {
      messageSecret: "hCpNlvKKaOLYerZaItLCiv5BzlUDq3krqihwX9F927A=",
    },
    interactiveMessage: {
      header: {
        hasMediaAttachment: false,
      },
      body: {
        text: "",
      },
      footer: {
        text: `© 2026 ${BOT_NAME} • Powered by ${DEV_NAME}`,
      },
      nativeFlowMessage: {
        buttons: [
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🀄 All Menu", id: ".menu all" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👤 Owner Profile", id: ".owner" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Ai", id: ".menu ai" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Core", id: ".menu core" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Dev", id: ".menu dev" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Downloader", id: ".menu downloader" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Fun", id: ".menu fun" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Games", id: ".menu games" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Group", id: ".menu group" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info", id: ".menu info" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Main", id: ".menu main" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Other", id: ".menu other" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: ".menu owner" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Search", id: ".menu search" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tools", id: ".menu tools" }) },
          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Utility", id: ".menu utility" }) },
        ],
        messageParamsJson: JSON.stringify({
          bottom_sheet: {
            in_thread_buttons_limit: 1,
            divider_indices: [1, 2],
            list_title: "Pilih Kategori Menu",
            button_title: "Pilih Kategori Menu",
          },
          limited_time_offer: {
            text: `${BOT_NAME} - Main Menu`,
            url: "",
            copy_code: "",
            expiration_time: Date.now() + 30 * 24 * 60 * 60 * 1000,
          },
        }),
        messageVersion: 1,
      },
      bloksWidget: {
        uuid: widgetUuid,
        data: widgetData,
        type: "im_a2ui",
      },
      contextInfo: {
        stanzaId: messageId,
        participant: m.sender,
        quotedMessage: {
          extendedTextMessage: {
            text: `${m.prefix}${m.command}`,
            previewType: 0,
            inviteLinkGroupTypeV2: 0,
          },
        },
        expiration: 7776000,
      },
    },
  };
}

function buildAdditionalNodes() {
  return [
    {
      tag: "biz",
      attrs: {
        actual_actors: "2",
        host_storage: "2",
        privacy_mode_ts: String(Math.floor(Date.now() / 1000)),
      },
      content: [
        {
          tag: "interactive",
          attrs: { type: "native_flow", v: "1" },
          content: [
            {
              tag: "native_flow",
              attrs: { v: "9", name: "mixed" },
            },
          ],
        },
        {
          tag: "quality_control",
          attrs: {
            decision_id: randomHex(16),
            source_type: "third_party",
          },
          content: [
            {
              tag: "decision_source",
              attrs: { value: "df" },
            },
          ],
        },
      ],
    },
  ];
}

/* ── audio PTT (nota de voz) ──
 * EL AUDIO VIAJA INCRUSTADO EN EL PLUGIN (base64), como los videos de
 * editkana.js. Motivo: en hosts como HidenCloud los binarios grandes del repo
 * (MP3/OGG en assets/) pueden bajarse TRUNCADOS al hacer pull y WhatsApp
 * muestra "este audio no está disponible porque algo falló con el archivo".
 * Un plugin de ~1MB sí carga bien en ese host (editkana.js = 990KB ya lo hace).
 * Formato: OGG Opus MONO 48kHz 32kbps — el mismo de las notas de voz reales
 * de WhatsApp — 2:56 (176.13s). Se envía como Buffer + ptt:false (audio normal); la librería
 * calcula seconds/waveform desde el buffer (validado con ourin-baileys). */
/* ── audio de bienvenida: EL MISMO del .allmenu ──────────────────────────────
 * Réplica exacta del flujo de plugins/main/allmenu.js (variante 1):
 *   ourin-mp3 (config.assets, cacheado en el arranque por preloadAssets)
 *   → ffmpeg "libopus 48k VBR" → temp/allmenu_audio_opus.ogg
 *   → sock.sendMessage({ audio: { url: ogg }, mimetype, ptt: true }).
 * Usa la MISMA ruta temp del menú: si ya existe, se envía el archivo exacto
 * que reproduce en tu WhatsApp. Fallback = MP3 directo (como el menú).
 * Sin URLs externas ni base64 incrustado. */
const MENU_AUDIO_KEY = "ourin-mp3";

/* idéntico a allmenu.js: escribe el MP3 y lo convierte con ffmpeg (48k VBR) */
function ensureMenuOgg(audioBuf) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const destPath = path.join(tempDir, "allmenu_audio_opus.ogg");
    if (fs.existsSync(destPath)) return resolve(destPath);
    const mp3Path = path.join(tempDir, "allmenu_audio.mp3");
    fs.writeFileSync(mp3Path, audioBuf);
    import("node:child_process")
      .then(({ spawn }) => {
        const ffmpeg = spawn("ffmpeg", ["-y", "-i", mp3Path, "-c:a", "libopus", "-b:a", "48k", "-vbr", "on", destPath]);
        ffmpeg.on("close", (code) => {
          if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
          if (code === 0) resolve(destPath);
          else reject(new Error("FFmpeg error"));
        });
        ffmpeg.on("error", (err) => {
          if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
          reject(err);
        });
      })
      .catch(reject);
  });
}

async function sendPttAudio(m, sock) {
  const audioBuf = getAssetBuffer(MENU_AUDIO_KEY);
  if (!audioBuf) {
    console.error("[prueba24] no se encontró el audio del menú (ourin-mp3)");
    throw new Error("ourin-mp3 no disponible");
  }
  try {
    const oggPath = await ensureMenuOgg(audioBuf);
    await sock.sendMessage(
      m.chat,
      { audio: { url: oggPath }, mimetype: "audio/ogg; codecs=opus", ptt: true },
      { quoted: m },
    );
    console.log(`[prueba24] audio del menú enviado (${path.basename(oggPath)}, ${fs.statSync(oggPath).size} bytes)`);
  } catch (err) {
    console.error("[prueba24] falló el OGG, envío MP3 directo (fallback del menú):", err?.message || err);
    await sock.sendMessage(
      m.chat,
      { audio: audioBuf, mimetype: "audio/mpeg", ptt: false },
      { quoted: m },
    );
    console.log(`[prueba24] audio MP3 (fallback) enviado (${audioBuf.length} bytes)`);
  }
}

/* ── handler ── */
async function handler(m, { sock }) {
  await m.react("🕒").catch(() => {});

  /* Modo solo-audio (alias prueba24audio) para diagnosticar el PTT sin el menú */
  if (m.command === "prueba24audio") {
    try {
      await sendPttAudio(m, sock);
      await m.react("✅").catch(() => {});
    } catch (error) {
      console.error("[prueba24] envío del audio falló:", error?.message || error);
      await m.react("☢").catch(() => {});
    }
    return;
  }

  const messageId = randomHex(16).toUpperCase(); // 32 hex
  const payload = buildMenuPayload(m, messageId);

  try {
    await Promise.race([
      sock.relayMessage(m.chat, payload, {
        messageId,
        additionalNodes: buildAdditionalNodes(),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("relayMessage timeout")), RELAY_TIMEOUT_MS),
      ),
    ]);
  } catch (error) {
    console.error("[prueba24] envío de la tarjeta falló:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }

  // 2) audio de bienvenida — el mismo del .allmenu
  try {
    await sendPttAudio(m, sock);
    console.log("[prueba24] audio enviado correctamente");
  } catch (error) {
    console.error("[prueba24] envío del audio falló:", error?.message || error);
  }

  await m.react("✅").catch(() => {});
  console.log("[prueba24] menú interactivo enviado correctamente");
}

export { pluginConfig as config, handler, buildMenuPayload, buildAdditionalNodes, sendPttAudio };
