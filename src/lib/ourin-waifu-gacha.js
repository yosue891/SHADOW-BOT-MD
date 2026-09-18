import fs from "fs";
import path from "path";
import axios from "axios";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "ourin";
import config from "../../config.js";
import { saluranCtx } from "./ourin-context.js";

const CHARACTERS_PATH = path.join(process.cwd(), "data", "waifu-characters.json");
const ROLL_COOLDOWN_MS = 4 * 60 * 1000;
const CLAIM_WINDOW_MS = 3 * 60 * 1000;
const DEFAULT_VALUE = 100;

let characterCache = null;
let flatCharacterCache = null;

function cleanId(jid = "") {
  return String(jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function sameUser(a, b) {
  const aa = cleanId(a);
  const bb = cleanId(b);
  return Boolean(aa && bb && (aa === bb || aa.endsWith(bb) || bb.endsWith(aa)));
}

function ownerKey(jid = "") {
  return cleanId(jid) || String(jid || "").trim();
}

function addUserWaifuIndex(store, jid, charId) {
  if (!store.users || typeof store.users !== "object") store.users = {};
  const key = ownerKey(jid);
  if (!key) return;
  if (!Array.isArray(store.users[key])) store.users[key] = [];
  if (!store.users[key].map(String).includes(String(charId))) {
    store.users[key].push(String(charId));
  }
}

function removeUserWaifuIndex(store, jid, charId) {
  if (!store.users || typeof store.users !== "object") store.users = {};
  const key = ownerKey(jid);
  if (!key || !Array.isArray(store.users[key])) return;
  store.users[key] = store.users[key].filter((id) => String(id) !== String(charId));
}

function rebuildUserWaifuIndex(store) {
  if (!store.users || typeof store.users !== "object") store.users = {};
  for (const [id, claim] of Object.entries(store.characters || {})) {
    if (claim?.user) addUserWaifuIndex(store, claim.user, id);
  }
}

function botName() {
  return config.bot?.name || "Kana-Assistant";
}

function styledFooter() {
  return `𐙚 𝑲𝒂𝒏𝒂-𝑨𝒔𝒔𝒊𝒔𝒕𝒂𝒏𝒕 ᰔᩚ`;
}

function loadCharactersDb() {
  if (characterCache) return characterCache;
  if (!fs.existsSync(CHARACTERS_PATH)) {
    throw new Error("No se encontró data/waifu-characters.json");
  }
  characterCache = JSON.parse(fs.readFileSync(CHARACTERS_PATH, "utf8"));
  return characterCache;
}

function flattenCharacters() {
  if (flatCharacterCache) return flatCharacterCache;
  const db = loadCharactersDb();
  flatCharacterCache = [];
  for (const [seriesId, series] of Object.entries(db)) {
    const chars = Array.isArray(series?.characters) ? series.characters : [];
    for (const char of chars) {
      if (!char?.id || !char?.name) continue;
      flatCharacterCache.push({
        ...char,
        id: String(char.id),
        seriesId,
        seriesName: series?.name || "Desconocido",
        value: Number(char.value) || DEFAULT_VALUE,
      });
    }
  }
  return flatCharacterCache;
}

function getCharacterById(id) {
  return flattenCharacters().find((char) => String(char.id) === String(id)) || null;
}

function randomCharacter() {
  const all = flattenCharacters();
  if (!all.length) throw new Error("No hay personajes cargados");
  return all[Math.floor(Math.random() * all.length)];
}

function normalizeImageUrl(url = "") {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("//")) return "https:" + url;
  return url;
}

function validImageUrl(url = "") {
  return /^https?:\/\//i.test(url) && /\.(jpe?g|png|webp)(?:\?|$)/i.test(url);
}

async function searchBooruImage(tag = "") {
  const query = String(tag || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!query) return "";

  const urls = [
    `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}+rating:safe`,
    `https://danbooru.donmai.us/posts.json?limit=20&tags=${encodeURIComponent(query)}+rating:safe`,
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      });
      const json = res.data;
      const arr = Array.isArray(json) ? json : json?.post || json?.data || [];
      const imgs = arr
        .map((item) => normalizeImageUrl(item?.file_url || item?.large_file_url || item?.image || item?.media_asset?.variants?.[0]?.url || ""))
        .filter(validImageUrl);
      if (imgs.length) return imgs[Math.floor(Math.random() * imgs.length)];
    } catch (error) {
      // Try next source
    }
  }

  return "";
}

async function getCharacterImage(char) {
  const direct = Array.isArray(char?.img) ? char.img.map(normalizeImageUrl).filter(validImageUrl) : [];
  if (direct.length) return direct[Math.floor(Math.random() * direct.length)];

  const tags = Array.isArray(char?.tags) ? char.tags : [];
  for (const tag of tags.slice(0, 3)) {
    const image = await searchBooruImage(tag);
    if (image) return image;
  }

  const fallbackTag = String(char?.name || "anime girl").toLowerCase().replace(/\s+/g, "_");
  return (await searchBooruImage(fallbackTag)) || "https://iili.io/K030s44.jpg";
}

function getStore(db) {
  let store = db.setting("waifuGacha");
  if (!store || typeof store !== "object") {
    store = { characters: {}, groups: {} };
    db.setting("waifuGacha", store);
  }
  if (!store.characters || typeof store.characters !== "object") store.characters = {};
  if (!store.groups || typeof store.groups !== "object") store.groups = {};
  if (!store.users || typeof store.users !== "object") store.users = {};
  rebuildUserWaifuIndex(store);
  return store;
}

