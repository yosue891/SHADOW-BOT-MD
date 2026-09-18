import { getDatabase } from "./ourin-database.js";
import { logger } from "./ourin-logger.js";
import { CronJob } from "cron";
import config from "../../config.js";
import * as timeHelper from "./ourin-time.js";
import { saluranCtx } from "./ourin-context.js";
import { getTodaySchedule, extractPrayerTimes } from "./ourin-sholat-api.js";

const TZ = "Asia/Jakarta";

const SHOLAT_MESSAGES = {
  imsak:
    "🌙 *HORA DEL IMSAK*\n\n> Hola Amigo, la hora del Imsak ha llegado.\n> Comes el sahur antes de que se acabe el tiempo.",
  subuh:
    "🌅 *HORA DEL SUBUH*\n\n> Hola Amigo, la hora de la oración Subuh ha llegado.\n> Toma el wudhu y ora rápidamente.",
  terbit:
    "☀️ *HORA DEL AMANECER*\n\n> El sol ha salido.\n> ¡Que tengas un buen día!",
  dhuha:
    "🌤️ *HORA DEL DHUHA*\n\n> Hola Amigo, la hora de la oración Dhuha ha llegado.\n> No olvides orar Dhuha, 2-8 rak'ah.",
  dzuhur:
    "🌞 *HORA DEL DZUHUR*\n\n> Hola Amigo, la hora de la oración Dzuhur ha llegado.\n> Toma el wudhu y ora rápidamente.",
  ashar:
    "🌇 *HORA DEL ASHAR*\n\n> Hola Amigo, la hora de la oración Ashar ha llegado.\n> Toma el wudhu y ora rápidamente.",
  maghrib:
    "🌆 *HORA DEL MAGHRIB*\n\n> Hola Amigo, la hora de la oración Maghrib ha llegado.\n> Toma el wudhu y ora rápidamente.",
  isya: "🌙 *HORA DEL ISYA*\n\n> Hola Amigo, la hora de la oración Isya ha llegado.\n> Toma el wudhu y ora rápidamente.",
};

const GAMBAR_SUASANA = {
  imsak: "https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif",
  subuh: "https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif",
  terbit: "https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif",
  dhuha: "https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif",
  dzuhur:
    "https://cdn.gimita.id/download/qf2d6868_sheikh-zayed-grand-mosque_625x300_04_March_25_1769502237718_92212561.webp",
  ashar:
    "https://cdn.gimita.id/download/18537d69-a2e0-4dc2-a144-57dde0f359b5_1769502389063_5c004902.jpg",
  maghrib:
    "https://cdn.gimita.id/download/mosque-5950407_1280_1769502206553_660ae15c.webp",
  isya: "https://cdn.gimita.id/download/pngtree-nighttime-mosque-illustration-with-realistic-details-celebrating-ramadan-kareem-mubarak-image_3814083_1769502091988_e4cf3326.jpg",
};

const AUDIO_ADZAN = "https://media.vocaroo.com/mp3/1ofLT2YUJAjQ";

let sock = null;
let cachedSchedule = null;
let cacheDate = "";
const sholatCronJobs = new Map();
let dailyRefreshJob = null;

function getTodayDateString() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

async function loadTodaySchedule() {
  const todayStr = getTodayDateString();
  if (cachedSchedule && cacheDate === todayStr) return cachedSchedule;

  const db = getDatabase();
  const kotaSetting = db.setting("autoSholatKota") || {
    id: "1301",
    nama: "KOTA JAKARTA",
  };

  try {
    const jadwalData = await getTodaySchedule(kotaSetting.id);
    cachedSchedule = extractPrayerTimes(jadwalData);
    cacheDate = todayStr;
    return cachedSchedule;
  } catch (e) {
    logger.error("SholatScheduler", `Error al obtener el horario: ${e.message}`);
    return null;
  }
}

function clearSholatCronJobs() {
  for (const [, job] of sholatCronJobs) job.stop();
  sholatCronJobs.clear();
}

async function schedulePrayerTimes() {
  clearSholatCronJobs();

  const db = getDatabase();
  const globalEnabled = db.setting("autoSholat");
  if (!globalEnabled) return;

  const schedule = await loadTodaySchedule();
  if (!schedule) return;

  for (const [sholat, waktu] of Object.entries(schedule)) {
    if (waktu === "-") continue;

    const [hour, minute] = waktu.split(":").map(Number);
    const cronExpr = `${minute} ${hour} * * *`;

    const job = new CronJob(
      cronExpr,
      async () => {
        await sendSholatNotifications(sholat, waktu);
      },
      null,
      true,
      TZ,
    );

    sholatCronJobs.set(sholat, job);
  }

  logger.info(
    "SholatScheduler",
    `Scheduled ${sholatCronJobs.size} prayer times (${TZ})`,
  );
}

