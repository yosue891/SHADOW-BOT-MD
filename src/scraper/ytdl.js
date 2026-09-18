import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const YOUTUBE_ID_REGEX =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const run = promisify(exec);

function extractVideoId(url) {
  return String(url || "").match(YOUTUBE_ID_REGEX)?.[1] || null;
}

async function fallbackToMp3Buffer(url) {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const id = crypto.randomBytes(6).toString("hex");
  const inputPath = path.join(tempDir, `ytfb_${id}.bin`);
  const outputPath = path.join(tempDir, `ytfb_${id}.mp3`);

  try {
    const { data } = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000,
    });

    const buffer = Buffer.from(data);
    if (!buffer.length) {
      throw new Error("Audio de respaldo vacío");
    }

    fs.writeFileSync(inputPath, buffer);

    await run(
      `ffmpeg -y -i "${inputPath}" -vn -map_metadata -1 -ac 2 -ar 44100 -c:a libmp3lame -b:a 192k "${outputPath}"`,
      { timeout: 120000 },
    );

    const mp3Buffer = fs.readFileSync(outputPath);
    if (!mp3Buffer.length) {
      throw new Error("Conversión de respaldo a MP3 fallida");
    }

    return mp3Buffer;
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch {}
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch {}
  }
}

async function ytdl(url, format = "mp3") {
  try {
    const videoId = extractVideoId(url);

    if (!videoId) {
      return {
        status: false,
        mess: "Formato de URL no reconocido o no es un enlace de YouTube válido.",
      };
    }

    const normalizedFormat =
      String(format || "mp3").toLowerCase() === "mp4" ? "mp4" : "mp3";

    const client = axios.create({
      timeout: 60000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7271.123 Mobile Safari/537.36",
        Referer: "https://id.ytmp3.mobi/",
      },
    });

    const { data: init } = await client.get("https://d.ymcdn.org/api/v1/init", {
      params: {
        p: "y",
        23: "1llum1n471",
        _: Math.random(),
      },
    });

    if (!init?.convertURL) {
      return {
        status: false,
        mess: "Error al inicializar servidor (Init failed).",
      };
    }

    const { data: convert } = await client.get(init.convertURL, {
      params: {
        v: videoId,
        f: normalizedFormat,
        _: Math.random(),
      },
    });

    if (!convert?.progressURL || !convert?.downloadURL) {
      return {
        status: false,
        mess: "Error al obtener datos de conversión.",
      };
    }

    let progress = 0;
    let title = convert.title || "";
    let attempts = 0;
    const maxAttempts = 20;

    while (progress < 3 && attempts < maxAttempts) {
      const { data } = await client.get(convert.progressURL);

      if ((data?.error || 0) > 0) {
        return {
          status: false,
          mess: `Error del servidor: ${data.error}`,
        };
      }

      progress = Number(data?.progress || 0);
      title = data?.title || title;

      if (progress < 3) {
        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    if (attempts >= maxAttempts && progress < 3) {
      return {
        status: false,
        mess: "Request timeout (proceso demasiado lento).",
      };
    }

    return { status: true, title, dl: convert.downloadURL };
  } catch (e) {
    return { status: false, mess: `System Error: ${e.message}` };
  }
}

class Youtube {
  constructor() {
    this.CREATED_BY = "Ditzzy";
    this.NOTE = "Thank you for using this scrape";
  }

  wrapResponse(data) {
    return {
      created_by: this.CREATED_BY,
      note: this.NOTE,
      results: data,
    };
  }

  async download(url, format = "audio") {
    const outputFormat = ["video", "mp4"].includes(
      String(format || "audio").toLowerCase(),
    )
      ? "mp4"
      : "mp3";
    const result = await ytdl(url, outputFormat);

    if (!result?.status || !result?.dl) {
      throw new Error(result?.mess || "Error al descargar contenido de YouTube");
    }

    return this.wrapResponse({
      title: result.title,
      download: result.dl,
      url: result.dl,
      format: outputFormat,
    });
  }
}

export { ytdl, Youtube, fallbackToMp3Buffer };
export default ytdl;
