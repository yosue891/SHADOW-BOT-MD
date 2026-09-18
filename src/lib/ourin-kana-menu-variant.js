import config from "../../config.js";
import { ButtonV2 } from "./ourin-builder.js";
import { getAssetBuffer } from "./ourin-asset-manager.js";
import { getCategories, getCommandsByCategory, getPluginCount } from "./ourin-plugins.js";
import { getCasesByCategory } from "../../case/ourin.js";
import { saluranCtx } from "./ourin-context.js";

const PANEL_FOOTER = "𐙚 𝑲𝒂𝒏𝒂-𝑨𝒔𝒔𝒊𝒔𝒕𝒂𝒏𝒕 ᰔᩚ";

const CATEGORY_EMOJIS = {
  owner: "👑",
  main: "🏠",
  utility: "🔧",
  tools: "🛠️",
  fun: "🎮",
  game: "🎯",
  download: "📥",
  downloader: "📥",
  search: "🔍",
  sticker: "🖼️",
  media: "🎬",
  ai: "🤖",
  group: "👥",
  religi: "☪️",
  islamic: "🕌",
  info: "ℹ️",
  cek: "📋",
  economy: "💰",
  user: "📊",
  canvas: "🎨",
  random: "🎲",
  premium: "💎",
  ephoto: "🖌️",
  jpm: "📨",
  pushkontak: "📱",
  panel: "🖥️",
  store: "🛒",
  rpg: "🗡️",
  gacha: "🎴",
};

const CATEGORY_ORDER = [
  "owner",
  "main",
  "utility",
  "tools",
  "fun",
  "game",
  "download",
  "search",
  "sticker",
  "media",
  "ai",
  "group",
  "religi",
  "info",
  "cek",
  "economy",
  "user",
  "canvas",
  "random",
  "premium",
  "ephoto",
  "jpm",
  "pushkontak",
  "panel",
  "store",
  "rpg",
  "gacha",
];

const CATEGORY_LABELS = {
  owner: "Owner",
  main: "Principal",
  utility: "Utilidad",
  tools: "Herramientas",
  fun: "Diversión",
  game: "Juegos",
  download: "Descargas",
  downloader: "Descargas",
  search: "Búsquedas",
  sticker: "Stickers",
  media: "Media",
  ai: "IA",
  group: "Grupos",
  religi: "Religión",
  islamic: "Islámico",
  info: "Información",
  cek: "Consultas",
  economy: "Economía",
  user: "Usuario",
  canvas: "Canvas",
  random: "Random",
  premium: "Premium",
  ephoto: "Ephoto",
  jpm: "JPM",
  pushkontak: "Push Contactos",
  panel: "Panel",
  store: "Tienda",
  rpg: "RPG",
  gacha: "Gacha",
};


function getAllMenuThumbnail() {
  return (
    getAssetBuffer("ourin-allmenu", config.assets) ||
    getAssetBuffer("ourin", config.assets) ||
    getAssetBuffer("ourin2", config.assets) ||
    null
  );
}

function getMenuAudio() {
  return getAssetBuffer("ourin-mp3", config.assets) || null;
}

