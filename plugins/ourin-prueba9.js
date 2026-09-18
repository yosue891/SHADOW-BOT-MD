import te from "../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba9",
  alias: ["a2uicentrado", "textocentrado"],
  category: "tools",
  description: "Enviar A2UI con texto centrado",
  usage: ".prueba9",
  example: ".prueba9",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function buildA2UIData() {
  return JSON.stringify({
    version: "v0.9",
    createSurface: {
      surfaceId: "gp-api-gianpool-dev",
      catalogId: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
      sendDataModel: true,
      components: [
        {
          id: "root",
          component: "Column",
          children: [
            "centered_text_row",
          ],
        },
        {
          id: "centered_text_row",
          component: "Row",
          justify: "center",
          children: [
            "main_centered_text",
          ],
        },
        {
          id: "main_centered_text",
          component: "Text",
          text: "Texto Centrado",
          variant: "h1",
        },
      ],
    },
  });
}

function buildPayload() {
  return {
    messageContextInfo: {
      messageSecret: "MrVuyq6yJcQaqEBhauquotU/NTBNVdrHBKybN5UK/Bg=",
    },
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: [],
        messageParamsJson: "{}",
        messageVersion: 1,
      },
      bloksWidget: {
        uuid: "5aeeb394-49fa-4043-b33e-415651b8a1f3",
        data: buildA2UIData(),
        type: "im_a2ui",
      },
      contextInfo: {
        expiration: 7776000,
      },
    },
  };
}

function buildAdditionalNodes() {
  return [
    {
      tag: "biz",
      attrs: {
        actual_actors: "2",
        host_storage: "2",
        privacy_mode_ts: "1787931782",
      },
      content: [
        {
          tag: "interactive",
          attrs: {
            type: "native_flow",
            v: "1",
          },
          content: [
            {
              tag: "native_flow",
              attrs: {
                v: "9",
                name: "mixed",
              },
            },
          ],
        },
      ],
    },
  ];
}

async function handler(m, { sock }) {
  await m.react("🕕").catch(() => {});

  try {
    await sock.relayMessage(
      m.chat,
      buildPayload(),
      {
        additionalNodes: buildAdditionalNodes(),
      },
    );

    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba9] A2UI centered text failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
