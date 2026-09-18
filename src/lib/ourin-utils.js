
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import crypto from 'crypto'
/**
 * Generate random string dengan panjang tertentu
 * @param {number} length - Panjang string yang diinginkan
 * @param {string} [charset='alphanumeric'] - Tipe karakter ('alphanumeric', 'numeric', 'alpha', 'hex')
 * @returns {string} Random string
 * @example
 * randomString(8); // "aB3dE7fG"
 * randomString(6, 'numeric'); // "472839"
 */
function randomString(length, charset = 'alphanumeric') {
    const charsets = {
        alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        numeric: '0123456789',
        alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        hex: '0123456789abcdef'
    };
    
    const chars = charsets[charset] || charsets.alphanumeric;
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * Generate random integer antara min dan max (inclusive)
 * @param {number} min - Nilai minimum
 * @param {number} max - Nilai maximum
 * @returns {number} Random integer
 * @example
 * randomInt(1, 10); // 7
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pilih item random dari array
 * @param {Array} array - Array untuk dipilih
 * @returns {*} Item random dari array
 * @example
 * randomPick(['a', 'b', 'c']); // 'b'
 */
function randomPick(array) {
    if (!Array.isArray(array) || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Delay eksekusi untuk durasi tertentu
 * @param {number} ms - Durasi delay dalam milliseconds
 * @returns {Promise<void>} Promise yang resolve setelah delay
 * @example
 * await delay(1000); // tunggu 1 detik
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cek apakah string adalah URL valid
 * @param {string} str - String untuk dicek
 * @returns {boolean} True jika URL valid
 * @example
 * isUrl('https://google.com'); // true
 * isUrl('not a url'); // false
 */
function isUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Cek apakah string adalah nomor telepon valid
 * @param {string} str - String untuk dicek
 * @returns {boolean} True jika nomor telepon valid
 * @example
 * isPhoneNumber('6281234567890'); // true
 */
function isPhoneNumber(str) {
    return /^[0-9]{10,15}$/.test(str.replace(/[^0-9]/g, ''));
}

/**
 * Cek apakah string adalah email valid
 * @param {string} str - String untuk dicek
 * @returns {boolean} True jika email valid
 */
function isEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/**
 * Parse mention dari text
 * @param {string} text - Text yang berisi mention
 * @returns {string[]} Array nomor yang di-mention
 * @example
 * parseMention('@6281234567890 hello'); // ['6281234567890']
 */
function parseMention(text) {
    if (!text) return [];
    const matches = text.match(/@([0-9]+)/g);
    if (!matches) return [];
    return matches.map(m => m.replace('@', ''));
}

/**
 * Escape karakter khusus regex
 * @param {string} str - String untuk di-escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Deep clone object
 * @param {Object} obj - Object untuk di-clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge deep objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            result[key] = deepMerge(target[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

/**
 * Fetch buffer dari URL
 * @param {string} url - URL untuk fetch
 * @param {Object} [options={}] - Axios options
 * @returns {Promise<Buffer>} Buffer dari response
 * @example
 * const buffer = await fetchBuffer('https://example.com/image.png');
 */
async function fetchBuffer(url, options = {}) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            ...options
        });
        return Buffer.from(response.data);
    } catch (error) {
        throw new Error(`Error al obtener buffer: ${error.message}`);
    }
}

/**
 * Fetch JSON dari URL
 * @param {string} url - URL untuk fetch
 * @param {Object} [options={}] - Axios options
 * @returns {Promise<Object>} JSON response
 * @example
 * const data = await fetchJson('https://api.example.com/data');
 */
async function fetchJson(url, options = {}) {
    try {
        const response = await axios.get(url, {
            responseType: 'json',
            ...options
        });
        return response.data;
    } catch (error) {
        throw new Error(`Error al obtener JSON: ${error.message}`);
    }
}

/**
 * Fetch text dari URL
 * @param {string} url - URL untuk fetch
 * @param {Object} [options={}] - Axios options
 * @returns {Promise<string>} Text response
 */
async function fetchText(url, options = {}) {
    try {
        const response = await axios.get(url, {
            responseType: 'text',
            ...options
        });
        return response.data;
    } catch (error) {
        throw new Error(`Error al obtener texto: ${error.message}`);
    }
}

/**
 * Download file dari URL dan simpan ke path
 * @param {string} url - URL file untuk download
 * @param {string} filePath - Path untuk menyimpan file
 * @returns {Promise<string>} Path file yang disimpan
 */
async function downloadFile(url, filePath) {
    try {
        const buffer = await fetchBuffer(url);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, buffer);
        return filePath;
    } catch (error) {
        throw new Error(`Error al descargar archivo: ${error.message}`);
    }
}

/**
 * Generate hash MD5 dari string
 * @param {string} str - String untuk di-hash
 * @returns {string} MD5 hash
 */
function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Generate hash SHA256 dari string
 * @param {string} str - String untuk di-hash
 * @returns {string} SHA256 hash
 */
function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Encode string ke Base64
 * @param {string} str - String untuk di-encode
 * @returns {string} Base64 encoded string
 */
function toBase64(str) {
    return Buffer.from(str).toString('base64');
}

/**
 * Decode Base64 ke string
 * @param {string} str - Base64 string untuk di-decode
 * @returns {string} Decoded string
 */
