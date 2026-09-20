let handler = async (m, { conn, text, usedPrefix, command }) => {
    conn.menfess = conn.menfess ? conn.menfess : {};
    if (!text) throw m.reply(`🎄 Ejemplo:\n\n${usedPrefix + command} numero mensaje\n\n✨ Uso: ${usedPrefix + command} ${m.sender.split`@`[0]} Hola.`);

    let split = text.trim().split(/ (.+)/); 
    let jid = split[0]; 
    let pesan = split[1]; 

    if (!jid || !pesan) throw m.reply(`🎄 Ejemplo:\n\n${usedPrefix + command} numero mensaje\n\n✨ Uso: ${usedPrefix + command} ${m.sender.split`@`[0]} Hola.`);

    jid = jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net'; 
    let data = (await conn.onWhatsApp(jid))[0] || {}; 
    if (!data.exists) throw m.reply(`❄️ El número no está registrado en WhatsApp.`);
    if (jid == m.sender) throw m.reply(`🎁 No puedes mandarte un mensaje a ti mismo.`);

    let mf = Object.values(conn.menfess).find(mf => mf.status === true);
    if (mf) return !0;

    let id = Math.floor(1000 + Math.random() * 9000); 
    let teks = 
`🌑🎄 *Confesión en las Sombras Navideñas* 🎄🌑

*Hola* @${data.jid.split("@")[0]}, has recibido un mensaje oculto entre las luces y las sombras...  
Para responder usa:  
✨ Ejemplo: .respuesta <id> <Mensaje>

🌌 *ID:* ${id}  
🎁 *Mensaje:*  

${pesan}

❄️✨ "Incluso en Navidad, las sombras guardan secretos..." ✨❄️`.trim();

    try {
        let sentMessage = await conn.sendMessage(data.jid, {
            text: teks,
            contextInfo: {
                mentionedJid: [data.jid],
                externalAdReply: {
                    title: '🎄 C O N F E S I O N E S  S H A D O W 🎄',
                    body: 'Responde con .respuesta (id) (Mensaje)',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://files.catbox.moe/ityzkw.jpg', // att:shadow uwu 
                    sourceUrl: channel,
                }
            }
        });

        if (sentMessage) {
            conn.menfess[id] = {
                id,
                dari: m.sender,
                penerima: data.jid,
                pesan: pesan,
                status: false 
            };
            return conn.reply(m.chat, `🎅 Confesión enviada con éxito.\n👻 *Identificador:* ${id}`, m);
        }

    } catch (e) {
        console.error(e);
        m.reply(`👻 Ocurrió un error en las sombras navideñas...`);
    }
}

handler.tags = ['fun'];
handler.help = ['confesar'].map(v => v + ' <número mensaje>');
handler.command = ['confesar', 'confesiones'];
handler.register = true;
handler.private = true;

export default handler;
