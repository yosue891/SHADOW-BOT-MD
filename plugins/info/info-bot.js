import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_NAVIDAD_AUDIO = path.join(__dirname, '..', '..', 'lib', 'navidad.m4a');
const REMOTE_NAVIDAD_AUDIO = 'https://u.pone.rs/ckiugqld.m4a';

const handler = async (m, { conn }) => {
    const audioSource = fs.existsSync(LOCAL_NAVIDAD_AUDIO)
        ? fs.readFileSync(LOCAL_NAVIDAD_AUDIO)
        : { url: REMOTE_NAVIDAD_AUDIO };

    await conn.sendMessage(
        m.chat,
        {
            audio: audioSource,
            mimetype: 'audio/mp4',
            fileName: 'feliz-navidad.m4a',
            ptt: true,
            ...(global.rcanal || {})
        },
        { quoted: m }
    );
};

handler.all = async function(m) {
    if (!m.text || typeof m.text !== 'string') return !0;
    if (m.isBaileys || m.fromMe) return !0;

    const chat = global.db?.data?.chats?.[m.chat];
    if (chat && (chat.isBanned || chat.isBaneed)) return !0;

    const trimmedText = m.text.trim();

    // Mensaje automático sin prefijo: "feliz navidad" (envío de audio en ptt: true)
    const regexNavidad = /^(?:¡|¿)?\s*feliz\s+navidad(?:\s+(?:a\s+todos|grupo|familia|gente))?[\s!?.¿¡🎄🎅🎁✨❄️]*$/i;
    if (regexNavidad.test(trimmedText)) {
        const audioSource = fs.existsSync(LOCAL_NAVIDAD_AUDIO)
            ? fs.readFileSync(LOCAL_NAVIDAD_AUDIO)
            : { url: REMOTE_NAVIDAD_AUDIO };

        await this.sendMessage(
            m.chat,
            {
                audio: audioSource,
                mimetype: 'audio/mp4',
                fileName: 'feliz-navidad.m4a',
                ptt: true,
                ...(global.rcanal || {})
            },
            { quoted: m }
        );
        return !0;
    }

    const respuestas = {
        "bot": `🎃 ¡Has invocado al Shadow-Bot en la Noche de Brujas! 🦇\n\n👑 Soy Asta, guardián de las sombras y el aquelarre.\n✰ Usa *!menu* para descubrir los rituales ocultos de Halloween. 🕯️`,
        "sexo": "🦇 Las sombras susurran... *pervertido del aquelarre* 🫣🎃",
        "teta": "🔥 El fuego fatuo arde... *qué caliente eres* 🥵🎃",
        "tetas": "🔥 El fuego fatuo arde... *qué caliente eres* 🥵🎃",
        "bug": "👻 Las sombras ríen desde ultratumba... *tu mamá we* 😹🦇",
        "pene": "🌌 En el abismo... *comes* 😹🦇",
        "adios": "🌙 Las sombras y espectros se despiden... 👋🎃",
        "amor": "💖 Bajo la luna de sangre, el romance sombrío florece 🩸🎃",
        "odio": "🕯️ Respira... incluso los espíritus se calman 😅🦇",
        "gato": "🐱 En la noche de brujas, los gatos negros reinan 🎃",
        "perro": "🐺 Guardián licántropo de las sombras 🌕",
        "pizza": "🍕 Festín de ultratumba: ¡Pizza time! 🎃",
        "hamburguesa": "🍔 Delicia de la cripta 🦇",
        "café": "☕ Brebaje oscuro de las sombras 🕯️",
        "té": "🍵 Pócima espectral de brujas 🧙‍♀️",
        "dinero": "💸 Todos lo buscan, incluso los fantasmas 👻",
        "trabajo": "💪 Las sombras te observan, sigue adelante 🦇",
        "fiesta": "🎉 Noche de Halloween en el Shadow Garden 🎃🦇",
        "música": "🎵 Melodías espectrales... ¿qué susurran? 🦇",
        "frío": "🥶 Abrígate, el viento de la cripta es helado ❄️🦇",
        "calor": "🔥 Las llamas del abismo arden 🎃",
        "lluvia": "🌧 La tormenta nocturna acompaña a los espectros 🦇",
        "sol": "☀️ Incluso la luz sucumbirá a la noche eterna 🎃",
        "noche": "🌙 Descansa bajo el manto de la noche de brujas 🦇🕯️",
        "día": "🎃 Salve, contratista de las sombras 🦇",
        "videojuego": "🎮 A jugar en el reino oculto de Halloween 🎃",
        "película": "🍿 Noche de terror en el cine sombrío 🦇",
        "serie": "📺 Maratón de ultratumba 🎃",
        "libro": "📚 Grimorio de sombras y secretos arcanos 🕯️",
        "viaje": "✈️ ¿Hacia qué aquelarre sombrío partimos? 🦇",
        "playa": "🏖 Sombras bajo la marea nocturna 🎃",
        "montaña": "⛰ Ascenso a la cumbre embrujada 🦇",
        "deporte": "⚽ Fuerza y disciplina de la sombra 🎃",
        "fútbol": "⚽ ¡Gol espectral! 🦇",
        "basquet": "🏀 ¡Encesto desde la oscuridad! 🎃",
        "amigo": "🤝 Compañero de pacto en las sombras 🎃",
        "enemigo": "😬 Cuidado... los murciélagos y sombras vigilan 🦇",
        "familia": "👨‍👩‍👧‍👦 Tu círculo sagrado 🕯️",
        "trabajador": "💪 Disciplina inquebrantable de Shadow Garden 🦇",
        "perezoso": "😴 Las sombras te atraparán en sueños... 👻"
    };

    for (let key in respuestas) {
        const regex = new RegExp(`^${key}$`, "i");
        if (regex.test(trimmedText)) {
            await this.reply(m.chat, respuestas[key], m, global.rcanal);
            return !0;
        }
    }

    return !0;
};

handler.help = ['feliznavidad'];
handler.tags = ['info'];
handler.command = ['feliznavidad'];

export default handler;
