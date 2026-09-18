import sharp from "sharp";

const VARIANT_STYLES = {
  default: {
    label: "Brat Default",
    width: 768,
    height: 768,
    bg: "#f7f7f2",
    fg: "#111111",
    accent: "#d9d9d2",
    font: "Arial, Helvetica, sans-serif",
    maxChars: 14,
    decoration: "grid",
  },
  green: {
    label: "Brat Green",
    width: 768,
    height: 768,
    bg: "#8ace00",
    fg: "#101010",
    accent: "#baff28",
    font: "Arial, Helvetica, sans-serif",
    maxChars: 13,
    decoration: "noise",
  },
  white: {
    label: "Brat White",
    width: 768,
    height: 768,
    bg: "#ffffff",
    fg: "#111111",
    accent: "#eeeeee",
    font: "Arial, Helvetica, sans-serif",
    maxChars: 13,
    decoration: "paper",
  },
  anime: {
    label: "Brat Anime",
    width: 768,
    height: 768,
    bg: "#ffe5f2",
    fg: "#4d1430",
    accent: "#ff7eb6",
    font: "Arial, Helvetica, sans-serif",
    maxChars: 12,
    decoration: "anime",
  },
  patrick: {
    label: "Brat Patrick",
    width: 768,
    height: 768,
    bg: "#ff9fc8",
    fg: "#35131f",
    accent: "#7ed957",
    font: "Arial, Helvetica, sans-serif",
    maxChars: 12,
    decoration: "patrick",
  },
  squidward: {
    label: "Brat Squidward",
    width: 768,
    height: 768,
    bg: "#9fd8d2",
    fg: "#102f34",
    accent: "#4f8d89",
    font: "Arial, Helvetica, sans-serif",
    maxChars: 12,
    decoration: "squidward",
  },
  hd: {
    label: "Brat HD",
    width: 1024,
    height: 1024,
    bg: "#f8f8f2",
    fg: "#050505",
    accent: "#b5b5ae",
    font: "Arial, Helvetica, sans-serif",
    maxChars: 16,
    decoration: "hd",
  },
};

