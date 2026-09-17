import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const BASE_URL = "https://imgdrop.web.id";
const UPLOAD_URL = `${BASE_URL}/upload.php`;
const REFERER = `${BASE_URL}/?i=1`;

function randomBoundary() {
  const rand = crypto.randomBytes(12).toString("base64url").replace(/[^a-zA-Z0-9]/g, "");
  return `----WebKitFormBoundary${rand.slice(0, 16)}`;
}

function guessMime(filename) {
  const ext = path.extname(filename).toLowerCase();

  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml"
  };

  return map[ext] || "application/octet-stream";
}

function toHex(buffer) {
  return Buffer.from(buffer).toString("hex").toLowerCase();
}

function solveJsChallenge(html) {
  const match = html.match(
    /var a=toNumbers\("([^"]+)"\),b=toNumbers\("([^"]+)"\),c=toNumbers\("([^"]+)"\)/
  );

  if (!match) return "";

  const key = Buffer.from(match[1], "hex");
  const iv = Buffer.from(match[2], "hex");
  const encrypted = Buffer.from(match[3], "hex");

  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  decipher.setAutoPadding(false);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return `__test=${toHex(decrypted)}`;
}

function parseSetCookie(headers) {
  const cookies = [];

  if (typeof headers.getSetCookie === "function") {
    for (const cookie of headers.getSetCookie()) {
      cookies.push(cookie.split(";")[0]);
    }
  } else {
    const raw = headers.get("set-cookie");
    if (raw) {
      cookies.push(raw.split(";")[0]);
    }
  }

  return cookies.join("; ");
}

function mergeCookies(...cookieStrings) {
  const map = new Map();

  for (const cookieString of cookieStrings) {
    if (!cookieString) continue;

    for (const item of cookieString.split("; ")) {
      const [name] = item.split("=");
      if (name) map.set(name, item);
    }
  }

  return [...map.values()].join("; ");
}

async function getSessionCookie() {
  const manualCookie = process.env.IMGDROP_COOKIE;
  if (manualCookie) return manualCookie;

  const res = await fetch(REFERER, {
    method: "GET",
    redirect: "manual",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
      "accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    }
  });

  const headerCookie = parseSetCookie(res.headers);
  const text = await res.text();
  const challengeCookie = solveJsChallenge(text);

  return mergeCookies(headerCookie, challengeCookie);
}

function createMultipartBody({ fieldName, filename, mime, fileBuffer, boundary }) {
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
      `Content-Type: ${mime}\r\n\r\n`,
    "utf8"
  );

  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");

  return Buffer.concat([head, fileBuffer, tail]);
}

async function requestUpload(fileBuffer, filename, cookie = "") {
  const mime = guessMime(filename);
  const boundary = randomBoundary();

  const body = createMultipartBody({
    fieldName: "file",
    filename,
    mime,
    fileBuffer,
    boundary
  });

  const headers = {
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    "accept": "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": `multipart/form-data; boundary=${boundary}`,
    "content-length": String(body.length),
    "origin": BASE_URL,
    "referer": REFERER,
    "sec-ch-ua-platform": `"Android"`,
    "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
    "sec-ch-ua-mobile": "?1",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "priority": "u=1, i"
  };

  if (cookie) {
    headers.cookie = cookie;
  }

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    redirect: "manual",
    headers,
    body
  });

  const responseText = await res.text();

  return {
    res,
    responseText,
    cookie
  };
}

async function uploadImage(buffer, filename) {
  let cookie = await getSessionCookie();

  let result = await requestUpload(buffer, filename, cookie);

  if (result.responseText.includes("slowAES.decrypt") || result.responseText.includes("__test=")) {
    const challengeCookie = solveJsChallenge(result.responseText);

    if (challengeCookie) {
      cookie = mergeCookies(cookie, challengeCookie);
      result = await requestUpload(buffer, filename, cookie);
    }
  }

  let json = null;

  try {
    json = JSON.parse(result.responseText);
  } catch {
    json = null;
  }

  return {
    status: result.res.ok && Boolean(json?.success),
    code: result.res.status,
    url: json?.url || "",
    size: json?.size || "",
    filename: json?.filename || ""
  };
}

export default uploadImage;
