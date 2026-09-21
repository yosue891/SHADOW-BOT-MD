import { test } from 'node:test'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import handler, { extractCode, extFromName } from '../plugins/herramientas/herras-zipcode.js'

/* ---------- mocks que imitan el runtime del bot ---------- */

function makeM({ quoted = null, text = '' } = {}) {
  return {
    chat: '120363000000000000@g.us',
    sender: '584242773183@s.whatsapp.net',
    text,
    quoted,
    reactions: [],
    async react(e) { this.reactions.push(e) },
  }
}

function makeConn(sent) {
  return {
    async reply(_chat, txt, _m) { sent.replies.push(txt); return {} },
    async sendFile(_chat, buffer, filename, caption, _quoted, _ptt, options) {
      sent.files.push({ buffer, filename, caption, options })
      return { key: { id: 'FAKE' } }
    },
  }
}

const run = async ({ quoted, text }) => {
  const sent = { replies: [], files: [] }
  const m = makeM({ quoted, text })
  const conn = makeConn(sent)
  await handler(m, { conn, text, usedPrefix: '>', command: 'zip' })
  return { m, sent }
}

const longCode = '```python\n' + 'def saludar(n):\n    return f"Hola {n}"\n'.repeat(4) + '\nfor i in range(5):\n    print(saludar(i))\n```'

/* ---------- extractCode ---------- */

test('extractCode: detecta lenguaje y extensión del bloque ```', () => {
  const { code, lang, ext } = extractCode(longCode)
  assert.equal(lang, 'python')
  assert.equal(ext, 'py')
  assert.ok(code.startsWith('def saludar(n):'), 'debe quitar las comillas triples')
  assert.ok(!code.includes('```'), 'no debe quedar ningún fence')
})

test('extractCode: sin bloque devuelve txt y limpia fences sueltos', () => {
  const { ext, code } = extractCode('```\nconsole.log(1)\n```')
  assert.equal(ext, 'txt')
  assert.equal(code.trim(), 'console.log(1)')
})

test('extFromName: reconoce extensión de nombre de archivo', () => {
  assert.equal(extFromName('script.py'), 'py')
  assert.equal(extFromName('app.component.ts'), 'ts')
  assert.equal(extFromName('sin_extension'), null)
  assert.equal(extFromName('raro.extensionlarga'), null)
})

/* ---------- handler: código citado ---------- */

test('handler: convierte código citado en un .zip descargable', async () => {
  const { m, sent } = await run({ quoted: { text: longCode, mimetype: 'text/plain' } })

  assert.equal(sent.files.length, 1, 'debe enviar exactamente un archivo')
  const f = sent.files[0]
  assert.equal(f.filename, 'codigo.zip')
  assert.equal(f.options.mimetype, 'application/zip')
  assert.equal(f.options.asDocument, true)

  // el buffer debe ser un ZIP real y legible
  const zip = new AdmZip(f.buffer)
  const names = zip.getEntries().map((e) => e.entryName)
  assert.deepEqual(names, ['codigo.py'], 'el zip debe contener el archivo con extensión .py')
  const content = zip.readAsText('codigo.py')
  assert.ok(content.includes('print(saludar(i))'), 'el contenido debe conservarse intacto')
  assert.equal(content.split('\n').length, 11, 'las 11 líneas del bloque deben conservarse')
  assert.ok(m.reactions.includes('✅'))
  assert.match(f.caption, /11 líneas/, 'la leyenda debe informar la cantidad de líneas')
})

test('handler: usa el nombre indicado por el usuario', async () => {
  const { sent } = await run({ quoted: { text: longCode }, text: 'mi_script' })
  assert.equal(sent.files[0].filename, 'mi_script.zip')
  assert.deepEqual(new AdmZip(sent.files[0].buffer).getEntries().map((e) => e.entryName), ['mi_script.py'])
})

test('handler: acepta "nombre | ..." como prefijo del argumento', async () => {
  const { sent } = await run({ quoted: { text: longCode }, text: 'bot.py | ignora esto' })
  assert.equal(sent.files[0].filename, 'bot.zip')
  assert.deepEqual(new AdmZip(sent.files[0].buffer).getEntries().map((e) => e.entryName), ['bot.py'])
})

/* ---------- handler: código en el mismo mensaje ---------- */

