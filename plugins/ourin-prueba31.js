/**
 * Plugin: prueba31 — Encuesta "Abro el grupo?" (pollCreationMessageV6)
 * ----------------------------------------------------------------------
 * El export (conn.relayMessage + pollCreationMessageV6 + messageSecret) es
 * la forma CORRECTA en WhatsApp actual. Un intento anterior usaba
 * sock.sendMessage({ poll: ... }), que la librería (ourin-baileys) convierte
 * a pollCreationMessageV1/V3 (formato antiguo): la librería no falla ni
 * lanza error, PERO WhatsApp ignora el mensaje (por eso el bot reaccionaba
 * ✅ y no llegaba nada).
 *
 * Solución: relayMessage DIRECTO con pollCreationMessageV6 (campo 119, que
 * el proto de la librería sí contiene) + messageContextInfo.messageSecret
 * POR MENSAJE (randomBytes(32), igual que hace la propia librería para los
 * demás tipos de mensaje — el secret del export es de otra sesión) +
 * additionalNodes meta polltype:creation (obligatorio para que el servidor
 * lo trate como creación de encuesta).
 *
 *   Pregunta: "Abro el grupo?"
 *   Opciones: Síii · Noo · Dame a maycol y ado 🗣️🗣️ (una selección)
 */

import te from "../../src/lib/ourin-error.js";
import { randomBytes } from "node:crypto";

const pluginConfig = {
  name: "prueba31",
  alias: ["p31", "abrirgrupo", "encuesta"],
  category: "tools",
  description: "Encuesta nativa: ¿Abro el grupo? (Síii / Noo / Dame a maycol y ado 🗣️🗣️)",
  usage: ".prueba31",
  example: ".prueba31",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const POLL_NAME = "Abro el grupo?";
const POLL_VALUES = ["Síii", "Noo", "Dame a maycol y ado 🗣️🗣️"];

/* Mensaje de creación de encuesta V6 — estructura EXACTA del export */
function buildPollCreationMessage() {
  return {
    messageContextInfo: {
      messageSecret: randomBytes(32), // 32 bytes frescos por mensaje
    },
    pollCreationMessageV6: {
      name: POLL_NAME,
      selectableOptionsCount: 0, // 0 = una sola opción seleccionable
      options: POLL_VALUES.map((optionName) => ({ optionName })),
      contextInfo: {
        expiration: 7776000,
        disappearingMode: { initiator: 0, trigger: 0 },
      },
      hideParticipantName: true,
    },
  };
}

/* ── handler ── */
async function handler(m, { sock }) {
  await m.react("🕒").catch(() => {});

  try {
    await sock.relayMessage(m.chat, buildPollCreationMessage(), {
      additionalNodes: [{ tag: "meta", attrs: { polltype: "creation" } }],
    });
  } catch (error) {
    console.error("[prueba31] relayMessage V6 falló:", error?.message || error);
    // último recurso: sendMessage (V1/V3 de la librería)
    try {
      await sock.sendMessage(m.chat, {
        poll: { name: POLL_NAME, values: POLL_VALUES, selectableCount: 1 },
      });
    } catch (e2) {
      console.error("[prueba31] fallback sendMessage falló:", e2?.message || e2);
      await m.react("☢").catch(() => {});
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }

  await m.react("✅").catch(() => {});
  console.log("[prueba31] encuesta V6 enviada: " + POLL_NAME + " | opciones: " + POLL_VALUES.join(" / "));
}

export { pluginConfig as config, handler, buildPollCreationMessage };
