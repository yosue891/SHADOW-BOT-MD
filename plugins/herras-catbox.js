import {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} from "@whiskeysockets/baileys";

const upload = async (m, { conn, from }) => {
    const msg = m.quoted || m;
    const mime = msg.mimetype || msg.mediaType || "";

    if (!/image|video|audio/.test(mime)) {
        return m.reply("❌ Responde a una imagen, video o audio.");
    }

    try {
        const buffer = await msg.download();
        const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

        let ext = "png";
        if (/video/.test(mime)) ext = "mp4";
        if (/audio/.test(mime)) ext = "mp3";

        const res = await fetch("https://yoru-box.onrender.com/upload", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                data: base64,
                name: `file_${Date.now()}.${ext}`
            })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        let mediaObj = {};
        if (/image/.test(mime)) mediaObj = { image: buffer };
        else if (/video/.test(mime)) mediaObj = { video: buffer };
        else if (/audio/.test(mime)) mediaObj = { audio: buffer };

        const media = await prepareWAMessageMedia(mediaObj, {
            upload: conn.waUploadToServer
        });

        const buttons = [
            {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: "📋 Copiar enlace",
                    copy_code: json.url
                })
            }
        ];

        let headerMessage = {};
        if (media.imageMessage) headerMessage = { title: "Archivo subido", hasMediaAttachment: true, imageMessage: media.imageMessage };
        else if (media.videoMessage) headerMessage = { title: "Archivo subido", hasMediaAttachment: true, videoMessage: media.videoMessage };
        else if (media.audioMessage) headerMessage = { title: "Archivo subido", hasMediaAttachment: true, audioMessage: media.audioMessage };

        const message = generateWAMessageFromContent(
            from,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: headerMessage,
                            body: {
                                text: "✅ Archivo subido correctamente.\n\nPulsa el botón de abajo para copiar tu enlace."
                            },
                            footer: {
                                text: "Shadow-BOT-MD ⚡"
                            },
                            nativeFlowMessage: {
                                buttons
                            }
                        }
                    }
                }
            },
            {
                userJid: conn.user.id
            }
        );

        await conn.relayMessage(from, message.message, {
            messageId: message.key.id
        });

    } catch (e) {
        console.error(e);
        m.reply("❌ Error al procesar y subir el archivo.");
    }
};

upload.command = ["catbox", "imgurl", "upload", "tourl"];

export default upload;
