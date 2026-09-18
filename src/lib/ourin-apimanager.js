import axios from "axios";
import FormData from "form-data";
import http from "node:http";
import https from "node:https";
import { LRUCache } from "lru-cache";
import qs from "qs";
import config from "../../config.js";

const DEF_TIMEOUT = 60000;
const DEF_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const DEF_CACHE_MAX = 500;
const HTTP_AGENT = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
});
const HTTPS_AGENT = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
});

/**
 * @typedef {Object} OurinApiAuthShape
 * @property {Object<string, any>} [headers]
 * @property {Object<string, any>} [params]
 */

/**
 * @typedef {Object} OurinApiProviderShape
 * @property {string} baseURL
 * @property {OurinApiAuthShape} [auth]
 * @property {Object<string, string>} [headers]
 * @property {number} [cacheTTL]
 * @property {number} [timeout]
 */

/**
 * @typedef {Object} OurinApiRequestOptions
 * @property {string} [method]
 * @property {Object<string, any>} [params]
 * @property {any} [data]
 * @property {Object<string, any>} [headers]
 * @property {'json'|'text'|'arraybuffer'|'stream'} [responseType]
 * @property {number} [timeout]
 * @property {boolean} [fullResponse]
 * @property {string} [cacheKey]
 * @property {number} [cacheTTL]
 * @property {number} [maxBodyLength]
 * @property {number} [maxContentLength]
 */

/**
 * @typedef {Object} OurinApiMultipartFile
 * @property {string} [name]
 * @property {Buffer|import('stream').Readable|string} [value]
 * @property {Buffer|import('stream').Readable|string} [buffer]
 * @property {Buffer|import('stream').Readable|string} [file]
 * @property {string} [filename]
 * @property {string} [contentType]
 */

/**
 * Client provider untuk pemanggilan API per namespace.
 */
class OurinApiProvider {
  /**
   * @param {OurinApiManager} mgr
   * @param {string} name
   */
  constructor(mgr, name) {
    this.mgr = mgr;
    this.name = name;
  }

  /**
   * @param {string} ep
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  request(ep, opt = {}) {
    return this.mgr.request(this.name, ep, opt);
  }

  /**
   * @param {string} ep
   * @param {Object<string, any>} [params]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  get(ep, params = {}, opt = {}) {
    return this.request(ep, { ...opt, method: "GET", params });
  }

  /**
   * @param {string} ep
   * @param {Object<string, any>} [params]
   * @param {number} [ttl]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  cache(ep, params = {}, ttl = 15000, opt = {}) {
    return this.request(ep, { ...opt, method: "GET", params, cacheTTL: ttl });
  }

  /**
   * @param {string} ep
   * @param {any} [data]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  post(ep, data = {}, opt = {}) {
    return this.request(ep, { ...opt, method: "POST", data });
  }

  /**
   * @param {string} ep
   * @param {any} [data]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  put(ep, data = {}, opt = {}) {
    return this.request(ep, { ...opt, method: "PUT", data });
  }

  /**
   * @param {string} ep
   * @param {Object<string, any>} [params]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  del(ep, params = {}, opt = {}) {
    return this.request(ep, { ...opt, method: "DELETE", params });
  }

  /**
   * @param {string} ep
   * @param {any} [data]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  patch(ep, data = {}, opt = {}) {
    return this.request(ep, { ...opt, method: "PATCH", data });
  }

  /**
   * @param {string} ep
   * @param {Object<string, any>} [params]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  delete(ep, params = {}, opt = {}) {
    return this.del(ep, params, opt);
  }

  /**
   * @param {string} ep
   * @param {Object<string, any>} [params]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  head(ep, params = {}, opt = {}) {
    return this.request(ep, { ...opt, method: "HEAD", params });
  }

  /**
   * @param {string} ep
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<string>}
   */
  text(ep, opt = {}) {
    return this.request(ep, { ...opt, responseType: "text" });
  }

