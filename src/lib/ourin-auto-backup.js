import fs from "fs";
import path from "path";
import archiver from "archiver";
import { CronJob } from "cron";
import config from "../../config.js";
import { getDatabase } from "./ourin-database.js";
import * as timeHelper from "./ourin-time.js";
import { logger } from "./ourin-logger.js";

const BACKUP_STATE_FILE = path.join(
  process.cwd(),
  "database",
  "autobackup.json",
);
let sockInstance = null;
let activeCronJob = null;

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "storage",
  "storages",
  "tmp",
  "temp",
  ".cache",
  "logs",
  "sessions",
  "session",
  "auth",
  ".npm",
  ".yarn",
  "dist",
  "coverage",
  "__pycache__",
  "autoreply_media",
  "build",
  "Baileys-master",
  "ourin",
  "ALYA V8",
  "DHX-pro",
  "RTXZY-MD-pro",
  "BETABOTZ-MD2-pro",
  "KazzTzyCanvs",
  "starseed-main",
  "OurinGlitch-Baileys-main",
  "Script Lyrra MD V7",
  "Sky Md V2",
  "Marin Kitagawa MD V1.0 (1)",
  "AmbaCrash v19 Free (1)",
  "@blckrose",
  "backup",
  "animation",
  "_tools",
  "PUSHKONTAK",
  ".vscode",
  ".gemini",
  "fischit-main",
]);

const EXCLUDE_EXTENSIONS = new Set([
  ".zip",
  ".tar.gz",
  ".7z",
  ".mp4",
  ".mp3",
  ".wav",
  ".avi",
  ".mkv",
  ".ico",
  ".svg",
  ".traineddata",
  ".log",
  ".bak",
  ".lock",
]);

const EXCLUDE_FILES = new Set([
  ".env",
  ".env.local",
  "creds.json",
  "package-lock.json",
  "yarn.lock",
  ".npmrc",
  ".gitignore",
  "boot_final.log",
  "bot_log.txt",
  "error.txt",
  "changelog.txt",
  "UPDATE.txt",
  "CHANGELOG.md",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function shouldExclude(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const parts = relativePath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDE_DIRS.has(part)) return true;
  }
  const fileName = path.basename(filePath);
  if (EXCLUDE_FILES.has(fileName)) return true;
  const ext = path.extname(fileName).toLowerCase();
  if (EXCLUDE_EXTENSIONS.has(ext)) {
    const isAsset =
      relativePath.startsWith("assets" + path.sep) ||
      relativePath.startsWith("database" + path.sep);
    if (!isAsset) return true;
  }
  if (fileName.endsWith(".tar.gz")) return true;
  return false;
}

function loadBackupState() {
  try {
    if (fs.existsSync(BACKUP_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(BACKUP_STATE_FILE, "utf8"));
    }
  } catch {}
  return {
    enabled: false,
    intervalMs: 3600000,
    intervalStr: "1h",
    lastBackup: null,
    backupCount: 0,
  };
}