async function getMenuAudioOpusPath(audio) {
  const fs = await import("fs");
  const path = await import("path");
  const { spawn } = await import("child_process");

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const destPath = path.join(tempDir, "kana_menu_audio_opus.ogg");
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) return destPath;

  const mp3Path = path.join(tempDir, "kana_menu_audio.mp3");
  fs.writeFileSync(mp3Path, audio);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      mp3Path,
      "-vn",
      "-c:a",
      "libopus",
      "-b:a",
      "48k",
      "-vbr",
      "on",
      destPath,
    ]);

    ffmpeg.on("close", (code) => {
      try {
        if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
      } catch {}

      if (code === 0 && fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
        resolve(destPath);
      } else {
        reject(new Error(`FFmpeg error ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      try {
        if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
      } catch {}
      reject(error);
    });
  });
}

async function sendMenuAudio(sock, m, db) {
  const audioEnabled = db?.setting?.("audioMenu") !== false;
  if (!audioEnabled) return;

  const audio = getMenuAudio();
  if (!audio) {
    console.error("[kana-menu-variant] menu audio asset not found: ourin-mp3");
    return;
  }

  const quotedAudio = {
    key: {
      fromMe: false,
      participant: m.sender,
    },
    message: {
      conversation: "Pon la música hermano",
    },
  };

  try {
    const oggPath = await getMenuAudioOpusPath(audio);
    await sock.sendMessage(
      m.chat,
      {
        audio: { url: oggPath },
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      },
      { quoted: quotedAudio },
    );
  } catch (error) {
    console.error("[kana-menu-variant] opus conversion failed, sending normal mp3:", error?.message || error);
    await sock.sendMessage(
      m.chat,
      {
        audio,
        mimetype: "audio/mpeg",
        ptt: false,
      },
      { quoted: quotedAudio },
    );
  }
}

function formatUptime(seconds = process.uptime()) {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function cleanName(value = "Usuario") {
  return String(value || "Usuario").replace(/[\n\r\t]+/g, " ").trim() || "Usuario";
}

function getSaludarCommand(prefix = ".") {
  // Se mantiene como botón normal al estilo `.prueba`, pero marcando que
  // viene desde el botón para que `.prueba4` pueda validarlo.
  return `${prefix}prueba4 --from-button`;
}

function getMode(db) {
  return db?.setting?.("botMode") || config.mode || config.config?.mode || "self";
}

function getRole(m, user = {}) {
  if (m.isOwner) return "👑 Owner";
  if (m.isPartner) return "🤝 Partner";
  if (m.isPremium || user.isPremium) return "💎 Premium";
  return "🏷️ User";
}

function buildBody(m, { db, plugins }) {
  const user = db?.getUser?.(m.sender) || {};
  const rawName = cleanName(user.regName || m.pushName || m.sender?.split("@")[0] || "Usuario");
  const displayName = rawName.startsWith("~") ? rawName : `~${rawName}`;
  const botName = config.bot?.name || "Kana-Assistant";
  const botMode = getMode(db);
  const commands = plugins?.count || getPluginCount() || global.plugins?.size || 916;
  const users = db?.getUserCount?.() || Object.keys(db?.data?.users || {}).length || 0;
  const registered = user.isRegistered ? "✅ Registrado" : "❌ No registrado";
  const energi = user.energi ?? config.energi?.default ?? 100;
  const level = user.level || user.rpg?.level || 1;
  const exp = user.exp || user.rpg?.exp || 0;
  const koin = user.koin || 0;

  return (
    `hola, *@${displayName}* 👋\n\n` +
    `bienvenido de nuevo a *${botName}*!\n\n` +
    `╭╮ \`✯ DETALLES DEL BOT\`\n` +
    `││  nombre   : ${botName} \n` +
    `││  modo     : ${botMode}\n` +
    `││  comandos : ${commands}\n` +
    `││  activo   : ${formatUptime()}\n` +
    `││  usuarios : ${users}\n` +
    `││  librería : \`ourin-baileys\`\n` +
    `╰╯\n\n` +
    `╭╮ \`❀ DETALLES DEL USUARIO\`\n` +
    `││  nombre   : _${rawName.replace(/^~/, "")}_\n` +
    `││  registro : ${registered}\n` +
    `││  rol      : ${getRole(m, user)}\n` +
    `││  energía  : ${energi} ⚡\n` +
    `││  nivel    : ${level} (${exp} exp)\n` +
    `││  monedas  : ${koin} 🪙\n` +
    `╰╯\n\n` +
    `Toca el botón "Categorías" de abajo para explorar las funciones!`
  );
}

function getCategoryRows(prefix = ".", m = {}) {
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const casesByCategory = getCasesByCategory();
  const allCategories = [
    ...new Set([...categories, ...Object.keys(casesByCategory)]),
  ];

  return allCategories
    .filter((category) => {
      if (category === "owner" && !m.isOwner) return false;
      const total =
        (commandsByCategory[category] || []).length +
        (casesByCategory[category] || []).length;
      return total > 0;
    })
    .sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    })
    .map((category) => {
      const total =
        (commandsByCategory[category] || []).length +
        (casesByCategory[category] || []).length;
      const emoji = CATEGORY_EMOJIS[category] || "📁";
      const label = CATEGORY_LABELS[category] || category;

      return {
        title: `${emoji} ${label} Menú`,
        description: `Ver ${total} comandos de ${label}`,
        id: `${prefix}menucat ${category}`,
      };
    });
}

function getSelectParams(prefix = ".", m = {}) {
  return {
    title: "Categorías",
    sections: [
      {
        title: "Por favor selecciona el menú",
        rows: getCategoryRows(prefix, m),
      },
    ],
  };
}

function buildFallbackButtons(prefix = ".", m = {}) {
  return [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify(getSelectParams(prefix, m)),
    },
    {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "saludar",
        id: getSaludarCommand(prefix),
      }),
    },
  ];
}