  /**
   * @param {string} ep
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<Buffer>}
   */
  buffer(ep, opt = {}) {
    return this.request(ep, { ...opt, responseType: "arraybuffer" });
  }

  /**
   * @param {string} ep
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  stream(ep, opt = {}) {
    return this.request(ep, { ...opt, responseType: "stream" });
  }

  /**
   * @param {string} ep
   * @param {Object<string, any>} [fields]
   * @param {OurinApiMultipartFile[]|Object<string, any>} [files]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  multipart(ep, fields = {}, files = [], opt = {}) {
    const form = this.mgr.makeForm(fields, files);
    const hdr = this.mgr.mergeHeaders(form.getHeaders(), opt.headers);
    return this.request(ep, {
      ...opt,
      method: opt.method || "POST",
      data: form,
      headers: hdr,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  /**
   * @param {string} ep
   * @param {Object<string, any>} [params]
   * @returns {string}
   */
  url(ep, params = {}) {
    return this.mgr.buildUrl(this.name, ep, params);
  }

  asParams(input, key) {
    if (this.mgr.isObj(input) && !Buffer.isBuffer(input)) return input;
    if (this.mgr.empty(input)) return {};
    return { [key]: input };
  }

  asData(input, key) {
    if (this.mgr.isObj(input) && !Buffer.isBuffer(input)) return input;
    if (this.mgr.empty(input)) return {};
    return { [key]: input };
  }
}

class CovenantApiProvider extends OurinApiProvider {
  gpt4(input, opt = {}) {
    return this.get("/api/ai/gpt4", this.asParams(input, "question"), opt);
  }

  mathGpt(input, opt = {}) {
    return this.get("/api/ai/mathgpt", this.asParams(input, "question"), opt);
  }

  rewrite(input, opt = {}) {
    return this.post("/api/ai/rewrite", this.asData(input, "text"), opt);
  }

  geminiImage(payload = {}, opt = {}) {
    return this.post("/api/ai/gemini-image", payload, opt);
  }

  seedream(payload = {}, opt = {}) {
    return this.post("/api/ai/seedream", payload, opt);
  }

  flux(payload = {}, opt = {}) {
    return this.post("/api/ai/flux", payload, opt);
  }

  meloloCategory(input, opt = {}) {
    return this.get(
      "/api/drama/melolo/category",
      this.asParams(input, "category"),
      opt,
    );
  }

  freefire(input, opt = {}) {
    return this.get("/api/stalk/freefire", this.asParams(input, "uid"), opt);
  }
}

class NeoxrApiProvider extends OurinApiProvider {
  whatMusic(input, opt = {}) {
    return this.get("/api/whatmusic", this.asParams(input, "url"), opt);
  }

  invoiceMaker(params = {}, opt = {}) {
    return this.get("/api/invoice-maker", params, opt);
  }

  emoimg(input, opt = {}) {
    return this.get("/api/emoimg", this.asParams(input, "q"), opt);
  }

  emojito(input, opt = {}) {
    return this.get("/api/emojito", this.asParams(input, "q"), opt);
  }

  lineSticker(input, opt = {}) {
    return this.get("/api/linesticker", this.asParams(input, "url"), opt);
  }

  attp3(params = {}, opt = {}) {
    return this.get("/api/attp3", params, opt);
  }

  film(input, opt = {}) {
    return this.get("/api/film", this.asParams(input, "q"), opt);
  }

  filmGet(input, opt = {}) {
    return this.get("/api/film-get", this.asParams(input, "url"), opt);
  }

  spotifySearch(input, opt = {}) {
    return this.get("/api/spotify-search", this.asParams(input, "q"), opt);
  }

  pixivSearch(input, opt = {}) {
    return this.get("/api/pixiv-search", this.asParams(input, "q"), opt);
  }

  pinterestV2(input, opt = {}) {
    return this.get("/api/pinterest-v2", this.asParams(input, "q"), opt);
  }

  chord(input, opt = {}) {
    return this.get("/api/chord", this.asParams(input, "q"), opt);
  }

