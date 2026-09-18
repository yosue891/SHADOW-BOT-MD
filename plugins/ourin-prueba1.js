import crypto from "node:crypto";
import axios from "axios";
import { getAssetBuffer } from "../src/lib/ourin-asset-manager.js";
import { saluranCtx } from "../src/lib/ourin-context.js";
import te from "../src/lib/ourin-error.js";

const HERO_IMAGE = "https://picsum.photos/seed/dxrkchan/800/400";
const GOOGLE_URL = "https://www.google.com";

const pluginConfig = {
  name: "prueba1",
  alias: ["a2ui", "catalogdemo", "catalogoprueba"],
  category: "tools",
  description: "Enviar demo A2UI/bloksWidget con catálogo completo",
  usage: ".prueba1",
  example: ".prueba1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function buildFullCatalogSurface() {
  const uuid = crypto.randomUUID();

  const components = [
    // ---------- HERO ----------
    {
      id: "root",
      component: "Column",
      children: [
        "hero",
        "divider_hero",
        "typo_section",
        "divider_1",
        "media_section",
        "divider_2",
        "layout_section",
        "divider_3",
        "interactive_section",
        "divider_4",
        "form_section",
        "divider_5",
        "dynamic_section",
      ],
    },

    { id: "hero", component: "Column", align: "center", children: ["hero_image", "app_title", "app_subtitle"] },
    { id: "hero_image", component: "Image", url: HERO_IMAGE, variant: "header", fit: "cover" },
    { id: "app_title", component: "Text", text: "Catálogo Completo A2UI", variant: "h1" },
    { id: "app_subtitle", component: "Text", text: "Demonstração de todos os componentes suportados", variant: "caption" },
    { id: "divider_hero", component: "Divider", axis: "horizontal" },

    // ---------- TIPOGRAFIA ----------
    { id: "typo_section", component: "Column", children: ["typo_title", "t_h1", "t_h2", "t_h3", "t_h4", "t_h5", "t_caption", "t_body"] },
    { id: "typo_title", component: "Text", text: "1. Tipografia", variant: "h2" },
    { id: "t_h1", component: "Text", text: "Título h1", variant: "h1" },
    { id: "t_h2", component: "Text", text: "Título h2", variant: "h2" },
    { id: "t_h3", component: "Text", text: "Título h3", variant: "h3" },
    { id: "t_h4", component: "Text", text: "Título h4", variant: "h4" },
    { id: "t_h5", component: "Text", text: "Título h5", variant: "h5" },
    { id: "t_caption", component: "Text", text: "Texto caption, menor e discreto", variant: "caption" },
    { id: "t_body", component: "Text", text: "Texto body, o padrão para parágrafos.", variant: "body" },
    { id: "divider_1", component: "Divider" },

    // ---------- MÍDIA ----------
    { id: "media_section", component: "Column", children: ["media_title", "icons_row", "video_demo", "audio_demo"] },
    { id: "media_title", component: "Text", text: "2. Ícones e mídia", variant: "h2" },
    { id: "icons_row", component: "Row", justify: "spaceEvenly", align: "center", children: ["ic_star", "ic_fav", "ic_share", "ic_download", "ic_settings"] },
    { id: "ic_star", component: "Icon", name: "star" },
    { id: "ic_fav", component: "Icon", name: "favorite" },
    { id: "ic_share", component: "Icon", name: "share" },
    { id: "ic_download", component: "Icon", name: "download" },
    { id: "ic_settings", component: "Icon", name: "settings" },
    { id: "video_demo", component: "Video", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { id: "audio_demo", component: "AudioPlayer", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "divider_2", component: "Divider" },

    // ---------- LAYOUT ----------
    { id: "layout_section", component: "Column", children: ["layout_title", "grid_row", "list_demo", "card_demo"] },
    { id: "layout_title", component: "Text", text: "3. Layout", variant: "h2" },
    { id: "grid_row", component: "Row", justify: "spaceBetween", align: "start", children: ["col_a", "col_b"] },
    { id: "col_a", component: "Column", weight: 2, children: ["col_a_title", "col_a_body"] },
    { id: "col_a_title", component: "Text", text: "Coluna A", variant: "h3" },
    { id: "col_a_body", component: "Text", text: "weight: 2 — o dobro da largura da coluna B.", variant: "body" },
    { id: "col_b", component: "Column", weight: 1, children: ["col_b_title", "col_b_body"] },
    { id: "col_b_title", component: "Text", text: "Coluna B", variant: "h3" },
    { id: "col_b_body", component: "Text", text: "weight: 1.", variant: "body" },
    { id: "list_demo", component: "List", direction: "horizontal", align: "center", children: ["li_1", "li_2", "li_3"] },
    { id: "li_1", component: "Text", text: "Item 1", variant: "body" },
    { id: "li_2", component: "Text", text: "Item 2", variant: "body" },
    { id: "li_3", component: "Text", text: "Item 3", variant: "body" },
    { id: "card_demo", component: "Card", child: "card_inner" },
    { id: "card_inner", component: "Column", children: ["card_title", "card_body"] },
    { id: "card_title", component: "Text", text: "Dentro de um Card", variant: "h3" },
    { id: "card_body", component: "Text", text: "Card só aceita 1 filho direto — por isso envolvemos tudo numa Column.", variant: "body" },
    { id: "divider_3", component: "Divider" },

    // ---------- INTERATIVOS ----------
    { id: "interactive_section", component: "Column", children: ["interactive_title", "tabs_demo", "modal_trigger_btn", "modal_demo"] },
    { id: "interactive_title", component: "Text", text: "4. Tabs, Modal e Botões", variant: "h2" },
    { id: "tabs_demo", component: "Tabs", tabs: [{ title: "Aba 1", child: "tab1_content" }, { title: "Aba 2", child: "tab2_content" }] },
    { id: "tab1_content", component: "Card", child: "tab1_text" },
    { id: "tab1_text", component: "Text", text: "Conteúdo da aba 1, dentro de um Card.", variant: "body" },
    { id: "tab2_content", component: "Text", text: "Conteúdo da aba 2, sem Card.", variant: "body" },
    {
      id: "modal_trigger_btn",
      component: "Button",
      child: "modal_trigger_text",
      variant: "borderless",
      action: { functionCall: { call: "openUrl", args: { url: GOOGLE_URL }, returnType: "void" } },
    },
    { id: "modal_trigger_text", component: "Text", text: "Ver política (abre link)", variant: "caption" },
    { id: "modal_demo", component: "Modal", trigger: "modal_trigger_btn", content: "modal_content" },
    { id: "modal_content", component: "Column", children: ["modal_title", "modal_body"] },
    { id: "modal_title", component: "Text", text: "Conteúdo do Modal", variant: "h3" },
    { id: "modal_body", component: "Text", text: "Modal referencia um 'trigger' e um 'content', ambos por ID.", variant: "body" },
    { id: "divider_4", component: "Divider" },

    // ---------- FORMULÁRIO ----------
    { id: "form_section", component: "Column", children: ["form_title", "field_short", "field_long", "field_number", "field_obscured", "checkbox_demo", "picker_single", "picker_multi", "slider_demo", "date_demo", "submit_btn"] },
    { id: "form_title", component: "Text", text: "5. Campos de formulário", variant: "h2" },
    {
      id: "field_short",
      component: "TextField",
      label: "Nome completo",
      value: { path: "/form/nome" },
      variant: "shortText",
      checks: [{ condition: { call: "required", args: { value: { path: "/form/nome" } }, returnType: "boolean" }, message: "Preencha seu nome" }],
    },
    { id: "field_long", component: "TextField", label: "Observações", value: "", variant: "longText" },
    {
      id: "field_number",
      component: "TextField",
      label: "Idade",
      value: "",
      variant: "number",
      checks: [{ condition: { call: "numeric", args: { value: { path: "/form/idade" }, min: 0, max: 120 }, returnType: "boolean" }, message: "Idade inválida" }],
    },
    { id: "field_obscured", component: "TextField", label: "Senha", value: "", variant: "obscured", validationRegexp: "^.{6,}$" },
    { id: "checkbox_demo", component: "CheckBox", label: "Aceito os termos", value: { path: "/form/aceite" } },
    {
      id: "picker_single",
      component: "ChoicePicker",
      label: "Plano",
      variant: "mutuallyExclusive",
      displayStyle: "checkbox",
      options: [{ label: "Básico", value: "basico" }, { label: "Padrão", value: "padrao" }, { label: "Premium", value: "premium" }],
      value: [],
    },
    {
      id: "picker_multi",
      component: "ChoicePicker",
      label: "Interesses",
      variant: "multipleSelection",
      displayStyle: "chips",
      filterable: true,
      options: [{ label: "Tecnologia", value: "tech" }, { label: "Música", value: "musica" }, { label: "Games", value: "games" }, { label: "Culinária", value: "culinaria" }],
      value: [],
    },
    { id: "slider_demo", component: "Slider", label: "Nível de satisfação", min: 0, max: 10, value: 5 },
    { id: "date_demo", component: "DateTimeInput", label: "Data e hora preferida", value: "", enableDate: true, enableTime: true, min: "2026-08-26", max: "2026-12-31" },
    {
      id: "submit_btn",
      component: "Button",
      child: "submit_text",
      variant: "primary",
      action: { event: { name: "submit_demo", context: { origem: "dxrkchan" } } },
    },
    { id: "submit_text", component: "Text", text: "Enviar", variant: "body" },
    { id: "divider_5", component: "Divider" },

    // ---------- DINÁMICO ----------
    { id: "dynamic_section", component: "Column", children: ["dynamic_title", "price_text", "date_text", "plural_text"] },
    { id: "dynamic_title", component: "Text", text: "6. Texto dinâmico (funções)", variant: "h2" },
    { id: "price_text", component: "Text", variant: "body", text: { call: "formatCurrency", args: { value: 149.9, currency: "BRL" }, returnType: "string" } },
    { id: "date_text", component: "Text", variant: "body", text: { call: "formatDate", args: { value: "2026-08-26T00:00:00Z", format: "EEEE, d MMMM yyyy" }, returnType: "string" } },
    { id: "plural_text", component: "Text", variant: "body", text: { call: "pluralize", args: { value: 3, one: "Você tem 1 mensagem nova", other: "Você tem várias mensagens novas" }, returnType: "string" } },
  ];

  const data = JSON.stringify({
    version: "v0.9",
    createSurface: {
      surfaceId: "starcore-widget=" + uuid,
      catalogId: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
      components,
    },
  });

  return { uuid, data };
}

function buildButtons() {
  return [
    {},
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "Site",
        url: GOOGLE_URL,
        merchant_url: GOOGLE_URL,
      }),
    },
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "Suporte",
        url: GOOGLE_URL,
        merchant_url: GOOGLE_URL,
      }),
    },
  ];
}

