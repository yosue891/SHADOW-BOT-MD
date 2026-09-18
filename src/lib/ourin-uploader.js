import axios from 'axios'
import FormData from 'form-data'

const termaiKey = 'AIzaBj7z2z3xBjsk'
const termaiDomain = 'https://c.termai.cc'

async function uploadToTermai(buffer, filename = 'image.jpg') {
    const form = new FormData()
    form.append('file', buffer, { filename })
    
    const response = await axios.post(`${termaiDomain}/api/upload?key=${termaiKey}`, form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
        timeout: 60000
    })
    
    if (response.data?.status && response.data?.path) {
        return response.data.path
    }
    
    throw new Error('Error al subir a Termai')
}

// Redirect all legacy exports to strictly use Termai as requested by user
export const uploadImage = uploadToTermai
export const uploadToTelegraph = uploadToTermai
export const uploadTo0x0 = uploadToTermai
export const uploadToCatbox = uploadToTermai
export const uploadToTmpfiles = uploadToTermai
export const uploadToUguu = uploadToTermai

import fs from 'fs';
import path from 'path';
import { ImageUploadService } from 'node-upload-images';
import config from '../../config.js';

export async function updateAssetUrl(assetKey, buffer, filename = 'image.jpg') {
  let category = 'image';
  const ext = path.extname(filename).toLowerCase() || '.jpg';
  if (['.mp4', '.avi', '.mkv'].includes(ext)) category = 'video';
  if (['.mp3', '.wav', '.ogg'].includes(ext)) category = 'audio';

  const newFileName = `${assetKey}${ext}`;
  const localPath = `./assets/${category}/${newFileName}`;

  // Call the manager to save and update memory cache
  const { updateAssetAndSave } = await import('./ourin-asset-manager.js');
  updateAssetAndSave(assetKey, buffer, localPath);

  const newUrl = localPath;
  
  if (!config.assets) config.assets = {};
  config.assets[assetKey] = newUrl;
  
  const configPath = path.join(process.cwd(), 'config.js');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  const regex = new RegExp(`("${assetKey}"\\s*:\\s*)"([^"]+)"`);
  
  if (regex.test(configContent)) {
    configContent = configContent.replace(regex, `$1"${newUrl}"`);
  } else {
    const assetsBlockRegex = /(assets\s*:\s*\{)([^}]*)(\})/;
    if (assetsBlockRegex.test(configContent)) {
      configContent = configContent.replace(assetsBlockRegex, (match, p1, p2, p3) => {
        let inner = p2.trim();
        if (inner.endsWith(',')) inner = inner.slice(0, -1);
        if (inner.length > 0) {
            return `${p1}\n    ${inner},\n    "${assetKey}": "${newUrl}"\n  ${p3}`;
        } else {
            return `${p1}\n    "${assetKey}": "${newUrl}"\n  ${p3}`;
        }
      });
    } else {
        throw new Error('Bloque config.assets no encontrado en config.js');
    }
  }
  
  fs.writeFileSync(configPath, configContent, 'utf8');
  return newUrl;
}