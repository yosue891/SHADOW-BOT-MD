import fs from "fs";
import path from "path";
import { logger } from "./ourin-logger.js";
import config from "../../config.js";
import { getDatabase } from "./ourin-database.js";
const BACKUP_CONFIG = {
  enabled: config.backup?.enabled ?? true,
  intervalHours: config.backup?.intervalHours ?? 24,
  retainDays: config.backup?.retainDays ?? 7,
  backupDir: "backups",
};

let backupInterval = null;

function getBackupDir() {
  const dir = path.join(process.cwd(), BACKUP_CONFIG.backupDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function generateBackupName() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `backup-${timestamp}.json`;
}

function backupDatabase(dbPath) {
  try {
    const db = getDatabase();

    if (!db.ready) {
      logger.warn("Backup", "Database not ready, skipping backup");
      return null;
    }

    const backupDir = getBackupDir();
    const backupName = generateBackupName();
    const backupPath = path.join(backupDir, backupName);
    const data = JSON.stringify(db.data, null, 2);
    fs.writeFileSync(backupPath, data, "utf-8");
    logger.success("Backup", `Created: ${backupName}`);

    cleanOldBackups();

    return backupPath;
  } catch (error) {
    logger.error("Backup", `Failed: ${error.message}`);
    return null;
  }
}

function cleanOldBackups() {
  try {
    const backupDir = getBackupDir();
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const maxAge = BACKUP_CONFIG.retainDays * 24 * 60 * 60 * 1000;

    let cleaned = 0;

    for (const file of files) {
      if (!file.startsWith("backup-") || !file.endsWith(".json")) continue;

      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info("Backup", `Cleaned ${cleaned} old backup(s)`);
    }
  } catch (error) {
    logger.error("Backup", `Cleanup failed: ${error.message}`);
  }
}

function listBackups() {
  try {
    const backupDir = getBackupDir();
    const files = fs.readdirSync(backupDir);

    return files
      .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
      .map((f) => {
        const filePath = path.join(backupDir, f);
        const stat = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stat.size,
          created: stat.mtime,
        };
      })
      .sort((a, b) => b.created - a.created);
  } catch (error) {
    return [];
  }
}

function restoreBackup(backupName, dbPath) {
  try {
    const backupDir = getBackupDir();
    const backupPath = path.join(backupDir, backupName);
    const destPath = path.join(dbPath, "db.json");

    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }

    const data = fs.readFileSync(backupPath, "utf-8");
    JSON.parse(data);

    fs.writeFileSync(destPath, data, "utf-8");

    logger.success("Backup", `Restored: ${backupName}`);
    return true;
  } catch (error) {
    logger.error("Backup", `Restore failed: ${error.message}`);
    return false;
  }
}

function startAutoBackup(dbPath) {
  if (!BACKUP_CONFIG.enabled) return;

  if (backupInterval) {
    clearInterval(backupInterval);
  }

  backupDatabase(dbPath);

  const intervalMs = BACKUP_CONFIG.intervalHours * 60 * 60 * 1000;
  backupInterval = setInterval(() => {
    backupDatabase(dbPath);
  }, intervalMs);

  logger.info(
    "Backup",
    `Auto backup enabled (every ${BACKUP_CONFIG.intervalHours}h)`,
  );
}

function stopAutoBackup() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    logger.info("Backup", "Auto backup stopped");
  }
}

function getBackupStatus() {
  const backups = listBackups();
  return {
    enabled: BACKUP_CONFIG.enabled,
    intervalHours: BACKUP_CONFIG.intervalHours,
    retainDays: BACKUP_CONFIG.retainDays,
    totalBackups: backups.length,
    latestBackup: backups[0] || null,
  };
}

export {
  backupDatabase,
  restoreBackup,
  listBackups,
  cleanOldBackups,
  startAutoBackup,
  stopAutoBackup,
  getBackupStatus,
  getBackupDir,
  BACKUP_CONFIG,
};
