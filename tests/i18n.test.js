import test from 'node:test'
import assert from 'node:assert/strict'
import {
  setBotLang,
  getBotLang,
  isTranslationActive,
  translateOutgoing,
  translateContent,
  unstyleFancyText
} from '../lib/i18n.js'
import { getLanguages } from '../lib/gtranslate.js'

test('i18n: getLanguages returns a valid map with common languages', async () => {
  const langs = await getLanguages()
  assert.ok(typeof langs === 'object' && langs !== null)
  assert.ok(langs.en, 'English should be available')
  assert.ok(langs.es, 'Spanish should be available')
  assert.ok(langs.ja, 'Japanese should be available')
})

test('i18n: translation activation and switching language', async () => {
  setBotLang('es')
  assert.equal(isTranslationActive(), false)

  setBotLang('ja')
  assert.equal(isTranslationActive(), true)
  assert.equal(getBotLang(), 'ja')

  setBotLang('es')
  assert.equal(isTranslationActive(), false)
})

test('i18n: unstyleFancyText strips mathematical bold and small caps', () => {
  const styled = '🎃 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 🦇 ┌ ◦ ᴇꜱᴛᴀᴅᴏ: ᴜꜱᴜᴀʀɪᴏ 🕯️ └ ◦ ʟíᴍɪᴛᴇ: 𝟐𝟎 🩸'
  const unstyled = unstyleFancyText(styled)
  assert.ok(unstyled.includes('SHADOW GARDEN'), 'Must unstyle math bold to plain text')
  assert.ok(unstyled.includes('estado: usuario'), 'Must unstyle small caps to plain text')
  assert.ok(unstyled.includes('20'), 'Must unstyle math digits to plain digits')
})

test('i18n: translates fancy styled bot commands into Japanese', async () => {
  setBotLang('ja')
  const styledText = '┌  ◦ ᴇꜱᴛᴀᴅᴏ: ᴜꜱᴜᴀʀɪᴏ 🕯️\n> 🌌 𝐓𝐢𝐞𝐦𝐩𝐨: 100ms\nUsa .menu para ver comandos'
  const translated = await translateOutgoing(styledText, 'ja')
  assert.ok(translated.includes('.menu'), 'Command .menu must remain intact')
  // Japanese characters should be present in the translated text
  assert.ok(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(translated), 'Should contain Japanese characters')
  setBotLang('es')
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