async function sendFullCatalogDemo(socket, remoteId) {
  const { uuid, data } = buildFullCatalogSurface();
  const messageSecret = crypto.randomBytes(32).toString("base64");
  const contextInfo = {
    ...saluranCtx(),
    expiration: 7776000,
  };

  return socket.relayMessage(
    remoteId,
    {
      messageContextInfo: {
        messageSecret,
      },
      interactiveMessage: {
        header: { hasMediaAttachment: false },
        body: { text: "" },
        footer: { text: "• dxrkchan 💜" },
        nativeFlowMessage: {
          buttons: buildButtons(),
          messageParamsJson: "{}",
          messageVersion: 1,
        },
        bloksWidget: {
          uuid,
          data,
          type: "im_a2ui",
          fallback: "Não foi possível carregar o menu completo. Seu WhatsApp pode estar desatualizado.",
        },
        contextInfo,
      },
    },
    {
      additionalNodes: [
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
      ],
    },
  );
}

async function getFallbackImage() {
  try {
    const { data, headers } = await axios.get(HERO_IMAGE, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: () => true,
    });

    if (headers?.["content-type"]?.startsWith("image/")) {
      return Buffer.from(data || []);
    }
  } catch (error) {
    console.error("[prueba1] fallback image error:", error?.message || error);
  }

  return getAssetBuffer("ourin") || null;
}

