import fs from "fs";
import path from "path";
import { AIRich } from "../../src/lib/ourin-builder.js";
import { getPlugin, getAllPlugins } from "../../src/lib/ourin-plugins.js";

function normalize(value = "") {
  return String(value || "").trim().toLowerCase();
}

function pluginsRoot() {
  return path.resolve(process.cwd(), "plugins");
}

function isInsidePlugins(filePath) {
  const root = pluginsRoot();
  const resolved = path.resolve(filePath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function safePluginPath(input) {
  const root = pluginsRoot();
  const clean = String(input || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);

  if (!parts.length || parts.some((part) => part === ".." || part.includes("\0"))) {
    return null;
  }

  const last = parts.pop();
  const file = last.endsWith(".js") ? last : `${last}.js`;
  const resolved = path.resolve(root, ...parts, file);

  if (!isInsidePlugins(resolved)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;

  return resolved;
}

function listPluginFiles(dir = pluginsRoot()) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...listPluginFiles(full));
    } else if (stat.isFile() && entry.endsWith(".js") && !entry.startsWith("_")) {
      files.push(full);
    }
  }

  return files;
}

function relativePluginPath(filePath) {
  return path.relative(pluginsRoot(), filePath).replace(/\\/g, "/");
}

function pluginInfoFromPath(filePath) {
  const rel = relativePluginPath(filePath);
  const parts = rel.split("/");
  return {
    path: filePath,
    category: parts.length > 1 ? parts[0] : "uncategorized",
    file: path.basename(filePath),
    relative: rel,
  };
}

function extractStringValues(raw = "") {
  const values = [];
  const stringRegex = /["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = stringRegex.exec(raw))) values.push(normalize(match[1]));
  return values;
}

function extractConfigNames(content = "", key = "name") {
  const values = [];
  const propRegex = new RegExp(
    String(key) + "\\s*[:=]\\s*(\\[[\\s\\S]*?\\]|[\"'`][^\"'`]+[\"'`])",
    "m",
  );
  const match = content.match(propRegex);
  if (!match) return values;

  if (match[1].trim().startsWith("[")) {
    values.push(...extractStringValues(match[1]));
  } else {
    values.push(...extractStringValues(match[1]));
  }

  return [...new Set(values)];
}

function searchLoadedPlugin(name) {
  const wanted = normalize(name);
  try {
    const loaded = getPlugin(wanted);
    if (loaded?.filePath && fs.existsSync(loaded.filePath) && isInsidePlugins(loaded.filePath)) {
      return pluginInfoFromPath(path.resolve(loaded.filePath));
    }
  } catch {}
  return null;
}

function searchPlugin(name) {
  const wanted = normalize(name);
  if (!wanted) return null;

  // 1) Buscar por plugin ya cargado. Esto soporta config.name como array y aliases.
  const loaded = searchLoadedPlugin(wanted);
  if (loaded) return loaded;

  // 2) Buscar por ruta explícita: owner/getplugin, random/anime.js, etc.
  if (wanted.includes("/")) {
    const byPath = safePluginPath(wanted);
    if (byPath) return pluginInfoFromPath(byPath);
  }

  const files = listPluginFiles();

  // 3) Buscar por nombre de archivo.
  for (const filePath of files) {
    const base = normalize(path.basename(filePath, ".js"));
    if (base === wanted) return pluginInfoFromPath(filePath);
  }

  // 4) Buscar estáticamente por config.name, config.alias o handler.command dentro del archivo.
  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const names = extractConfigNames(content, "name");
      const aliases = extractConfigNames(content, "alias");
      const commands = extractConfigNames(content, "command");
      if ([...names, ...aliases, ...commands].includes(wanted)) return pluginInfoFromPath(filePath);
    } catch {}
  }

  return null;
}

