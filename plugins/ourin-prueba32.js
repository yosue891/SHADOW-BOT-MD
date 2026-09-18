/**
 * Plugin: prueba32 — Extractor de estructura de mensajes (code-extractor)
 * ----------------------------------------------------------------------
 * Adaptación en español del plugin "code-extractor.js" (Raiden Shogunv2).
 *
 * ¿Qué hace? Respóndele (cita) a CUALQUIER mensaje —un comando, una tarjeta,
 * una encuesta, un audio...— y devuelve:
 *   1) El mensaje citado reenviado tal cual (para verlo de nuevo), y
 *   2) Su ESTRUCTURA COMPLETA serializada como código JavaScript, lista para
 *      copiar y replicar en cualquier bot (igual que los mensajes exportados
 *      de los ZIPs que ya montamos).
 *
 * Cambios respecto al original:
 *   - Traducido al español (mensajes, comentarios, errores).
 *   - Sin highlight.js: mini-resaltador propio (0 dependencias nuevas).
 *   - Sin newsletters ajenas ni core/theme: errores vía m.reply.
 *   - Adaptado al framework del bot: pluginConfig, sock (no conn), te().
 *   - Receta ready del bot para mensajes AI-rich: botJid "0@bot", sin
 *     messageContextInfo/botMetadata (los campos del bot ajeno hacían que
 *     WhatsApp degradara el mensaje a texto).
 */

import { proto, generateWAMessageFromContent, generateMessageID } from "ourin";
import te from "../../src/lib/ourin-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "prueba32",
  alias: ["p32", "estructura", "extract", "codeextract"],
  category: "tools",
  description: "Extrae la estructura de un mensaje citado y la muestra como código replicable",
  usage: ".prueba32 <responde a un mensaje>",
  example: ">prueba32 (respondiendo a un mensaje)",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const BOT_NAME = config.bot?.name || "Kana-Assistant";

/* ── mini-resaltador de JS (sustituye a highlight.js) ───────────────── */
const KEYWORDS =
  "break|case|catch|class|const|continue|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield|async|await";

const TOKEN_RE = new RegExp(
  `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)` + // 1: comentario (5)
    `|(\`(?:\\\\.|[^\\\\\`])*\`|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')` + // 2: string (3)
    `|\\b(${KEYWORDS})\\b` + // 3: palabra clave (1)
    `|(\\b\\d+(?:\\.\\d+)?\\b)` + // 4: número (2)
    `|([A-Za-z_$][\\w$]*(?=\\s*:))`, // 5: atributo/clave de objeto (4)
  "g",
);

const TYPE_MAP = { 1: 1, 2: 3, 3: 1, 4: 2, 5: 4 }; // grupo → highlightType

function hljsToWhatsApp(code) {
  const result = [];
  TOKEN_RE.lastIndex = 0;
  let lastIndex = 0;
  let match;

  const pushPlain = (text) => {
    text
      .split(/(\s+|\.|\(|\)|\{|\}|,|:)/g)
      .filter(Boolean)
      .forEach((part) =>
        result.push({ highlightType: 0, codeContent: part }),
      );
  };

  while ((match = TOKEN_RE.exec(code)) !== null) {
    if (match.index > lastIndex) {
      pushPlain(code.slice(lastIndex, match.index));
    }
    const group = match.slice(1).findIndex((g) => g !== undefined) + 1;
    result.push({
      highlightType: TYPE_MAP[group] ?? 0,
      codeContent: match[0],
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) pushPlain(code.slice(lastIndex));
  return result;
}

/* ── obtener el mensaje citado (robusto) ────────────────────────────── */
function getQuotedMessage(m) {
  // m.quoted.message => protobuf crudo (el serializador del bot ya lo arma)
  if (m.quoted?.message) return m.quoted.message;
  if (m.quoted?.vM?.message) return m.quoted.vM.message;
  // último recurso: quotedMessage dentro del propio mensaje
  const firstKey = Object.keys(m.message || {})[0];
  return m.message?.[firstKey]?.contextInfo?.quotedMessage || null;
}

/* ── payload del mensaje rich con el código ─────────────────────────── */
function buildStructurePayload(messageCode, quotedMessage, participant = null) {
  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            { messageType: 2, messageText: "📦 *Código extraído:*" },
            {
              messageType: 5,
              codeMetadata: {
                codeLanguage: "javascript",
                codeBlocks: hljsToWhatsApp(messageCode),
              },
            },
            { messageType: 2, messageText: `> ${BOT_NAME}` },
          ],
          contextInfo: {
            forwardingScore: 2,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: "0@bot" },
            forwardOrigin: 4,
            quotedMessage,
            participant,
          },
        },
      },
    },
  };
}

/* ── handler ── */
async function handler(m, { sock }) {
  await m.react("⚙️").catch(() => {});

  if (!m.quoted) {
    await m.reply(
      `❌ *Uso incorrecto*\n\n> Responde (cita) a un mensaje y te mostraré su estructura.\n> Ejemplo: \`${m.prefix || ">"}prueba32\` respondiendo a un comando/tarjeta/encuesta.`,
    );
    return;
  }

  let message = getQuotedMessage(m);
  if (!message) {
    await m.reply(
      "❌ *No se encontró*\n\n> No pude obtener la estructura del mensaje citado.",
    );
    return;
  }

  try {
    /* 1) reenviar el mensaje citado tal cual */
    await sock.relayMessage(m.chat, proto.Message.fromObject(message), {});

    /* 2) serializar su estructura como código */
    const messageCode = JSON.stringify(
      proto.Message.toObject(proto.Message.fromObject(message), {
        enums: Number,
        longs: String,
        bytes: String,
        defaults: false,
        arrays: true,
        objects: true,
        oneofs: true,
      }),
      null,
      2,
    ).replace(/^(\s*)"([A-Za-z_$][A-Za-z0-9_$]*)":/gm, "$1$2:");

    const fullCode = `
> try {
  await conn.relayMessage(
    m.chat,
    ${messageCode},
    {}
  );

  await conn.sendMessage(m.chat, {
    react: {
      text: "✅",
      key: m.key
    }
  });
} catch (e) {
  await m.reply(String(e.stack || e));
}
`.trim();

    /* 3) mensaje rich con el código (receta del bot: botJid 0@bot) */
    const payload = proto.Message.fromObject(
      buildStructurePayload(
        fullCode,
        m.message || undefined,
        m.sender || m.key?.participant || m.chat,
      ),
    );
    const msg = generateWAMessageFromContent(m.chat, payload, {
      userJid: m.sender,
      messageId: generateMessageID(),
    });
    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });

    await m.react("✅").catch(() => {});
  } catch (e) {
    console.error("[prueba32] error:", e?.message || e);
    await m.react("❌").catch(() => {});
    await m.reply(`❌ *Error*\n\n> ${String(e?.stack || e)}`);
  }
}

export { pluginConfig as config, handler, buildStructurePayload, hljsToWhatsApp };
