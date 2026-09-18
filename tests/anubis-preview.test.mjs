import assert from 'node:assert/strict'
import test from 'node:test'

import handler from '../plugins/_yttest.js'

test('el comando test envía la vista previa de Anubis Support', async () => {
  const sent = []
  const conn = {
    waUploadToServer: async () => ({
      mediaUrl: 'https://upload.test/thumb.jpg',
      directPath: '/mms/image/test'
    }),
    sendMessage: async (...args) => {
      sent.push(args)
      return { key: { id: 'test-message' } }
    }
  }
  const message = {
    chat: '123456789@s.whatsapp.net',
    key: { remoteJid: '123456789@s.whatsapp.net', id: 'quoted-id' }
  }

  await handler(message, { conn })

  assert.equal(sent.length, 1)
  const [jid, content, options] = sent[0]
  assert.equal(jid, message.chat)
  assert.equal(
    content.text,
    'https://anubissuport.netlify.app\n\n🎟️ *Anubis Support*\n> Soporte oficial de Anubis Bot'
  )
  assert.equal(content.linkPreview['canonical-url'], 'https://anubissuport.netlify.app')
  assert.equal(content.linkPreview['matched-text'], 'https://anubissuport.netlify.app')
  assert.equal(content.linkPreview.title, 'Anubis Support')
  assert.equal(content.linkPreview.description, 'Soporte oficial de Anubis Bot')
  assert.ok(Buffer.isBuffer(content.linkPreview.jpegThumbnail))
  assert.equal(options.quoted, message)
})