  apkmod(input, opt = {}) {
    return this.get("/api/apkmod", this.asParams(input, "q"), opt);
  }

  stableDiff(params = {}, opt = {}) {
    return this.get("/api/stablediff", params, opt);
  }
}

class CukiApiProvider extends OurinApiProvider {
  tiktokPhoto(params = {}, opt = {}) {
    return this.get("/api/search/tiktokfoto", params, opt);
  }

  mcpe(params = {}, opt = {}) {
    return this.get("/api/search/mcpe", params, opt);
  }

  mangatoon(params = {}, opt = {}) {
    return this.get("/api/search/mangatoon", params, opt);
  }

  sendNgl(params = {}, opt = {}) {
    return this.get("/api/tools/sendngl", params, opt);
  }

  bratVermeil(input, opt = {}) {
    return this.get(
      "/api/canvas/brat/bratnime-vermeil",
      this.asParams(input, "text"),
      opt,
    );
  }

  lahelu(params = {}, opt = {}) {
    return this.get("/api/random/lahelu", params, opt);
  }

  ustadz(input, opt = {}) {
    return this.get("/api/canvas/ustadz", this.asParams(input, "text"), opt);
  }
}

class ApiFaaProvider extends OurinApiProvider {
  googleImage(params = {}, opt = {}) {
    return this.get("/faa/google-image", params, opt);
  }

  qrCreate(input, opt = {}) {
    return this.get("/faa/qr-create", this.asParams(input, "text"), opt);
  }

  ssweb3hasil(input, opt = {}) {
    return this.get("/faa/ssweb-3hasil", this.asParams(input, "url"), opt);
  }

  reactChannel(params = {}, opt = {}) {
    return this.get("/faa/react-channel", params, opt);
  }

  tomekah(input, opt = {}) {
    return this.get("/faa/tomekah", this.asParams(input, "url"), opt);
  }

  tojapanese(input, opt = {}) {
    return this.get("/faa/tojapanese", this.asParams(input, "url"), opt);
  }

  tohijab(input, opt = {}) {
    return this.get("/faa/tohijab", this.asParams(input, "url"), opt);
  }

  toghibli(input, opt = {}) {
    return this.get("/faa/toghibli", this.asParams(input, "url"), opt);
  }

  tofigurav3(input, opt = {}) {
    return this.get("/faa/tofigurav3", this.asParams(input, "url"), opt);
  }

  tofigura(input, opt = {}) {
    return this.get("/faa/tofigura", this.asParams(input, "url"), opt);
  }

  tomoai(input, opt = {}) {
    return this.get("/faa/tomoai", this.asParams(input, "url"), opt);
  }

  bratvid(input, opt = {}) {
    return this.get("/faa/bratvid", this.asParams(input, "text"), opt);
  }
}

class OurinMainApiProvider extends OurinApiProvider {
  ytmp4(input, opt = {}) {
    return this.get("/api/ytmp4", this.asParams(input, "url"), opt);
  }

  bratWhite(input, opt = {}) {
    return this.get("/api/bratwhite", this.asParams(input, "text"), opt);
  }

  bratSquidward(input, opt = {}) {
    return this.get("/api/bratsquidward", this.asParams(input, "text"), opt);
  }

  bratPatrick(input, opt = {}) {
    return this.get("/api/bratpatrick", this.asParams(input, "text"), opt);
  }

  bratHd(input, opt = {}) {
    return this.get("/api/brat-hd", this.asParams(input, "text"), opt);
  }

  bratGreen(input, opt = {}) {
    return this.get("/api/brat-grenn", this.asParams(input, "text"), opt);
  }

  bratBahlil(input, opt = {}) {
    return this.get("/api/bratbahlil", this.asParams(input, "text"), opt);
  }

  bratAnime(input, opt = {}) {
    return this.get("/api/bratanime", this.asParams(input, "text"), opt);
  }
}

