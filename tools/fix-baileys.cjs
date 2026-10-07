const fs = require('fs')
const path = require('path')

// --- Shim para 'ourin' alias (ourin-baileys) ---
// Algunos paneles/hostings usan npm viejo o no resuelven "ourin": "npm:ourin-baileys"
// Aseguramos node_modules/ourin -> ourin-baileys y @ffmpeg-installer
try {
  const ourinPath = path.join(process.cwd(), 'node_modules', 'ourin')
  const baileysPath = path.join(process.cwd(), 'node_modules', 'ourin-baileys')
  if (!fs.existsSync(ourinPath) && fs.existsSync(baileysPath)) {
    try {
      const type = process.platform === 'win32' ? 'junction' : 'dir'
      fs.symlinkSync('ourin-baileys', ourinPath, type)
      console.log('[fix-baileys] Symlink creado: node_modules/ourin -> ourin-baileys')
    } catch (e) {
      // fallback: copiar
      try {
        fs.cpSync(baileysPath, ourinPath, { recursive: true, force: true })
        console.log('[fix-baileys] Copia creada: node_modules/ourin desde ourin-baileys')
      } catch {}
    }
  }
  // Verificar @ffmpeg-installer/ffmpeg
  const ffmpegPath = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'ffmpeg')
  if (!fs.existsSync(ffmpegPath)) {
    console.warn('[fix-baileys] ADVERTENCIA: @ffmpeg-installer/ffmpeg no encontrado. Ejecuta: npm install @ffmpeg-installer/ffmpeg')
  }
  // npm puede bloquear el install script de @ffmpeg-installer (chmod +x del
  // binario). Sin permiso de ejecución, la conversión GIF→MP4 de los comandos
  // anime falla y solo se ve el texto. Se lo damos aquí.
  try {
    const instDir = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer')
    for (const sub of fs.readdirSync(instDir)) {
      const bin = path.join(instDir, sub, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
      if (!fs.existsSync(bin)) continue
      const st = fs.statSync(bin)
      if (!(st.mode & 0o111)) {
        fs.chmodSync(bin, st.mode | 0o755)
        console.log('[fix-baileys] permiso de ejecución aplicado a:', bin)
      }
    }
  } catch (e) {
    console.warn('[fix-baileys] no se pudo ajustar el permiso de ffmpeg:', e.message)
  }
} catch (e) {
  console.error('[fix-baileys] Error shim ourin', e.message)
}

const explicit = "export { BufferJSON } from './generics.js';"

const candidates = [
  path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'index.js'),
  path.join(process.cwd(), 'vendor', 'baileys', 'lib', 'Utils', 'index.js')
]

for (const target of candidates) {
  if (!fs.existsSync(target)) continue
  const src = fs.readFileSync(target, 'utf8')
  if (src.includes("BufferJSON } from './generics.js'")) continue
  const needsPatch = src.includes("export * from './generics.js';") &&
    src.includes("export * from './use-sqlite-auth-state.js';")
  if (!needsPatch) continue
  try {
    fs.writeFileSync(target, src.trimEnd() + '\n' + explicit + '\n')
    console.log('[fix-baileys] Parche aplicado en:', target)
  } catch (err) {
    console.error('[fix-baileys] No se pudo parchear', target, err.message)
  }
}