async function sendSholatNotifications(sholat, waktu) {
  try {
    const db = getDatabase();

    const closeGroup = db.setting("autoSholatCloseGroup") || false;
    const duration = db.setting("autoSholatDuration") || 5;
    const sendAudio = db.setting("autoSholatAudio") !== false;
    const kotaSetting = db.setting("autoSholatKota") || {
      nama: "KOTA JAKARTA",
    };

    const saluranId = config.saluran?.id || "120363403739366547@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";

    let groupList = [];
    try {
      const groupsObj = await sock.groupFetchAllParticipating();
      groupList = Object.keys(groupsObj);
    } catch (e) {
      logger.error("SholatScheduler", `Failed to fetch groups: ${e.message}`);
      return;
    }

    if (groupList.length === 0) return;

    let sentCount = 0;
    const closedGroups = [];
    const isSholatTime = [
      "subuh",
      "dzuhur",
      "ashar",
      "maghrib",
      "isya",
    ].includes(sholat);

    let message = `${SHOLAT_MESSAGES[sholat] || `🕌 *WAKTU ${sholat.toUpperCase()}*`}\n\n⏰ *${waktu} WIB*\n📍 *${kotaSetting.nama}*`;

    if (closeGroup && isSholatTime) {
      message += `\n\n> 🔒 _Grupo cerrado ${duration} minutos para la oración_`;
    }

    for (const groupId of groupList) {
      const groupData = db.data?.groups?.[groupId] || {};
      if (groupData.notifSholat === false) continue;

      try {
        if (sendAudio && isSholatTime) {
          await sock.sendMessage(groupId, {
            audio: { url: AUDIO_ADZAN },
            mimetype: "audio/mpeg",
            ptt: false,
            contextInfo: {
              ...saluranCtx(),
              forwardedNewsletterMessageInfo: {
                newsletterJid: saluranId,
                newsletterName: saluranName,
                serverMessageId: 127,
              },
            },
          });
        } else {
          await sock.sendMessage(groupId, {
            text: message,
            contextInfo: {
              ...saluranCtx(),
              forwardedNewsletterMessageInfo: {
                newsletterJid: saluranId,
                newsletterName: saluranName,
                serverMessageId: 127,
              },
            },
          });
        }

        if (closeGroup && isSholatTime) {
          try {
            await sock.groupSettingUpdate(groupId, "announcement");
            closedGroups.push(groupId);
          } catch (e) {
            logger.error(
              "SholatScheduler",
              `Failed to close ${groupId}: ${e.message}`,
            );
          }
        }

        sentCount++;
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        logger.error(
          "SholatScheduler",
          `Failed to send to ${groupId}: ${err.message}`,
        );
      }
    }

    if (closeGroup && closedGroups.length > 0) {
      setTimeout(
        async () => {
          for (const groupId of closedGroups) {
            try {
              await sock.groupSettingUpdate(groupId, "not_announcement");
              await sock.sendMessage(groupId, {
                text: `✅ Grupo reabierto después de la oración ${sholat}.\n\n> Que nuestra oración sea aceptada. Amén 🤲`,
                contextInfo: {
                  forwardingScore: 9999,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid: saluranId,
                    newsletterName: saluranName,
                    serverMessageId: 127,
                  },
                },
              });
              await new Promise((r) => setTimeout(r, 600));
            } catch (e) {
              logger.error(
                "SholatScheduler",
                `Failed to open ${groupId}: ${e.message}`,
              );
            }
          }
          logger.info(
            "SholatScheduler",
            `Opened ${closedGroups.length} groups after ${sholat}`,
          );
        },
        duration * 60 * 1000,
      );
    }

    if (sentCount > 0) {
      logger.info(
        "SholatScheduler",
        `Sent ${sholat} notification to ${sentCount} groups` +
          (closedGroups.length > 0 ? ` (${closedGroups.length} closed)` : ""),
      );
    }
  } catch (error) {
    logger.error("SholatScheduler", `Error: ${error.message}`);
  }
}

function initSholatScheduler(socketInstance) {
  sock = socketInstance;

  if (dailyRefreshJob) dailyRefreshJob.stop();

  dailyRefreshJob = new CronJob(
    "1 0 * * *",
    async () => {
      cachedSchedule = null;
      await schedulePrayerTimes();
    },
    null,
    true,
    TZ,
  );

  schedulePrayerTimes();
  logger.info(
    "SholatScheduler",
    "Prayer time scheduler started (CronJob, precise per-prayer)",
  );
}

function stopSholatScheduler() {
  clearSholatCronJobs();
  if (dailyRefreshJob) {
    dailyRefreshJob.stop();
    dailyRefreshJob = null;
  }
  logger.info("SholatScheduler", "Prayer time scheduler stopped");
}

export {
  initSholatScheduler,
  stopSholatScheduler,
  SHOLAT_MESSAGES,
  GAMBAR_SUASANA,
  AUDIO_ADZAN,
};
