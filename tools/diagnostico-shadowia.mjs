#!/usr/bin/env node
/* ============================================================
   tools/diagnostico-shadowia.mjs
   ------------------------------------------------------------
   Diagnóstico completo: por qué Shadowia no responde.

   Uso:  node tools/diagnostico-shadowia.mjs

   Revisa, en orden:
     1. Versión de Node
     2. Que el archivo del plugin exista
     3. Que sus dependencias estén instaladas
     4. Que el módulo importe sin errores (muestra el error real)
     5. Metadatos del plugin (command / tags / rowner)
     6. Que el CARGADOR REAL del bot lo registre
     7. Conflicto de nombres de comando con otros plugins
     8. Que el handler ejecute sin red (prueba en seco)
     9. Ajustes de la base que hacen que el bot ignore mensajes
    10. Owners configurados
    11. Si el código local está desactualizado respecto a GitHub
    12. El comando .bots (info y carrusel de Sub-Bots)
   ============================================================ */

import { existsSync, readFileSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const ESC = String.fromCharCode(27)
const pintar = (codigo) => (s) => ESC + '[' + codigo + 'm' + s + ESC + '[0m'
const verde = pintar(32)
const rojo = pintar(31)
const amarillo = pintar(33)
const cyan = pintar(36)

const RAIZ = process.cwd()
const PLUGIN = 'plugins/ia/ia-shadowia.js'

let fallos = 0
let avisos = 0

function ok(texto) {
  console.log('  ' + verde('OK  ') + ' ' + texto)
}
function fail(texto, arreglo) {
  fallos++
  console.log('  ' + rojo('FALLO') + ' ' + texto)
  console.log('        ' + rojo('->') + ' ' + arreglo)
}
function warn(texto, arreglo) {
  avisos++
  console.log('  ' + amarillo('OJO ') + ' ' + texto)
  console.log('        ' + amarillo('->') + ' ' + arreglo)
}
function seccion(texto) {
  const guiones = '-'.repeat(Math.max(0, 58 - texto.length))
  console.log('\n' + cyan('-- ' + texto + ' ' + guiones))
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log(cyan('\nDIAGNOSTICO DE SHADOWIA - SHADOW-BOT-MD\n'))

  /* 1. Node */
  seccion('1. Node.js')
  const version = Number(process.versions.node.split('.')[0])
  if (version >= 20) ok('Node ' + process.versions.node)
  else fail('Node ' + process.versions.node + ' es muy viejo', 'Instala Node 20 o superior: https://nodejs.org')

  /* 2. El archivo existe */
  seccion('2. Archivo del plugin')
  const rutaPlugin = join(RAIZ, PLUGIN)
  const existePlugin = existsSync(rutaPlugin)
  if (existePlugin) ok(PLUGIN + ' existe (' + readFileSync(rutaPlugin).length + ' bytes)')
  else fail(PLUGIN + ' NO existe en esta carpeta',
    'Tu copia del bot esta desactualizada. Ejecuta: git pull origin main\n' +
    '        (si no usas git, baja el repo otra vez de https://github.com/yosue891/SHADOW-BOT-MD)')

  /* 3. Dependencias */
  seccion('3. Dependencias')
  const faltan = []
  for (const dep of ['axios', 'cfonts', 'adm-zip']) {
    try { await import(dep) } catch { faltan.push(dep) }
  }
  if (!faltan.length) ok('dependencias instaladas (axios, cfonts, adm-zip)')
  else fail('faltan dependencias: ' + faltan.join(', '), 'Ejecuta: npm install')

  /* 4. El modulo importa */
  seccion('4. Importar el modulo')
  let mod = null
  if (existePlugin) {
    try {
      mod = await import('file://' + rutaPlugin + '?t=' + Date.now())
      ok('el modulo importa sin errores de sintaxis')
    } catch (e) {
      fail('el modulo NO importa', (e?.message || String(e)) + '\n        Revisa la linea que indica el error en ' + PLUGIN)
    }
  }

  /* 5. Metadatos */
  seccion('5. Metadatos del plugin')
  const h = mod?.default
  if (h) {
    const cmds = Array.isArray(h.command) ? h.command : h.command ? [h.command] : []
    if (cmds.length) ok('comandos: ' + cmds.join(', '))
    else fail('no tiene handler.command', 'Sin comandos el bot no puede llamarlo')
    if (Array.isArray(h.tags)) ok('tags: ' + h.tags.join(', '))
    if (h.rowner === true) ok('rowner: true (solo owners) - correcto')
    else warn('rowner no es true', 'Cualquiera podria usarlo; revisa el final del archivo')
    if (typeof h === 'function') ok('el handler es una funcion')
    else fail('el default export no es una funcion', 'Revisa el export default del final del archivo')
  }

  /* 6. Cargador real */
  seccion('6. Cargador real del bot (src/index.js)')
  let registrado = false
  let claveShadowia = null
  try {
    await import('file://' + join(RAIZ, 'src/index.js') + '?t=' + Date.now())
    for (let i = 0; i < 90; i++) {
      if (global.plugins && Object.keys(global.plugins).length) break
      await dormir(1000)
    }
    const total = Object.keys(global.plugins || {}).length
    claveShadowia = Object.keys(global.plugins || {}).find((k) => /shadowia/i.test(k))
    if (claveShadowia) {
      registrado = true
      ok('el bot lo registro como "' + claveShadowia + '" (' + total + ' plugins en total)')
    } else {
      fail('no aparece entre los ' + total + ' plugins cargados',
        'El bot no lo esta leyendo. Busca arriba en la consola del bot un error al cargar ia-shadowia.js')
    }
  } catch (e) {
    fail('no se pudo arrancar el bot para probar', String(e?.message || e))
  }

  /* 7. Conflicto de comandos */
  seccion('7. Conflicto de nombres de comando')
  if (registrado) {
    const mio = global.plugins[claveShadowia]
    const misCmds = (Array.isArray(mio.command) ? mio.command : [mio.command]).map(String)
    let chocan = []
    for (const [ruta, p] of Object.entries(global.plugins)) {
      if (/shadowia/i.test(ruta)) continue
      const otros = (Array.isArray(p?.command) ? p.command : p?.command ? [p.command] : []).map(String)
      for (const c of otros) if (misCmds.includes(c)) chocan.push(c + ' -> ' + ruta)
    }
    if (chocan.length) {
      for (const c of chocan) warn('comando compartido: ' + c,
        'Ojo: el bot ejecuta TODOS los plugins que coinciden (no hay break), asi que se dispararian los dos a la vez. Renombra el comando en ia-shadowia.js')
    } else ok('ningun otro plugin usa los mismos comandos')
  }

  /* 8. Prueba en seco */
  seccion('8. Prueba en seco (sin red)')
  if (registrado) {
    try {
      const plugin = global.plugins[claveShadowia]
      const GRUPO = '120363000000000000@g.us'
      global.db = global.db || { data: { chats: {}, users: {}, settings: {} } }
      global.db.data.chats[GRUPO] = global.db.data.chats[GRUPO] || {}
      const respuestas = []
      const conn = {
        user: { jid: '584240000000@s.whatsapp.net' },
        async reply(_c, t) { respuestas.push(String(t)) },
        async groupMetadata() {
          return {
            owner: '584241111111@s.whatsapp.net',
            participants: [
              { id: '584240000000@s.whatsapp.net', admin: 'superadmin' },
              { id: '584242222222@s.whatsapp.net', admin: null },
            ],
          }
        },
        async groupParticipantsUpdate() {},
        async groupUpdateSubject() {},
        async groupUpdateDescription() {},
        async updateProfilePicture() {},
        async groupSettingUpdate() {},
        async groupLeave() {},
        async sendPresenceUpdate() {},
        async sendMessage() { return { key: { id: 'X' } } },
      }
      const m = {
        chat: GRUPO, sender: '584242773183@s.whatsapp.net', isGroup: true, text: 'ayuda',
        mentionedJid: [], reactions: [], quoted: null, msg: {}, async react() {},
      }
      await plugin(m, {
        conn, args: [], text: 'ayuda', isROwner: true, isOwner: true,
        usedPrefix: '>', command: 'shadowia', isBotAdmin: true,
      })
      if (respuestas.length) ok('respondio: "' + respuestas[0].slice(0, 60).replace(/\n/g, ' ') + '..."')
      else fail('el handler corrio pero no respondio nada', 'Revisa el caso ayuda del switch')
    } catch (e) {
      fail('el handler lanzo una excepcion', String(e?.message || e))
    }
  }

  /* 9. Ajustes que hacen que el bot ignore mensajes */
  seccion('9. Ajustes que hacen que el bot ignore TODO en silencio')
  const rutaDb = join(RAIZ, 'database.json')
  let db = { settings: {}, chats: {}, users: {} }
  if (existsSync(rutaDb)) {
    try { db = JSON.parse(readFileSync(rutaDb, 'utf8')) }
    catch { warn('database.json no es JSON valido', 'Borralo y reinicia el bot, se recrea solo') }
  } else warn('no hay database.json', 'Se crea solo al arrancar el bot')

  const ajustes = Object.values(db.settings || {})[0] || {}
  const bloqueos = [
    ['self', 'MODO SELF activo: solo responde a su dueno y a mods. Pon "self": false en database.json'],
    ['antiPrivate', 'antiPrivate activo: bloquea chats privados. Pon "antiPrivate": false'],
    ['gponly', 'gponly activo: ignora casi todo fuera de grupos. Pon "gponly": false'],
  ]
  let algunoMal = false
  for (const [clave, mensaje] of bloqueos) {
    if (ajustes[clave]) { fail(clave + ' = true', mensaje); algunoMal = true }
  }
  const baneados = Object.entries(db.chats || {}).filter(([, c]) => c?.isBanned)
  if (baneados.length) {
    fail(baneados.length + ' chat(s) baneado(s): ' + baneados.map(([k]) => k).join(', '),
      'Un chat baneado ignora TODO menos .unbanchat. Escribe .unbanchat en ese grupo')
    algunoMal = true
  }
  if (!algunoMal) ok('ningun ajuste esta bloqueando los mensajes')

  /* 10. Owners */
  seccion('10. Owners configurados')
  // El bot usa global.owner, que se define en src/settings.js (NO en config.js).
  // config.js tiene su propio owner para los helpers de config, así que reviso ambos.
  const leerNumeros = (archivo, patron) => {
    try {
      const txt = readFileSync(join(RAIZ, archivo), 'utf8')
      const bloque = patron.exec(txt)
      if (!bloque) return null
      return (bloque[1].match(/\d{7,15}/g) || [])
    } catch { return null }
  }
  const deSettings = leerNumeros('src/settings.js', /global\.owner\s*=\s*\[([\s\S]*?)\n\]/)
  const deConfig = leerNumeros('config.js', /owner:\s*\{[\s\S]*?number:\s*\[([^\]]*)\]/)

  if (deSettings?.length) {
    ok('owners que usa el bot (src/settings.js): ' + deSettings.join(', '))
    if (deSettings.includes('584242773183')) ok('584242773183 (Yosue) esta en la lista -> Shadowia te va a obedecer')
    else fail('584242773183 (Yosue) NO esta en src/settings.js',
      'Agregalo a global.owner en src/settings.js: ["584242773183", "yosue", true]')
  } else {
    fail('no pude leer global.owner en src/settings.js', 'Sin owners, Shadowia rechaza a todo el mundo')
  }
  if (deConfig?.length) ok('owners en config.js (secundario): ' + deConfig.join(', '))
  if (deSettings?.length && deSettings.length > 3) {
    warn('hay ' + deSettings.length + ' owners', 'Shadowia obedece a TODOS ellos. Si quieres que sea solo tuya, deja unicamente tu numero en src/settings.js')
  }

  /* 11. Codigo actualizado */
  seccion('11. Tu codigo esta al dia?')
  const REPO = 'https://github.com/yosue891/SHADOW-BOT-MD'
  const corre = (cmd) => {
    try { return execSync(cmd, { cwd: RAIZ, stdio: ['ignore', 'pipe', 'ignore'], timeout: 45000 }).toString().trim() }
    catch { return null }
  }
  if (!corre('git rev-parse --git-dir')) {
    warn('esta carpeta no es un repo git', 'Baja el repo actualizado de ' + REPO + ' y compara tus archivos')
  } else if (!corre('git remote get-url origin')) {
    warn('el repo no tiene configurado el remoto "origin"', 'Ejecuta: git remote add origin ' + REPO)
  } else if (corre('git fetch origin main --quiet') === null) {
    warn('no pude consultar GitHub (sin conexion o sin permisos)', 'Revisa tu internet, o entra a ' + REPO + '/commits/main y compara el ultimo commit con el tuyo')
  } else {
    const detras = Number(corre('git rev-list --count HEAD..origin/main') || 0)
    const local = corre('git rev-parse --short HEAD')
    const remoto = corre('git rev-parse --short origin/main')
    if (detras > 0) fail('tu copia va ' + detras + ' commit(s) por detras (tu: ' + local + ', GitHub: ' + remoto + ')',
      'Ejecuta: git pull origin main   <- si Shadowia no responde, casi seguro es esto')
    else ok('estas al dia con GitHub (' + local + ')')
  }

  /* 12. El comando .bots (carrusel de Sub-Bots) */
  seccion('12. Comando .bots (info de Sub-Bots)')
  const PLUGIN_BOTS = 'plugins/subbots/subs-listbots.js'
  const rutaBots = join(RAIZ, PLUGIN_BOTS)
  if (!existsSync(rutaBots)) {
    fail(PLUGIN_BOTS + ' NO existe', 'Tu copia esta desactualizada: git pull origin main')
  } else {
    const codigoBots = readFileSync(rutaBots, 'utf8')
    // las tres guardas del arreglo; si falta alguna, tu copia es vieja
    if (codigoBots.includes('Array.isArray(global.conns)')) ok('inicializa global.conns (si no, revienta)')
    else fail('le falta la guarda de global.conns', 'Tu copia de ' + PLUGIN_BOTS + ' es vieja: git pull origin main')

    if (codigoBots.includes('if (!conectados.length)')) ok('avisa cuando no hay Sub-Bots conectados')
    else fail('no avisa cuando no hay Sub-Bots', 'Tu copia es vieja: con 0 Sub-Bots mandaba un carrusel vacio que WhatsApp descarta en silencio')

    if (/const listaTexto|const textoRespaldo/.test(codigoBots) && codigoBots.includes('await m.reply(listaTexto)')) ok('manda la cantidad en texto SIEMPRE, ademas del carrusel')
    else if (/const textoRespaldo/.test(codigoBots)) warn('solo manda la lista si el carrusel FALLA',
      'Si tu WhatsApp no dibuja carruseles, relayMessage no avisa y te quedas sin nada. Actualiza: git pull origin main')
    else fail('no manda la cantidad en texto', 'Tu copia es vieja: git pull origin main')

    // prueba en seco del comando
    try {
      const modBots = await import('file://' + rutaBots + '?t=' + Date.now())
      const hBots = modBots.default
      const cmdsBots = (Array.isArray(hBots.command) ? hBots.command : [hBots.command]).map(String)
      if (cmdsBots.includes('bots')) ok('responde a .bots (comandos: ' + cmdsBots.join(', ') + ')')
      else fail('el comando "bots" no esta en handler.command', 'Revisa el final de ' + PLUGIN_BOTS)

      if (!Array.isArray(global.conns)) global.conns = []
      const connsGuardados = global.conns
      const connGuardado = global.conn
      global.conns = []
      global.conn = { user: { jid: '584240000000:12@s.whatsapp.net', name: 'Diagnostico' } }

      const enviados = []
      const connFalso = {
        user: { jid: '584240000000:12@s.whatsapp.net', name: 'Diagnostico' },
        async reply(c, t) { enviados.push(String(t)) },
        async relayMessage() { enviados.push('[carrusel]') },
        async waUploadToServer() { throw new Error('diagnostico sin red') },
        getName: () => 'Diagnostico',
      }
      const mFalso = {
        chat: '120363000000000000@g.us', sender: '584240000000@s.whatsapp.net',
        text: '.bots', isGroup: true, pushName: 'Diagnostico', quoted: null, msg: {},
        key: { id: 'DIAG', fromMe: false, remoteJid: '120363000000000000@g.us' },
        message: { extendedTextMessage: { text: '.bots' } },
        async react() {}, async reply(t) { enviados.push(String(t)) },
      }
      await hBots(mFalso, { conn: connFalso, command: 'bots', args: [], text: '', usedPrefix: '.' })

      if (!enviados.length) fail('con 0 Sub-Bots NO mando ningun mensaje',
        'Este es el bug: WhatsApp descarta en silencio un carrusel sin tarjetas. Actualiza: git pull origin main')
      else if (enviados.some((t) => t.includes('[carrusel]'))) fail('con 0 Sub-Bots mando un CARRUSEL VACIO',
        'WhatsApp lo descarta y no ves nada. Actualiza: git pull origin main')
      else ok('con 0 Sub-Bots responde: "' + enviados[0].split('\n')[0].slice(0, 60) + '"')

      global.conns = connsGuardados
      global.conn = connGuardado
    } catch (e) {
      fail('el comando .bots se rompio al probarlo', (e?.message || String(e)) + '\n        Actualiza: git pull origin main')
    }
  }
  if (registrado) {
    const totalConns = Array.isArray(global.conns) ? global.conns.length : 0
    if (totalConns === 0) warn('ahora mismo hay 0 Sub-Bots conectados',
      'El CARRUSEL solo aparece con al menos uno. Conecta uno con .code o .qr y despues usa .bots\n        (la cantidad en texto si te llega siempre)')
    else ok('hay ' + totalConns + ' Sub-Bot(s) en global.conns')
  }

  /* Resumen */
  console.log(cyan('\n-- RESUMEN ' + '-'.repeat(48)))
  if (fallos === 0) {
    console.log('  ' + verde('Todo correcto.') + '\n')
    console.log('  Si aun asi no responde en WhatsApp, revisa:')
    console.log('    - que el bot este CONECTADO (la consola no debe quedarse en "Connecting...")')
    console.log('    - que uses un prefijo valido: ' + cyan('#') + ' ' + cyan('!') + ' ' + cyan('.') + ' ' + cyan('/') + '   ejemplo: ' + cyan('.shadowia ayuda'))
    console.log('    - que el bot sea ADMIN del grupo si le pides acciones de admin')
    console.log('    - que tu numero este en la lista de owners (seccion 10)\n')
  } else {
    console.log('  ' + rojo(fallos + ' problema(s)') + ' y ' + amarillo(avisos + ' aviso(s)'))
    console.log('  Arregla primero los marcados como ' + rojo('FALLO') + '.\n')
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(rojo('El diagnostico se rompio: ') + (e?.stack || e))
  process.exit(1)
})
