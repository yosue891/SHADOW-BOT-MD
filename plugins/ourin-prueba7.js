import fs from "fs";
import crypto from "node:crypto";
import path from "path";
import axios from "axios";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFile } from "child_process";
import { promisify } from "util";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "ourin";
import te from "../../src/lib/ourin-error.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";

const execFileAsync = promisify(execFile);

const API_BASE = "https://apiyosoyyo-ofc.onrender.com/api/ytshorts";
const API_KEY = process.env.YOSOY_API_KEY || "yosoyyo_sk_fsy4b2in";
const API_TIMEOUT_MS = 3 * 60 * 1000;
const THUMB_TIMEOUT_MS = 90 * 1000;
const MAX_VIDEO_BYTES = 95 * 1024 * 1024;

const pluginConfig = {
  name: "prueba7",
  alias: ["ytshortlive", "shortlive", "fotoliveyt"],
  category: "tools",
  description: "Descargar un YouTube Shorts y enviarlo como foto live",
  usage: ".prueba7 <url de YouTube Shorts>",
  example: ".prueba7 https://youtube.com/shorts/fLYUDrHmSUs",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function getTempDir() {
  const dir = path.join(process.cwd(), "tmp", "ytshorts-live");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(files = []) {
  for (const file of files) {
    if (!file) continue;
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {}
  }
}

function extractYouTubeUrl(text = "") {
  const match = String(text || "").match(/https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)[^\s<>"']+/i);
  return match ? match[0].replace(/[),.]+$/g, "") : "";
}

function extractVideoId(url = "") {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.split("/").filter(Boolean)[1] || "";
    }
    return parsed.searchParams.get("v") || "";
  } catch {
    const match = String(url).match(/(?:shorts\/|youtu\.be\/|v=)([A-Za-z0-9_-]{6,})/);
    return match?.[1] || "";
  }
}

function safeTitle(title = "YouTube Shorts") {
  return String(title || "YouTube Shorts")
    .replace(/[\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function buildApiUrl(shortsUrl) {
  const params = new URLSearchParams({
    url: shortsUrl,
    apiKey: API_KEY,
  });
  return `${API_BASE}?${params.toString()}`;
}

async function fetchShortsInfo(shortsUrl) {
  const { data } = await axios.get(API_BASE, {
    timeout: API_TIMEOUT_MS,
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    params: {
      url: shortsUrl,
      apiKey: API_KEY,
    },
  });

  // La API oficial responde así:
  // { status: true, creator: "YO SOY YO", result: { title, id, downloadUrl } }
  // También aceptamos la forma plana por compatibilidad futura.
  const result = data?.result || data;

  if (data?.status === false || !result?.downloadUrl) {
    throw new Error(data?.message || data?.error || result?.message || result?.error || "La API no devolvió downloadUrl");
  }

  return {
    title: safeTitle(result.title),
    id: result.id || extractVideoId(shortsUrl),
    downloadUrl: result.downloadUrl,
    creator: data?.creator || "YO SOY YO",
    raw: data,
  };
}

function isHtmlBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) return false;
  const head = buffer.subarray(0, 300).toString("utf8").toLowerCase();
  return head.includes("<html") || head.includes("<!doctype html");
}

function isMp4Buffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
}

async function downloadShortsVideo(downloadUrl) {
  const { data, headers } = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
    timeout: API_TIMEOUT_MS,
    maxRedirects: 5,
    maxBodyLength: MAX_VIDEO_BYTES,
    maxContentLength: MAX_VIDEO_BYTES,
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "video/mp4,application/octet-stream,*/*",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const buffer = Buffer.from(data || []);
  const contentType = headers?.["content-type"] || "video/mp4";

  if (!buffer.length) throw new Error("El video descargado está vacío");
  if (buffer.length > MAX_VIDEO_BYTES) throw new Error("El video es demasiado grande para foto live");
  if (isHtmlBuffer(buffer)) throw new Error("El enlace del short devolvió HTML en vez de video");
  if (!/^video\//i.test(contentType) && !isMp4Buffer(buffer)) {
    throw new Error("El enlace del short no devolvió un video válido");
  }

  return {
    buffer,
    contentType: contentType.split(";")[0] || "video/mp4",
  };
}

