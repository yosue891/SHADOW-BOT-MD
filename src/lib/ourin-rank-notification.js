import fs from "fs";
import path from "path";
import config from "../../config.js";
import { getAssetBuffer } from "./ourin-asset-manager.js";
import { saluranCtx } from "./ourin-context.js";

const RANK_ACTIONS = {
  promote: {
    assetKey: "ourin-promote",
    title: "👑 *PROMOTE*",
    fallbackExts: [".png", ".jpg", ".jpeg", ".webp"],
    text: (participant, author) =>
      `👑 *PROMOTE*\n\n` +
      `> @${participant} ahora es administrador.\n` +
      `> Promovido por: @${author}`,
  },
  demote: {
    assetKey: "ourin-demote",
    title: "📉 *DEMOTE*",
    fallbackExts: [".png", ".jpg", ".jpeg", ".webp"],
    text: (participant, author) =>
      `📉 *DEMOTE*\n\n` +
      `> @${participant} ya no es administrador.\n` +
      `> Degradado por: @${author}`,
  },
};

const imageCache = new Map();
const recentRankNotifications = global.__ourinRankNotifications || new Map();
global.__ourinRankNotifications = recentRankNotifications;

function cleanJidNumber(jid, fallback = "Unknown") {
  return String(jid || fallback)
    .split("@")[0]
    .split(":")[0]
    .replace(/[^0-9]/g, "") || fallback;
}

function getCandidatePaths(assetKey, exts = []) {
  const candidates = [];
  const configuredPath = config.assets?.[assetKey];
  if (configuredPath && typeof configuredPath === "string" && !configuredPath.startsWith("http")) {
    candidates.push(configuredPath);
  }

  for (const ext of exts) {
    candidates.push(`./assets/image/${assetKey}${ext}`);
    candidates.push(`./assets/images/${assetKey}${ext}`);
  }

  return [...new Set(candidates)].filter(Boolean);
}

function loadRankImageBuffer(action) {
  const rankConfig = RANK_ACTIONS[action];
  if (!rankConfig) return null;

  const { assetKey, fallbackExts } = rankConfig;

  try {
    const cachedAsset = getAssetBuffer(assetKey, config.assets);
    if (Buffer.isBuffer(cachedAsset) && cachedAsset.length > 0) {
      return cachedAsset;
    }
  } catch {}

  for (const candidate of getCandidatePaths(assetKey, fallbackExts)) {
    try {
      const resolvedPath = path.resolve(process.cwd(), candidate);
      if (fs.existsSync(resolvedPath)) {
        const buffer = fs.readFileSync(resolvedPath);
        if (Buffer.isBuffer(buffer) && buffer.length > 0) return buffer;
      }
    } catch {}
  }

  return null;
}

async function normalizeRankImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer, { animated: false })
      .rotate()
      .resize(1024, 512, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
  } catch (error) {
    console.error("[rank-notification] image normalize error:", error?.message || error);
    return buffer;
  }
}

async function getRankImage(action) {
  if (imageCache.has(action)) return imageCache.get(action);

  const rawImage = loadRankImageBuffer(action);
  if (!rawImage) return null;

  const image = await normalizeRankImage(rawImage);
  if (image) imageCache.set(action, image);
  return image;
}

function markRankNotification(key, ttlMs = 8000) {
  const now = Date.now();
  for (const [cachedKey, timestamp] of recentRankNotifications.entries()) {
    if (now - timestamp > ttlMs) recentRankNotifications.delete(cachedKey);
  }

  const last = recentRankNotifications.get(key);
  if (last && now - last < ttlMs) return false;

  recentRankNotifications.set(key, now);
  return true;
}

async function sendRankNotification(sock, groupJid, action, participantJid, authorJid = null, quoted = null, options = {}) {
  const rankConfig = RANK_ACTIONS[action];
  if (!rankConfig || !sock || !groupJid || !participantJid) return false;

  const participantNumber = cleanJidNumber(participantJid);
  const authorNumber = cleanJidNumber(authorJid || options.fallbackAuthor || "Unknown");
  const mentions = authorJid ? [participantJid, authorJid] : [participantJid];
  const text = options.text || rankConfig.text(participantNumber, authorNumber);
  const dedupeKey = `${groupJid}:${action}:${participantNumber}`;

  if (options.dedupe !== false && !markRankNotification(dedupeKey)) {
    return true;
  }

  const contextInfo = {
    ...saluranCtx(),
    mentionedJid: mentions,
  };

  const sendOptions = quoted ? { quoted } : {};
  const image = await getRankImage(action);

  if (image) {
    try {
      await sock.sendMessage(
        groupJid,
        {
          image,
          caption: text,
          mentions,
          contextInfo,
        },
        sendOptions,
      );
      return true;
    } catch (error) {
      console.error(`[rank-notification] ${action} image send error:`, error?.message || error);
    }
  }

  try {
    await sock.sendMessage(
      groupJid,
      {
        text,
        mentions,
        contextInfo,
      },
      sendOptions,
    );
    return true;
  } catch (error) {
    console.error(`[rank-notification] ${action} fallback send error:`, error?.message || error);
    return false;
  }
}

export { getRankImage, sendRankNotification };