class NexrayApiProvider extends OurinApiProvider {
  geminiTts(input, opt = {}) {
    return this.get("/ai/gemini-tts", this.asParams(input, "text"), opt);
  }

  bratAnime(input, opt = {}) {
    return this.get("/maker/bratanime", this.asParams(input, "text"), opt);
  }

  appleMusic(input, opt = {}) {
    return this.get("/search/applemusic", this.asParams(input, "q"), opt);
  }

  instagram(input, opt = {}) {
    return this.get(
      "/downloader/v2/instagram",
      this.asParams(input, "url"),
      opt,
    );
  }

  spamNgl(params = {}, opt = {}) {
    return this.get("/tools/spamngl", params, opt);
  }

  gitagpt(input, opt = {}) {
    return this.get("/ai/gitagpt", this.asParams(input, "text"), opt);
  }

  muslim(input, opt = {}) {
    return this.get("/ai/muslim", this.asParams(input, "text"), opt);
  }
}

class YupraApiProvider extends OurinApiProvider {
  brat(input, opt = {}) {
    return this.get("/api/image/brat", this.asParams(input, "text"), opt);
  }
}

class EmiliabotApiProvider extends OurinApiProvider {
  textToSpeech(input, opt = {}) {
    return this.get("/tools/text-to-speech", this.asParams(input, "text"), opt);
  }

  tts(input, opt = {}) {
    return this.textToSpeech(input, opt);
  }
}

class AzbryApiProvider extends OurinApiProvider {
  tiktokSearch(input, opt = {}) {
    return this.get("/api/search/ttsearch", this.asParams(input, "q"), opt);
  }

  spotplay(input, opt = {}) {
    return this.get("/api/download/spoplay", this.asParams(input, "q"), opt);
  }

  spotify(input, opt = {}) {
    return this.get("/api/download/spotify", this.asParams(input, "url"), opt);
  }

  hdimage(input, opt = {}) {
    return this.get("/api/tools/hdimage", this.asParams(input, "url"), opt);
  }

  remini(input, opt = {}) {
    return this.request("/api/tools/remini", {
      ...opt,
      method: "GET",
      params: this.asParams(input, "url"),
      responseType: opt.responseType || "arraybuffer",
    });
  }
}

class YuulabsApiProvider extends OurinApiProvider {
  tiktok(input, opt = {}) {
    return this.get("/api/downloader/tiktok", this.asParams(input, "url"), opt);
  }
}

class ZenzxzApiProvider extends OurinApiProvider {
  youtube(input, opt = {}) {
    return this.get("/download/youtube", this.asParams(input, "url"), opt);
  }

  fakeCall(params = {}, opt = {}) {
    return this.get("/maker/fakecall", params, opt);
  }

  copilot(params = {}, opt = {}) {
    return this.get("/ai/copilot", params, opt);
  }
}

class FgsiApiProvider extends OurinApiProvider {
  enchantVideo(fields = {}, files = [], opt = {}) {
    return this.multipart("/api/tools/enchantVideo", fields, files, opt);
  }

  poll(pollUrl, opt = {}) {
    return this.mgr.requestUrl(pollUrl, {
      ...opt,
      method: opt.method || "GET",
      headers: this.mgr.mergeHeaders(
        this.mgr.resolveHeaders(this.mgr.getProviderConfig(this.name)),
        opt.headers,
      ),
    });
  }
}

/**
 * API manager terpusat untuk provider eksternal Ourin.
 */
