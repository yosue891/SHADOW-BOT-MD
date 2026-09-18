import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import config from "../../config.js";
import { saluranCtx } from "./ourin-context.js";
import {
  delay,
  DisconnectReason,
  jidNormalizedUser,
  useMultiFileAuthState,
} from "ourin";
import { logger } from "./ourin-logger.js";
import { addJadibotOwner } from "./ourin-jadibot-database.js";
import { extendSocket } from "./ourin-socket.js";
import { getAssetBuffer } from "./ourin-asset-manager.js";
const JADIBOT_AUTH_FOLDER = path.join(process.cwd(), "session", "jadibot");

const jadibotSessions = new Map();
const reconnectAttempts = new Map();
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_INTERVAL = 5000;

if (!fs.existsSync(JADIBOT_AUTH_FOLDER)) {
  fs.mkdirSync(JADIBOT_AUTH_FOLDER, { recursive: true });
}

function cleanNumber(value = "") {
  return String(value || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function getMainBotNumber(sock) {
  return cleanNumber(sock?.user?.id || sock?.user?.jid || sock?.authState?.creds?.me?.id || "");
}

function isMainBotNumber(sock, jidOrNumber) {
  const target = cleanNumber(jidOrNumber);
  const mainNumber = getMainBotNumber(sock);
  const configuredNumber = cleanNumber(config.session?.pairingNumber || "");
  return Boolean(
    target &&
      ((mainNumber && target === mainNumber) ||
        (configuredNumber && target === configuredNumber))
  );
}

function removeDangerousJadibotSession(sessionId) {
  const authPath = getJadibotAuthPath(`${cleanNumber(sessionId)}@s.whatsapp.net`);
  try {
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
  } catch {}
}

function getJadibotAuthPath(jid) {
  const id = jid.replace(/@.+/g, "");
  return path.join(JADIBOT_AUTH_FOLDER, id);
}

function isJadibotActive(jid) {
  const id = jid.replace(/@.+/g, "");
  return jadibotSessions.has(id);
}

function getActiveJadibots() {
  return Array.from(jadibotSessions.entries()).map(([id, data]) => ({
    id,
    jid: id + "@s.whatsapp.net",
    ...data,
  }));
}

function getAllJadibotSessions() {
  const sessions = [];
  if (!fs.existsSync(JADIBOT_AUTH_FOLDER)) return sessions;

  const dirs = fs.readdirSync(JADIBOT_AUTH_FOLDER);
  for (const dir of dirs) {
    const credsPath = path.join(JADIBOT_AUTH_FOLDER, dir, "creds.json");
    if (fs.existsSync(credsPath)) {
      sessions.push({
        id: dir,
        jid: dir + "@s.whatsapp.net",
        isActive: jadibotSessions.has(dir),
        credsPath,
      });
    }
  }
  return sessions;
}

function createJadibotStore() {
  return {
    messages: new Map(),
    chats: new Map(),
    contacts: {},
    bind(ev) {
      ev.on("messages.upsert", ({ messages }) => {
        for (const msg of messages || []) {
          const jid = msg.key?.remoteJid;
          if (!jid) continue;
          if (!this.messages.has(jid)) this.messages.set(jid, new Map());
          const chat = this.messages.get(jid);
          if (msg.key?.id) {
            chat.set(msg.key.id, msg);
            if (chat.size > 200) {
              const keys = [...chat.keys()];
              for (let i = 0; i < keys.length - 150; i++) chat.delete(keys[i]);
            }
          }
          if (!this.chats.has(jid)) {
            this.chats.set(jid, { id: jid });
          }
          if (msg.pushName && jid.endsWith("@s.whatsapp.net")) {
            this.contacts[jid] = {
              ...this.contacts[jid],
              notify: msg.pushName,
            };
          }
        }
      });
      ev.on("chats.upsert", (chats) => {
        for (const chat of chats || []) {
          if (chat.id) this.chats.set(chat.id, chat);
        }
      });
      ev.on("contacts.upsert", (contacts) => {
        for (const contact of contacts || []) {
          if (contact.id) {
            this.contacts[contact.id] = {
              ...this.contacts[contact.id],
              ...contact,
            };
          }
        }
      });
    },
    async loadMessage(jid, id) {
      return this.messages.get(jid)?.get(id) || undefined;
    },
  };
}

const rateLimit = new Map();

const ERROR_MESSAGES = {
  401: {
    reason: "Número no registrado en WhatsApp",
    action: "Asegúrate de que este número esté activo en WhatsApp",
    fatal: true,
  },
  403: {
    reason: "Acceso denegado/baneado",
    action: "Este número puede estar baneado por WhatsApp",
    fatal: true,
  },
  405: {
    reason: "Método no permitido",
    action: "Intenta de nuevo más tarde",
    fatal: true,
  },
  406: {
    reason: "Número restringido",
    action: "Este número está restringido por WhatsApp, espera unas horas",
    fatal: true,
  },
  408: {
    reason: "Tiempo de solicitud agotado",
    action: "Conexión lenta, se intentará reconectar",
    fatal: false,
  },
  409: {
    reason: "Conflicto de sesión",
    action: "La sesión está siendo usada en otro dispositivo",
    fatal: true,
  },
  411: {
    reason: "Autenticación fallida",
    action: "Necesita escanear QR/pairing nuevamente",
    fatal: true,
  },
  428: {
    reason: "Límite de velocidad",
    action: "Demasiadas solicitudes, espera unos minutos",
    fatal: true,
  },
  440: {
    reason: "Se requiere inicio de sesión",
    action: "Sesión expirada, necesitas iniciar sesión nuevamente",
    fatal: true,
  },
  500: {
    reason: "Error del servidor de WhatsApp",
    action: "El servidor de WhatsApp tiene problemas",
    fatal: false,
  },
  501: {
    reason: "No implementado",
    action: "Característica aún no soportada",
    fatal: true,
  },
  503: {
    reason: "Servicio no disponible",
    action: "WhatsApp está en mantenimiento",
    fatal: false,
  },
  515: {
    reason: "Error de transmisión",
    action: "Se intentará reconectar",
    fatal: false,
  },
};

const CONNECTION_CLOSED_REASONS = [
  {
    match: /Connection Closed/i,
    reason: "Conexión cerrada",
    action: "Posiblemente el número esté baneado o haya problemas de red",
    fatal: true,
  },
  {
    match: /write EOF/i,
    reason: "Conexión interrumpida",
    action: "Problema de red, se intentará reconectar",
    fatal: false,
  },
  {
    match: /ECONNRESET/i,
    reason: "Reinicio de conexión",
    action: "Red inestable",
    fatal: false,
  },
  {
    match: /ETIMEDOUT/i,
    reason: "Tiempo de espera agotado",
    action: "Conexión lenta",
    fatal: false,
  },
  {
    match: /logged out/i,
    reason: "Sesión cerrada",
    action: "Cuenta desconectada del dispositivo",
    fatal: true,
  },
  {
    match: /replaced/i,
    reason: "Sesión reemplazada",
    action: "Inicio de sesión en otro dispositivo",
    fatal: true,
  },
  {
    match: /Multidevice mismatch/i,
    reason: "Sesión no válida",
    action: "Necesita escanear nuevamente",
    fatal: true,
  },
  {
    match: /restart required/i,
    reason: "Reinicio necesario",
    action: "Se reiniciará automáticamente",
    fatal: false,
  },
  {
    match: /bad session/i,
    reason: "Sesión dañada",
    action: "Necesita escanear nuevamente",
    fatal: true,
  },
];

function parseDisconnectError(lastDisconnect) {
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const errorMessage = lastDisconnect?.error?.message || "Unknown error";

  if (statusCode && ERROR_MESSAGES[statusCode]) {
    return {
      ...ERROR_MESSAGES[statusCode],
      code: statusCode,
      message: errorMessage,
    };
  }

  for (const pattern of CONNECTION_CLOSED_REASONS) {
    if (pattern.match.test(errorMessage)) {
      return {
        code: statusCode || "N/A",
        reason: pattern.reason,
        action: pattern.action,
        fatal: pattern.fatal,
        message: errorMessage,
      };
    }
  }

  return {
    code: statusCode || "N/A",
    reason: "Error desconocido",
    action: "Contacta al administrador si persiste",
    fatal: false,
    message: errorMessage,
  };
}

function isSocketAlive(sock) {
  try {
    if (!sock) return false;
    if (sock.ws && sock.ws.readyState === 1) return true;
    if (sock.user?.id) return true;
    return false;
  } catch {
    return false;
  }
}

async function safeSend(sock, jid, content, options = {}) {
  try {
    if (!jid) return null;
    if (!isSocketAlive(sock)) return null;
    return await sock.sendMessage(jid, content, options);
  } catch {
    return null;
  }
}

async function startJadibot(sock, m, userJid, usePairing = true) {
  if (
    !userJid ||
    typeof userJid !== "string" ||
    !userJid.includes("@s.whatsapp.net")
  ) {
throw new Error("JID de usuario no válido");
  }

  const id = userJid.replace(/@.+/g, "");

  if (isMainBotNumber(sock, userJid)) {
    throw new Error(
      "No se puede vincular el número del bot principal como subbot. Usa otro número de WhatsApp.",
    );
  }

  if (usePairing) {
    const lastAttempt = rateLimit.get(id) || 0;
    if (Date.now() - lastAttempt < 60000) {
      throw new Error("Espere 1 minuto antes de intentar de nuevo.");
    }
    rateLimit.set(id, Date.now());
  }

  const authPath = getJadibotAuthPath(userJid);

  if (jadibotSessions.has(id)) {
    throw new Error("¡Jadibot ya está activo para este número!");
  }

  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const {
    default: makeWASocket,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
  } = await import("ourin");
  const { version } = await fetchLatestBaileysVersion();
  const pinoModule = await import("pino");
  const pinoLogger = pinoModule.default({ level: "silent" });
  const childStore = createJadibotStore();
  const groupMetadataCache = new Map();

  const childSock = makeWASocket({
    version,
    logger: pinoLogger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pinoLogger),
    },
    browser: ["Ubuntu", "Chrome", "20.0.0"],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    defaultQueryTimeoutMs: 20000,
    connectTimeoutMs: 20000,
    keepAliveIntervalMs: 10000,
    retryRequestDelayMs: 150,
    getMessage: async (key) => {
      return (await childStore.loadMessage(key.remoteJid, key.id))?.message;
    },
    cachedGroupMetadata: async (jid) => {
      const cached = groupMetadataCache.get(jid);
      if (cached) return cached;
      try {
        const fresh = await childSock.groupMetadata(jid);
        groupMetadataCache.set(jid, fresh);
        return fresh;
      } catch {
        return undefined;
      }
    },
    fireInitQueries: true,
    emitOwnEvents: true,
    shouldSyncHistoryMessage: () => false,
    transactionOpts: { maxCommitRetries: 5, delayBetweenTriesMs: 500 },
  });

  childStore.bind(childSock.ev);
  childSock.store = childStore;
  await extendSocket(childSock);

  let qrCount = 0;
  let lastQRMsg = null;
  let pairingCode = null;
  let heartbeatInterval = null;

  childSock.ev.on("creds.update", saveCreds);

  childSock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairing) {
      qrCount++;
      if (qrCount > 3) {
        await safeSend(sock, m?.chat, {
          text: "❌ ¡Código QR expirado! Por favor, inténtalo de nuevo.",
        });
        if (lastQRMsg?.key) {
          await safeSend(sock, m?.chat, { delete: lastQRMsg.key });
        }
        jadibotSessions.delete(id);
        reconnectAttempts.delete(id);
        try {
          childSock.ws.close();
        } catch {}
        return;
      }

      try {
        const qrBuffer = await QRCode.toBuffer(qr, {
          scale: 8,
          margin: 4,
          width: 256,
          color: { dark: "#000000ff", light: "#ffffffff" },
        });

        if (lastQRMsg?.key) {
          await safeSend(sock, m?.chat, { delete: lastQRMsg.key });
        }

        if (!m?.chat) return;
        lastQRMsg = await sock.sendMessage(
          m.chat,
          {
            image: qrBuffer,
            caption:
              `🤖 *ᴊᴀᴅɪʙᴏᴛ — Qʀ ᴄᴏᴅᴇ*\n\n` +
              `Escanea este código QR para convertirte en bot.\n\n` +
              `> ⏱️ Expira en 20 segundos\n` +
              `> 📊 Conteo QR: ${qrCount}/3`,
          },
          { quoted: m },
        );
      } catch (e) {
        logger.error("Jadibot", "Error al enviar QR: " + e.message);
      }
    }

    if (connection === "open") {
      const childNumber = cleanNumber(childSock.user?.id || childSock.user?.jid || userJid);
      if (isMainBotNumber(sock, childNumber)) {
        logger.error(
          "Jadibot",
          `Bloqueado: el subbot ${childNumber} coincide con el bot principal`,
        );
        try {
          childSock.ev.removeAllListeners();
          childSock.ws?.close?.();
          childSock.end?.();
        } catch {}
        jadibotSessions.delete(id);
        reconnectAttempts.delete(id);
        removeDangerousJadibotSession(childNumber || id);
        await safeSend(sock, m?.chat, {
          text:
            `🚫 *JadiBot bloqueado*

` +
            `> No puedes convertir el número del bot principal en subbot.
` +
            `> Usa un número diferente para evitar conflictos/restricciones de sesión.`,
        });
        return;
      }

      logger.info("Jadibot", `Connected: ${id}`);

      reconnectAttempts.delete(id);

      jadibotSessions.set(id, {
        sock: childSock,
        jid: childSock.user?.jid || userJid,
        startedAt: Date.now(),
        ownerJid: m?.sender || userJid,
        status: "connected",
        connectionReady: true,
        pendingMessages: [],
      });

      heartbeatInterval = setInterval(() => {
        try {
          if (!isSocketAlive(childSock)) {
            clearInterval(heartbeatInterval);
          }
        } catch {}
      }, 30000);

      const session = jadibotSessions.get(id);
      if (session) {
        session.heartbeatInterval = heartbeatInterval;
      }

      childSock.sendPresenceUpdate("available").catch(() => {});

      addJadibotOwner(id, m?.sender || userJid);


      if (m?.chat) {
        sock
          .sendMessage(m.chat, {
            text:
              `✅ *ᴊᴀᴅɪʙᴏᴛ ᴛᴇʀʜᴜʙᴜɴɢ*\n\n` +
              `> 📱 Número: *@${id}*\n` +
              `> 🟢 Estado: *En línea*\n` +
              `> ⏱️ Inicio: *${new Date().toLocaleTimeString("id-ID")}*\n\n` +
              `¡Tu bot está activo y listo para recibir comandos!\n\n` +
              `> ℹ️ Escribe \`${m.prefix || "."}stopjadibot\` para detenerlo`,
            mentions: [userJid],
          })
          .catch((e) => {
            logger.error(
              "Jadibot",
              `Error al enviar notificación de conexión: ${e.message}`,
            );
          });
      }

      if (lastQRMsg?.key && m?.chat) {
        safeSend(sock, m.chat, { delete: lastQRMsg.key }).catch(() => {});
      }
    }

    if (connection === "close") {
      const errorInfo = parseDisconnectError(lastDisconnect);

      logger.info(
        "Jadibot",
        `Disconnected: ${id}, code: ${errorInfo.code}, reason: ${errorInfo.reason}`,
      );

      const session = jadibotSessions.get(id);
      if (session?.heartbeatInterval) {
        clearInterval(session.heartbeatInterval);
      }

      const attempts = reconnectAttempts.get(id) || 0;

      if (errorInfo.fatal || attempts >= MAX_RECONNECT_ATTEMPTS) {
        jadibotSessions.delete(id);
        reconnectAttempts.delete(id);

        if (errorInfo.fatal) {
          try {
            if (fs.existsSync(authPath)) {
              fs.rmSync(authPath, { recursive: true, force: true });
            }
          } catch {}
        }

        let statusEmoji = "❌";
        if (errorInfo.code === 403 || errorInfo.reason?.includes("banned")) {
          statusEmoji = "🚫";
        } else if (
          errorInfo.code === 406 ||
          errorInfo.reason?.includes("dibatasi")
        ) {
          statusEmoji = "⚠️";
        }

        await safeSend(sock, m?.chat, {
          text:
            `${statusEmoji} *ᴊᴀᴅɪʙᴏᴛ ᴅɪsᴄᴏɴɴᴇᴄᴛᴇᴅ*\n\n` +
            `> 📱 Número: *@${id}*\n` +
            `> 🔢 Código: \`${errorInfo.code}\`\n` +
            `> 📋 Razón: *${errorInfo.reason}*\n` +
            `> ℹ️ ${errorInfo.action}\n\n` +
            (errorInfo.fatal
              ? `> ⚠️ Sesión eliminada. Usa \`.jadibot\` para volver a empezar.`
              : ""),
          mentions: [userJid],
        });
      } else {
        reconnectAttempts.set(id, attempts + 1);

        await safeSend(sock, m?.chat, {
          text:
            `🔄 *ᴊᴀᴅɪʙᴏᴛ ʀᴇᴄᴏɴɴᴇᴄᴛɪɴɢ...*\n\n` +
            `> 📱 Número: *@${id}*\n` +
            `> 📋 Razón: *${errorInfo.reason}*\n` +
            `> 🔁 Intento: *${attempts + 1}/${MAX_RECONNECT_ATTEMPTS}*\n\n` +
            `> Reconectando en ${RECONNECT_INTERVAL / 1000} segundos...`,
          mentions: [userJid],
        });

        setTimeout(() => {
          startJadibot(sock, m, userJid, false).catch((e) => {
            logger.error("Jadibot", `Reconnect failed for ${id}: ${e.message}`);
            jadibotSessions.delete(id);
            reconnectAttempts.delete(id);
          });
        }, RECONNECT_INTERVAL);
      }
    }
  });

  const processedMessages = new Map();

  childSock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (!childSock.user || !childSock.user.id) {
      childSock.user = {
        id: jidNormalizedUser(id),
        name: "Jadibot",
      };
    }

    if (type !== "notify" && type !== "append") return;

    for (const msg of messages) {
      if (!msg.message) continue;

      const msgId = msg.key?.id;
      if (msgId && processedMessages.has(msgId)) continue;
      if (msgId) processedMessages.set(msgId, Date.now());

      if (msg.key && msg.key.remoteJid === "status@broadcast") continue;

      const msgTimestamp = msg.messageTimestamp
        ? Number(msg.messageTimestamp) * 1000
        : Date.now();
      const msgAge = Date.now() - msgTimestamp;
      if (msgAge > 60 * 60 * 1000) continue;

      const metadataKeys = [
        "senderKeyDistributionMessage",
        "messageContextInfo",
      ];
      const msgType =
        Object.keys(msg.message).find((k) => !metadataKeys.includes(k)) ||
        Object.keys(msg.message)[0];
      const ignoredTypes = [
        "protocolMessage",
        "senderKeyDistributionMessage",
        "reactionMessage",
        "stickerSyncRmrMessage",
        "encReactionMessage",
        "pollUpdateMessage",
        "pollCreationMessage",
        "pollCreationMessageV2",
        "pollCreationMessageV3",
        "keepInChatMessage",
        "deviceSentMessage",
        "call",
        "peerDataOperationRequestMessage",
      ];
      if (ignoredTypes.includes(msgType)) continue;

      if (!isSocketAlive(childSock)) continue;

      const session = jadibotSessions.get(id);
      if (session && !session.connectionReady) {
        session.pendingMessages = session.pendingMessages || [];
        session.pendingMessages.push(msg);
        continue;
      }

      try {
        const { messageHandler } = await import("../handler.js");
        await messageHandler(msg, childSock, {
          isJadibot: true,
          jadibotId: id,
        });
      } catch (e) {
        if (
          e.message?.includes("Connection Closed") ||
          e.message?.includes("428")
        ) {
          logger.info(
            "Jadibot",
            `${id} connection closed during handler, skipping`,
          );
          break;
        }
        logger.error("Jadibot", `Handler error for ${id}: ${e.message}`);
      }
    }

    const fiveMinAgo = Date.now() - 300000;
    for (const [key, time] of processedMessages) {
      if (time < fiveMinAgo) processedMessages.delete(key);
    }
  });

  if (usePairing && !state.creds?.registered) {
    try {
      await delay(3000);
      pairingCode = await childSock.requestPairingCode(id);
      pairingCode = pairingCode.match(/.{1,4}/g)?.join("-") || pairingCode;

      if (m && m.chat) {
        let thumbnail = null;
        try {
          if (!!getAssetBuffer("ourin2")) {
            thumbnail = getAssetBuffer("ourin2");
          }
        } catch {}

        await sock.sendMessage(
          m.chat,
          {
            text:
              `🔗 *ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ*\n\n` +
              `Ingresa el siguiente código en tu WhatsApp:\n\n` +
              `> 📱 *Configuración → Dispositivos vinculados → Vincular un dispositivo*\n\n` +
              `\`\`\`${pairingCode}\`\`\`\n\n` +
              `> 🕕 El código es válido por unos minutos\n` +
              `> ⚠️ No compartas este código con nadie`,
            contextInfo: saluranCtx(),
            interactiveButtons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy Pairing Code",
                  copy_code: pairingCode.replace(/-/g, ""),
                }),
              },
            ],
          },
          { quoted: m },
        );
      } else {
        logger.info("Jadibot", `Pairing Code for ${id}: ${pairingCode}`);
      }
    } catch (e) {
      logger.error("Jadibot", "Error al obtener código de pairing: " + e.message);

      let errorMsg = "Error al obtener código de pairing";
      if (
        e.message?.includes("rate") ||
        e.message?.includes("limit") ||
        e.message?.includes("428")
      ) {
        errorMsg = "¡Límite de velocidad alcanzado! Espere 5-10 minutos.";
      } else if (
        e.message?.includes("banned") ||
        e.message?.includes("blocked")
      ) {
        errorMsg = "El número puede estar bloqueado por WhatsApp.";
      } else if (
        e.message?.includes("Connection Closed") ||
        e.message?.includes("closed")
      ) {
        errorMsg = "Conexión interrumpida. Intente de nuevo.";
      }

      await safeSend(sock, m?.chat, {
        text: `❌ *ᴊᴀᴅɪʙᴏᴛ ᴇʀʀᴏʀ*\n\n> ${errorMsg}`,
      });

      try {
        childSock.end?.();
      } catch {}
      jadibotSessions.delete(id);
      reconnectAttempts.delete(id);
      throw new Error(errorMsg);
    }
  }

  return { sock: childSock, pairingCode };
}

