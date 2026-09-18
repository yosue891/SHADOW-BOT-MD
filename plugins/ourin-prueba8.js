/**
 * Do not remove this watermark.
 *
 * Runtime:
 * - Baileys: @whiskeysockets/baileys (latest)
 *
 * Created by FgsiDev
 * Contributors: Nixel, ~ nebulous, itsliaaa
 *
 * WhatsApp: https://chat.whatsapp.com/CozQeroCVV36SfbtxKfuiM
 * Channel: https://whatsapp.com/channel/0029VapkSr45q08hPPPVqy26
 *
 * Copyright (c) 2026 Fgsi
 *
 * Permission is granted to use and modify this library
 * for personal or commercial projects.
 *
 * Reuploading, reselling, relicensing, or redistributing
 * this library as a standalone product is prohibited.
 *
 * Do not claim this project as your own original work.
 */

"use strict";

import crypto from "crypto";
import { generateWAMessageFromContent } from "ourin";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import te from "../../src/lib/ourin-error.js";

class A2UI {
  constructor({ catalogId = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json", version = "v0.9" } = {}) {
    this._version = version;
    this._catalogId = catalogId;
    this._components = new Map();
    this._counter = 0;
    this._rootChildren = [];
  }

  #nextId(prefix) {
    return `${prefix}_${(this._counter++).toString(36)}`;
  }

  #reg(id, component, extra = {}) {
    id ??= this.#nextId(component.toLowerCase());
    if (this._components.has(id)) throw new Error(`Component id "${id}" already used`);
    this._components.set(id, { id, component, ...extra });
    return id;
  }

  text(text, { id, variant = "body" } = {}) {
    return this.#reg(id, "Text", { text, variant });
  }

  image(url, { id, variant, fit = "cover" } = {}) {
    return this.#reg(id, "Image", { url, ...(variant ? { variant } : {}), fit });
  }

  video(url, { id } = {}) {
    return this.#reg(id, "Video", { url });
  }

  checkbox(label, { id, value = false } = {}) {
    return this.#reg(id, "CheckBox", { label, value });
  }

  textField(label, { id, variant = "text" } = {}) {
    return this.#reg(id, "TextField", { label, variant });
  }

  button(childId, { id, variant = "primary", action } = {}) {
    if (!childId) throw new TypeError("button(childId) requires the id of a child component (e.g. from .text())");
    return this.#reg(id, "Button", { child: childId, variant, ...(action ? { action } : {}) });
  }

  card(childId, { id } = {}) {
    return this.#reg(id, "Card", { child: childId });
  }

  column(children = [], { id, justify, align } = {}) {
    if (!children.length) throw new TypeError("column(children) requires at least one child id");
    return this.#reg(id, "Column", { children, ...(justify ? { justify } : {}), ...(align ? { align } : {}) });
  }

  row(children = [], { id } = {}) {
    if (!children.length) throw new TypeError("row(children) requires at least one child id");
    return this.#reg(id, "Row", { children });
  }

  divider({ id } = {}) {
    return this.#reg(id, "Divider", {});
  }

  choicePicker(label, options, { id, variant = "mutuallyExclusive", value, displayStyle = "checkbox", filterable = false } = {}) {
    if (!Array.isArray(options) || !options.length) {
      throw new TypeError("choicePicker(label, options) requires a non-empty options array of {label, value}");
    }
    return this.#reg(id, "ChoicePicker", {
      label,
      variant,
      ...(value !== undefined ? { value } : {}),
      options,
      displayStyle,
      filterable,
    });
  }

  root(children) {
    if (!Array.isArray(children) || !children.length) {
      throw new TypeError("root(children) requires a non-empty array of top-level component ids");
    }
    this._rootChildren = children;
    return this;
  }

  build({ uuid = crypto.randomUUID(), surfaceId, type = "im_a2ui", wrapped = true } = {}) {
    if (!this._rootChildren.length) throw new Error("Call root([...ids]) before build()");
    const root = { id: "root", component: "Column", children: this._rootChildren };
    const components = [root, ...this._components.values()];
    const data = wrapped
      ? {
          version: this._version,
          createSurface: {
            surfaceId: surfaceId ?? `starcore-widget=${uuid}`,
            catalogId: this._catalogId,
            components,
          },
        }
      : { components };
    return {
      uuid,
      data: JSON.stringify(data),
      type,
    };
  }
}