async function sendPruebaStylePanel(sock, m, bodyText, prefix = ".") {
  const thumbnail = getAllMenuThumbnail();
  const botName = config.bot?.name || "Kana-Assistant";

  const builder = new ButtonV2(sock)
    .setTitle(botName)
    .setSubtitle(botName)
    .setBody(bodyText)
    .setFooter(PANEL_FOOTER)
    .setContextInfo({
      ...saluranCtx(),
      mentionedJid: [m.sender],
    })
    .addRawButton({
      buttonId: "categorias",
      buttonText: { displayText: "Categorías" },
      type: 1,
      nativeFlowInfo: {
        name: "single_select",
        paramsJson: JSON.stringify(getSelectParams(prefix, m)),
      },
    })
    .addButton("saludar", getSaludarCommand(prefix));

  if (thumbnail) builder.setThumbnail(thumbnail);

  return builder.send(m.chat, { quoted: m });
}

async function sendFallback(sock, m, bodyText, prefix = ".") {
  const thumbnail = getAllMenuThumbnail();
  const payload = {
    caption: bodyText,
    footer: PANEL_FOOTER,
    title: config.bot?.name || "Kana-Assistant",
    subtitle: config.bot?.name || "Kana-Assistant",
    interactiveButtons: buildFallbackButtons(prefix, m),
    mentions: [m.sender],
    contextInfo: {
      ...saluranCtx(),
      mentionedJid: [m.sender],
    },
  };

  if (thumbnail) payload.image = thumbnail;
  else payload.text = bodyText;

  return sock.sendMessage(m.chat, payload, { quoted: m });
}

async function sendKanaMenuVariant(sock, m, { db, plugins = {}, prefix = m.prefix || config.command?.prefix || "." } = {}) {
  const bodyText = buildBody(m, { db, plugins });

  try {
    // Misma estructura que `.prueba`: ButtonV2 + buttonsMessage + miniatura.
    // Solo cambia la miniatura a la imagen de allmenu.
    await sendPruebaStylePanel(sock, m, bodyText, prefix);
  } catch (error) {
    console.error("[kana-menu-variant] ButtonV2 allmenu panel failed, using fallback:", error?.message || error);
    await sendFallback(sock, m, bodyText, prefix);
  }

  try {
    // Envía el mismo audio local que usa el menú principal, como nota de voz Opus.
    await sendMenuAudio(sock, m, db);
  } catch (audioError) {
    console.error("[kana-menu-variant] menu audio failed:", audioError?.message || audioError);
  }
}

export { sendKanaMenuVariant };
