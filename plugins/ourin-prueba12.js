import { AIRich } from "../src/lib/ourin-builder.js";
import te from "../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba12",
  alias: ["airichcopy", "copyrich"],
  category: "tools",
  description: "Enviar AIRich con acción copiar al portapapeles",
  usage: ".prueba12",
  example: ".prueba12",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  await m.react("🕕").catch(() => {});

  try {
    const rich = new AIRich(sock);

    rich.addSection({
      view_model: {
        __typename: "GenAIAddonActionLayoutViewModel",
        addon_action_type: "COPY_TO_CLIPBOARD",
        addon_action_alignment: "END",
        primitives: [
          {
            __typename: "GenAIMarkdownTextUXPrimitive",
            text: "`hallloowwww`",
            inline_entities: [],
          },
        ],
      },
    });

    await rich.send(m.chat, { quoted: m });
    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba12] AIRich copy action failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
