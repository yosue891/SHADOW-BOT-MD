import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import te from "../../src/lib/ourin-error.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";

const pluginConfig = {
  name: "prueba5",
  alias: ["a2uicatalog", "a2uischema", "catalogschema"],
  category: "tools",
  description: "Enviar el catálogo básico A2UI como mensaje visual",
  usage: ".prueba5",
  example: ".prueba5",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SCHEMA_PATH = path.join(process.cwd(), "data", "a2ui-basic-catalog.json");

function readSchema() {
  const raw = fs.readFileSync(SCHEMA_PATH, "utf8");
  const schema = JSON.parse(raw);

  const requiredComponents = [
    "Text", "Image", "Icon", "Video", "AudioPlayer", "Row", "Column", "List",
    "Card", "Tabs", "Modal", "Divider", "Button", "TextField", "CheckBox",
    "ChoicePicker", "Slider", "DateTimeInput",
  ];

  const missing = requiredComponents.filter((key) => !schema.components?.[key]);
  if (missing.length > 0) {
    throw new Error(`Schema A2UI incompleto. Faltan componentes: ${missing.join(", ")}`);
  }

  return schema;
}

function short(text = "", max = 180) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function getFunctionReturnType(fn = {}) {
  return fn.properties?.returnType?.const || "value";
}

function makeText(id, text, variant = "body") {
  return {
    id,
    component: "Text",
    text,
    variant,
  };
}

function makeDivider(id) {
  return {
    id,
    component: "Divider",
    axis: "horizontal",
  };
}

function makeCard(id, child) {
  return {
    id,
    component: "Card",
    child,
  };
}

function makeColumn(id, children, extra = {}) {
  return {
    id,
    component: "Column",
    children,
    ...extra,
  };
}

function buildCatalogSurface(schema) {
  const body = [];
  const rootChildren = [];
  const push = (component) => body.push(component);
  const addRoot = (id) => rootChildren.push(id);

  addRoot("hero");
  addRoot("divider_hero");
  addRoot("summary_card");
  addRoot("divider_components");
  addRoot("components_title");
  addRoot("components_list");
  addRoot("divider_functions");
  addRoot("functions_title");
  addRoot("functions_list");
  addRoot("divider_defs");
  addRoot("defs_title");
  addRoot("defs_list");
  addRoot("footer_note");

  push(makeColumn("hero", ["hero_title", "hero_subtitle"], { align: "center" }));
  push(makeText("hero_title", schema.title || "A2UI Basic Catalog", "h1"));
  push(makeText("hero_subtitle", schema.description || "Unified catalog", "caption"));
  push(makeDivider("divider_hero"));

  push(makeCard("summary_card", "summary_inner"));
  push(makeColumn("summary_inner", ["summary_title", "summary_catalog", "summary_counts"]));
  push(makeText("summary_title", "Resumen del catálogo", "h2"));
  push(makeText("summary_catalog", `Catalog ID: ${schema.catalogId || schema.$id}`, "caption"));
  push(makeText(
    "summary_counts",
    `Componentes: ${Object.keys(schema.components || {}).length} · Funciones: ${Object.keys(schema.functions || {}).length}`,
    "body",
  ));

  push(makeDivider("divider_components"));
  push(makeText("components_title", "Componentes soportados", "h2"));

  const componentIds = [];
  for (const [index, [name, definition]] of Object.entries(Object.entries(schema.components || {}))) {
    const id = `component_${index}`;
    componentIds.push(id);
    const required = definition.allOf?.at(-1)?.required?.join(", ") || "component";
    const description = definition.allOf?.at(-1)?.description || definition.description || "Componente A2UI";
    push(makeText(
      id,
      `• ${name}\n  Required: ${required}\n  ${short(description, 150)}`,
      "body",
    ));
  }
  push(makeColumn("components_list", componentIds));

  push(makeDivider("divider_functions"));
  push(makeText("functions_title", "Funciones del catálogo", "h2"));

  const functionIds = [];
  for (const [index, [name, definition]] of Object.entries(Object.entries(schema.functions || {}))) {
    const id = `function_${index}`;
    functionIds.push(id);
    push(makeText(
      id,
      `• ${name}() → ${getFunctionReturnType(definition)}\n  ${short(definition.description, 170)}`,
      "body",
    ));
  }
  push(makeColumn("functions_list", functionIds));

  push(makeDivider("divider_defs"));
  push(makeText("defs_title", "Definiciones internas", "h2"));
  const defs = Object.keys(schema.$defs || {});
  push(makeColumn("defs_list", ["defs_text"]));
  push(makeText("defs_text", defs.length ? defs.map((key) => `• ${key}`).join("\n") : "Sin definiciones internas", "body"));

  push(makeText(
    "footer_note",
    "Este mensaje visual conserva el catálogo A2UI y sus funciones; no se envía como archivo JSON.",
    "caption",
  ));

  return [
    makeColumn("root", rootChildren),
    ...body,
  ];
}

function buildA2UIData(schema) {
  const uuid = crypto.randomUUID();
  const data = JSON.stringify({
    version: "v0.9",
    createSurface: {
      surfaceId: `a2ui-basic-catalog-${uuid}`,
      catalogId: schema.catalogId || schema.$id,
      components: buildCatalogSurface(schema),
    },
  });

  return { uuid, data };
}

function buildFallbackText(schema) {
  const components = Object.keys(schema.components || {}).join(", ");
  const functions = Object.keys(schema.functions || {}).join(", ");
  return (
    `A2UI Basic Catalog\n\n` +
    `Componentes:\n${components}\n\n` +
    `Funciones:\n${functions}\n\n` +
    `Tu WhatsApp no pudo cargar el panel A2UI completo.`
  );
}

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
          content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
        },
        {
          tag: "quality_control",
          attrs: {
            decision_id: crypto.randomBytes(20).toString("hex"),
            source_type: "third_party",
          },
          content: [{ tag: "decision_source", attrs: { value: "df" } }],
        },
      ],
    },
  ];
}

