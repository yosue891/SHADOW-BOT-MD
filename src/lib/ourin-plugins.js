import fs from "fs";
import path from "path";
import { theme, chalk, logger } from "./ourin-logger.js";
/**
 * @typedef {Object} PluginConfig
 * @property {string} name - Nama command (tanpa prefix)
 * @property {string[]} alias - Array alias untuk command
 * @property {string} category - Kategori plugin (owner, main, utility, fun, dll)
 * @property {string} description - Deskripsi singkat command
 * @property {string} usage - Cara penggunaan command
 * @property {string} example - Contoh penggunaan command
 * @property {boolean} isOwner - Apakah command khusus owner
 * @property {boolean} isPremium - Apakah command khusus premium user
 * @property {boolean} isGroup - Apakah command hanya untuk group
 * @property {boolean} isPrivate - Apakah command hanya untuk private chat
 * @property {boolean} isAdmin - Apakah command memerlukan admin group
 * @property {boolean} isBotAdmin - Apakah bot harus jadi admin
 * @property {number} cooldown - Cooldown dalam detik
 * @property {number} limit - Jumlah limit yang digunakan per eksekusi
 * @property {boolean} isEnabled - Apakah plugin aktif
 */

/**
 * @typedef {Object} Plugin
 * @property {PluginConfig} config - Konfigurasi plugin
 * @property {PluginHandler} handler - Fungsi handler plugin
 */

/**
 * @callback PluginHandler
 * @param {Object} m - Serialized message object
 * @param {Object} params - Parameter tambahan
 * @param {Object} params.sock - Socket connection Baileys
 * @param {Object} params.store - Data store
 * @param {Object} params.config - Bot configuration
 * @param {Object} params.plugins - All loaded plugins
 * @returns {Promise<void>}
 */

/**
 * @typedef {Object} PluginStore
 * @property {Map<string, Plugin>} commands - Map command name ke plugin
 * @property {Map<string, string>} aliases - Map alias ke command name
 * @property {Map<string, Plugin[]>} categories - Map category ke array plugins
 */

/**
 * Collection untuk menyimpan semua plugins
 * @type {PluginStore}
 */
const pluginStore = {
  commands: new Map(),
  aliases: new Map(),
  categories: new Map(),
};

/**
 * Default config untuk plugin
 * @type {PluginConfig}
 */
const defaultConfig = {
  name: "",
  alias: [],
  category: "uncategorized",
  description: "No description",
  usage: "",
  example: "",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  isAdmin: false,
  isBotAdmin: false,
  cooldown: 3,
  limit: 1,
  isEnabled: true,
};

