/**
 * Plugin: prueba34 — Mensaje interactivo con botón de reserva (booking)
 * ----------------------------------------------------------------------
 * Réplica EXACTA del mensaje exportado: interactiveMessage con
 * nativeFlowMessage y un botón "booking_confirmation" (reserva de
 * videollamada de WhatsApp con fecha, lugar, teléfono y enlaces).
 *
 * Se envía por sock.relayMessage con los MISMOS additionalNodes del menú
 * interactivo de prueba24 (tag biz + interactive native_flow v9) — es el
 * camino que ya renderiza los botones nativos en tu WhatsApp. Sin metadata
 * de bot ajeno (el export no traía verificationMetadata; contextInfo vacío).
 *
 * Comando: >prueba34
 */

import te from "../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba34",
  alias: ["p34", "booking", "reserva", "videollamada"],
  category: "tools",
  description: "Mensaje interactivo con botón nativo de reserva de videollamada (booking_confirmation)",
  usage: ".prueba34",
  example: ".prueba34",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const RELAY_TIMEOUT_MS = 25000;

function randomHex(bytes) {
  const b = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) b[i] = Math.floor(Math.random() * 256);
  return b.toString("hex");
}

/* Nodos del menú interactivo (prueba24) — hacen que WhatsApp renderice el
 * botón nativo dentro del mensaje interactivo. */
function buildAdditionalNodes() {
  return [
    {
      tag: "biz",
      attrs: {
        actual_actors: "2",
        host_storage: "2",
        privacy_mode_ts: String(Math.floor(Date.now() / 1000)),
      },
      content: [
        {
          tag: "interactive",
          attrs: { type: "native_flow", v: "1" },
          content: [
            { tag: "native_flow", attrs: { v: "9", name: "mixed" } },
          ],
        },
        {
          tag: "quality_control",
          attrs: {
            decision_id: randomHex(16),
            source_type: "third_party",
          },
          content: [{ tag: "decision_source", attrs: { value: "df" } }],
        },
      ],
    },
  ];
}

/* Payload EXACTO del mensaje exportado (interactiveMessage + botón booking) */
function buildBookingPayload() {
  return {
    interactiveMessage: {
      header: { title: "Texto" },
      body: { text: "" },
      footer: { text: "" },
      nativeFlowMessage: {
        buttons: [
          {
            name: "booking_confirmation",
            buttonParamsJson: JSON.stringify({
              icon: "default",
              start_datetime: "2026-06-06T10:11:42.060Z",
              end_datetime: "2026-06-06T10:21:42.060Z",
              location: "30 dic. 2030, 12:00 p.m.",
              booking_url: "https://call.whatsapp.com/video/KfDnOW3dGnChkiQBLQOGHO",
              phone_number: "51900373696",
              booking_management_url: "https://wa.me/51900373696",
              description: "Descripción: null",
              email: "soporte@icom",
              display_text: "Ver detalles",
              display_content: {
                display_language: "es",
                display_meeting_type: "Videollamada de WhatsApp",
                display_bottom_sheet_header: "Detalles de la reserva",
                display_view_on_maps_cta_text: "Ver en Maps",
                display_manage_booking_cta_text: "Administrar la reserva",
              },
            }),
          },
        ],
        messageParamsJson: "{}",
      },
      contextInfo: {},
    },
  };
}

/* ── handler ── */
async function handler(m, { sock }) {
  await m.react("🕒").catch(() => {});

  const messageId = randomHex(16).toUpperCase(); // 32 hex
  const payload = buildBookingPayload();

  try {
    await Promise.race([
      sock.relayMessage(m.chat, payload, {
        messageId,
        additionalNodes: buildAdditionalNodes(),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("relayMessage timeout")), RELAY_TIMEOUT_MS),
      ),
    ]);
  } catch (error) {
    console.error("[prueba34] envío del mensaje interactivo falló:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }

  await m.react("✅").catch(() => {});
  console.log("[prueba34] mensaje interactivo (botón booking) enviado correctamente");
}

export { pluginConfig as config, handler, buildBookingPayload, buildAdditionalNodes };
