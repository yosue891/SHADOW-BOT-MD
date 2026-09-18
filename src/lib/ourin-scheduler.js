import { getDatabase } from "./ourin-database.js";
import { logger } from "./ourin-logger.js";
import { CronJob } from "cron";
import moment from "moment-timezone";
import { saluranCtx } from "./ourin-context.js";
import config from "../../config.js";

const scheduledTasks = new Map();
const activeCronJobs = new Map();
const TZ = "Asia/Jakarta";

function getMsUntilTime(hour, minute = 0) {
  const now = moment.tz(TZ);
  const target = moment
    .tz(TZ)
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0);
  if (target.isSameOrBefore(now)) target.add(1, "day");
  return target.diff(now);
}

function formatTimeRemaining(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function startDailyLimitReset(options = {}) {
  const hour = options.hour ?? 0;
  const minute = options.minute ?? 0;
  const defaultLimit = options.defaultLimit ?? 25;

  if (activeCronJobs.has("dailyLimitReset")) {
    activeCronJobs.get("dailyLimitReset").stop();
    activeCronJobs.delete("dailyLimitReset");
  }

  const job = new CronJob(
    `${minute} ${hour} * * *`,
    async () => {
      try {
        const db = getDatabase();
        const resetCount = db.resetAllEnergi(defaultLimit, -1);
        logger.success(
          "Scheduler",
          `Daily limit reset complete! ${resetCount} users reset (regular: ${defaultLimit}, premium: ∞)`,
        );
        db.incrementStat("dailyResets");
        db.setting("lastLimitReset", new Date().toISOString());
      } catch (error) {
        logger.error("Scheduler", `Daily limit reset failed: ${error.message}`);
      }
    },
    null,
    true,
    TZ,
  );

  activeCronJobs.set("dailyLimitReset", job);
  logger.info(
    "Scheduler",
    `Daily limit reset enabled at ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} (${TZ})`,
  );
}

async function scheduleMessage(options, sock) {
  const {
    id,
    jid,
    message,
    hour,
    minute = 0,
    repeat = false,
    createdAt = null,
    ...meta
  } = options;

  if (!id || !jid || !message || hour === undefined) {
    throw new Error("Faltan opciones requeridas: id, jid, message, hour");
  }

  if (scheduledTasks.has(id)) cancelScheduledMessage(id);

  const task = {
    id,
    jid,
    message,
    hour,
    minute,
    repeat,
    createdAt: createdAt || new Date().toISOString(),
    nextRun: null,
    ...meta,
  };

  if (activeCronJobs.has(id)) {
    activeCronJobs.get(id).stop();
    activeCronJobs.delete(id);
  }

  const job = new CronJob(
    `${minute} ${hour} * * *`,
    async () => {
      try {
        await sock.sendMessage(jid, message);
        logger.success("Scheduler", `Scheduled message sent: ${id}`);
        const db = getDatabase();
        db.incrementStat("scheduledMessagesSent");

        if (!repeat) {
          job.stop();
          scheduledTasks.delete(id);
          activeCronJobs.delete(id);
        } else {
          task.nextRun = job.nextDate().toISO();
        }
      } catch (error) {
        logger.error(
          "Scheduler",
          `Error al enviar mensaje programado ${id}: ${error.message}`,
        );
      }
    },
    null,
    true,
    TZ,
  );

  task.nextRun = job.nextDate().toISO();
  activeCronJobs.set(id, job);
  scheduledTasks.set(id, task);

  logger.info(
    "Scheduler",
    `Mensaje programado: ${id} a las ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  );
  return task;
}

function cancelScheduledMessage(id) {
  if (activeCronJobs.has(id)) {
    activeCronJobs.get(id).stop();
    activeCronJobs.delete(id);
  }
  if (scheduledTasks.has(id)) {
    scheduledTasks.delete(id);
    logger.info("Scheduler", `Cancelled scheduled message: ${id}`);
    return true;
  }
  return false;
}

function getScheduledMessages() {
  return Array.from(scheduledTasks.values());
}

function getScheduledMessage(id) {
  return scheduledTasks.get(id) || null;
}

function saveScheduledMessages() {
  try {
    const db = getDatabase();
    const tasks = Array.from(scheduledTasks.values());
    db.setting("scheduledMessages", tasks);
    logger.debug("Scheduler", `Saved ${tasks.length} scheduled messages`);
  } catch (error) {
    logger.error(
      "Scheduler",
      `Error al guardar mensajes programados: ${error.message}`,
    );
  }
}

function loadScheduledMessages(sock) {
  try {
    const db = getDatabase();
    const savedTasks = db.setting("scheduledMessages") || [];
    for (const task of savedTasks) {
      if (task.repeat || new Date(task.nextRun) > new Date()) {
        scheduleMessage(task, sock);
      }
    }
    logger.info("Scheduler", `Loaded ${savedTasks.length} scheduled messages`);
  } catch (error) {
    logger.error(
      "Scheduler",
      `Error al cargar mensajes programados: ${error.message}`,
    );
  }
}

function stopAllSchedulers() {
  saveScheduledMessages();
  for (const [id, job] of activeCronJobs) {
    job.stop();
    logger.debug("Scheduler", `Stopped: ${id}`);
  }
  activeCronJobs.clear();
  if (groupScheduleSock) groupScheduleSock = null;
  sewaSock = null;
  logger.info("Scheduler", "All schedulers stopped");
}

function getSchedulerStatus() {
  const db = getDatabase();
  return {
    dailyResetEnabled: activeCronJobs.has("dailyLimitReset"),
    lastLimitReset: db.setting("lastLimitReset") || "Never",
    scheduledMessagesCount: scheduledTasks.size,
    totalResets: db.getStats("dailyResets"),
    totalMessagesSent: db.getStats("scheduledMessagesSent"),
  };
}

const schedulerRegistry = {
  dailyLimitReset: {
    name: "Daily Limit Reset",
    key: "dailyLimitReset",
    description: "Reiniciar límite de usuario a las 00:00",
  },
  groupSchedule: {
    name: "Group Schedule",
    key: "groupSchedule",
        description: "Abrir/cerrar grupo automáticamente",
  },
  sewaChecker: {
    name: "Sewa Checker",
    key: "sewaChecker",
        description: "Verificar alquileres expirados cada 10 minutos",
  },
  scheduledMessages: {
    name: "Schedule Planner",
    key: "scheduledMessages",
    description: "Recordatorios y horarios libres del owner",
  },
};

function isSchedulerRunning(name) {
  const key = name.toLowerCase().replace(/[\s-]/g, "");
  if (key === "dailylimitreset" || key === "limitreset" || key === "limit")
    return activeCronJobs.has("dailyLimitReset");
  if (key === "groupschedule" || key === "groupsched" || key === "group")
    return activeCronJobs.has("groupSchedule");
  if (key === "sewachecker" || key === "sewa")
    return activeCronJobs.has("sewaChecker");
  if (key === "scheduledmessages" || key === "messages" || key === "msg")
    return scheduledTasks.size > 0;
  return false;
}

function getFullSchedulerStatus() {
  const db = getDatabase();
  const status = {
    schedulers: [
      {
        name: "Daily Limit Reset",
        key: "limitreset",
        running: activeCronJobs.has("dailyLimitReset"),
        description: "Reiniciar límite de usuario a las 00:00",
        lastRun: db.setting("lastLimitReset") || "Never",
        stats: { totalResets: db.getStats("dailyResets") || 0 },
      },
      {
        name: "Group Schedule",
        key: "groupschedule",
        running: activeCronJobs.has("groupSchedule"),
        description: "Abrir/cerrar grupo automáticamente programado",
        lastRun: "-",
        stats: {},
      },
      {
        name: "Sewa Checker",
        key: "sewa",
        running: activeCronJobs.has("sewaChecker"),
    description: "Verificar alquileres expirados cada 10 minutos",
        lastRun: "-",
        stats: {},
      },
      {
        name: "Schedule Planner",
        key: "messages",
        running: scheduledTasks.size > 0,
        description: "Reminder dan jadwal custom owner",
        lastRun: "-",
        stats: {
          activeMessages: scheduledTasks.size,
          totalSent: db.getStats("scheduledMessagesSent") || 0,
        },
      },
    ],
    summary: { totalActive: 0, totalInactive: 0 },
  };
  status.schedulers.forEach((s) => {
    if (s.running) status.summary.totalActive++;
    else status.summary.totalInactive++;
  });
  return status;
}

function stopSchedulerByName(name) {
  const key = name.toLowerCase().replace(/[\s-]/g, "");
  let stopped = false;
  let schedulerName = "";

  if (key === "dailylimitreset" || key === "limitreset" || key === "limit") {
    if (activeCronJobs.has("dailyLimitReset")) {
      activeCronJobs.get("dailyLimitReset").stop();
      activeCronJobs.delete("dailyLimitReset");
      stopped = true;
      schedulerName = "Daily Limit Reset";
    }
  }

  if (key === "groupschedule" || key === "groupsched" || key === "group") {
    if (activeCronJobs.has("groupSchedule")) {
      activeCronJobs.get("groupSchedule").stop();
      activeCronJobs.delete("groupSchedule");
    }
    groupScheduleSock = null;
    stopped = true;
    schedulerName = "Group Schedule";
  }

  if (key === "sewachecker" || key === "sewa") {
    if (activeCronJobs.has("sewaChecker")) {
      activeCronJobs.get("sewaChecker").stop();
      activeCronJobs.delete("sewaChecker");
      stopped = true;
      schedulerName = "Sewa Checker";
    }
    sewaSock = null;
  }

  if (key === "scheduledmessages" || key === "messages" || key === "msg") {
    for (const [id] of scheduledTasks) cancelScheduledMessage(id);
    stopped = true;
    schedulerName = "Schedule Planner";
  }

  if (key === "all") {
    stopAllSchedulers();
    return { stopped: true, name: "All Schedulers" };
  }

  if (stopped) logger.info("Scheduler", `Stopped: ${schedulerName}`);
  return { stopped, name: schedulerName };
}

function startSchedulerByName(name, sock, config = null) {
  const key = name.toLowerCase().replace(/[\s-]/g, "");
  let started = false;
  let schedulerName = "";
  const cfg = config;

  if (key === "dailylimitreset" || key === "limitreset" || key === "limit") {
    if (!activeCronJobs.has("dailyLimitReset")) {
      startDailyLimitReset({
        hour: cfg.scheduler?.resetHour ?? 0,
        minute: cfg.scheduler?.resetMinute ?? 0,
        defaultLimit: cfg.energi?.default ?? 25,
      });
      started = true;
      schedulerName = "Daily Limit Reset";
    }
  }

  if (key === "groupschedule" || key === "groupsched" || key === "group") {
    if (sock) {
      startGroupScheduleChecker(sock);
      started = true;
      schedulerName = "Group Schedule";
    }
  }

  if (key === "sewachecker" || key === "sewa") {
    if (sock && !activeCronJobs.has("sewaChecker")) {
      startSewaChecker(sock);
      started = true;
      schedulerName = "Sewa Checker";
    }
  }

  if (key === "scheduledmessages" || key === "messages" || key === "msg") {
    if (sock) {
      loadScheduledMessages(sock);
      started = true;
      schedulerName = "Schedule Planner";
    }
  }

  if (key === "all") {
    if (sock) {
      initScheduler(cfg, sock);
      startGroupScheduleChecker(sock);
      startSewaChecker(sock);
      return { started: true, name: "All Schedulers" };
    }
  }

  if (started) logger.info("Scheduler", `Started: ${schedulerName}`);
  return { started, name: schedulerName };
}

function initScheduler(config, sock = null) {
  if (config.features?.dailyLimitReset !== false) {
    startDailyLimitReset({
      hour: config.scheduler?.resetHour ?? 0,
      minute: config.scheduler?.resetMinute ?? 0,
      defaultLimit: config.energi?.default ?? 25,
    });
  }
  if (sock) loadScheduledMessages(sock);

  new CronJob(
    "*/5 * * * *",
    () => {
      if (scheduledTasks.size > 0) saveScheduledMessages();
    },
    null,
    true,
    TZ,
  );

  logger.success("Scheduler", "Scheduler initialized");
}

let groupScheduleSock = null;
const notifiedGroups = new Set();

async function startGroupScheduleChecker(sock) {
  if (activeCronJobs.has("groupSchedule")) {
    activeCronJobs.get("groupSchedule").stop();
    activeCronJobs.delete("groupSchedule");
  }

  groupScheduleSock = sock;
  notifiedGroups.clear();

  const job = new CronJob(
    "* * * * *",
    async () => {
      if (!groupScheduleSock) return;

      try {
        const db = getDatabase();
        const now = moment.tz(TZ);
        const currentTime = now.format("HH:mm");
        const groups = db.db?.data?.groups || {};
        if (!groups || typeof groups !== "object") return;

        for (const [groupId, group] of Object.entries(groups)) {
          if (!group || typeof group !== "object") continue;
          const notifyKey = `${groupId}_${currentTime}`;
          if (notifiedGroups.has(notifyKey)) continue;

          if (group.scheduleOpen === currentTime) {
            try {
              await groupScheduleSock.groupSettingUpdate(
                groupId,
                "not_announcement",
              );
              await groupScheduleSock.sendMessage(groupId, {
                text: `🔓 *ᴀᴜᴛᴏ ᴏᴘᴇɴ*\n\n> Grupo abierto automáticamente según el horario.\n> Hora: ${currentTime} WIB`,
              });
              notifiedGroups.add(notifyKey);
              logger.success(
                "GroupSchedule",
                `Opened group ${groupId} at ${currentTime}`,
              );
            } catch (e) {
              if (
                e.message?.includes("not-authorized") ||
                e.message?.includes("admin")
              ) {
                logger.warn(
                  "GroupSchedule",
                  `El bot no es admin en ${groupId}, no puede abrir el grupo`,
                );
                try {
                  await groupScheduleSock.sendMessage(groupId, {
                    text: `⚠️ *ɢᴀɢᴀʟ ᴀᴜᴛᴏ ᴏᴘᴇɴ*\n\n> El bot no es admin, no puede cambiar la configuración del grupo.\n> Haz al bot administrador para activar esta función.`,
                  });
                } catch {}
              } else {
                logger.error(
                  "GroupSchedule",
                  `Error al abrir ${groupId}: ${e.message}`,
                );
              }
              notifiedGroups.add(notifyKey);
            }
          }

          if (group.scheduleClose === currentTime) {
            try {
              await groupScheduleSock.groupSettingUpdate(
                groupId,
                "announcement",
              );
              await groupScheduleSock.sendMessage(groupId, {
                text: `🔒 *ᴀᴜᴛᴏ ᴄʟᴏsᴇ*\n\n> Grupo cerrado automáticamente según el horario.\n> Hora: ${currentTime} WIB`,
              });
              notifiedGroups.add(notifyKey);
              logger.success(
                "GroupSchedule",
                `Closed group ${groupId} at ${currentTime}`,
              );
            } catch (e) {
              if (
                e.message?.includes("not-authorized") ||
                e.message?.includes("admin")
              ) {
                logger.warn(
                  "GroupSchedule",
                  `El bot no es admin en ${groupId}, no puede cerrar el grupo`,
                );
                try {
                  await groupScheduleSock.sendMessage(groupId, {
                    text: `⚠️ *ɢᴀɢᴀʟ ᴀᴜᴛᴏ ᴄʟᴏsᴇ*\n\n> El bot no es admin, no puede cambiar la configuración del grupo.\n> Haz al bot administrador para activar esta función.`,
                  });
                } catch {}
              } else {
                logger.error(
                  "GroupSchedule",
                  `Error al cerrar ${groupId}: ${e.message}`,
                );
              }
              notifiedGroups.add(notifyKey);
            }
          }
        }

        if (now.second() === 0 && now.minute() === 0) notifiedGroups.clear();
      } catch (error) {
        logger.error("GroupSchedule", `Checker error: ${error.message}`);
      }
    },
    null,
    true,
    TZ,
  );

  activeCronJobs.set("groupSchedule", job);
  logger.info(
    "Scheduler",
    "Group schedule checker started (CronJob, every minute)",
  );
}

let sewaSock = null;

async function startSewaChecker(sock) {
  sewaSock = sock;

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  if (activeCronJobs.has("sewaChecker")) {
    activeCronJobs.get("sewaChecker").stop();
    activeCronJobs.delete("sewaChecker");
  }

  const doCheck = async () => {
    try {
      const db = getDatabase();
      const sewaData = db.db.data.sewa;
      if (
        !sewaData ||
        !sewaData.groups ||
        Object.keys(sewaData.groups).length === 0
      )
        return;

      const sewaGroups = db.db.data.sewa.groups || {};
      const now = Date.now();
      let expiredCount = 0;
      let warnedCount = 0;

      for (const [groupId, data] of Object.entries(sewaGroups)) {
        if (data.isLifetime) continue;
        if (data.status === "expired") continue;

        if (data.expiredAt <= now) {
          try {
            await sewaSock.sendText(
              groupId,
              `⏰ *ALQUILER FINALIZADO*\n\nEl tiempo de alquiler del bot en este grupo ha terminado.\nEl bot dejará el grupo.\n\nContacta al owner para renovar el alquiler.`,
              null,
              {
                contextInfo: saluranCtx(),
              },
            );
            await new Promise((r) => setTimeout(r, 2000));
            await sewaSock.groupLeave(groupId);
            data.status = "expired";
            data.expiredLeftAt = Date.now();
            expiredCount++;
            await new Promise((r) => setTimeout(r, 3000));
          } catch (e) {
            logger.error(
              "Scheduler",
              `Error al salir del grupo expirado: ${e.message}`,
            );
          }
          continue;
        }

        const remaining = data.expiredAt - now;

        if (remaining <= ONE_HOUR_MS && !data._warned1h) {
          try {
            const minutes = Math.floor(remaining / 60000);
            await sewaSock.sendText(
              groupId,
              `⚠️ *AVISO DE ALQUILER*\n\n¡Tiempo de alquiler restante: *${minutes} minutos*!\nContacta al owner para renovar.\n\nSi no se renueva, el bot saldrá automáticamente.`,
              null,
              {
                contextInfo: saluranCtx(),
              },
            );
            data._warned1h = true;
            warnedCount++;
            await new Promise((r) => setTimeout(r, 2000));
          } catch {}
        } else if (
          remaining <= THREE_DAYS_MS &&
          remaining > ONE_HOUR_MS &&
          !data._warned3d
        ) {
          try {
            const days = Math.floor(remaining / 86400000);
            const hours = Math.floor((remaining % 86400000) / 3600000);
            await sewaSock.sendText(
              groupId,
              `⚠️ *AVISO DE ALQUILER*\n\nTiempo de alquiler restante: *${days}d ${hours}h*\nContacta al owner para renovar.\n\nSi no se renueva, el bot saldrá automáticamente.`,
              null,
              {
                contextInfo: saluranCtx(),
              },
            );
            data._warned3d = true;
            warnedCount++;
            await new Promise((r) => setTimeout(r, 2000));
          } catch {}
        }
      }

      if (expiredCount > 0 || warnedCount > 0) {
        db.db.write();
        logger.success(
          "Scheduler",
          `Verificación de alquiler: ${expiredCount} expirados, ${warnedCount} avisados`,
        );
      }
    } catch (error) {
      logger.error("Scheduler", `Error en verificación de alquiler: ${error.message}`);
    }
  };

  doCheck();

  const job = new CronJob("*/10 * * * *", doCheck, null, true, TZ);
  activeCronJobs.set("sewaChecker", job);
  logger.info("Scheduler", "Verificador de alquiler activado (CronJob, cada 10 minutos)");
}

export {
  initScheduler,
  stopAllSchedulers,
  startDailyLimitReset,
  startGroupScheduleChecker,
  startSewaChecker,
  scheduleMessage,
  cancelScheduledMessage,
  getScheduledMessages,
  getScheduledMessage,
  saveScheduledMessages,
  loadScheduledMessages,
  getMsUntilTime,
  formatTimeRemaining,
  getSchedulerStatus,
  getFullSchedulerStatus,
  isSchedulerRunning,
  startSchedulerByName,
  stopSchedulerByName,
};