class OurinApiManager {
  /**
   * @param {{ timeout?: number, userAgent?: string, cacheMax?: number, httpAgent?: http.Agent, httpsAgent?: https.Agent }} [opt]
   */
  constructor(opt = {}) {
    this.timeout = opt.timeout || DEF_TIMEOUT;
    this.userAgent = opt.userAgent || DEF_UA;
    this.httpAgent = opt.httpAgent || HTTP_AGENT;
    this.httpsAgent = opt.httpsAgent || HTTPS_AGENT;
    this.cache = new LRUCache({
      max: opt.cacheMax || DEF_CACHE_MAX,
    });
    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        "User-Agent": this.userAgent,
      },
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      paramsSerializer: {
        serialize: (params) => this.serializeParams(params),
      },
      validateStatus: (s) => s >= 200 && s < 300,
    });
    this.providers = this.makeProviders();
    this.providerClasses = this.makeProviderClasses();
    this.bindProviders();
  }

  /**
   * @returns {string[]}
   */
  listProviders() {
    return Object.keys(this.providers);
  }

  /**
   * @param {string} name
   * @returns {boolean}
   */
  hasProvider(name) {
    return Object.prototype.hasOwnProperty.call(this.providers, name);
  }

  /**
   * @param {string} name
   * @returns {OurinApiProvider}
   */
  provider(name) {
    if (!this.hasProvider(name)) {
      throw new Error(`Proveedor no encontrado: ${name}`);
    }
    return this[name];
  }

  /**
   * @param {string} name
   * @returns {OurinApiProviderShape}
   */
  getProviderConfig(name) {
    const cfg = this.providers[name];
    if (!cfg) {
      throw new Error(`Proveedor no encontrado: ${name}`);
    }
    return cfg;
  }

  /**
   * @param {string} name
   * @param {OurinApiProviderShape} cfg
   * @returns {OurinApiProvider}
   */
  registerProvider(name, cfg) {
    this.providers[name] = this.mergeProvider(this.providers[name], cfg);
    this.bindProvider(name);
    return this[name];
  }

  /**
   * @param {string} name
   * @param {Partial<OurinApiProviderShape>} cfg
   * @returns {OurinApiProvider}
   */
  extendProvider(name, cfg) {
    return this.registerProvider(name, cfg);
  }

  /**
   * @param {string} name
   * @param {string} baseURL
   * @returns {OurinApiProvider}
   */
  setBaseURL(name, baseURL) {
    return this.extendProvider(name, { baseURL });
  }

  makeProviderClasses() {
    return {
      covenant: CovenantApiProvider,
      neoxr: NeoxrApiProvider,
      cuki: CukiApiProvider,
      apiFaa: ApiFaaProvider,
      ourin: OurinMainApiProvider,
      nexray: NexrayApiProvider,
      yupra: YupraApiProvider,
      emiliabot: EmiliabotApiProvider,
      azbry: AzbryApiProvider,
      yuulabs: YuulabsApiProvider,
      zenzxz: ZenzxzApiProvider,
      fgsi: FgsiApiProvider,
    };
  }

  bindProviders() {
    for (const name of this.listProviders()) {
      this.bindProvider(name);
    }
  }

  bindProvider(name) {
    Object.defineProperty(this, name, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: this.makeProviderClient(name),
    });
  }

  makeProviderClient(name) {
    const ProviderClass = this.providerClasses?.[name] || OurinApiProvider;
    return new ProviderClass(this, name);
  }

  mergeProvider(oldCfg = {}, newCfg = {}) {
    return {
      ...oldCfg,
      ...newCfg,
      headers: this.mergeHeaders(oldCfg.headers, newCfg.headers),
      auth: {
        headers: this.mergeHeaders(oldCfg.auth?.headers, newCfg.auth?.headers),
        params: this.mergeParams(oldCfg.auth?.params, newCfg.auth?.params),
      },
    };
  }

  /**
   * @returns {number}
   */
  getCacheSize() {
    return this.cache.size;
  }

  /**
   * @returns {void}
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  deleteCache(key) {
    return this.cache.delete(String(key));
  }

  /**
   * @param {string} provider
   * @returns {number}
   */
  clearProviderCache(provider) {
    const base = this.normBase(this.getProviderConfig(provider).baseURL);
    let total = 0;

    for (const key of this.cache.keys()) {
      if (!String(key).includes(base)) continue;
      if (this.cache.delete(key)) total += 1;
    }

    return total;
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  async request(provider, endpoint, opt = {}) {
    const cfg = this.makeRequestConfig(provider, endpoint, opt);
    const ttl = this.getCacheTTL(provider, opt);
    const key = this.shouldCache(cfg.method, ttl, opt)
      ? this.makeCacheKey(provider, endpoint, cfg, opt)
      : null;

    if (key && this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const res = await this.client.request(cfg);
      const data = this.pickResponse(res, cfg.responseType, opt.fullResponse);
      if (key) this.cache.set(key, data, { ttl });
      return data;
    } catch (err) {
      throw this.makeError(provider, endpoint, err);
    }
  }

  async requestUrl(url, opt = {}) {
    const cfg = {
      url: String(url),
      method: String(opt.method || "GET").toUpperCase(),
      headers: this.mergeHeaders({ "User-Agent": this.userAgent }, opt.headers),
      params: opt.params || {},
      data: opt.data,
      responseType: opt.responseType || "json",
      timeout: opt.timeout || this.timeout,
      maxBodyLength: opt.maxBodyLength ?? Infinity,
      maxContentLength: opt.maxContentLength ?? Infinity,
    };

    try {
      const res = await this.client.request(cfg);
      return this.pickResponse(res, cfg.responseType, opt.fullResponse);
    } catch (err) {
      throw this.makeError("url", url, err);
    }
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {Object<string, any>} [params]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  get(provider, endpoint, params = {}, opt = {}) {
    return this.request(provider, endpoint, { ...opt, method: "GET", params });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<string>}
   */
  text(provider, endpoint, opt = {}) {
    return this.request(provider, endpoint, { ...opt, responseType: "text" });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {Object<string, any>} [params]
   * @param {number} [ttl]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  cacheGet(provider, endpoint, params = {}, ttl = 15000, opt = {}) {
    return this.request(provider, endpoint, {
      ...opt,
      method: "GET",
      params,
      cacheTTL: ttl,
    });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<Buffer>}
   */
  buffer(provider, endpoint, opt = {}) {
    return this.request(provider, endpoint, {
      ...opt,
      responseType: "arraybuffer",
    });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  stream(provider, endpoint, opt = {}) {
    return this.request(provider, endpoint, { ...opt, responseType: "stream" });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {any} [data]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  post(provider, endpoint, data = {}, opt = {}) {
    return this.request(provider, endpoint, { ...opt, method: "POST", data });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {any} [data]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  put(provider, endpoint, data = {}, opt = {}) {
    return this.request(provider, endpoint, { ...opt, method: "PUT", data });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {any} [data]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  patch(provider, endpoint, data = {}, opt = {}) {
    return this.request(provider, endpoint, { ...opt, method: "PATCH", data });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {Object<string, any>} [params]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  del(provider, endpoint, params = {}, opt = {}) {
    return this.request(provider, endpoint, {
      ...opt,
      method: "DELETE",
      params,
    });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {Object<string, any>} [params]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  head(provider, endpoint, params = {}, opt = {}) {
    return this.request(provider, endpoint, {
      ...opt,
      method: "HEAD",
      params,
    });
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {Object<string, any>} [params]
   * @param {OurinApiRequestOptions} [opt]
   * @returns {Promise<any>}
   */
  delete(provider, endpoint, params = {}, opt = {}) {
    return this.del(provider, endpoint, params, opt);
  }

  /**
   * @param {string} provider
   * @param {string} endpoint
   * @param {Object<string, any>} [params]
   * @returns {string}
   */
  buildUrl(provider, endpoint, params = {}) {
    const cfg = this.getProviderConfig(provider);
    const url = new URL(
      this.normEndpoint(endpoint),
      this.normBase(cfg.baseURL),
    );
    const merged = this.mergeParams(this.resolveParams(cfg), params);
    const query = this.serializeParams(merged);

    if (query) url.search = query;

    return url.toString();
  }

  makeProviders() {
    return {
      nexray: {
        baseURL: "https://api.nexray.web.id",
      },
      apiFaa: {
        baseURL: "https://api-faa.my.id",
      },
      yuulabs: {
        baseURL: "https://api.yuulabs.web.id",
      },
      yupra: {
        baseURL: "https://api.yupra.my.id",
      },
      emiliabot: {
        baseURL: "https://api.emiliabot.my.id",
      },
      azbry: {
        baseURL: "https://api.azbry.com",
      },
      cuki: {
        baseURL: "https://api.cuki.biz.id",
        auth: {
          params: {
            apikey: () => this.pickCfg(["APIkey.cuki"], "cuki-x"),
          },
          headers: {
            "x-api-key": () => this.pickCfg(["APIkey.cuki"], "cuki-x"),
          },
        },
      },
      neoxr: {
        baseURL: "https://api.neoxr.eu",
        auth: {
          params: {
            apikey: () => this.pickCfg(["APIkey.neoxr"]),
          },
        },
      },
      covenant: {
        baseURL: "https://api.covenant.sbs",
        auth: {
          headers: {
            "x-api-key": () => this.pickCfg(["APIkey.covenant"]),
          },
        },
      },
      fgsi: {
        baseURL: "https://fgsi.dpdns.org",
        auth: {
          headers: {
            apikey: () => this.pickCfg(["APIkey.fgsi"], "fgsiapi-20c1605c-6d"),
          },
        },
      },
      zenzxz: {
        baseURL: "https://api.zenzxz.my.id",
      },
      ourin: {
        baseURL: "https://api.ourin.my.id",
      },
    };
  }

  makeRequestConfig(provider, endpoint, opt = {}) {
    const pvd = this.getProviderConfig(provider);
    const method = String(opt.method || "GET").toUpperCase();
    const headers = this.makeHeaders(pvd, opt.headers);
    const params = this.makeParams(pvd, opt.params);

    return {
      baseURL: this.normBase(pvd.baseURL),
      url: new URL(
        this.normEndpoint(endpoint),
        this.normBase(pvd.baseURL),
      ).toString(),
      method,
      headers,
      params,
      data: opt.data,
      responseType: opt.responseType || "json",
      timeout: opt.timeout || pvd.timeout || this.timeout,
      maxBodyLength: opt.maxBodyLength ?? Infinity,
      maxContentLength: opt.maxContentLength ?? Infinity,
    };
  }

  makeHeaders(pvd, hdr = {}) {
    return this.mergeHeaders(
      {
        "User-Agent": this.userAgent,
      },
      pvd.headers,
      this.resolveHeaders(pvd),
      hdr,
    );
  }

  makeParams(pvd, prm = {}) {
    return this.mergeParams(this.resolveParams(pvd), prm);
  }

  getCacheTTL(provider, opt = {}) {
    const ttl = opt.cacheTTL ?? this.getProviderConfig(provider).cacheTTL ?? 0;
    return Number(ttl) > 0 ? Number(ttl) : 0;
  }

  shouldCache(method, ttl, opt = {}) {
    if (opt.fullResponse) return false;
    if (opt.responseType === "stream") return false;
    return String(method || "GET").toUpperCase() === "GET" && ttl > 0;
  }

  makeCacheKey(provider, endpoint, cfg, opt = {}) {
    if (opt.cacheKey) return String(opt.cacheKey);
    return `${String(cfg.method || "GET").toUpperCase()}:${this.buildUrl(provider, endpoint, cfg.params)}`;
  }

  resolveHeaders(pvd) {
    return this.resolveMap(pvd.auth?.headers);
  }

  resolveParams(pvd) {
    return this.resolveMap(pvd.auth?.params);
  }

  resolveMap(src = {}) {
    const out = {};

    for (const [k, v] of Object.entries(src || {})) {
      const val = typeof v === "function" ? v() : v;
      if (this.empty(val)) continue;
      out[k] = val;
    }

    return out;
  }

  makeForm(fields = {}, files = []) {
    const form = new FormData();

    for (const [k, v] of Object.entries(fields || {})) {
      if (this.empty(v)) continue;
      form.append(k, this.formValue(v));
    }

    for (const file of this.normFiles(files)) {
      const name = file.name || "file";
      const value = file.value ?? file.buffer ?? file.file;
      if (this.empty(value)) continue;

      const meta = {};
      if (file.filename) meta.filename = file.filename;
      if (file.contentType) meta.contentType = file.contentType;

      if (Object.keys(meta).length > 0) {
        form.append(name, value, meta);
      } else {
        form.append(name, value);
      }
    }

    return form;
  }

  normFiles(files) {
    if (!files) return [];
    if (Array.isArray(files)) return files;
    if (this.isObj(files)) {
      return Object.entries(files).map(([name, value]) => {
        if (this.isObj(value) && !Buffer.isBuffer(value)) {
          return { name, ...value };
        }
        return { name, value };
      });
    }
    return [files];
  }

  makeError(provider, endpoint, err) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      err?.message ||
      "Error en la solicitud";
    const ex = new Error(`[${provider}] ${msg}`);
    ex.provider = provider;
    ex.endpoint = endpoint;
    ex.status = err?.response?.status || 500;
    ex.data = err?.response?.data || null;
    ex.cause = err;
    return ex;
  }

  pickResponse(res, type, fullResponse = false) {
    if (fullResponse) return res;
    if (type === "arraybuffer") {
      return Buffer.isBuffer(res.data) ? res.data : Buffer.from(res.data);
    }
    return res.data;
  }

  serializeParams(params = {}) {
    return qs.stringify(this.cleanParams(params), {
      arrayFormat: "repeat",
      skipNulls: true,
      encodeValuesOnly: true,
    });
  }

  cleanParams(val) {
    if (Array.isArray(val)) {
      return val
        .map((item) => this.cleanParams(item))
        .filter(
          (item) =>
            !this.empty(item) &&
            !(Array.isArray(item) && item.length === 0) &&
            !(this.isObj(item) && Object.keys(item).length === 0),
        );
    }

    if (this.isObj(val) && !Buffer.isBuffer(val)) {
      const out = {};

      for (const [k, v] of Object.entries(val)) {
        const next = this.cleanParams(v);
        if (this.empty(next)) continue;
        if (Array.isArray(next) && next.length === 0) continue;
        if (this.isObj(next) && Object.keys(next).length === 0) continue;
        out[k] = next;
      }

      return out;
    }

    return val;
  }

  normBase(baseURL) {
    return String(baseURL || "").replace(/\/+$/, "") + "/";
  }

  normEndpoint(endpoint) {
    return String(endpoint || "").replace(/^\/+/, "");
  }

  getCfg(path, fallback = undefined) {
    const parts = String(path || "")
      .split(".")
      .filter(Boolean);
    let cur = config;

    for (const part of parts) {
      if (cur == null || !Object.prototype.hasOwnProperty.call(cur, part)) {
        return fallback;
      }
      cur = cur[part];
    }

    return cur == null ? fallback : cur;
  }

  pickCfg(paths = [], fallback = undefined) {
    for (const path of paths) {
      const val = this.getCfg(path);
      if (!this.empty(val)) return val;
    }
    return fallback;
  }

  mergeHeaders(...list) {
    return Object.assign({}, ...list.filter(Boolean));
  }

  mergeParams(...list) {
    return Object.assign({}, ...list.filter(Boolean));
  }

  empty(val) {
    return val === undefined || val === null || val === "";
  }

  isObj(val) {
    return !!val && typeof val === "object" && !Array.isArray(val);
  }

  stringify(val) {
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    return JSON.stringify(val);
  }

  formValue(val) {
    if (Buffer.isBuffer(val)) return val;
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    return JSON.stringify(val);
  }
}

const ourinApi = new OurinApiManager();

export { OurinApiManager, OurinApiProvider, ourinApi };
export default ourinApi;
