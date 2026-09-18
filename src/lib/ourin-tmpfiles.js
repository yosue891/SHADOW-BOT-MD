import axios from 'axios'
import FormData from 'form-data'

const termaiKey = 'AIzaBj7z2z3xBjsk'
const termaiDomain = 'https://c.termai.cc'

async function uploadTo0x0(buffer, opts) {
  if (!Buffer.isBuffer(buffer)) throw new Error("buffer debe ser Buffer");
  
  const filename = opts?.filename || 'image.jpg'
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: opts?.contentType || "application/octet-stream" });

  const res = await axios.post(`${termaiDomain}/api/upload?key=${termaiKey}`, form, {
    headers: { ...form.getHeaders(), Accept: "application/json" },
    timeout: opts?.timeoutMs ?? 60_000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  })

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Error al subir (HTTP ${res.status}): ${typeof res.data === "string" ? res.data : JSON.stringify(res.data)}`);
  }
  
  if (res.data?.status && res.data?.path) {
    return { url: res.data.path, directUrl: res.data.path }
  }

  throw new Error("Respuesta sin datos válidos de Termai");
}

// Map everything locally to termai wrapper, keeping exported name identical for compatibility
export { uploadTo0x0 }