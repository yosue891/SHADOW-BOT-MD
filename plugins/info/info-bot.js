import fs from 'fs';

const handler = (m) => {
  return m;
};

handler.all = async function(m) {

    const chat = global.db.data.chats[m.chat];
    if (chat.isBaneed) return;

    const text = m.text.toLowerCase(); 

    const respuestas = {
        "bot": `🌌 ¡Has invocado al Shadow-Bot!\n\n👑 Soy Asta, guardián de las sombras.\n✰ Usa *!menu* para descubrir los rituales ocultos.`,
        "sexo": "❄️ Las sombras susurran... *pervertido* 🫣",
        "teta": "🔥 La nieve se derrite... *qué caliente eres* 🥵",
        "tetas": "🔥 La nieve se derrite... *qué caliente eres* 🥵",
        "bug": "👻 Las sombras ríen... *tu mamá we* 😹",
        "pene": "🌌 En silencio... *comes* 😹",
        "adios": "🌙 Las sombras se despiden... 👋",
        "amor": "💖 Bajo la nieve, el amor florece ❤️",
        "odio": "❄️ Respira... incluso las sombras se calman 😅",
        "gato": "🐱 En la oscuridad, los gatos reinan",
        "perro": "🐶 Fiel guardián de las sombras",
        "pizza": "🍕 Ritual festivo: ¡Pizza time!",
        "hamburguesa": "🍔 Delicia sombría",
        "café": "☕ Elixir de las sombras",
        "té": "🍵 Serenidad navideña",
        "dinero": "💸 Todos lo buscan, incluso en la oscuridad",
        "trabajo": "💪 Las sombras te observan, sigue adelante",
        "fiesta": "🎉 Celebración en el Shadow Garden",
        "música": "🎵 Ecos sombríos... ¿qué escuchas?",
        "frío": "🥶 Abrígate, las sombras son gélidas",
        "calor": "🥵 El fuego rompe la oscuridad",
        "lluvia": "🌧 La lluvia acompaña a las sombras",
        "sol": "☀️ Incluso la luz tiene su sombra",
        "noche": "🌙 Descansa bajo el manto sombrío",
        "día": "🌞 Buen día, guerrero de las sombras",
        "videojuego": "🎮 A jugar en el reino oculto",
        "película": "🍿 Sombras en la pantalla",
        "serie": "📺 Maratón sombrío",
        "libro": "📚 Conocimiento oculto",
        "viaje": "✈️ ¿Hacia qué reino sombrío partimos?",
        "playa": "🏖 Sombras bajo el sol",
        "montaña": "⛰ Ascenso sombrío",
        "deporte": "⚽ Fuerza y disciplina",
        "fútbol": "⚽ Gol sombrío!",
        "basquet": "🏀 Encesto en la oscuridad!",
        "amigo": "🤝 Compañero en las sombras",
        "enemigo": "😬 Cuidado... las sombras vigilan",
        "familia": "👨‍👩‍👧‍👦 Tu círculo protector",
        "trabajador": "💪 Disciplina sombría",
        "perezoso": "😴 Las sombras esperan..."
    };

    for (let key in respuestas) {
        const regex = new RegExp(`^${key}$`, "i");
        if (regex.test(m.text)) {
            conn.reply(m.chat, respuestas[key], m, rcanal);
            return !0;
        }
    }

    return !0;
};

export default handler;