async function sendA2UICatalog(sock, m, schema) {
  const { uuid, data } = buildA2UIData(schema);
  const specUrl = schema.catalogId || schema.$id || "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";

  return sock.relayMessage(
    m.chat,
    {
      messageContextInfo: {
        messageSecret: crypto.randomBytes(32).toString("base64"),
      },
      interactiveMessage: {
        header: { hasMediaAttachment: false },
        body: { text: "" },
        footer: { text: "A2UI Basic Catalog" },
        nativeFlowMessage: {
          buttons: [
            {},
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "Ver especificación",
                url: specUrl,
                merchant_url: specUrl,
              }),
            },
          ],
          messageParamsJson: "{}",
          messageVersion: 1,
        },
        bloksWidget: {
          uuid,
          data,
          type: "im_a2ui",
          fallback: buildFallbackText(schema),
        },
        contextInfo: {
          ...saluranCtx(),
          expiration: 7776000,
        },
      },
    },
    {
      additionalNodes: buildAdditionalNodes(),
    },
  );
}

async function sendFallback(sock, m, schema) {
  const text = buildFallbackText(schema);
  return sock.sendMessage(m.chat, { text, contextInfo: saluranCtx() }, { quoted: m });
}

async function handler(m, { sock }) {
  await m.react("🕕");

  try {
    const schema = readSchema();
    await sendA2UICatalog(sock, m, schema);
    await m.react("✅");
  } catch (error) {
    console.error("[prueba5] A2UI send error:", error?.message || error);

    try {
      const schema = readSchema();
      await sendFallback(sock, m, schema);
      await m.react("✅");
    } catch (fallbackError) {
      console.error("[prueba5] fallback error:", fallbackError?.message || fallbackError);
      await m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }
}

export { pluginConfig as config, handler };
