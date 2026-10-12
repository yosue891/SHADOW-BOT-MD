import test from 'node:test'
import assert from 'node:assert/strict'
import {
  setBotLang,
  getBotLang,
  isTranslationActive,
  translateOutgoing,
  translateContent
} from '../lib/i18n.js'
import { getLanguages, translate } from '../lib/gtranslate.js'

test('i18n: getLanguages returns a valid map with common languages', async () => {
  const langs = await getLanguages()
  assert.ok(typeof langs === 'object' && langs !== null)
  assert.ok(langs.en, 'English should be available')
  assert.ok(langs.es, 'Spanish should be available')
  assert.ok(langs.fr, 'French should be available')
})

test('i18n: translation activation and switching language', async () => {
  setBotLang('es')
  assert.equal(isTranslationActive(), false)

  setBotLang('en')
  assert.equal(isTranslationActive(), true)
  assert.equal(getBotLang(), 'en')

  const translated = await translateOutgoing('Hola mundo', 'en')
  assert.match(translated, /hello world/i)

  setBotLang('es')
  assert.equal(isTranslationActive(), false)
})

test('i18n: translateContent preserves bot commands and mentions', async () => {
  const payload = {
    text: 'Hola @123456, usa el comando .menu para comenzar https://example.com'
  }
  const result = await translateContent(payload, 'en')
  assert.ok(result.text.includes('.menu'), 'Command .menu must remain intact')
  assert.ok(result.text.includes('@123456'), 'Mention @123456 must remain intact')
  assert.ok(result.text.includes('https://example.com'), 'URL must remain intact')
})
