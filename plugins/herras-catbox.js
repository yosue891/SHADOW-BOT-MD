//código echo por Cristian OFC y edítado y ajustado por yosue dejar créditos si lo van a usar 
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

        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", new Blob([buffer], { type: mime }), `img_${Date.now()}.png`);

        const res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const link = await res.text();

        if (!link || !link.startsWith("http")) {
            throw new Error("No se recibió un enlace válido de Catbox");
        }

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
                    copy_code: link.trim()
                })
            }
        ];

        const message = generateWAMessageFromContent(
            from,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: "✅ Imagen subida correctamente.",
                                hasMediaAttachment: true,
                                imageMessage: media.imageMessage
                            },
                            body: {
                                text: "Pulsa el botón de abajo para copiar el enlace de tu imagen."
                            },
                            footer: {
                                text: "Catbox Uploader ⚡"
                            },
                            nativeFlowMessage: {
                                buttons: buttons
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
        m.reply("❌ Error al subir la imagen a Catbox.");
    }

};

upload.command = ["catbox"];

export default upload;
