import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba11",
  alias: ["a2uiprecios", "listaprecios"],
  category: "tools",
  description: "Enviar A2UI listCard con daftar harga produk",
  usage: ".prueba11",
  example: ".prueba11",
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
    const { A2UI, sendA2UIWidget } = await import(`../../lib/a2ui.js?t=${Date.now()}`);

    const ui = new A2UI();
    ui.listCard({
      title: "Daftar Harga Produk",
      fallbackText: "Daftar harga: Role Premium Rp10.000, Role VIP Rp25.000, VPS Rp5.000, dan AlightMotion Mod Gratis.",
      items: [
        { assetId: "35863165023282993", title: "Role APIKEY Premium", price: "Rp10.000", imageUrl: "https://u.pone.rs/ycpjiosz.jpg" },
        { assetId: "35863165023282993", title: "Role APIKEY VIP", price: "Rp25.000", imageUrl: "https://u.pone.rs/ycpjiosz.jpg" },
        { assetId: "28366645646301647", title: "VPS (1 bulan)", price: "Rp5.000", imageUrl: "https://u.pone.rs/ycpjiosz.jpg" },
        { assetId: "27433765359552309", title: "AlightMotion Mod Premium", price: "Gratis", imageUrl: "https://u.pone.rs/ycpjiosz.jpg" },
      ],
    });

    await sendA2UIWidget(sock, m.chat, {
      a2ui: ui,
      singleScreen: true,
    });

    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba11] A2UI listCard failed:", error?.message || error);
    await m.react("☢").catch(() => {});
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
