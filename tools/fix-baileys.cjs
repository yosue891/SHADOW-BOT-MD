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

const explicit = "export { BufferJSON } from './generics.js'; // fix: resuelve el conflicto de star exports"

const candidates = [
  path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'index.js'),
  path.join(process.cwd(), 'vendor', 'baileys', 'lib', 'Utils', 'index.js')
]

for (const target of candidates) {
  if (!fs.existsSync(target)) continue
  const src = fs.readFileSync(target, 'utf8')
  if (src.includes("BufferJSON } from './generics.js'")) {
    console.log('[fix-baileys] Parche ya aplicado en:', target)
    continue
  }
  const needsPatch = src.includes("export * from './generics.js';") &&
    src.includes("export * from './use-sqlite-auth-state.js';")
  if (!needsPatch) {
    console.log('[fix-baileys] Sin conflicto de BufferJSON en:', target)
    continue
  }
  try {
    fs.writeFileSync(target, src.trimEnd() + '\n' + explicit + '\n')
    console.log('[fix-baileys] Parche aplicado en:', target)
  } catch (err) {
    console.error('[fix-baileys] No se pudo parchear', target, err.message)
  }
}