function fromBase64(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

/**
 * Cek apakah path adalah file
 * @param {string} filePath - Path untuk dicek
 * @returns {boolean} True jika file exists dan adalah file
 */
function isFile(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    } catch {
        return false;
    }
}

/**
 * Cek apakah path adalah directory
 * @param {string} dirPath - Path untuk dicek
 * @returns {boolean} True jika path exists dan adalah directory
 */
function isDirectory(dirPath) {
    try {
        return fs.statSync(dirPath).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Buat directory jika belum ada
 * @param {string} dirPath - Path directory
 * @returns {boolean} True jika berhasil
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
}

/**
 * Baca file JSON dengan aman
 * @param {string} filePath - Path file JSON
 * @param {*} [defaultValue={}] - Default value jika file tidak ada
 * @returns {Object} Parsed JSON atau default value
 */
function readJsonFile(filePath, defaultValue = {}) {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return defaultValue;
    }
}

/**
 * Tulis object ke file JSON
 * @param {string} filePath - Path file JSON
 * @param {Object} data - Data untuk ditulis
 * @param {boolean} [pretty=true] - Apakah format dengan indentasi
 * @returns {boolean} True jika berhasil
 */
function writeJsonFile(filePath, data, pretty = true) {
    try {
        const dir = path.dirname(filePath);
        ensureDir(dir);
        
        const content = pretty 
            ? JSON.stringify(data, null, 2) 
            : JSON.stringify(data);
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    } catch {
        return false;
    }
}

/**
 * Dapatkan MIME type dari buffer
 * @param {Buffer} buffer - Buffer untuk dicek
 * @returns {string} MIME type
 */
function getMimeType(buffer) {
    const signatures = {
        'ffd8ff': 'image/jpeg',
        '89504e47': 'image/png',
        '47494638': 'image/gif',
        '52494646': 'image/webp',
        '00000020': 'video/mp4',
        '00000018': 'video/mp4',
        '00000014': 'video/mp4',
        '1a45dfa3': 'video/webm',
        '4f676753': 'audio/ogg',
        'fff3': 'audio/mpeg',
        'fff2': 'audio/mpeg',
        'fffb': 'audio/mpeg',
        '494433': 'audio/mpeg',
        '25504446': 'application/pdf'
    };
    
    const hex = buffer.slice(0, 4).toString('hex');
    
    for (const [sig, mime] of Object.entries(signatures)) {
        if (hex.startsWith(sig)) {
            return mime;
        }
    }
    
    return 'application/octet-stream';
}

/**
 * Dapatkan ekstensi file dari MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} File extension (tanpa dot)
 */
function getExtension(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'audio/mpeg': 'mp3',
        'audio/ogg': 'ogg',
        'audio/opus': 'opus',
        'application/pdf': 'pdf'
    };
    
    return extensions[mimeType] || 'bin';
}

/**
 * Sleep dengan random delay
 * @param {number} minMs - Minimum delay
 * @param {number} maxMs - Maximum delay
 * @returns {Promise<void>}
 */
async function randomDelay(minMs, maxMs) {
    const ms = randomInt(minMs, maxMs);
    return delay(ms);
}

/**
 * Función de reintento con backoff exponencial
 * @param {Function} fn - Función a reintentar
 * @param {number} [maxRetries=3] - Máximo de reintentos
 * @param {number} [baseDelay=1000] - Retraso base en ms
 * @returns {Promise<*>} Resultado de la función
 */
async function retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await delay(baseDelay * Math.pow(2, i));
            }
        }
    }
    
    throw lastError;
}

/**
 * Chunk array menjadi array of arrays dengan size tertentu
 * @param {Array} array - Array untuk di-chunk
 * @param {number} size - Ukuran setiap chunk
 * @returns {Array<Array>} Array of chunks
 * @example
 * chunk([1,2,3,4,5], 2); // [[1,2], [3,4], [5]]
 */
function chunk(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

/**
 * Flatten nested array
 * @param {Array} array - Nested array
 * @param {number} [depth=1] - Kedalaman flatten
 * @returns {Array} Flattened array
 */
function flatten(array, depth = 1) {
    return array.flat(depth);
}

/**
 * Remove duplicate dari array
 * @param {Array} array - Array dengan kemungkinan duplicate
 * @returns {Array} Array tanpa duplicate
 */
function unique(array) {
    return [...new Set(array)];
}

/**
 * Group array by key
 * @param {Array<Object>} array - Array of objects
 * @param {string} key - Key untuk grouping
 * @returns {Object} Grouped object
 */
function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * Sort array of objects by key
 * @param {Array<Object>} array - Array of objects
 * @param {string} key - Key untuk sorting
 * @param {string} [order='asc'] - Order: 'asc' atau 'desc'
 * @returns {Array<Object>} Sorted array
 */
function sortBy(array, key, order = 'asc') {
    const multiplier = order === 'desc' ? -1 : 1;
    return [...array].sort((a, b) => {
        if (a[key] < b[key]) return -1 * multiplier;
        if (a[key] > b[key]) return 1 * multiplier;
        return 0;
    });
}

export { randomString, randomInt, randomPick, delay, isUrl, isPhoneNumber, isEmail, parseMention, escapeRegex, deepClone, deepMerge, fetchBuffer, fetchJson, fetchText, downloadFile, md5, sha256, toBase64, fromBase64, isFile, isDirectory, ensureDir, readJsonFile, writeJsonFile, getMimeType, getExtension, randomDelay, retry, chunk, flatten, unique, groupBy, sortBy }