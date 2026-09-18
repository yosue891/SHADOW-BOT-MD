import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba14",
  alias: ["rgb"],
  category: "tools",
  description: "Enviar texto RGB animado usando AIRich HTML primitive",
  usage: ".prueba14 <texto>",
  example: ".prueba14 Hola mundo 🌈",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildRgbPayload(text = "") {
  const safeText = escapeHtml(text);

  return `<style>
.rgb{background:linear-gradient(90deg,red,orange,yellow,lime,cyan,blue,violet,red);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:rgb 2s linear infinite;font-size:30px;font-weight:bold}
@keyframes rgb{from{background-position:200% 0}to{background-position:0 0}}
</style><div class="rgb">${safeText}</div>`;
}

async function handler(m, { sock, text }) {
  const input = String(text || m.text || "").trim();

  if (!input) {
    return m.reply(
      `🌈 *RGB AIRich*\n\n` +
        `> Ejemplo: \`${m.prefix || "."}prueba14 Hola mundo 🌈\`\n` +
        `> Alias: \`${m.prefix || "."}rgb Hola mundo 🌈\``,
    );
  }

  await m.react("🕕").catch(() => {});

  try {
    await sock.relayMessage(
      m.chat,
      {
        botForwardedMessage: {
          message: {
            richResponseMessage: {
              messageType: 1,
              submessages: [],
              unifiedResponse: {
                data: Buffer.from(
                  JSON.stringify({
                    response_id: `gp-rgb-${Date.now()}`,
                    sections: [
                      {
                        view_model: {
                          primitive: {
                            __typename: "GenAIaeacdsnwHtmlPrimitive",
                            payload: buildRgbPayload(input),
                            trusted_sources: ["api.gianpool.dev"],
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
                forwardedAiBotMessageInfo: {
                  botJid: "0@bot",
                },
                forwardOrigin: 4,
              },
            },
          },
        },
      },
      {},
    );

    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba14] RGB AIRich failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
