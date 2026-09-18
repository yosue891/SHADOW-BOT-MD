let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}
/**
 * Simple syntax highlighter for Carbon-like images
 * @param {string} code
 * @returns {Array<{text: string, color: string}>}
 */
function highlightCode(code) {
  const tokens = [];
  const keywords = [
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "switch",
    "case",
    "break",
    "continue",
    "true",
    "false",
    "null",
    "undefined",
    "async",
    "await",
    "new",
    "class",
    "extends",
    "super",
    "this",
    "import",
    "from",
    "export",
    "try",
    "catch",
    "finally",
    "throw",
    "default",
    "void",
    "typeof",
    "instanceof",
  ];
  const regex =
    /(\/\*[\s\S]*?\*\/|\/\/.*)|(".*?"|'.*?'|`.*?`)|(\b\d+\b)|([{}\[\](),.;:+\-*/%=<>!&|^~?])|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|(\s+)/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        text: code.slice(lastIndex, match.index),
        color: "#D4D4D4",
      });
    }

    const [full, comment, string, number, symbol, word, space] = match;

    if (comment) {
      tokens.push({ text: comment, color: "#6A9955" });
    } else if (string) {
      tokens.push({ text: string, color: "#CE9178" });
    } else if (number) {
      tokens.push({ text: number, color: "#B5CEA8" });
    } else if (symbol) {
      tokens.push({ text: symbol, color: "#D4D4D4" });
    } else if (word) {
      if (keywords.includes(word)) {
        tokens.push({ text: word, color: "#569CD6" });
      } else {
        tokens.push({ text: word, color: "#9CDCFE" });
      }
    } else if (space) {
      tokens.push({ text: space, color: "#D4D4D4" });
    } else {
      tokens.push({ text: full, color: "#D4D4D4" });
    }

    lastIndex = regex.lastIndex;
  }
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), color: "#D4D4D4" });
  }

  return tokens;
}

/**
 * Generate Carbon-like image from code
 * @param {string} code
 * @returns {Promise<Buffer>}
 */
async function generateCarbon(code) {
  const { createCanvas, GlobalFonts } = await _getCanvas();
  const padding = 50;
  const lineHeight = 24;
  const fontSize = 16;
  const fontFamily = "monospace";
  const lines = code.split("\n");
  const tempCanvas = createCanvas(100, 100);
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.font = `${fontSize}px ${fontFamily}`;
  let maxLineWidth = 0;
  for (const line of lines) {
    const width = tempCtx.measureText(line).width;
    if (width > maxLineWidth) maxLineWidth = width;
  }
  const width = Math.max(800, maxLineWidth + padding * 2);
  const height = lines.length * lineHeight + padding * 2 + 20;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1E1E1E";
  ctx.fillRect(0, 0, width, height);
  const startX = 20;
  const startY = 20;
  const gap = 20;
  ctx.beginPath();
  ctx.arc(startX, startY, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#FF5F56";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(startX + gap, startY, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#FFBD2E";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(startX + gap * 2, startY, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#27C93F";
  ctx.fill();
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "top";

  let currentY = padding + 20;

  for (const line of lines) {
    let currentX = padding;
    const tokens = highlightCode(line);

    for (const token of tokens) {
      ctx.fillStyle = token.color;
      ctx.fillText(token.text, currentX, currentY);
      currentX += ctx.measureText(token.text).width;
    }

    currentY += lineHeight;
  }

  return canvas.toBuffer("image/png");
}

export { generateCarbon };
