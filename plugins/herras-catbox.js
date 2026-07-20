//código echo por Cristian OFC dejar créditos si lo van a usar 
import {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} from "@whiskeysockets/baileys";
import FormData from "form-data";

const upload = async (m, { conn, from }) => {

    const msg = m.quoted || m;
    const mime = msg.mimetype || msg.mediaType || "";

    if (!/image/.test(mime)) {
        return m.reply("❌ Responde a una imagen o envíala junto al comando.");
    }

    try {

        const buffer = await msg.download();

        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", buffer, {
            filename: `img_${Date.now()}.png`,
            contentType: mime
        });

        const res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: form,
            headers: form.getHeaders()
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const link = await res.text();

        if (!link || !link.trim().startsWith("http")) {
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