test('handler: comprime código pegado junto al comando', async () => {
  const { sent } = await run({ quoted: null, text: 'index.js\n' + 'const a = 1\n'.repeat(6) })
  assert.equal(sent.files.length, 1)
  assert.equal(sent.files[0].filename, 'index.zip')
  assert.deepEqual(new AdmZip(sent.files[0].buffer).getEntries().map((e) => e.entryName), ['index.js'])
})

/* ---------- handler: documento citado ---------- */

test('handler: comprime un documento citado conservando su nombre', async () => {
  const payload = Buffer.from('contenido del documento de prueba\n'.repeat(3))
  const quoted = {
    msg: { documentMessage: { fileName: 'reporte.pdf', mimetype: 'application/pdf' } },
    mimetype: 'application/pdf',
    async download() { return payload },
  }
  const { sent } = await run({ quoted })
  assert.equal(sent.files[0].filename, 'reporte.zip')
  const zip = new AdmZip(sent.files[0].buffer)
  assert.deepEqual(zip.getEntries().map((e) => e.entryName), ['reporte.pdf'])
  assert.deepEqual(zip.readFile('reporte.pdf'), payload, 'los bytes deben ser idénticos')
})

/* ---------- handler: imagen citada ---------- */

test('handler: comprime una imagen citada usando la extensión detectada', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex')
  const quoted = { mimetype: 'image/png', async download() { return png } }
  const { sent } = await run({ quoted })
  assert.equal(sent.files[0].filename, 'media.zip')
  const zip = new AdmZip(sent.files[0].buffer)
  assert.deepEqual(zip.getEntries().map((e) => e.entryName), ['archivo.png'])
})

/* ---------- casos de error / ayuda ---------- */

test('handler: sin citar y sin texto muestra la ayuda', async () => {
  const { sent } = await run({ quoted: null, text: '' })
  assert.equal(sent.files.length, 0)
  assert.match(sent.replies[0], /ZIP de código/)
})

test('handler: texto demasiado corto no genera zip y avisa', async () => {
  const { m, sent } = await run({ quoted: { text: 'hola' } })
  assert.equal(sent.files.length, 0)
  assert.match(sent.replies[0], /muy corto/)
  assert.ok(m.reactions.includes('❓'))
})

test('handler: citado sin texto avisa en lugar de fallar', async () => {
  const { sent } = await run({ quoted: { mimetype: 'text/plain' } })
  assert.equal(sent.files.length, 0)
  assert.match(sent.replies[0], /no tiene texto/)
})

test('handler: si download() falla, responde el error sin romper', async () => {
  const quoted = {
    msg: { documentMessage: { fileName: 'x.pdf', mimetype: 'application/pdf' } },
    mimetype: 'application/pdf',
    async download() { throw new Error('media expirada') },
  }
  const { m, sent } = await run({ quoted })
  assert.equal(sent.files.length, 0)
  assert.match(sent.replies[0], /media expirada/)
  assert.ok(m.reactions.includes('❌'))
})

/* ---------- casos reales de Baileys (lib/simple.js) ---------- */

test('handler: quoted sin download (media expirada) responde error claro', async () => {
  // lib/simple.js:2281 borra quoted.download cuando no hay mediaMessage
  const quoted = {
    msg: { documentMessage: { fileName: 'viejo.pdf', mimetype: 'application/pdf' } },
    mimetype: 'application/pdf',
  }
  const { m, sent } = await run({ quoted })
  assert.equal(sent.files.length, 0)
  assert.match(sent.replies[0], /media expirada|no puedo descargar/i)
  assert.ok(m.reactions.includes('❌'))
})

test('handler: lee el caption cuando lo citado es una imagen con texto', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex')
  const quoted = {
    mimetype: 'image/png',
    caption: '```js\n' + 'const x = 1\n'.repeat(6) + '```',
    async download() { return png },
  }
  const { sent } = await run({ quoted })
  assert.equal(sent.files.length, 1, 'una imagen citada siempre se puede zipear')
  assert.equal(sent.files[0].filename, 'media.zip')
  assert.deepEqual(new AdmZip(sent.files[0].buffer).getEntries().map((e) => e.entryName), ['archivo.png'])
})

test('metadata del plugin registrada correctamente', () => {
  assert.deepEqual(handler.command, ['zip', 'zipcode', 'codezip', 'zipc', 'azip', 'tozip', 'zip-code'])
  assert.deepEqual(handler.tags, ['tools'])
  assert.ok(Array.isArray(handler.help) && handler.help.length > 0)
})
