const fs = require('fs')
const path = require('path')

try {
  const liaPath = path.join(process.cwd(), 'node_modules', '@itsliaaa', 'baileys')

  // --- Shim para 'ourin' y 'ourin-baileys' desde '@itsliaaa/baileys' ---
  const targets = [
    path.join(process.cwd(), 'node_modules', 'ourin'),
    path.join(process.cwd(), 'node_modules', 'ourin-baileys'),
    path.join(process.cwd(), 'node_modules', 'baileys'),
    path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys')
  ]

  if (fs.existsSync(liaPath)) {
    for (const target of targets) {
      if (!fs.existsSync(target)) {
        try {
          const parentDir = path.dirname(target)
          if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true })
          const type = process.platform === 'win32' ? 'junction' : 'dir'
          fs.symlinkSync(path.relative(parentDir, liaPath), target, type)
          console.log(`[fix-baileys] Symlink creado: ${path.relative(process.cwd(), target)} -> @itsliaaa/baileys`)
        } catch (e) {
          try {
            fs.cpSync(liaPath, target, { recursive: true, force: true })
            console.log(`[fix-baileys] Copia creada: ${path.relative(process.cwd(), target)} desde @itsliaaa/baileys`)
          } catch {}
        }
      }
    }
  }

  // Verificar @ffmpeg-installer/ffmpeg
  const ffmpegPath = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'ffmpeg')
  if (!fs.existsSync(ffmpegPath)) {
    console.warn('[fix-baileys] ADVERTENCIA: @ffmpeg-installer/ffmpeg no encontrado. Ejecuta: npm install @ffmpeg-installer/ffmpeg')
  }
  try {
    const instDir = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer')
    if (fs.existsSync(instDir)) {
      for (const sub of fs.readdirSync(instDir)) {
        const bin = path.join(instDir, sub, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
        if (!fs.existsSync(bin)) continue
        const st = fs.statSync(bin)
        if (!(st.mode & 0o111)) {
          fs.chmodSync(bin, st.mode | 0o755)
          console.log('[fix-baileys] permiso de ejecución aplicado a:', bin)
        }
      }
    }
  } catch (e) {
    console.warn('[fix-baileys] no se pudo ajustar el permiso de ffmpeg:', e.message)
  }
} catch (e) {
  console.error('[fix-baileys] Error shim baileys:', e.message)
}

const explicit = "export { BufferJSON } from './generics.js';"

const candidates = [
  path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'index.js'),
  path.join(process.cwd(), 'node_modules', '@itsliaaa', 'baileys', 'lib', 'Utils', 'index.js'),
  path.join(process.cwd(), 'node_modules', 'ourin', 'lib', 'Utils', 'index.js'),
  path.join(process.cwd(), 'node_modules', 'ourin-baileys', 'lib', 'Utils', 'index.js')
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