function saveStore(db, store) {
  db.setting("waifuGacha", store);
  db.save?.();
}

function getGroupState(db, chat) {
  const store = getStore(db);
  if (!store.groups[chat]) store.groups[chat] = { enabled: true, lastRoll: null };
  if (store.groups[chat].enabled === undefined) store.groups[chat].enabled = true;
  return { store, group: store.groups[chat] };
}

function getUserData(db, jid) {
  const user = db.getUser(jid) || db.setUser(jid, {});
  if (!Array.isArray(user.waifus)) user.waifus = [];
  return user;
}

function userDisplayName(db, jid, fallback = "Usuario") {
  const user = db.getUser(jid);
  return user?.regName || user?.name || cleanId(jid) || fallback;
}

function formatMoney(value = 0) {
  return Number(value || 0).toLocaleString("es-VE");
}

function msToTime(ms = 0) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

function buildRollCaption(db, char, claimData, seriesName) {
  const owner = claimData?.user ? userDisplayName(db, claimData.user, "desconocido") : "Libre";
  const status = claimData?.user ? `Reclamado por ${owner}` : "Libre";
  return (
    `❀ Nombre » *${char.name}*\n` +
    `⚥ Género » *${char.gender || "Desconocido"}*\n` +
    `✰ Valor » *${formatMoney(claimData?.value ?? char.value ?? DEFAULT_VALUE)}*\n` +
    `♡ Estado » *${status}*\n` +
    `❖ Fuente » *${seriesName || char.seriesName || "Desconocido"}*\n\n` +
    `» Reclámala respondiendo *${config.command?.prefix || "."}claim* a este mensaje.`
  );
}

function rollButtons(prefix = ".") {
  return [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "🎴 Gacha Waifu",
        sections: [
          {
            title: "Acciones",
            rows: [
              { title: "❤️ Reclamar", description: "Reclamar la waifu del roll actual", id: `${prefix}claim` },
              { title: "🎲 Tirar otra", description: "Buscar otra waifu aleatoria", id: `${prefix}rw` },
              { title: "💞 Ver harem", description: "Ver tus waifus reclamadas", id: `${prefix}harem` },
              { title: "🏆 Top waifus", description: "Ranking de coleccionistas", id: `${prefix}topwaifus` },
              { title: "ℹ️ Info", description: "Información del sistema", id: `${prefix}gachainfo` },
            ],
          },
        ],
      }),
    },
  ];
}

function fakeQuoted() {
  return {
    key: { remoteJid: "status@broadcast", fromMe: false, id: "WAIFU_GACHA" },
    message: { conversation: styledFooter() },
    participant: "0@s.whatsapp.net",
  };
}

async function sendWaifuCard(sock, m, caption, imageUrl, options = {}) {
  const prefix = m.prefix || config.command?.prefix || ".";
  try {
    const media = await prepareWAMessageMedia(
      { image: { url: imageUrl } },
      { upload: sock.waUploadToServer },
    );

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
              body: { text: String(caption) },
              footer: { text: `${styledFooter()} ✧ ${options.footer || "Kana dice: si Ruby brilla, yo también reclamaré mi luz."}` },
              nativeFlowMessage: {
                buttons: rollButtons(prefix),
              },
              contextInfo: saluranCtx(),
            },
          },
        },
      },
      { quoted: fakeQuoted(), userJid: sock.user?.jid || sock.user?.id },
    );

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    return { key: { id: msg.key.id } };
  } catch (error) {
    console.error("[waifu-gacha] interactive image failed:", error?.message || error);
    return sock.sendMessage(
      m.chat,
      { image: { url: imageUrl }, caption, contextInfo: saluranCtx() },
      { quoted: m },
    );
  }
}

function findUserWaifus(store, jid) {
  const key = ownerKey(jid);
  const byId = new Map();

  for (const id of store.users?.[key] || []) {
    const claim = store.characters?.[id];
    if (claim) byId.set(String(id), { id: String(id), ...claim });
  }

  for (const [id, claim] of Object.entries(store.characters || {})) {
    if (claim?.user && sameUser(claim.user, jid)) {
      byId.set(String(id), { id: String(id), ...claim });
    }
  }

  return [...byId.values()]
    .filter((claim) => claim?.user)
    .sort((a, b) => (b.value || 0) - (a.value || 0));
}

function findCharacterByName(query = "") {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  return flattenCharacters().find((char) => String(char.name || "").toLowerCase() === q) ||
    flattenCharacters().find((char) => String(char.name || "").toLowerCase().includes(q)) || null;
}

export {
  CHARACTERS_PATH,
  ROLL_COOLDOWN_MS,
  CLAIM_WINDOW_MS,
  cleanId,
  sameUser,
  ownerKey,
  addUserWaifuIndex,
  removeUserWaifuIndex,
  botName,
  styledFooter,
  loadCharactersDb,
  flattenCharacters,
  getCharacterById,
  randomCharacter,
  getCharacterImage,
  getStore,
  saveStore,
  getGroupState,
  getUserData,
  userDisplayName,
  formatMoney,
  msToTime,
  buildRollCaption,
  sendWaifuCard,
  findUserWaifus,
  findCharacterByName,
};