function saveBackupState(state) {
  try {
    const dir = path.dirname(BACKUP_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BACKUP_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    logger.error("AutoBackup", `Save state failed: ${e.message}`);
  }
}

function parseInterval(str) {
  const match = str.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let ms = 0;
  switch (unit) {
    case "m":
      ms = value * 60 * 1000;
      break;
    case "h":
      ms = value * 60 * 60 * 1000;
      break;
    case "d":
      ms = value * 24 * 60 * 60 * 1000;
      break;
    default:
      return null;
  }
  if (ms < 60000 || ms > 7 * 24 * 60 * 60 * 1000) return null;
  return { ms, str: `${value}${unit}` };
}

function formatInterval(ms) {
  if (ms >= 24 * 60 * 60 * 1000)
    return `${Math.floor(ms / (24 * 60 * 60 * 1000))} días`;
  if (ms >= 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))} horas`;
  return `${Math.floor(ms / (60 * 1000))} minutos`;
}

function intervalToCron(ms) {
  if (ms >= 24 * 60 * 60 * 1000) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    return `0 0 */${days} * *`;
  }
  if (ms >= 60 * 60 * 1000) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    return `0 */${hours} * * *`;
  }
  const minutes = Math.floor(ms / (60 * 1000));
  return `*/${minutes} * * * *`;
}

async function createBackup() {
  return new Promise((resolve, reject) => {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const backupPath = path.join(tmpDir, `backup_${timestamp}.zip`);

    const output = fs.createWriteStream(backupPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    let fileCount = 0;

    output.on("close", () => {
      resolve({
        path: backupPath,
        size: archive.pointer(),
        fileCount,
        timestamp,
      });
    });
    archive.on("error", reject);
    archive.pipe(output);

    const rootDir = process.cwd();

    function addDirectory(dirPath) {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (shouldExclude(fullPath)) continue;
          if (entry.isDirectory()) {
            addDirectory(fullPath);
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size < MAX_FILE_SIZE) {
                const relativePath = path.relative(rootDir, fullPath);
                archive.file(fullPath, { name: relativePath });
                fileCount++;
              }
            } catch {}
          }
        }
      } catch {}
    }

    addDirectory(rootDir);
    archive.finalize();
  });
}

async function sendBackupToOwner(backupInfo) {
  if (!sockInstance) {
    logger.error("AutoBackup", "Socket no inicializado");
    return false;
  }

  const ownerNumbers = config.owner?.number || [];
  if (ownerNumbers.length === 0) {
    logger.error("AutoBackup", "No hay número de propietario configurado");
    return false;
  }

  const ownerNumber = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  if (!ownerNumber) {
    logger.error("AutoBackup", "Número de propietario no válido");
    return false;
  }

  const ownerJid = `${ownerNumber}@s.whatsapp.net`;

  try {
    const sizeInMB = (backupInfo.size / (1024 * 1024)).toFixed(2);
    const state = loadBackupState();

    const caption =
      `🗂️ *ᴀᴜᴛᴏ ʙᴀᴄᴋᴜᴘ*\n\n` +
      `╭┈┈⬡「 📋 *ɪɴꜰᴏ* 」\n` +
      `┃ 📅 Fecha: ${timeHelper.formatDateTime("DD MMMM YYYY HH:mm:ss")} WIB\n` +
      `┃ 📦 Tamaño: ${sizeInMB} MB\n` +
      `┃ 📁 Archivos: ${backupInfo.fileCount}\n` +
      `┃ ⏱️ Intervalo: ${formatInterval(state.intervalMs)}\n` +
      `┃ #️⃣ Backup ke-${state.backupCount + 1}\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `> ${config.bot?.name || "Ourin-AI"} Auto Backup System`;

    await sockInstance.sendMessage(ownerJid, {
      document: fs.readFileSync(backupInfo.path),
      mimetype: "application/zip",
      fileName: path.basename(backupInfo.path),
      caption,
    });

    state.lastBackup = new Date().toISOString();
    state.backupCount++;
    saveBackupState(state);

    try {
      fs.unlinkSync(backupInfo.path);
    } catch {}

    logger.success("AutoBackup", `Copia de seguridad enviada al propietario (${sizeInMB} MB)`);
    return true;
  } catch (error) {
    logger.error("AutoBackup", `Error al enviar: ${error.message}`);
    return false;
  }
}

async function doBackup() {
  try {
    logger.info("AutoBackup", "Starting backup...");
    const backupInfo = await createBackup();
    await sendBackupToOwner(backupInfo);
  } catch (error) {
    logger.error("AutoBackup", `Backup failed: ${error.message}`);
  }
}

function startAutoBackup(sock) {
  sockInstance = sock;
  const state = loadBackupState();

  if (!state.enabled) {
    logger.info("AutoBackup", "Auto backup is disabled");
    return;
  }

  stopAutoBackup();

  const cronExp = intervalToCron(state.intervalMs);
  activeCronJob = new CronJob(cronExp, doBackup, null, true, "Asia/Jakarta");
  logger.info(
    "AutoBackup",
    `Started with interval: ${formatInterval(state.intervalMs)} (cron: ${cronExp})`,
  );
}

function stopAutoBackup() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info("AutoBackup", "Stopped");
  }
}

function enableAutoBackup(intervalStr, sock) {
  const parsed = parseInterval(intervalStr);
  if (!parsed) {
    return {
      success: false,
      error: "Formato de intervalo no válido. Ejemplo: 5m, 1h, 2d",
    };
  }

  sockInstance = sock;

  const state = loadBackupState();
  state.enabled = true;
  state.intervalMs = parsed.ms;
  state.intervalStr = parsed.str;
  saveBackupState(state);

  stopAutoBackup();
  startAutoBackup(sock);

  return {
    success: true,
    interval: formatInterval(parsed.ms),
    intervalStr: parsed.str,
  };
}

function disableAutoBackup() {
  const state = loadBackupState();
  state.enabled = false;
  saveBackupState(state);
  stopAutoBackup();
  return { success: true };
}

function getBackupStatus() {
  const state = loadBackupState();
  return {
    enabled: state.enabled,
    interval: formatInterval(state.intervalMs),
    intervalStr: state.intervalStr,
    lastBackup: state.lastBackup,
    backupCount: state.backupCount,
    isRunning: activeCronJob !== null,
  };
}

async function triggerManualBackup(sock) {
  sockInstance = sock;
  await doBackup();
}

function initAutoBackup(sock) {
  sockInstance = sock;
  startAutoBackup(sock);
}

export {
  initAutoBackup,
  startAutoBackup,
  stopAutoBackup,
  enableAutoBackup,
  disableAutoBackup,
  getBackupStatus,
  triggerManualBackup,
  createBackup,
  parseInterval,
  formatInterval,
};
