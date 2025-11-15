const keywords = ['bot', 'Bot', 'shadow', 'Shadow'];
const creatorNumber = '584242773183';

// Objeto para guardar últimos usos de keywords
let lastKeywordUse = {};

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

export async function before(m, { conn }) {
    const text = m.text.toLowerCase();

    // ⚠️ Si mencionan al creador
    if (text.includes(creatorNumber) || text.includes('yosue')) {
        return conn.reply(
            m.chat,
            `⚠️ *No etiquetes al creador. Si tienes dudas, contáctalo directamente al privado.*`,
            m
        );
    }

    // 📜 Si escriben "reglas"
    if (/^reglas$/i.test(m.text)) {
        const reglas = `🌐 *REGLAS DEL BOT SHADOW* 🌐

1️⃣ No hacer spam de comandos
2️⃣ No enviar enlaces sin permiso
3️⃣ No llamar al bot ni al creador
4️⃣ Respeta a los demás miembros
5️⃣ No usar el bot para contenido ofensivo
6️⃣ Si tienes dudas, pregunta con respeto
7️⃣ El bot no responde a provocaciones
8️⃣ No uses el bot para fines ilegales
9️⃣ No intentes forzar comandos ocultos
🔟 Recuerda: el bot observa... siempre.

🕶️ *La oscuridad no tolera el caos. Respeta las reglas y serás escuchado.*`;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: 'https://n.uguu.se/ZZHiiljb.jpg' },
                caption: reglas
            },
            { quoted: m }
        );
        return;
    }

    // 🎭 Si escriben "xd" → siempre responde con sticker
    if (/^xd$/i.test(m.text)) {
        await conn.sendMessage(
            m.chat,
            { sticker: { url: 'https://stickerswiki.uguu.se/ejemplo.webp' } }, // coloca tu sticker aquí
            { quoted: m }
        );
        return;
    }

    // 👋 Si contiene palabra clave con cooldown de 2 horas
    const hasKeyword = keywords.some(k => text.includes(k.toLowerCase()));
    if (hasKeyword) {
        const now = Date.now();
        const lastUse = lastKeywordUse[m.chat] || 0;
        const cooldown = 2 * 60 * 60 * 1000; // 2 horas en ms

        if (now - lastUse >= cooldown) {
            lastKeywordUse[m.chat] = now; // actualizar último uso
            return conn.reply(
                m.chat,
                `👋 *Hola soy Shadow.*\nUsa *.menu* para ver mi lista de comandos.`,
                m
            );
        }
    }

    return !0;
            }
