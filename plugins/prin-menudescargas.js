import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
const { prepareWAMessageMedia, generateWAMessageFromContent } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const isRegistered = global.db.data.users[m.sender]?.registered;
    if (!isRegistered) {
      return conn.sendMessage(m.chat, {
        text: `🎄 *ACCESO DENEGADO* 🎄\n\nUsa *${usedPrefix}reg shadow.18* para registrarte.`,
      }, { quoted: m });
    }

    // Texto principal del menú con tu mensaje
    let txt = `📂 Menú de Descargas\n\nRecuerden que este menú es para ver cuáles opciones de descargas hay\n> Att:shadow\n\nSelecciona una opción:`; 

    // Imagen en el header (se reemplaza el video)
    let mediaMessage = await prepareWAMessageMedia(
      { image: { url: "https://files.catbox.moe/me80dc.jpg" } },
      { upload: conn.waUploadToServer }
    );

    // Construcción del mensaje interactivo con tus comandos
    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: txt },
            footer: { text: "🎄 Menú Navideño 🎄" },
            header: {
              hasMediaAttachment: !!mediaMessage,
              imageMessage: mediaMessage.imageMessage
            },
            nativeFlowMessage: {
              buttons: [{
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "📂 Descargas",
                  sections: [{
                    title: "Comandos disponibles",
                    rows: [
                      { title: "🎄 .apk", description: "Descargar APKs", id: "apk" },
                      { title: "🎁 .instagram", description: "Descargar contenido de Instagram", id: "instagram" },
                      { title: "✨ .ig", description: "Atajo para Instagram", id: "ig" },
                      { title: "⛄ .facebook", description: "Descargar contenido de Facebook", id: "facebook" },
                      { title: "🔔 .fb", description: "Atajo para Facebook", id: "fb" },
                      { title: "🎶 .mediafire", description: "Descargar archivos de Mediafire", id: "mediafire" },
                      { title: "🎄 .play", description: "Buscar y reproducir música", id: "play" },
                      { title: "🎁 .playaudio", description: "Descargar audio de canciones", id: "playaudio" },
                      { title: "✨ .ytmp3", description: "Descargar audio de YouTube", id: "ytmp3" },
                      { title: "⛄ .play2", description: "Segunda opción de reproducción", id: "play2" },
                      { title: "🔔 .playvid", description: "Descargar videos musicales", id: "playvid" },
                      { title: "🎶 .ytv", description: "Descargar videos de YouTube", id: "ytv" },
                      { title: "🎄 .ytmp4", description: "Descargar YouTube en MP4", id: "ytmp4" },
                      { title: "🎁 .yt", description: "Descargar contenido de YouTube", id: "yt" },
                      { title: "✨ .mp3doc", description: "Descargar audio como documento", id: "mp3doc" },
                      { title: "⛄ .ytmp3doc", description: "YouTube MP3 en documento", id: "ytmp3doc" },
                      { title: "🔔 .mp4doc", description: "Descargar video como documento", id: "mp4doc" },
                      { title: "🎶 .ytmp4doc", description: "YouTube MP4 en documento", id: "ytmp4doc" },
                      { title: "🎄 .tiktok", description: "Descargar videos de TikTok", id: "tiktok" }
                    ]
                  }]
                })
              }]
            },
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardingScore: 9999999
            }
          }
        }
      }
    }, { quoted: m });

    await conn.relayMessage(m.chat, msg.message, {});

  } catch (e) {
    conn.reply(m.chat, "👻 Error en el menú de descargas...", m);
  }
};

// 👇 Solo este comando
handler.help = ['descargas']
handler.tags = ['tools']
handler.command = ['descargas']   // ✅ Solo funciona con "descargas"
export default handler
