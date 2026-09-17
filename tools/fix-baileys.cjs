/**
 * Post-install: corrige el fork de Baileys (yo-soy-yo-baileys) instalado como
 * @whiskeysockets/baileys.
 *
 * Problema: lib/Utils/index.js hace `export *` de generics.js y de
 * use-sqlite-auth-state.js, y AMBOS exportan `BufferJSON`. Ese conflicto de
 * "star exports" tumba el arranque con:
 *   SyntaxError: ... contains conflicting star exports for name 'BufferJSON'
 *
 * Solución: añadir una exportación explícita de BufferJSON en el barrel.
 * Una exportación explícita tiene prioridad sobre las estrella y resuelve la
 * ambigüedad sin perder ningún nombre exportado (useSqliteAuthState incluido).
 * Es idempotente: se puede ejecutar muchas veces sin efectos secundarios.
 */
const fs = require('fs')
const path = require('path')

const barrel = path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'index.js')
const explicit = "export { BufferJSON } from './generics.js'; // fix: resuelve el conflicto de star exports"

try {
  if (!fs.existsSync(barrel)) {
    console.log('[fix-baileys] @whiskeysockets/baileys no está instalado todavía; nada que parchear.')
    process.exit(0)
  }
  const src = fs.readFileSync(barrel, 'utf8')
  if (src.includes("BufferJSON } from './generics.js'")) {
    console.log('[fix-baileys] El parche ya estaba aplicado.')
    process.exit(0)
  }
  const needsPatch = src.includes("export * from './generics.js';") &&
    src.includes("export * from './use-sqlite-auth-state.js';")
  if (!needsPatch) {
    console.log('[fix-baileys] La versión instalada no tiene el conflicto de BufferJSON; nada que hacer.')
    process.exit(0)
  }
  fs.writeFileSync(barrel, src.trimEnd() + '\n' + explicit + '\n')
  console.log('[fix-baileys] Parche aplicado: conflicto de star exports BufferJSON resuelto.')
} catch (err) {
  // No romper la instalación si el parche falla.
  console.error('[fix-baileys] No se pudo aplicar el parche:', err.message)
}
