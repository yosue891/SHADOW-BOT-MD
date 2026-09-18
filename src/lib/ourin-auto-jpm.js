import { getDatabase } from "./ourin-database.js";
import { logger } from "./ourin-logger.js";
import { delay } from "./ourin-utils.js";
import config from "../../config.js";
import fs from "fs";
import { saluranCtx } from "./ourin-context.js";
import path from "path";
import { getAssetBuffer } from "./ourin-asset-manager.js";
let autoJpmTimer = null;
let sock = null;
let isSending = false;
let cachedThumb = null;

try {
  if (!!getAssetBuffer("ourin2")) {
    cachedThumb = getAssetBuffer("ourin2");
  }
} catch (e) {}

function getAutoJpmStorageDir() {
  const dir = path.join(process.cwd(), "storage", "autojpm");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getAutoJpmConfig() {
  const db = getDatabase();
  return db.setting("autoJpm") || {};
}

function setAutoJpmConfig(data) {
  const db = getDatabase();
  db.setting("autoJpm", data);
  return data;
}

function buildContextInfo() {
  return saluranCtx();
}

function clearAutoJpmTimer() {
  if (autoJpmTimer) {
    clearTimeout(autoJpmTimer);
    autoJpmTimer = null;
  }
}

function scheduleNextRun(sendImmediately = false) {
  clearAutoJpmTimer();
  const cfg = getAutoJpmConfig();
  if (!sock || !cfg.enabled) return;
  const intervalMs = Number(cfg.intervalMs || 0);
  const MIN_INTERVAL = 15 * 60 * 1000;
  if (!intervalMs || intervalMs < MIN_INTERVAL) return;

  const lastRun = Number(cfg.lastRun || 0);
  const isFirstRun = !lastRun || lastRun === 0;

  if (sendImmediately || isFirstRun) {
    setAutoJpmConfig({ ...cfg, nextRun: Date.now() + 5000 });
    autoJpmTimer = setTimeout(runAutoJpm, 5000);
  } else {
    const nextRun = lastRun + intervalMs;
    const delayMs = Math.max(nextRun - Date.now(), 1000);
    setAutoJpmConfig({ ...cfg, nextRun });
    autoJpmTimer = setTimeout(runAutoJpm, delayMs);
  }
}

function buildPayload(message, contextInfo) {
  const text = message?.text || "";
  const media = message?.media;
  if (!media || !media.path || !fs.existsSync(media.path)) {
    return { payload: { text, contextInfo }, sendTextAfter: false };
  }
  const buffer = fs.readFileSync(media.path);
  if (media.type === "image") {
    return {
      payload: { image: buffer, caption: text || "", contextInfo },
      sendTextAfter: false,
    };
  }
  if (media.type === "video") {
    return {
      payload: { video: buffer, caption: text || "", contextInfo },
      sendTextAfter: false,
    };
  }
  if (media.type === "audio") {
    return {
      payload: {
        audio: buffer,
        mimetype: media.mimetype || "audio/mpeg",
        ptt: false,
        contextInfo,
      },
      sendTextAfter: Boolean(text),
    };
  }
  if (media.type === "document") {
    return {
      payload: {
        document: buffer,
        mimetype: media.mimetype || "application/octet-stream",
        fileName: media.fileName || "file",
        contextInfo,
      },
      sendTextAfter: Boolean(text),
    };
  }
  return { payload: { text, contextInfo }, sendTextAfter: false };
}

async function sendAutoJpm(cfg) {
  const db = getDatabase();
  const message = cfg.message || {};
  if (!message.text && !message.media) return;
  const contextInfo = buildContextInfo();
  let groupIds = [];
  global.statusautojpm = true;
  try {
    global.isFetchingGroups = true;
    const allGroups = await sock.groupFetchAllParticipating();
    groupIds = Object.keys(allGroups);
  } finally {
    global.isFetchingGroups = false;
  }
  const blacklist = db.setting("jpmBlacklist") || [];
  const autoBlacklist = db.setting("autoJpmBlacklist") || [];
  const allBlacklist = [...new Set([...blacklist, ...autoBlacklist])];
  groupIds = groupIds.filter((id) => !allBlacklist.includes(id));
  if (!groupIds.length) return;
  const jedaJpm = db.setting("jedaJpm") || 5000;
  const payloadInfo = buildPayload(message, contextInfo);
  for (const groupId of groupIds) {
    if (!getAutoJpmConfig().enabled || global.stopjpm) {
      if (global.stopjpm) delete global.stopjpm;
      break;
    }
    try {
      await sock.sendMessage(groupId, payloadInfo.payload);
      if (payloadInfo.sendTextAfter && message.text) {
        await sock.sendMessage(groupId, { text: message.text, contextInfo });
      }
    } catch (error) {
      logger.error("AutoJPM", `Failed ${groupId}: ${error.message}`);
    }
    await delay(jedaJpm);
  }
}

async function runAutoJpm() {
  if (!sock) return;
  const cfg = getAutoJpmConfig();
  if (!cfg.enabled) return;
  if (isSending || global.statusjpm) {
    scheduleNextRun();
    return;
  }
  isSending = true;
  setAutoJpmConfig({ ...cfg, lastRun: Date.now() });
  try {
    await sendAutoJpm(cfg);
  } catch (error) {
    logger.error("AutoJPM", error.message);
  } finally {
    isSending = false;
    global.statusautojpm = false;
    scheduleNextRun();
  }
}

function initAutoJpmScheduler(socket) {
  sock = socket;
  scheduleNextRun();
}

function startAutoJpmScheduler(socket) {
  if (socket) sock = socket;
  scheduleNextRun();
}

function stopAutoJpmScheduler() {
  clearAutoJpmTimer();
}

export {
  initAutoJpmScheduler,
  startAutoJpmScheduler,
  stopAutoJpmScheduler,
  getAutoJpmConfig,
  setAutoJpmConfig,
  getAutoJpmStorageDir,
};
