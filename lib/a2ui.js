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

  row(children = [], { id, justify, align } = {}) {
    if (!children.length) throw new TypeError("row(children) requires at least one child id");
    return this.#reg(id, "Row", { children, ...(justify ? { justify } : {}), ...(align ? { align } : {}) });
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

  listCard({ title, fallbackText, items }, { id } = {}) {
    if (!Array.isArray(items) || !items.length) {
      throw new TypeError("listCard({ items }) requires a non-empty items array");
    }

    // `ListCard` no existe en el catálogo básico A2UI v0.9. Para que WhatsApp
    // no lance A2UIParseException, lo representamos con componentes soportados:
    // Text + Card + Column + Row + Image.
    const baseId = id || this.#nextId("listcard");
    const titleId = this.text(title || fallbackText || "", {
      id: `${baseId}_title`,
      variant: "h2",
    });

    const itemRows = items.map((item, index) => {
      const itemId = `${baseId}_item_${index}`;
      const assetId = item.assetId || item.asset_id || item.id || item.title || index;
      const imageUrl =
        item.imageUrl ||
        item.image ||
        item.thumbnail ||
        item.assetUrl ||
        `https://api.dicebear.com/9.x/adventurer-neutral/png?seed=${encodeURIComponent(String(assetId))}`;

      const imageId = this.image(imageUrl, {
        id: `${itemId}_image`,
        variant: "avatar",
        fit: "cover",
      });
      const titleTextId = this.text(item.title || "", {
        id: `${itemId}_title`,
        variant: "body",
      });
      const priceTextId = this.text(item.price || "", {
        id: `${itemId}_price`,
        variant: "body",
      });
      const leftRowId = this.row([imageId, titleTextId], {
        id: `${itemId}_left`,
        align: "center",
      });

      return this.row([leftRowId, priceTextId], {
        id: `${itemId}_row`,
        justify: "spaceBetween",
        align: "center",
      });
    });

    const listId = this.column(itemRows, { id: `${baseId}_list` });
    const cardId = this.card(listId, { id: `${baseId}_card` });
    const listCardId = this.column([titleId, cardId], { id: baseId });

    if (!this._rootChildren.length) this._rootChildren = [listCardId];
    return listCardId;
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

export { A2UI, sendA2UIWidget };
