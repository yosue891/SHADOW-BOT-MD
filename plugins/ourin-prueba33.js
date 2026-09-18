/**
 * Plugin: prueba33 — Tarjeta de estado/progreso del bot ("holaaa bandaaa xd")
 * ----------------------------------------------------------------------
 * Réplica del mensaje rich exportado (GenAIBotProgressStatusPrimitive) con
 * el texto cambiado a "holaaa bandaaa xd" (en el title y en el submessage).
 *
 * DIFERENCIAS con el original (lecciones de los plugins anteriores):
 *   - Se ELIMINA la metadata del bot IA ajeno: messageContextInfo.botMetadata
 *     (botResponseId + verificationMetadata con firma KAYZI) y
 *     senderKeyDistributionMessage (es de OTRO grupo/sesión — Baileys
 *     inyecta el de tu sesión/grupo automáticamente). Esa metadata ajena
 *     era lo que hacía degradar el mensaje a texto en WhatsApp.
 *   - botJid "0@bot" + forwardOrigin 4 (receta que ya renderiza).
 *   - El primitive se conserva tal cual: GenAIBotProgressStatusPrimitive con
 *     is_in_progress: true (la tarjeta muestra el "escribiendo/analizando"
 *     del bot IA) y title = "holaaa bandaaa xd".
 */

import te from "../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba33",
  alias: ["p33", "hola", "banda", "progreso"],
  category: "tools",
  description: "Tarjeta de estado del bot: holaaa bandaaa xd (GenAIBotProgressStatusPrimitive)",
  usage: ".prueba33",
  example: ".prueba33",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const STATUS_TEXT = "holaaa bandaaa xd";

/* ── payload rich (receta probada, sin metadata de bot ajeno) ────────── */
function buildStatusPayload() {
  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            { messageType: 2, messageText: STATUS_TEXT },
          ],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                response_id: "status-" + Date.now(),
                sections: [
                  {
                    view_model: {
                      primitive: {
                        icon: null,
                        is_in_progress: true,
                        meta_search_apps: null,
                        target_secondary_screen_id: null,
                        target_secondary_screen_tab_id: null,
                        title: STATUS_TEXT,
                        __typename: "GenAIBotProgressStatusPrimitive",
                      },
                      __typename: "GenAISingleLayoutViewModel",
                    },
                  },
                ],
              }),
            ).toString("base64"),
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: "0@bot" },
            forwardOrigin: 4,
          },
        },
      },
    },
  };
}

/* ── handler ── */
async function handler(m, { sock }) {
  await m.react("🕒").catch(() => {});

  try {
    await sock.relayMessage(m.chat, buildStatusPayload(), {});
  } catch (error) {
    console.error("[prueba33] envío falló:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }

  await m.react("✅").catch(() => {});
  console.log("[prueba33] tarjeta de estado enviada: " + STATUS_TEXT);
}

export { pluginConfig as config, handler, buildStatusPayload };
