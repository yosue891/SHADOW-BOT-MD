import crypto from "crypto";
import { generateWAMessageFromContent } from "ourin";
import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba13",
  alias: ["airichlive", "messagebuilder47"],
  category: "tools",
  description: "Demo AIRich editado en vivo estilo MessageBuilderV4.7",
  usage: ".prueba13",
  example: ".prueba13",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const CHANNEL_URL = "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O";
const CHANNEL_JID = "120363403739366547@newsletter";
const PRODUCT_URL = "https://wa.me/p/25697885489797403/51900373696";
const PRODUCT_CAROUSEL_LINK = "https://wa.me/584242773183";
const IMAGE_URL = "https://iili.io/K030s44.jpg";
const FULL_IMAGE_URL = "https://cdn.ornzora.eu.cc/2fa0763e-011f-4d18-b69b-32dd24282393-FIORA.jpg";
const TABLE_IMAGE_URL = "https://u.pone.rs/osfhpgaj.jpg";
const IMAGINE_IMAGE_URL = "https://u.pone.rs/jvkseojd.jpg";
const VIDEO_URL = "https://u.pone.rs/qrxzutmf.mp4";
const REEL_CAROUSEL_IMAGES = [
  "https://u.pone.rs/zeeyxbzy.jpg",
  "https://u.pone.rs/rgecouzz.jpg",
  "https://u.pone.rs/qxyejmcy.jpg",
  "https://u.pone.rs/yhkdbkxt.jpg",
];
const POST_CAROUSEL_IMAGES = [
  "https://u.pone.rs/pepnsewo.jpg",
  "https://u.pone.rs/pyaoixxc.jpg",
];
const PRODUCT_TOP_IMAGE = "https://u.pone.rs/figmkvby.jpg";

function responseId() {
  return "BAE5" + crypto.randomBytes(8).toString("hex").toUpperCase();
}

function single(primitive) {
  return {
    view_model: {
      primitive,
      __typename: "GenAISingleLayoutViewModel",
    },
  };
}

function hscroll(primitives) {
  return {
    view_model: {
      primitives,
      __typename: "GenAIHScrollLayoutViewModel",
    },
  };
}

function actionRow(primitives) {
  return {
    view_model: {
      primitives,
      __typename: "GenAIActionRowLayoutViewModel",
    },
  };
}

function markdownPrimitive(text, extra = {}) {
  return single({
    text,
    ...extra,
    __typename: "GenAIMarkdownTextUXPrimitive",
  });
}

function metadataPrimitive(text) {
  return single({
    text,
    __typename: "GenAIMetadataTextPrimitive",
  });
}

function foaPrimitive(text) {
  return single({
    text,
    __typename: "GenAIFOATextPrimitive",
  });
}

function imagePrimitive(url = "", { status = "READY", update_text = "" } = {}) {
  return single({
    media: {
      url,
      mime_type: "image/jpeg",
    },
    imagine_type: "IMAGE",
    status: {
      status,
      ...(update_text ? { update_text } : {}),
    },
    __typename: "GenAIImaginePrimitive",
  });
}

function videoPrimitive(url = "", { status = "READY", update_text = "", duration = 10 } = {}) {
  return single({
    media: {
      url,
      mime_type: "video/mp4",
      duration,
    },
    imagine_type: "ANIMATE",
    status: {
      status,
      ...(update_text ? { update_text } : {}),
    },
    __typename: "GenAIImaginePrimitive",
  });
}

function tablePrimitive(table = []) {
  const [header, ...rows] = table;
  const maxLen = Math.max(header?.length || 0, ...rows.map((row) => row.length));
  const normalize = (row) => [...row, ...Array(maxLen - row.length).fill("")];
  return single({
    rows: [
      { is_header: true, cells: normalize(header || []) },
      ...rows.map((row) => ({ is_header: false, cells: normalize(row) })),
    ],
    __typename: "GenATableUXPrimitive",
  });
}

function codePrimitive(language, code) {
  return single({
    language,
    code_blocks: [
      {
        content: code,
        type: "DEFAULT",
      },
    ],
    __typename: "GenAICodeUXPrimitive",
  });
}

function sourcePrimitive(sources = []) {
  return single({
    sources: sources.map(([profileUrl, url, text]) => ({
      source_type: "THIRD_PARTY",
      source_display_name: text || "",
      source_subtitle: "AI",
      source_url: url || "",
      favicon: {
        url: profileUrl || "",
        mime_type: "image/x-icon",
        width: 16,
        height: 16,
      },
    })),
    search_engine: "BING",
    facepile_favicons: [],
    __typename: "GenAISearchResultPrimitive",
  });
}

