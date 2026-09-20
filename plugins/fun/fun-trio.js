let handler = async (m, { conn }) => {
    // Detectar menciones
    const ctx = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const fallback = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];
    const quoted = m.quoted?.sender ? [m.quoted.sender] : [];
    const mentions = [...new Set([...ctx, ...fallback, ...quoted])];

    if (mentions.length >= 2) {
        const person1 = mentions[0];
        const person2 = mentions[1];

        // Función para obtener nombre o número
        const getDisplayName = async (jid) => {
            let name = await conn.getName(jid);
            if (name) return name; // ✅ si hay nombre, úsalo
            return jid.split('@')[0]; // ✅ si no, muestra el número real
        };

        const name1 = await getDisplayName(person1);
        const name2 = await getDisplayName(person2);
        const name3 = await getDisplayName(m.sender);

        const pp = 'https://files.catbox.moe/r15z6m.jpg'; // URL pública de la imagen

        const trio = `\t\t*TRÍO VIOLENTOOOOO!*
        
${name1} y ${name2} tienen un *${Math.floor(Math.random() * 100)}%* de compatibilidad como pareja.
Mientras que ${name1} y ${name3} tienen un *${Math.floor(Math.random() * 100)}%* de compatibilidad.
Y ${name2} y ${name3} tienen un *${Math.floor(Math.random() * 100)}%* de compatibilidad.
¿Qué opinas de un trío? 😏`;

        await conn.sendMessage(m.chat, {
            image: { url: pp },
            caption: trio,
            mentions: [person1, person2, m.sender]
        }, { quoted: m });
    } else {
        await conn.reply(m.chat, `⚠️ Debes mencionar a 2 usuarios reales con @ para calcular la compatibilidad.`, m);
    }
}

handler.help = ['formartrio @usuario1 @usuario2'];
handler.tags = ['fun'];
handler.command = ['formartrio'];
handler.group = true;
handler.register = true;

export default handler;
