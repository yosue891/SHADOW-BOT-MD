import fs from 'fs';
import path from 'path';

// Memory cache for all local assets
const assetCache = {};

/**
 * Preload all assets into memory at startup.
 * @param {Object} configAssets - botConfig.assets or config.assets object
 */
export function preloadAssets(configAssets) {
  if (!configAssets) return;
  for (const [key, filepath] of Object.entries(configAssets)) {
    try {
      if (typeof filepath === 'string' && !filepath.startsWith('http')) {
        const fullPath = path.resolve(process.cwd(), filepath);
        if (fs.existsSync(fullPath)) {
          assetCache[key] = fs.readFileSync(fullPath);
          console.log(`[AssetManager] 📂 Successfully cached: ${key}`);
        } else {
          console.error(`[AssetManager] ❌ File not found: ${fullPath}`);
        }
      }
    } catch (e) {
      console.error(`[AssetManager] ❌ Failed to load ${key}:`, e.message);
    }
  }
}

/**
 * Get the cached asset buffer by key (e.g. 'ourin', 'ourin2').
 * If not in cache but available in config, loads it synchronously.
 * 
 * @param {string} key - The asset key defined in config.assets
 * @param {Object} [configAssets] - Optional config.assets reference for fallback
 * @returns {Buffer | null} The asset as a Buffer, or null if missing.
 */
export function getAssetBuffer(key, configAssets = null) {
  if (assetCache[key]) {
    return assetCache[key];
  }
  
  if (configAssets && configAssets[key] && !configAssets[key].startsWith('http')) {
    try {
      const fullPath = path.resolve(process.cwd(), configAssets[key]);
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        assetCache[key] = buf; 
        return buf;
      }
    } catch (e) {
      console.error(`[AssetManager] Failed to read ${key} from disk:`, e.message);
    }
  }
  
  return null;
}

/**
 * Update an asset buffer in memory and save it to disk (useful for owner commands that change assets).
 * 
 * @param {string} key - Asset key
 * @param {Buffer} buffer - New asset buffer
 * @param {string} filepath - The path where it should be saved
 */
export function updateAssetAndSave(key, buffer, filepath) {
  assetCache[key] = buffer;
  if (filepath && !filepath.startsWith('http')) {
    try {
      const fullPath = path.resolve(process.cwd(), filepath);
      fs.writeFileSync(fullPath, buffer);
    } catch (e) {
      console.error(`[AssetManager] Failed to write updated asset ${key} to disk:`, e.message);
    }
  }
}