function reelsPrimitive(data = {}) {
  return hscroll([
    {
      reels_url: data.videoUrl || data.url || "",
      thumbnail_url: data.thumbnail || data.thumbnailUrl || "",
      creator: data.username || data.title || "",
      avatar_url: data.profileIconUrl || data.profile_url || data.thumbnail || "",
      reels_title: data.reels_title || data.title || "",
      likes_count: data.likes_count || 0,
      shares_count: data.shares_count || 0,
      view_count: data.view_count || 0,
      reel_source: data.reel_source || "IG",
      is_verified: Boolean(data.is_verified || data.verified),
      __typename: "GenAIReelPrimitive",
    },
  ]);
}

function productPrimitive(data = {}) {
  return single({
    title: data.title || "",
    brand: data.brand || "",
    price: data.price || "",
    sale_price: data.sale_price || "",
    product_url: data.product_url || data.url || "",
    image: {
      url: data.image_url || data.image || "",
    },
    additional_images: [
      {
        url: data.icon_url || data.icon || data.image_url || data.image || "",
      },
    ],
    __typename: "GenAIProductItemCardPrimitive",
  });
}

function postPrimitive(data = {}) {
  return hscroll([
    {
      title: data.title || "",
      subtitle: data.subtitle || "",
      username: data.username || "",
      profile_picture_url: data.profile_picture_url || data.profile_url || data.thumbnail || "",
      is_verified: Boolean(data.is_verified || data.verified),
      thumbnail_url: data.thumbnail_url || data.thumbnail || "",
      post_caption: data.caption || data.post_caption || "",
      likes_count: data.likes_count || 0,
      comments_count: data.comments_count || 0,
      shares_count: data.shares_count || 0,
      post_url: data.post_url || data.url || "",
      post_deeplink: data.post_deeplink || data.deeplink || data.url || "",
      source_app: data.source_app || data.source || "INSTAGRAM",
      footer_label: data.footer_label || "",
      footer_icon: data.footer_icon || "",
      is_carousel: false,
      orientation: data.orientation || "LANDSCAPE",
      post_type: data.post_type || "VIDEO",
      __typename: "GenAIPostPrimitive",
    },
  ]);
}

function widgetPrimitive(data = {}) {
  return single({
    __typename: "GenAI3PExtWidgetPrimitive",
    header: {
      __typename: "GenAI3PExtWidgetStandardHeader",
      title: data.title || "Widget",
    },
    body: {
      __typename: "GenAI3PExtCalendarEventList",
      sections: data.sections || [],
      ctas: (data.actions || []).map((action, index) => ({
        __typename: "GenAI3PExtWidgetCTA",
        label: action.label || `Action ${index + 1}`,
        state: action.state || "PENDING",
        kind: action.kind || "OTHER",
        tool_call_id: String(index).padStart(2, "0"),
        toast: {
          __typename: "GenAI3PExtWidgetToast",
          label: "",
        },
      })),
    },
  });
}

function footerActionPrimitive({ text = "Visit", url = "https://whatsapp.com" } = {}) {
  return single({
    __typename: "GenAIFooterActionPrimitive",
    cta_text: text,
    cta_type: "OPEN_URL",
    cta_url: url,
    channel_jid: CHANNEL_JID,
  });
}

class LiveAIRich {
  constructor(client) {
    if (!client) throw new Error("Socket is required");
    this.client = client;
    this.title = "";
    this.entries = [];
    this.sentKey = null;
    this.jid = null;
  }

  setTitle(title) {
    this.title = title || "";
    return this;
  }

  upsert(entry, options = {}) {
    const replaceId = options.replace;
    const insertAt = options.insertAt;
    const entryId = options.id || replaceId || crypto.randomUUID();
    const next = { ...entry, id: entryId };

    if (replaceId) {
      const index = this.entries.findIndex((item) => item.id === replaceId);
      if (index >= 0) this.entries.splice(index, 1, next);
      else this.entries.push(next);
      return this;
    }

    if (insertAt) {
      const index = this.entries.findIndex((item) => item.id === insertAt);
      if (index >= 0) this.entries.splice(index + 1, 0, next);
      else this.entries.push(next);
      return this;
    }

    this.entries.push(next);
    return this;
  }

