/**
 * SHADOW-BOT-MD — Lanzador con QR visual
 * ───────────────────────────────────────
 * Arranca el bot en modo QR (`node src/index.js qr`) y, además de imprimir
 * el QR en consola, lo guarda como PNG en `qr-bot.png` (raíz del repo)
 * para poder escanearlo desde el visor de archivos.
 *
 * Uso: node tools/run-qr-visual.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const qt = require('qrcode-terminal')
const QRCode = require('qrcode')

const RUTA_PNG = new URL('../qr-bot.png', import.meta.url).pathname
const original = qt.generate.bind(qt)

qt.generate = function (text, opciones, cb) {
  // Solo cadenas largas de QR (el código de pairing corto no se renderiza)
  if (typeof text === 'string' && text.length > 40) {
    try {
      QRCode.toFile(RUTA_PNG, text, { width: 720, margin: 2, errorCorrectionLevel: 'M' }, (err) => {
        if (!err) console.log(`\n📷 [qr] PNG actualizado: ${RUTA_PNG} — escanéalo con WhatsApp (Dispositivos vinculados)\n`)
        else console.error('[qr] fallo generando PNG:', err.message)
      })
    } catch (e) {
      console.error('[qr] no se pudo generar el PNG:', e.message)
    }
  }
  // La generación original (y su callback con el ASCII) se deja intacta
  if (typeof opciones === 'function') return original(text, opciones)
  return original(text, opciones, cb)
}

process.argv.push('qr')
await import('../src/index.js')
