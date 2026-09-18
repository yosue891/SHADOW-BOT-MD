import te from "../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba10",
  alias: ["a2uilistcard", "listcard"],
  category: "tools",
  description: "Enviar A2UI listCard de prueba",
  usage: ".prueba10",
  example: ".prueba10",
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
    const { A2UI, sendA2UIWidget } = await import(`../../src/lib/a2ui.js?t=${Date.now()}`);

    const ui = new A2UI();
    ui.listCard({
      title: "jir tes ilmu",
      fallbackText: "maaf test ilmu",
      items: [
        { assetId: "28238215985807585", title: "Araw", price: "Gratis", imageUrl: "https://u.pone.rs/ycpjiosz.jpg" },
      ],
    });

    await sendA2UIWidget(sock, m.chat, {
      a2ui: ui,
      singleScreen: true,
    });

    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba10] A2UI listCard failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