  addText(text, options = {}) {
    return this.upsert({ section: markdownPrimitive(text), submessage: { messageType: 2, messageText: text } }, options);
  }

  addTip(text, options = {}) {
    return this.upsert({ section: metadataPrimitive(text), submessage: { messageType: 2, messageText: text } }, options);
  }

  addMetadata(text, options = {}) {
    return this.upsert({ section: metadataPrimitive(text), submessage: { messageType: 2, messageText: text } }, options);
  }

  addFOAText(text, options = {}) {
    return this.upsert({ section: foaPrimitive(text), submessage: { messageType: 2, messageText: text } }, options);
  }

  addImage(url, options = {}) {
    return this.upsert({ section: imagePrimitive(url, options), submessage: { messageType: 2, messageText: "[IMAGE]" } }, options);
  }

  addVideo(url, options = {}) {
    return this.upsert({ section: videoPrimitive(url, options), submessage: { messageType: 2, messageText: "[VIDEO]" } }, options);
  }

  addCode(language, code, options = {}) {
    return this.upsert({ section: codePrimitive(language, code), submessage: { messageType: 5, messageText: code } }, options);
  }

  addTable(table, options = {}) {
    return this.upsert({ section: tablePrimitive(table), submessage: { messageType: 4, messageText: "[TABLE]" } }, options);
  }

  addSource(sources, options = {}) {
    return this.upsert({ section: sourcePrimitive(sources) }, options);
  }

  addReels(data, options = {}) {
    return this.upsert({ section: reelsPrimitive(data) }, options);
  }

  addProduct(data, options = {}) {
    return this.upsert({ section: productPrimitive(data) }, options);
  }

  addPost(data, options = {}) {
    return this.upsert({ section: postPrimitive(data) }, options);
  }

  addWidget(data, options = {}) {
    return this.upsert({ section: widgetPrimitive(data) }, options);
  }

  addFooterAction(data, options = {}) {
    return this.upsert({ section: footerActionPrimitive(data) }, options);
  }

  addSuggest(suggestions, options = {}) {
    const values = Array.isArray(suggestions) ? suggestions : [suggestions];
    const section = actionRow(
      values.map((text) => ({
        prompt_text: text,
        prompt_type: "SUGGESTED_PROMPT",
        __typename: "GenAIFollowUpSuggestionPillPrimitive",
      })),
    );
    return this.upsert({ section }, options);
  }

  delete(id) {
    this.entries = this.entries.filter((item) => item.id !== id);
    return this;
  }