async function captureFrameFromBuffer(videoBuffer, videoId = "") {
  const tmpDir = getTempDir();
  const input = path.join(tmpDir, `ytshorts-${videoId || Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  const output = path.join(tmpDir, `ytshorts-${videoId || Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);

  try {
    fs.writeFileSync(input, videoBuffer);
    await execFileAsync(
      ffmpegInstaller.path,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        "00:00:01",
        "-i",
        input,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        output,
      ],
      { timeout: THUMB_TIMEOUT_MS },
    );

    if (fs.existsSync(output) && fs.statSync(output).size > 1000) {
      return fs.readFileSync(output);
    }
  } catch (error) {
    console.error("[prueba7] captura local ffmpeg falló:", error?.message || error);
  } finally {
    cleanup([input, output]);
  }

  return null;
}

async function captureFrame(videoUrl, videoId = "") {
  const tmpDir = getTempDir();
  const output = path.join(tmpDir, `ytshorts-${videoId || Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);

  try {
    await execFileAsync(
      ffmpegInstaller.path,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        "00:00:01",
        "-i",
        videoUrl,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        output,
      ],
      { timeout: THUMB_TIMEOUT_MS },
    );

    if (fs.existsSync(output) && fs.statSync(output).size > 1000) {
      const buffer = fs.readFileSync(output);
      cleanup([output]);
      return buffer;
    }
  } catch (error) {
    cleanup([output]);
    console.error("[prueba7] captura ffmpeg falló:", error?.message || error);
  }

  return null;
}

async function fetchThumbnailFallback(videoId = "") {
  if (!videoId) return null;
  const urls = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  ];

  for (const url of urls) {
    try {
      const { data, headers } = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const buffer = Buffer.from(data || []);
      const contentType = headers?.["content-type"] || "";
      if (buffer.length > 1000 && /^image\//i.test(contentType)) return buffer;
    } catch {}
  }

  return null;
}

async function getVideoCapture(videoInput, videoId) {
  if (Buffer.isBuffer(videoInput)) {
    return (await captureFrameFromBuffer(videoInput, videoId)) || (await fetchThumbnailFallback(videoId));
  }
  return (await captureFrame(videoInput, videoId)) || (await fetchThumbnailFallback(videoId));
}

function buildChildMessageId(parentId = "") {
  return `${parentId || Date.now().toString(36)}_YT_SHORT_LIVE_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function buildCaption(info) {
  return (
    `📸 *YOUTUBE SHORTS FOTO LIVE*\n\n` +
    `> Título: *${info.title}*\n` +
    `> ID: \`${info.id || "-"}\`\n\n` +
    `𐙚 𝑲𝒂𝒏𝒂-𝑨𝒔𝒔𝒊𝒔𝒕𝒂𝒏𝒕 ᰔᩚ ✧ Kana dice: si Ruby brilla en un short, esta escena también puede vivir.`
  );
}

async function sendFotoLive(sock, chatId, imageInput, videoUrl, quoted = null, caption = "") {
  if (!sock?.waUploadToServer) {
    throw new Error("waUploadToServer no está disponible en este socket");
  }

  const imagePayload = Buffer.isBuffer(imageInput)
    ? { image: imageInput }
    : { image: { url: imageInput } };

  const image = await prepareWAMessageMedia(imagePayload, {
    upload: sock.waUploadToServer,
  });

  const videoPayload = Buffer.isBuffer(videoUrl)
    ? { video: videoUrl }
    : { video: { url: videoUrl } };

  const video = await prepareWAMessageMedia(videoPayload, {
    upload: sock.waUploadToServer,
  });

  if (!image?.imageMessage) throw new Error("No se pudo preparar la captura del video");
  if (!video?.videoMessage) throw new Error("No se pudo preparar el video");

  const parentMsg = generateWAMessageFromContent(
    chatId,
    {
      messageContextInfo: {
        messageSecret: crypto.randomBytes(32),
      },
      imageMessage: {
        ...image.imageMessage,
        contextInfo: {
          ...(image.imageMessage.contextInfo || {}),
          pairedMediaType: 5,
          statusSourceType: 0,
        },
      },
    },
    { quoted },
  );

  await sock.relayMessage(chatId, parentMsg.message, {
    messageId: parentMsg.key.id,
  });

  // Motion Photo / Foto Live: el video asociado debe viajar dentro de
  // associatedChildMessage, mientras que la asociación va en el messageContextInfo
  // del mensaje contenedor. Si messageAssociation queda dentro del hijo, algunos
  // clientes solo muestran la imagen y nunca habilitan la reproducción live.
  const childMsg = generateWAMessageFromContent(
    chatId,
    {
      associatedChildMessage: {
        message: {
          videoMessage: {
            ...video.videoMessage,
            contextInfo: {
              ...(video.videoMessage.contextInfo || {}),
              pairedMediaType: 6,
              statusSourceType: 1,
            },
          },
        },
      },
      messageContextInfo: {
        messageSecret: crypto.randomBytes(32),
        messageAssociation: {
          associationType: 12,
          parentMessageKey: parentMsg.key,
        },
      },
    },
    { userJid: sock.user?.jid || sock.user?.id },
  );

  await sock.relayMessage(chatId, childMsg.message, {
    messageId: childMsg.key.id,
  });

  return parentMsg.key;
}

async function sendFallback(sock, m, info, imageBuffer = null, videoBuffer = null) {
  const caption = buildCaption(info) + "\n\n> Tu WhatsApp no renderizó el formato live, envío el video normal.";

  if (imageBuffer) {
    await sock.sendMessage(
      m.chat,
      { image: imageBuffer, caption: `🖼️ *Captura del short*\n\n${info.title}` },
      { quoted: m },
    );
  }

  return sock.sendMessage(
    m.chat,
    {
      video: videoBuffer || { url: info.downloadUrl },
      caption,
      mimetype: "video/mp4",
      contextInfo: saluranCtx(),
    },
    { quoted: m },
  );
}

async function handler(m, { sock }) {
  const shortsUrl = extractYouTubeUrl(m.text || m.args?.join(" ") || "");

  if (!shortsUrl) {
    return m.reply(
      `📸 *YOUTUBE SHORTS FOTO LIVE*\n\n` +
        `Convierte un YouTube Shorts en foto live: la imagen será una captura del video y el live tendrá el video descargado.\n\n` +
        `*Uso:*\n` +
        `> \`${m.prefix}prueba7 https://youtube.com/shorts/xxxx\``,
    );
  }

  await m.react("🕕");

  let info = null;
  let imageBuffer = null;
  let videoBuffer = null;

  try {
    await m.reply(
      `📥 *Procesando YouTube Shorts...*\n\n` +
        `> Consultando API oficial YO SOY YO.\n` +
        `> Preparando captura + video live.`,
    );

    info = await fetchShortsInfo(shortsUrl);

    try {
      const videoData = await downloadShortsVideo(info.downloadUrl);
      videoBuffer = videoData.buffer;
    } catch (downloadError) {
      console.error("[prueba7] descarga del short falló, usando URL directa:", downloadError?.message || downloadError);
    }

    // La captura y el live se crean desde el MISMO video del short.
    imageBuffer = await getVideoCapture(videoBuffer || info.downloadUrl, info.id);

    if (!imageBuffer) {
      throw new Error("No se pudo obtener captura del video");
    }

    await sendFotoLive(sock, m.chat, imageBuffer, videoBuffer || info.downloadUrl, m, buildCaption(info));
    await m.react("✅");
  } catch (error) {
    console.error("[prueba7/ytshorts-live] error:", error?.message || error);

    try {
      if (info?.downloadUrl) {
        await sendFallback(sock, m, info, imageBuffer, videoBuffer);
        await m.react("✅");
        return;
      }
    } catch (fallbackError) {
      console.error("[prueba7/ytshorts-live] fallback error:", fallbackError?.message || fallbackError);
    }

    await m.react("☢");
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
