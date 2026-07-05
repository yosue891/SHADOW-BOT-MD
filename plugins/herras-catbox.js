//código echo por Cristian OFC y editado por yosue dejar créditos si lo van a usar 
import {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} from "@whiskeysockets/baileys";

const upload = async (m, { conn, from }) => {

    const msg = m.quoted || m;
    const mime = msg.mimetype || msg.mediaType || "";

    if (!/image/.test(mime)) {
        return m.reply("❌ Responde a una imagen o envíala junto al comando.");
    }

    try {

        const buffer = await msg.download();

        const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

        const res = await fetch("https://yoru-box.onrender.com/upload", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                data: base64,
                name: `img_${Date.now()}.png`
            })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        const media = await prepareWAMessageMedia(
            {
                image: buffer
            },
            {
                upload: conn.waUploadToServer
            }
        );

        const buttons = [
            {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: "📋 Copiar enlace",
                    copy_code: json.url
                })
            }
        ];

        const message = generateWAMessageFromContent(
            from,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: {
                                text: "✅ Imagen subida correctamente."
                            },
                            footer: {
                                text: "Yoru Box ⚡"
                            },
                            carouselMessage: {
                                cards: [
                                    {
                                        header: {
                                            title: "Imagen subida",
                                            hasMediaAttachment: true,
                                            imageMessage: media.imageMessage
                                        },
                                        body: {
                                            text: "Pulsa el botón para copiar el enlace."
                                        },
                                        footer: {
                                            text: "Shadow-BOT-MD"
                                        },
                                        nativeFlowMessage: {
                                            buttons
                                        }
                                    }
                                ]
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
        m.reply("❌ Error al subir la imagen.");
    }

};

upload.command = ["catbox", "imgurl", "upload"];

export default upload;