async function sendA2UIWidget(client, jid, {
  a2ui,
  bodyText = "",
  footer = "",
  buttons = [],
  contextInfo = {},
  expiration,
  quoted,
  type = "im_a2ui",
  wrapped = true,
  singleScreen = false,
} = {}) {
  if (!client) throw new Error("Socket is required");
  if (!(a2ui instanceof A2UI)) throw new TypeError("a2ui must be an A2UI instance");

  const nativeFlowMessage = buttons && buttons.length
    ? {
        buttons: buttons.map((b) => ({
          name: b.name ?? "cta_url",
          buttonParamsJson: typeof b.params === "string" ? b.params : JSON.stringify(b.params ?? {}),
        })),
        messageParamsJson: "{}",
        messageVersion: 1,
      }
    : { messageParamsJson: "" };

  const interactiveMessage = singleScreen
    ? {
        nativeFlowMessage,
        bloksWidget: a2ui.build({ type, wrapped }),
        ...(expiration || Object.keys(contextInfo).length ? { contextInfo: { ...(expiration ? { expiration } : {}), ...contextInfo } } : {}),
      }
    : {
        ...(footer !== undefined ? { header: { hasMediaAttachment: false } } : {}),
        ...(bodyText !== undefined ? { body: { text: bodyText } } : {}),
        ...(footer !== undefined ? { footer: { text: footer } } : {}),
        nativeFlowMessage,
        bloksWidget: a2ui.build({ type, wrapped }),
        ...(expiration || Object.keys(contextInfo).length ? { contextInfo: { ...(expiration ? { expiration } : {}), ...contextInfo } } : {}),
      };

  const msg = generateWAMessageFromContent(jid, {
    messageContextInfo: { messageSecret: crypto.randomBytes(32) },
    interactiveMessage,
  }, { quoted });

  await client.relayMessage(msg.key.remoteJid, msg.message, {
    messageId: msg.key.id,
    additionalNodes: [
      {
        tag: "biz",
        attrs: { actual_actors: "2", host_storage: "2", privacy_mode_ts: String(Math.floor(Date.now() / 1e3)) },
        content: [
          { tag: "interactive", attrs: { type: "native_flow", v: "1" }, content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }] },
          { tag: "quality_control", attrs: { decision_id: crypto.randomUUID().replace(/-/g, ""), source_type: "third_party" }, content: [{ tag: "decision_source", attrs: { value: "df" } }] },
        ],
      },
    ],
  });
  return msg;
}

const pluginConfig = {
  name: "prueba8",
  alias: ["a2uifgsi", "fgsia2ui"],
  category: "tools",
  description: "Enviar ejemplos A2UI de FgsiDev",
  usage: ".prueba8 [1|2]",
  example: ".prueba8 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function buildExampleOne() {
  const ui = new A2UI();
  ui.root([
    ui.card(
      ui.column([
        ui.text("Ini A2UI By FgsiDev", { variant: "caption" }),
      ]),
    ),
  ]);
  return ui;
}

function buildExampleTwo() {
  const ui = new A2UI();

  const img = ui.image(
    "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png",
    { variant: "header" },
  );

  const title = ui.text("Ini Title", { variant: "h1" });
  const description = ui.text("Ini Description");
  const status = ui.text("Ini Caption", { variant: "caption" });

  const profileCard = ui.card(
    ui.column([
      img,
      description,
      status,
    ]),
  );

  const sectionTitle = ui.text("Ini Section Title", {
    variant: "h2",
  });

  const option1 = ui.checkbox("Ini Checkbox 1");
  const option2 = ui.checkbox("Ini Checkbox 2");
  const option3 = ui.checkbox("Ini Checkbox 3");

  const section = ui.column([
    sectionTitle,
    option1,
    option2,
    option3,
  ]);

  const inputTitle = ui.text("Ini Input Section", {
    variant: "h2",
  });

  const input = ui.textField("Ini Placeholder", {
    variant: "longText",
  });

  const buttonText = ui.text("Ini Button");

  const button = ui.button(buttonText, {
    action: {
      name: "testAction",
    },
  });

  const form = ui.column([
    inputTitle,
    input,
    button,
  ]);

  ui.root([
    title,
    profileCard,
    section,
    form,
  ]);

  return ui;
}

async function sendFallback(sock, m) {
  return sock.sendMessage(
    m.chat,
    {
      text:
        `⚠️ *A2UI FgsiDev*\n\n` +
        `Tu WhatsApp no pudo cargar el widget A2UI.\n` +
        `Prueba actualizar WhatsApp o usar otro cliente compatible.`,
      contextInfo: saluranCtx(),
    },
    { quoted: m },
  );
}

async function handler(m, { sock }) {
  const arg = (m.args || []).join(" ").trim().toLowerCase();
  const useSimple = ["1", "simple", "example", "example1"].includes(arg);
  const ui = useSimple ? buildExampleOne() : buildExampleTwo();

  await m.react("🕕").catch(() => {});

  try {
    if (useSimple) {
      await sendA2UIWidget(sock, m.chat, {
        a2ui: ui,
        quoted: m,
        contextInfo: saluranCtx(),
      });
    } else {
      await sendA2UIWidget(sock, m.chat, {
        footer: "• Ini Footer",
        buttons: [
          {
            name: "cta_url",
            params: {
              display_text: "Ini Button 1",
              url: "https://www.google.com",
              merchant_url: "https://www.google.com",
            },
          },
          {
            name: "cta_url",
            params: {
              display_text: "Ini Button 2",
              url: "https://www.google.com",
              merchant_url: "https://www.google.com",
            },
          },
        ],
        a2ui: ui,
        contextInfo: saluranCtx(),
        expiration: 7776000,
        quoted: m,
      });
    }

    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba8] A2UI widget failed:", error?.message || error);
    try {
      await sendFallback(sock, m);
      await m.react("✅").catch(() => {});
    } catch (fallbackError) {
      console.error("[prueba8] fallback failed:", fallbackError?.message || fallbackError);
      await m.react("☢").catch(() => {});
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }
}

export { A2UI, sendA2UIWidget, pluginConfig as config, handler };