function collectKnownPlugins() {
  const entries = [];
  const seen = new Set();

  try {
    for (const plugin of getAllPlugins()) {
      if (!plugin?.filePath || !fs.existsSync(plugin.filePath) || !isInsidePlugins(plugin.filePath)) continue;
      const info = pluginInfoFromPath(path.resolve(plugin.filePath));
      const names = Array.isArray(plugin.config?.name) ? plugin.config.name : [plugin.config?.name];
      const aliases = Array.isArray(plugin.config?.alias) ? plugin.config.alias : [];
      for (const value of [...names, ...aliases, path.basename(info.file, ".js"), info.relative]) {
        const key = normalize(value);
        if (!key || seen.has(`${key}:${info.relative}`)) continue;
        seen.add(`${key}:${info.relative}`);
        entries.push({ name: key, info });
      }
    }
  } catch {}

  for (const filePath of listPluginFiles()) {
    const info = pluginInfoFromPath(filePath);
    const base = normalize(path.basename(filePath, ".js"));
    if (!seen.has(`${base}:${info.relative}`)) {
      seen.add(`${base}:${info.relative}`);
      entries.push({ name: base, info });
    }
  }

  return entries;
}

function similarity(a, b) {
  a = normalize(a);
  b = normalize(b);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;

  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  const distance = matrix[b.length][a.length];
  const max = Math.max(a.length, b.length);
  return Math.round((1 - distance / max) * 100);
}

function getSimilarPlugins(name) {
  const wanted = normalize(name);
  return collectKnownPlugins()
    .map((entry) => ({ ...entry, score: similarity(wanted, entry.name) }))
    .filter((entry) => entry.score >= 35 || entry.name.includes(wanted) || wanted.includes(entry.name))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((entry) => entry.info.relative);
}

function buildUsage(prefix = ".") {
  return (
    `📦 *PRUEBA3 — RICH CODE*\n\n` +
    `Obtiene y muestra el código fuente de un plugin renderizado con AIRich.\n\n` +
    `*Uso:*\n` +
    `> \`${prefix}prueba3 <comando o archivo>\`\n\n` +
    `*Ejemplos:*\n` +
    `> \`${prefix}prueba3 menu\`\n` +
    `> \`${prefix}prueba3 waifu\`\n` +
    `> \`${prefix}prueba3 facebook\`\n` +
    `> \`${prefix}prueba3 prueba1\``
  );
}

async function sendAsRichCode(sock, m, pluginInfo, codeText) {
  return new AIRich(sock)
    .addText(
      `📦 *Código del plugin*\n\n` +
      `- Archivo: \`${pluginInfo.file}\`\n` +
      `- Categoría: \`${pluginInfo.category}\`\n` +
      `- Ruta: \`${pluginInfo.relative}\`\n`,
    )
    .addCode("javascript", codeText)
    .addText("\nCopia el código de arriba o usa el archivo si el mensaje no carga completo.")
    .send(m.chat, { quoted: m });
}

const handler = async (m, { conn, args, text, usedPrefix }) => {
  const sock = conn;
  const pluginName = (args?.[0] || text || "").trim();
  if (!pluginName) return m.reply(buildUsage(usedPrefix || "."));

  const pluginInfo = searchPlugin(pluginName);

  if (!pluginInfo) {
    const similar = [...new Set(getSimilarPlugins(pluginName))];
    let replyText = `❌ *PLUGIN NO ENCONTRADO*\n\n`;
    replyText += `> No encontré: \`${pluginName}\`\n\n`;
    if (similar.length > 0) {
      replyText += `*Quizás buscabas:*\n`;
      for (const item of similar) replyText += `> • \`${item}\`\n`;
    }
    return m.reply(replyText);
  }

  const codeBuffer = fs.readFileSync(pluginInfo.path);
  const codeText = codeBuffer.toString("utf8");

  if (!codeText.trim()) {
    return m.reply(`❌ El archivo \`${pluginInfo.relative}\` está vacío.`);
  }

  try {
    await sendAsRichCode(sock, m, pluginInfo, codeText);
  } catch (error) {
    console.error("[prueba3] AIRich fallback:", error?.message || error);
    if (codeText.length <= 3500) {
      await m.reply(
        `📦 *${pluginInfo.relative}*\n\n` +
        "```js\n" + codeText + "\n```",
      );
    } else {
      await m.reply(`❌ Error renderizando rich response: ${error.message}`);
    }
  }
};

handler.help = ['prueba3 <plugin>'];
handler.tags = ['pruebas'];
handler.command = ['prueba3'];

export default handler;