async function sendFallback(socket, m) {
  const image = await getFallbackImage();
  const text =
    `🧩 *Catálogo Completo A2UI*\n\n` +
    `> Tu WhatsApp o la librería no pudo cargar el bloksWidget completo.\n` +
    `> Te dejo una vista básica con botones de respaldo.\n\n` +
    `• Tipografia\n` +
    `• Ícones y mídia\n` +
    `• Layout\n` +
    `• Tabs, Modal e Botões\n` +
    `• Campos de formulário\n` +
    `• Texto dinâmico`;

  const payload = {
    caption: text,
    footer: "• dxrkchan 💜",
    interactiveButtons: [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "Site",
          url: GOOGLE_URL,
          merchant_url: GOOGLE_URL,
        }),
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "Suporte",
          url: GOOGLE_URL,
          merchant_url: GOOGLE_URL,
        }),
      },
    ],
    contextInfo: saluranCtx(),
  };

  if (image) payload.image = image;
  else {
    payload.text = text;
    delete payload.caption;
  }

  return socket.sendMessage(m.chat, payload, { quoted: m });
}

async function handler(m, { sock }) {
  await m.react("🕕");

  try {
    if (!sock?.relayMessage) {
      throw new Error("relayMessage no está disponible en este socket");
    }

    await sendFullCatalogDemo(sock, m.chat);
    await m.react("✅");
  } catch (error) {
    console.error("[prueba1] A2UI failed, using fallback:", error?.message || error);

    try {
      await sendFallback(sock, m);
      await m.react("✅");
    } catch (fallbackError) {
      console.error("[prueba1] fallback failed:", fallbackError?.message || fallbackError);
      await m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }
}

export { pluginConfig as config, handler };