function containsEmoji(value = "") {
  return /[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(String(value));
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripEmojiForText(value = "") {
  return String(value)
    .replace(/[\p{Extended_Pictographic}\u2600-\u27BF][\uFE0E\uFE0F]?(?:\u200D[\p{Extended_Pictographic}\u2600-\u27BF][\uFE0E\uFE0F]?)*|[\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(text = "") {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function wrapText(text, maxChars = 13) {
  const words = cleanText(text).split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : ["brat"];
}

function getFontSize(lines, style) {
  const { width, height } = style;
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const byWidth = Math.floor((width * 0.82) / Math.max(longest * 0.58, 1));
  const byHeight = Math.floor((height * 0.68) / Math.max(lines.length * 1.05, 1));
  return Math.max(44, Math.min(148, byWidth, byHeight));
}

function decorations(style) {
  const { width, height, accent, decoration } = style;
  if (decoration === "anime") {
    return `
      <circle cx="${width - 115}" cy="120" r="82" fill="${accent}" opacity="0.45"/>
      <circle cx="115" cy="${height - 115}" r="95" fill="#ffffff" opacity="0.35"/>
      <text x="95" y="135" font-size="58" opacity="0.65">✦</text>
      <text x="${width - 160}" y="${height - 105}" font-size="68" opacity="0.65">♡</text>
      <path d="M0 ${height * 0.72} C ${width * 0.25} ${height * 0.62}, ${width * 0.35} ${height * 0.9}, ${width} ${height * 0.75} L ${width} ${height} L 0 ${height} Z" fill="${accent}" opacity="0.18"/>
    `;
  }
  if (decoration === "patrick") {
    return `
      <circle cx="120" cy="120" r="88" fill="#ff6ba5" opacity="0.35"/>
      <circle cx="${width - 115}" cy="${height - 135}" r="104" fill="#7ed957" opacity="0.35"/>
      <text x="${width - 178}" y="165" font-size="78" opacity="0.72">★</text>
      <text x="78" y="${height - 88}" font-size="68" opacity="0.72">★</text>
    `;
  }
  if (decoration === "squidward") {
    return `
      <circle cx="${width - 115}" cy="125" r="88" fill="#4f8d89" opacity="0.32"/>
      <circle cx="110" cy="${height - 120}" r="96" fill="#ffffff" opacity="0.22"/>
      <path d="M45 ${height - 115} C 180 ${height - 230}, 300 ${height - 25}, 445 ${height - 145} S ${width - 90} ${height - 230}, ${width - 35} ${height - 118}" fill="none" stroke="#4f8d89" stroke-width="18" opacity="0.38" stroke-linecap="round"/>
      <text x="72" y="140" font-size="62" opacity="0.6">♬</text>
    `;
  }
  if (decoration === "paper" || decoration === "hd") {
    return `
      <rect x="30" y="30" width="${width - 60}" height="${height - 60}" rx="36" fill="none" stroke="${accent}" stroke-width="${decoration === "hd" ? 8 : 5}" opacity="0.8"/>
      <line x1="70" y1="${height - 92}" x2="${width - 70}" y2="${height - 92}" stroke="${accent}" stroke-width="4" opacity="0.5"/>
    `;
  }
  if (decoration === "noise") {
    return `
      <circle cx="94" cy="122" r="62" fill="#ffffff" opacity="0.18"/>
      <circle cx="${width - 92}" cy="${height - 112}" r="80" fill="#000000" opacity="0.08"/>
      <path d="M0 ${height * 0.18} L ${width} ${height * 0.05} L ${width} 0 L 0 0 Z" fill="#ffffff" opacity="0.12"/>
    `;
  }
  return `
    <pattern id="tinyGrid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M 42 0 L 0 0 0 42" fill="none" stroke="${accent}" stroke-width="2" opacity="0.32"/>
    </pattern>
    <rect width="${width}" height="${height}" fill="url(#tinyGrid)" opacity="0.45"/>
  `;
}

function buildSvg(text, variant = "default") {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const lines = wrapText(text, style.maxChars);
  const fontSize = getFontSize(lines, style);
  const lineHeight = Math.round(fontSize * 1.03);
  const totalHeight = lineHeight * lines.length;
  const startY = Math.round((style.height - totalHeight) / 2 + fontSize * 0.8);
  const textShadow = variant === "hd" ? "0 6px 0 rgba(0,0,0,0.10)" : "0 4px 0 rgba(0,0,0,0.08)";
  const stroke = variant === "hd" ? "stroke:#ffffff;stroke-width:10px;paint-order:stroke;" : "";

  const fontFamily = containsEmoji(text)
    ? "Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, Arial, Helvetica, sans-serif"
    : style.font;
  const letterSpacing = containsEmoji(text) ? "0px" : "-3px";
  const tspans = lines
    .map((line, index) => {
      const textLine = containsEmoji(line) ? stripEmojiForText(line) : line;
      return `<tspan x="50%" y="${startY + index * lineHeight}">${escapeXml(textLine || " ")}</tspan>`;
    })
    .join("");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${style.width}" height="${style.height}" viewBox="0 0 ${style.width} ${style.height}">
    <rect width="100%" height="100%" fill="${style.bg}"/>
    ${decorations(style)}
    <text
      x="50%"
      y="50%"
      text-anchor="middle"
      font-family="${fontFamily}"
      font-size="${fontSize}"
      font-weight="900"
      fill="${style.fg}"
      style="letter-spacing:${letterSpacing};filter:drop-shadow(${textShadow});${stroke}"
    >${tspans}</text>
  </svg>`;
}

function getEmojiMatches(text = "") {
  const matches = [];
  const regex = /\p{Extended_Pictographic}/gu;
  let match;
  while ((match = regex.exec(String(text))) && matches.length < 8) {
    matches.push(match[0]);
  }
  return matches;
}

function emojiCodepoint(emoji) {
  return [...emoji]
    .map((char) => char.codePointAt(0).toString(16))
    .join("-");
}

async function fetchEmojiImage(emoji, size = 96) {
  const codepoint = emojiCodepoint(emoji);
  const urls = [
    `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codepoint}.png`,
    `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint}.png`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!response.ok) continue;
      const input = Buffer.from(await response.arrayBuffer());
      return await sharp(input)
        .resize(size, size, { fit: "contain" })
        .png()
        .toBuffer();
    } catch {}
  }

  return null;
}

async function overlayEmojiFallback(baseBuffer, text, variant = "default") {
  const emojis = getEmojiMatches(text);
  if (!emojis.length) return baseBuffer;

  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const uniqueEmojis = [...new Set(emojis)].slice(0, 6);
  const overlays = [];
  const size = Math.max(72, Math.round(style.width * 0.105));
  const gap = Math.round(size * 0.18);
  const totalWidth = uniqueEmojis.length * size + (uniqueEmojis.length - 1) * gap;
  let left = Math.round((style.width - totalWidth) / 2);
  const top = Math.round(style.height * 0.78);

  for (const emoji of uniqueEmojis) {
    const input = await fetchEmojiImage(emoji, size);
    if (input) {
      overlays.push({ input, left, top });
      left += size + gap;
    }
  }

  if (!overlays.length) return baseBuffer;
  return sharp(baseBuffer).composite(overlays).png().toBuffer();
}

async function createBratImage(text, variant = "default") {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const svg = buildSvg(text, variant);
  let buffer = await sharp(Buffer.from(svg))
    .resize(style.width, style.height, { fit: "cover" })
    .png()
    .toBuffer();

  if (containsEmoji(text)) {
    buffer = await overlayEmojiFallback(buffer, text, variant);
  }

  return buffer;
}

async function sendBratSticker(sock, m, text, variant = "default", stickerOptions = {}) {
  const buffer = await createBratImage(text, variant);
  return sock.sendImageAsSticker(m.chat, buffer, m, stickerOptions);
}

export { VARIANT_STYLES, createBratImage, sendBratSticker };