async function stopJadibot(jid, deleteSession = false) {
  const id = jid.replace(/@.+/g, "");
  const session = jadibotSessions.get(id);

  if (session) {
    try {
      if (session.heartbeatInterval) {
        clearInterval(session.heartbeatInterval);
      }
      session.sock.ev.removeAllListeners();
      session.sock.ws?.close?.();
      session.sock.end?.();
    } catch {}
    jadibotSessions.delete(id);
  }

  reconnectAttempts.delete(id);

  if (deleteSession) {
    const authPath = getJadibotAuthPath(jid);
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
    }
  }

  return true;
}

async function stopAllJadibots() {
  const stopped = [];
  for (const [id, session] of jadibotSessions) {
    try {
      if (session.heartbeatInterval) {
        clearInterval(session.heartbeatInterval);
      }
      session.sock.ev.removeAllListeners();
      session.sock.ws?.close?.();
      session.sock.end?.();
    } catch {}
    stopped.push(id);
  }
  jadibotSessions.clear();
  reconnectAttempts.clear();
  return stopped;
}

async function restartJadibotSession(sock, sessionId) {
  const userJid = sessionId + "@s.whatsapp.net";
  try {
    if (isMainBotNumber(sock, sessionId)) {
      logger.warn(
        "Jadibot",
        `Sesión de subbot ignorada porque coincide con el bot principal: ${sessionId}`,
      );
      removeDangerousJadibotSession(sessionId);
      return;
    }

    logger.info("Jadibot", `Restoring session: ${sessionId}`);

    const dbPath = path.join(JADIBOT_AUTH_FOLDER, sessionId, "data.json");
    let ownerJid = userJid;
    try {
      if (fs.existsSync(dbPath)) {
        const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
        if (data.owners?.[0]) ownerJid = data.owners[0] + "@s.whatsapp.net";
      }
    } catch {}

    const mockM = {
      chat: ownerJid,
      sender: ownerJid,
      prefix: ".",
      key: {
        remoteJid: ownerJid,
        fromMe: false,
        id: "restart-" + Date.now(),
      },
      reply: async (text) => {
        await safeSend(sock, ownerJid, { text });
      },
      react: async () => {},
    };
    await startJadibot(sock, mockM, userJid, false);
  } catch (e) {
    logger.error("Jadibot", `Error al restaurar ${sessionId}: ${e.message}`);
  }
}

function getJadibotStatus(jid) {
  const id = jid.replace(/@.+/g, "");
  const session = jadibotSessions.get(id);
  if (!session) return null;

  return {
    id,
    jid: session.jid,
    status: session.status || "unknown",
    startedAt: session.startedAt,
    ownerJid: session.ownerJid,
    uptime: Date.now() - session.startedAt,
  };
}

export {
  JADIBOT_AUTH_FOLDER,
  jadibotSessions,
  getJadibotAuthPath,
  isJadibotActive,
  getActiveJadibots,
  getAllJadibotSessions,
  startJadibot,
  stopJadibot,
  stopAllJadibots,
  restartJadibotSession,
  getJadibotStatus,
  isSocketAlive,
  safeSend,
};