const normalizePluginNames = (name) => {
  const values = Array.isArray(name) ? name : [name];
  return values
    .map((item) =>
      String(item || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
};

const normalizePluginAliases = (alias) => {
  const values = Array.isArray(alias) ? alias : alias ? [alias] : [];
  return values
    .map((item) =>
      String(item || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
};

const findRegisteredPluginByFilePath = (filePath) => {
  if (!filePath) {
    return null;
  }
  const resolvedFilePath = path.resolve(filePath);
  for (const plugin of new Set(pluginStore.commands.values())) {
    if (
      plugin?.filePath &&
      path.resolve(plugin.filePath) === resolvedFilePath
    ) {
      return plugin;
    }
  }
  return null;
};

const removePluginFromStore = (plugin) => {
  if (!plugin?.config) {
    return false;
  }
  const names = normalizePluginNames(plugin.config.name);
  const aliases = normalizePluginAliases(plugin.config.alias);
  const category = String(plugin.config.category || "").toLowerCase();
  for (const name of names) {
    pluginStore.commands.delete(name);
  }
  for (const alias of aliases) {
    pluginStore.aliases.delete(alias);
  }
  const categoryPlugins = pluginStore.categories.get(category);
  if (categoryPlugins) {
    const index = categoryPlugins.findIndex((item) => item === plugin);
    if (index !== -1) {
      categoryPlugins.splice(index, 1);
    }
  }
  return true;
};

/**
 * Memuat satu plugin dari file
 * @param {string} filePath - Path ke file plugin
 * @returns {Plugin|null} Plugin object atau null jika gagal
 * @example
 * const plugin = await loadPlugin('./plugins/main/ping.js');
 */
import { pathToFileURL } from "url";

async function loadPlugin(filePath, bustCache = false) {
  try {
    const fileUrl =
      pathToFileURL(path.resolve(filePath)).href +
      (bustCache ? "?t=" + Date.now() : "");
    let plugin = await import(fileUrl);

    if ((!plugin.config || !plugin.handler) && plugin.default) {
      plugin = plugin.default;
    }

    if (!plugin.config || !plugin.handler) {
      return null;
    }

    if (typeof plugin.handler !== "function") {
      return null;
    }

    let pInfo = {
      config: { ...defaultConfig, ...plugin.config },
      handler: plugin.handler,
      filePath: filePath,
    };

    if (!pInfo.config.name) {
      pInfo.config.name = path.basename(filePath, path.extname(filePath));
    }

    return pInfo;
  } catch (error) {
    const fileName = path.basename(filePath);
    if (process.env.DEBUG_PLUGINS === "true" || true) {
      logger.error("plugin", `failed ${fileName} - ${error.message}`);
    }
    return null;
  }
}

/**
 * Registrar plugin en el store
 * @param {Plugin} plugin - Plugin a registrar
 * @returns {boolean} True si se registró correctamente
 */
function registerPlugin(plugin) {
  if (!plugin || !plugin.config || !plugin.config.name) {
    return false;
  }

  const { name, alias, category } = plugin.config;

  const names = normalizePluginNames(name);
  const aliases = normalizePluginAliases(alias);
  const primaryName = names[0];
  if (!primaryName) {
    return false;
  }

  for (const n of names) {
    pluginStore.commands.set(n, plugin);
  }

  for (const a of aliases) {
    pluginStore.aliases.set(a, primaryName);
  }

  const categoryLower = String(
    category || defaultConfig.category,
  ).toLowerCase();
  if (!pluginStore.categories.has(categoryLower)) {
    pluginStore.categories.set(categoryLower, []);
  }
  pluginStore.categories.get(categoryLower).push(plugin);

  return true;
}

function printPluginTable(plugins) {
  if (plugins.length === 0) return;

  const safeStr = (str) => {
    if (Array.isArray(str)) return str[0] || "";
    return String(str || "");
  };

  const grouped = {};
  plugins.forEach((p) => {
    const cat = safeStr(p.category);
    if (!grouped[cat]) grouped[cat] = 0;
    grouped[cat]++;
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const catCount = sorted.length;
  const TOP = 8;
  const top = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP);
  const restTotal = rest.reduce((s, [, c]) => s + c, 0);

  const COL_W = 25;
  const pad = (cat, count, index) => {
    const label = String(cat).padEnd(12);
    return `${theme.colorizeCategory(label, index)} ${theme.pill(String(count), "accent")}`.padEnd(
      COL_W + 12,
    );
  };

  console.log("");
  console.log(
    `  ${theme.pill("plugins", "primary")} ${theme.rainbow(String(plugins.length))} ${theme.dim("total")} ${theme.border("│")} ${chalk.whiteBright(`${catCount} categorías`)}`,
  );
  console.log(`  ${theme.borderFx("─".repeat(58))}`);

  for (let i = 0; i < top.length; i += 2) {
    const left = pad(top[i][0], top[i][1], i);
    const right =
      i + 1 < top.length ? pad(top[i + 1][0], top[i + 1][1], i + 1) : "";
    console.log(`  ${left}  ${theme.border("│")}  ${right}`);
  }

  if (rest.length > 0) {
    console.log(
      `  ${theme.dim(`+${rest.length} más`.padEnd(14))}${theme.pill(String(restTotal), "system")}`,
    );
  }

  console.log("");
}

/**
 * Memuat semua plugins dari directory
 * @param {string} pluginsDir - Path ke directory plugins
 * @returns {number} Jumlah plugin yang berhasil dimuat
 * @example
 * const count = loadPlugins('./ourin-plugins');
 * console.log(`Loaded ${count} plugins`);
 */
async function loadPlugins(pluginsDir) {
  pluginStore.commands.clear();
  pluginStore.aliases.clear();
  pluginStore.categories.clear();

  let loadedCount = 0;
  const loadedPlugins = [];

  if (!fs.existsSync(pluginsDir)) {
    logger.warn("plugin", `directory not found: ${pluginsDir}`);
    return 0;
  }

  const categories = fs.readdirSync(pluginsDir);

  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);

    if (!fs.statSync(categoryPath).isDirectory()) {
      if (category.endsWith(".js") && category !== "_index.js") {
        const plugin = await loadPlugin(categoryPath);
        if (plugin && registerPlugin(plugin)) {
          loadedCount++;
          loadedPlugins.push({
            name: plugin.config.name,
            category: "uncategorized",
          });
        }
      }
      continue;
    }

    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      if (!file.endsWith(".js") || file.startsWith("_")) continue;

      const filePath = path.join(categoryPath, file);
      const plugin = await loadPlugin(filePath);

      if (plugin) {
        if (
          !plugin.config.category ||
          plugin.config.category === "uncategorized"
        ) {
          plugin.config.category = category;
        }

        if (registerPlugin(plugin)) {
          loadedCount++;
          loadedPlugins.push({
            name: plugin.config.name,
            category: plugin.config.category,
          });
        }
      }
    }
  }

  printPluginTable(loadedPlugins);
  return loadedCount;
}

/**
 * Mendapatkan plugin berdasarkan nama atau alias
 * @param {string} name - Nama command atau alias
 * @returns {Plugin|null} Plugin object atau null jika tidak ditemukan
 * @example
 * const plugin = getPlugin('menu');
 * if (plugin) {
 *   await plugin.handler(m, { sock, config });
 * }
 */
function getPlugin(name) {
  if (!name) return null;

  const nameLower = name.toLowerCase();

  if (pluginStore.commands.has(nameLower)) {
    return pluginStore.commands.get(nameLower);
  }

  if (pluginStore.aliases.has(nameLower)) {
    const commandName = pluginStore.aliases.get(nameLower);
    return pluginStore.commands.get(commandName);
  }

  return null;
}

/**
 * Mendapatkan semua plugins dalam kategori tertentu
 * @param {string} category - Nama kategori
 * @returns {Plugin[]} Array plugins dalam kategori
 * @example
 * const ownerPlugins = getPluginsByCategory('owner');
 */
function getPluginsByCategory(category) {
  if (!category) return [];
  return pluginStore.categories.get(category.toLowerCase()) || [];
}

/**
 * Mendapatkan semua kategori yang ada
 * @returns {string[]} Array nama kategori
 * @returns {string[]} Array nama kategori
 */
function getCategories() {
  return Array.from(pluginStore.categories.keys());
}

/**
 * Mendapatkan semua plugins
 * @returns {Plugin[]} Array semua plugins
 */
function getAllPlugins() {
  return Array.from(pluginStore.commands.values());
}

/**
 * Mendapatkan total jumlah plugins
 * @returns {number} Total plugins
 */
function getPluginCount() {
  return pluginStore.commands.size;
}

/**
 * Mendapatkan semua nama command dan alias as array (Cached)
 * @returns {string[]}
 */
function getAllCommandNames() {
  return [...pluginStore.commands.keys(), ...pluginStore.aliases.keys()];
}

/**
 * Obtener lista de comandos por categoría para el menú
 * @returns {Object<string, string[]>} Objeto con clave de categoría y valor de array de nombres de comandos
 */
function getCommandsByCategory() {
  const result = {};

  for (const [category, plugins] of pluginStore.categories.entries()) {
    result[category] = [];
    for (const p of plugins) {
      if (!p.config.isEnabled) continue;
      const names = Array.isArray(p.config.name)
        ? p.config.name
        : [p.config.name];
      result[category].push(...names);
    }
  }

  return result;
}

/**
 * Mendapatkan info plugin untuk help
 * @param {string} name - Nama command
 * @returns {Object|null} Info plugin atau null
 */
function getPluginInfo(name) {
  const plugin = getPlugin(name);
  if (!plugin) return null;

  const { config } = plugin;

  return {
    name: config.name,
    alias: config.alias,
    category: config.category,
    description: config.description,
    usage: config.usage,
    example: config.example,
    isOwner: config.isOwner,
    isPremium: config.isPremium,
    cooldown: config.cooldown,
  };
}

/**
 * Reload single plugin
 * @param {string} name - Nama command untuk reload
 * @returns {boolean} True jika berhasil
 */
function reloadPlugin(name) {
  const plugin = getPlugin(name);
  if (!plugin || !plugin.filePath) return false;

  const category = plugin.config.category;

  pluginStore.commands.delete(name.toLowerCase());

  for (const alias of plugin.config.alias || []) {
    pluginStore.aliases.delete(alias.toLowerCase());
  }

  const categoryPlugins = pluginStore.categories.get(category.toLowerCase());
  if (categoryPlugins) {
    const index = categoryPlugins.findIndex((p) => p.config.name === name);
    if (index !== -1) {
      categoryPlugins.splice(index, 1);
    }
  }

  const newPlugin = loadPlugin(plugin.filePath);
  if (newPlugin && registerPlugin(newPlugin)) {
    logger.success("plugin", `reloaded: ${name}`);
    return true;
  }

  return false;
}

/**
 * Disable plugin
 * @param {string} name - Nama command untuk disable
 * @returns {boolean} True jika berhasil
 */
function disablePlugin(name) {
  const plugin = getPlugin(name);
  if (!plugin) return false;

  plugin.config.isEnabled = false;
  return true;
}

/**
 * Enable plugin
 * @param {string} name - Nama command untuk enable
 * @returns {boolean} True jika berhasil
 */
function enablePlugin(name) {
  const plugin = getPlugin(name);
  if (!plugin) return false;

  plugin.config.isEnabled = true;
  return true;
}

/**
 * Cek apakah plugin aktif
 * @param {string} name - Nama command
 * @returns {boolean} True jika plugin aktif
 */
function isPluginEnabled(name) {
  const plugin = getPlugin(name);
  return plugin ? plugin.config.isEnabled : false;
}

async function hotReloadPlugin(filePath) {
  let primaryName = "";
  try {
    const plugin = await loadPlugin(filePath, true);
    if (!plugin) {
      return { success: false, error: "Error al cargar plugin" };
    }

    const names = normalizePluginNames(plugin.config.name);
    primaryName = names[0] || "";

    const existingPlugin =
      findRegisteredPluginByFilePath(filePath) ||
      (primaryName ? pluginStore.commands.get(primaryName) : null);
    if (existingPlugin) {
      removePluginFromStore(existingPlugin);
    }

    if (registerPlugin(plugin)) {
      logger.success("plugin", `hot reloaded: ${primaryName}`);
      return { success: true, name: primaryName };
    }

    return { success: false, error: "Error al registrar plugin" };
  } catch (error) {
    logger.error("plugin", `hot reload error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function unloadPlugin(name) {
  try {
    const nameLower = name.toLowerCase();
    let plugin = pluginStore.commands.get(nameLower);

    if (!plugin) {
      const commandName = pluginStore.aliases.get(nameLower);
      if (commandName) {
        plugin = pluginStore.commands.get(commandName);
      }
    }

    if (!plugin && /[\\/]/.test(name)) {
      plugin = findRegisteredPluginByFilePath(name);
    }

    if (!plugin) {
      return { success: false, error: "Plugin no encontrado" };
    }

    const names = normalizePluginNames(plugin.config.name);
    const primaryName = names[0] || nameLower;

    removePluginFromStore(plugin);

    if (plugin.filePath) {
      try {
        // require.cache removed
      } catch {}
    }

    logger.warn("plugin", `unloaded: ${primaryName}`);
    return { success: true, name: primaryName };
  } catch (error) {
    logger.error("plugin", `unload error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export {
  loadPlugin,
  loadPlugins,
  registerPlugin,
  getPlugin,
  getPluginsByCategory,
  getCategories,
  getAllPlugins,
  getPluginCount,
  getCommandsByCategory,
  getPluginInfo,
  reloadPlugin,
  disablePlugin,
  enablePlugin,
  isPluginEnabled,
  hotReloadPlugin,
  unloadPlugin,
  pluginStore,
  defaultConfig,
  getAllCommandNames,
};