  build() {
    const sections = this.entries.map((entry) => entry.section);
    const submessages = this.entries.map((entry) => entry.submessage).filter(Boolean);

    return {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {
          messageDisclaimerText: this.title,
          richResponseSourcesMetadata: { sources: [] },
        },
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages,
            unifiedResponse: {
              data: Buffer.from(
                JSON.stringify({
                  response_id: crypto.randomUUID(),
                  sections,
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

  additionalNodes() {
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

  async send(jid) {
    this.jid = jid;
    const msg = generateWAMessageFromContent(jid, this.build(), {});

    await this.client.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
      additionalNodes: this.additionalNodes(),
    });

    this.sentKey = msg.key;
    return this.sentKey;
  }

  async sendEdit() {
    if (!this.sentKey || !this.jid) throw new Error("Call send(jid) before sendEdit()");

    const editMsg = generateWAMessageFromContent(
      this.jid,
      {
        protocolMessage: {
          key: this.sentKey,
          type: 14,
          editedMessage: this.build(),
          timestampMs: Date.now(),
        },
      },
      {},
    );

    return this.client.relayMessage(editMsg.key.remoteJid, editMsg.message, {
      messageId: editMsg.key.id,
      additionalNodes: this.additionalNodes(),
    });
  }
}

function fillCompleteDemo(rich) {
  return rich
    .addText("One message, rendered complete from start to finish, no spam. Try it yourself. 🚀", { id: "introduce" })
    .addSuggest(["MessageBuilderV4.7", "Dynamic AIRich", "NIXCODE"], { id: "suggestions" })
    .addText("I'm using the same video, images and links from the catalogo command.", { id: "introduce2" })
    .addText("First up — catalog images and video rendered as READY media.", { id: "introduce3" })
    .addImage(IMAGINE_IMAGE_URL, { id: "media1" })
    .addImage(FULL_IMAGE_URL, { id: "media_full" })
    .addImage(TABLE_IMAGE_URL, { id: "media_table" })
    .addVideo(VIDEO_URL, { id: "media2" })
    .addTip("These media URLs are the same ones used by .catalogo.", { id: "video_note" })
    .addText("Now let's talk content blocks. Code, with syntax highlighting:", { id: "code_intro" })
    .addCode("javascript", "function greet(name) {\n\treturn `Hello, ${name}!`;\n}\n\ngreet('Nixel');", { id: "code1" })
    .addText("Tables, formatted automatically:", { id: "table_intro" })
    .addTable([
      ["Feature", "Since", "Status"],
      ["loadFrom", "v4.7", "✅ stable"],
      ["sendEdit", "v4.7", "✅ stable"],
      ["insertAt / replace", "v4.7", "✅ stable"],
      ["delete", "v4.7", "✅ stable"],
    ], { id: "table1" })
    .addFOAText("This line is rendered with a different primitive under the hood (FOATextPrimitive) — same builder, different look.", { id: "foa1" })
    .addMetadata("↑ that was addFOAText(). This one is addMetadata() — good for subtle captions.", { id: "meta1" })
    .addText("Need to cite something? Sources render as a clean list:", { id: "source_intro" })
    .addSource([
      [IMAGE_URL, CHANNEL_URL, "Canal oficial"],
      [PRODUCT_TOP_IMAGE, PRODUCT_URL, "Producto del catálogo"],
      [POST_CAROUSEL_IMAGES[0], PRODUCT_CAROUSEL_LINK, "Contacto WhatsApp"],
    ], { id: "source1" })
    .addText("Horizontal scrolling cards work too — reels style:", { id: "reels_intro" })
    .addReels({
      username: "Yosue",
      thumbnail: REEL_CAROUSEL_IMAGES[2],
      profileIconUrl: REEL_CAROUSEL_IMAGES[0],
      videoUrl: VIDEO_URL,
      reels_title: "Reel del catálogo",
      likes_count: 128,
      shares_count: 12,
      view_count: 4200,
      reel_source: "IG",
      verified: true,
    }, { id: "reels1" })
    .addText("...product cards:", { id: "product_intro" })
    .addProduct({
      title: "Producto del catálogo",
      brand: "Contacto",
      price: "S/100",
      sale_price: "S/50",
      product_url: PRODUCT_URL,
      image_url: PRODUCT_TOP_IMAGE,
      icon_url: REEL_CAROUSEL_IMAGES[1],
    }, { id: "product1" })
    .addText("...and social post embeds:", { id: "post_intro" })
    .addPost({
      title: "Post del catálogo",
      subtitle: "Subtítulo",
      username: "Yosue",
      caption: "Descripción del post usando las imágenes y enlaces del catálogo.",
      thumbnail: POST_CAROUSEL_IMAGES[0],
      profile_url: POST_CAROUSEL_IMAGES[1],
      post_url: CHANNEL_URL,
      deeplink: PRODUCT_CAROUSEL_LINK,
      likes_count: 87,
      comments_count: 9,
      shares_count: 1,
      source_app: "INSTAGRAM",
      verified: true,
    }, { id: "post1" })
    .addText("Interactive widgets with action buttons? Also in.", { id: "widget_intro" })
    .addWidget({
      title: "Quick Actions",
      sections: [],
      actions: [
        { label: "Ver canal", kind: "OTHER", state: "PENDING" },
        { label: "Ver producto", kind: "OTHER", state: "PENDING" },
      ],
    }, { id: "widget1" })
    .addFooterAction({ text: "Visit Channel", url: CHANNEL_URL }, { id: "footer1" })
    .addTip("That was every primitive AIRich supports — using the media and links from .catalogo.", { id: "closing_tip" });
}

async function handler(m, { sock }) {
  await m.react("🕕").catch(() => {});

  try {
    const rich = new LiveAIRich(sock).setTitle("MessageBuilderV4.7");

    // Antes se intentaba editar muchas veces el mismo AIRich. En varios
    // clientes de WhatsApp esos edits de botForwardedMessage no se renderizan,
    // por eso solo se veía el primer texto. Ahora el contenido completo se
    // construye antes de enviar y sale en un solo mensaje, sin spam.
    fillCompleteDemo(rich);
    await rich.send(m.chat);

    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba13] AIRich demo failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
