let handler = async (m, { conn, usedPrefix}) => {
  try {
    const apiKey = 'yVQTbMhSEqbcGv7q5Z8AfeQL7kbmT45mH7RjYh0hPz7WGnusXpLsn2AZ';
    const total = 20; // cantidad de resultados para elegir aleatoriamente
    const res = await fetch(`https://api.pexels.com/v1/search?query=cosplay&per_page=${total}`, {
      headers: { Authorization: apiKey}
});

    const json = await res.json();
    if (!json.photos || json.photos.length === 0) throw new Error("No se encontraron imágenes");

    const randomIndex = Math.floor(Math.random() * json.photos.length);
    const cosplayUrl = json.photos[randomIndex].src.large;

    await conn.sendMessage(m.chat, { react: { text: "🎭", key: m.key}});

    const buttons = [
      {
        buttonId: `${usedPrefix}cosplay`,
        buttonText: { displayText: "🎭 Otro Cosplay"},
        type: 1,
},
      {
        buttonId: `${usedPrefix}waifu`,
        buttonText: { displayText: "💘 Waifu Random"},
        type: 1,
},
    ];

    const msg = {
      image: { url: cosplayUrl},
      caption: `✨ Aquí tienes tu dosis de cosplay, bro.\n¿Quieres ver otro? Toca el botón 👇`,
      footer: "🧬 Cosplay Generator",
      buttons: buttons,
      headerType: 4,
};

    await conn.sendMessage(m.chat, msg, { quoted: m});
} catch (e) {
    console.error("❌ Error en el comando cosplay:", e);
    await conn.sendMessage(m.chat, {
      text: "❎ No se pudo obtener la imagen de cosplay. Intenta más tarde."
}, { quoted: m});
}
};

handler.help = ['cosplay'];
handler.tags = ['anime'];
handler.command = ['cosplay'];
handler.register = true;

export default handler;
