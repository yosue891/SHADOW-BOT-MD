import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(execFile)

test('stickeraudio: handles short videos of 2s, 4s, PTV, styles/angles (normal, circle, crop), and 2-step sessions', async () => {
	const handlerModule = await import('../plugins/stickers/stickers-stickeraudio.js')
	const handler = handlerModule.default

	const installer = await import('@ffmpeg-installer/ffmpeg')
	const ffmpeg = installer?.default?.path || installer?.path || 'ffmpeg'

	// Generate 2s video with audio
	const v2aPath = '/tmp/test_sa_2s_a.mp4'
	await execAsync(ffmpeg, [
		'-y', '-f', 'lavfi', '-i', 'testsrc=d=2:s=320x240:r=30',
		'-f', 'lavfi', '-i', 'sine=d=2',
		'-c:v', 'libx264', '-c:a', 'aac', '-shortest', v2aPath
	])
	const v2aBuf = await fs.readFile(v2aPath)

	// Generate 2s video without audio (silent / GIF)
	const v2naPath = '/tmp/test_sa_2s_na.mp4'
	await execAsync(ffmpeg, [
		'-y', '-f', 'lavfi', '-i', 'testsrc=d=2:s=320x240:r=30',
		'-c:v', 'libx264', v2naPath
	])
	const v2naBuf = await fs.readFile(v2naPath)

	// Generate 4s video with audio
	const v4aPath = '/tmp/test_sa_4s_a.mp4'
	await execAsync(ffmpeg, [
		'-y', '-f', 'lavfi', '-i', 'testsrc=d=4:s=320x240:r=30',
		'-f', 'lavfi', '-i', 'sine=d=4',
		'-c:v', 'libx264', '-c:a', 'aac', '-shortest', v4aPath
	])
	const v4aBuf = await fs.readFile(v4aPath)

	// Mock WhatsApp connection
	const sentMessages = []
	const relayedMessages = []
	const mockConn = {
		decodeJid: (x) => x,
		generateMessageTag: () => 'tag_' + Math.random().toString(36).slice(2),
		waUploadToServer: async (streamOrPath, opts) => ({
			mediaUrl: 'https://example.com/mock_media',
			directPath: '/v/mock_media',
			mediaKey: Buffer.alloc(32),
			fileEncSha256: Buffer.alloc(32),
			fileSha256: Buffer.alloc(32),
			fileLength: 1000
		}),
		relayMessage: async (jid, message, options) => {
			relayedMessages.push({ jid, message, options })
			return { key: { id: 'relayed_1', remoteJid: jid } }
		},
		sendMessage: async (jid, content, options) => {
			sentMessages.push({ jid, content, options })
			return { key: { id: 'sent_1', remoteJid: jid } }
		}
	}

	// Test 1: 2s video with audio directly (normal default style)
	let reacted = false
	const m2a = {
		chat: '12345@s.whatsapp.net',
		sender: '12345@s.whatsapp.net',
		mtype: 'videoMessage',
		msg: {
			mimetype: 'video/mp4',
			seconds: 2
		},
		download: async () => v2aBuf,
		reply: async (t) => {},
		react: async (r) => { reacted = true }
	}

	await handler(m2a, {
		conn: mockConn,
		args: [],
		usedPrefix: '.',
		command: 'stickeraudio'
	})

	assert.equal(relayedMessages.length, 1, 'Debe haber enviado 1 sticker mediante relayMessage')
	assert.ok(relayedMessages[0].message?.stickerMessage, 'El mensaje relevado debe contener stickerMessage')
	assert.ok(relayedMessages[0].message?.stickerMessage?.audioMessage, 'El stickerMessage debe tener audioMessage')
	assert.ok(relayedMessages[0].message?.stickerMessage?.sound, 'El stickerMessage debe tener sound')
	assert.equal(sentMessages.length, 1, 'Debe haber enviado 1 audio complementario')
	assert.ok(sentMessages[0].content?.audio, 'El contenido debe ser un audio')
	assert.equal(reacted, true, 'Debe haber reaccionado con 🔊')

	// Test 2: 2s video WITHOUT audio directly (silent clip / GIF)
	relayedMessages.length = 0
	sentMessages.length = 0
	reacted = false

	const m2na = {
		chat: '12345@s.whatsapp.net',
		sender: '12345@s.whatsapp.net',
		mtype: 'videoMessage',
		msg: {
			mimetype: 'video/mp4',
			seconds: 2
		},
		download: async () => v2naBuf,
		reply: async (t) => {},
		react: async (r) => { reacted = true }
	}

	await handler(m2na, {
		conn: mockConn,
		args: [],
		usedPrefix: '.',
		command: 'stickeraudio'
	})

	assert.equal(relayedMessages.length, 1, 'Debe haber enviado 1 sticker para video sin audio')
	assert.ok(relayedMessages[0].message?.stickerMessage, 'El mensaje relevado debe contener stickerMessage')
	assert.ok(relayedMessages[0].message?.stickerMessage?.audioMessage, 'El stickerMessage debe tener audioMessage de respaldo silencioso')
	assert.ok(relayedMessages[0].message?.stickerMessage?.sound, 'El stickerMessage debe tener sound')
	assert.equal(sentMessages.length, 1, 'Debe haber enviado el audio')
	assert.equal(reacted, true, 'Debe haber reaccionado con 🔊')

	// Test 3: 4s video with circle style
	relayedMessages.length = 0
	sentMessages.length = 0
	reacted = false

	const m4a = {
		chat: '12345@s.whatsapp.net',
		sender: '12345@s.whatsapp.net',
		mtype: 'videoMessage',
		msg: {
			mimetype: 'video/mp4',
			seconds: 4
		},
		download: async () => v4aBuf,
		reply: async (t) => {},
		react: async (r) => { reacted = true }
	}

	await handler(m4a, {
		conn: mockConn,
		args: ['circle'],
		usedPrefix: '.',
		command: 'stickeraudio'
	})

	assert.equal(relayedMessages.length, 1, 'Debe haber enviado 1 sticker para video de 4s con estilo circle')
	assert.ok(relayedMessages[0].message?.stickerMessage?.audioMessage, 'El stickerMessage debe tener audioMessage para 4s')
	assert.equal(reacted, true, 'Debe haber reaccionado con 🔊')

	// Test 4: 2s video with crop style
	relayedMessages.length = 0
	sentMessages.length = 0
	reacted = false

	await handler(m2a, {
		conn: mockConn,
		args: ['crop'],
		usedPrefix: '.',
		command: 'stickeraudio'
	})

	assert.equal(relayedMessages.length, 1, 'Debe haber enviado 1 sticker con estilo crop')
	assert.equal(reacted, true, 'Debe haber reaccionado con 🔊')

	// Test 5: list styles
	sentMessages.length = 0
	await handler(m2a, {
		conn: mockConn,
		args: ['list'],
		usedPrefix: '.',
		command: 'stickeraudio'
	})
	assert.equal(sentMessages.length, 1, 'Debe haber enviado la lista de estilos')
	assert.ok(sentMessages[0].content?.text?.includes('Lista de estilos'), 'Debe contener el encabezado de estilos')
	assert.ok(sentMessages[0].content?.text?.includes('circle'), 'Debe incluir circle')
	assert.ok(sentMessages[0].content?.text?.includes('crop'), 'Debe incluir crop')

	// Test 6: PTV (video note) message
	relayedMessages.length = 0
	sentMessages.length = 0
	reacted = false

	const mPtv = {
		chat: '12345@s.whatsapp.net',
		sender: '12345@s.whatsapp.net',
		mtype: 'ptvMessage',
		msg: {
			mimetype: 'video/mp4',
			seconds: 2
		},
		download: async () => v2aBuf,
		reply: async (t) => {},
		react: async (r) => { reacted = true }
	}

	await handler(mPtv, {
		conn: mockConn,
		args: [],
		usedPrefix: '.',
		command: 'stickeraudio'
	})

	assert.equal(relayedMessages.length, 1, 'Debe procesar notas de video PTV correctamente')
	assert.equal(reacted, true, 'Debe haber reaccionado con 🔊')

	// Test 7: Video of up to 60s (valid duration)
	relayedMessages.length = 0
	sentMessages.length = 0
	reacted = false
	let replyText = ''

	const m60 = {
		chat: '12345@s.whatsapp.net',
		sender: '12345@s.whatsapp.net',
		mtype: 'videoMessage',
		msg: {
			mimetype: 'video/mp4',
			seconds: 60
		},
		download: async () => v4aBuf,
		reply: async (t) => { replyText = t },
		react: async (r) => { reacted = true }
	}

	await handler(m60, {
		conn: mockConn,
		args: [],
		usedPrefix: '.',
		command: 'stickeraudio'
	})

	assert.equal(relayedMessages.length, 1, 'Debe procesar videos de hasta 60s correctamente')
	assert.ok(relayedMessages[0].message?.stickerMessage?.audioMessage, 'El sticker debe tener audioMessage')
	assert.equal(reacted, true, 'Debe haber reaccionado con 🔊')

	// Test 8: Video exceeding 60s (e.g. 65s) is rejected with limit warning
	relayedMessages.length = 0
	sentMessages.length = 0
	reacted = false
	replyText = ''

	const mOver60 = {
		chat: '12345@s.whatsapp.net',
		sender: '12345@s.whatsapp.net',
		mtype: 'videoMessage',
		msg: {
			mimetype: 'video/mp4',
			seconds: 65
		},
		download: async () => v4aBuf,
		reply: async (t) => { replyText = t },
		react: async (r) => { reacted = true }
	}

	await handler(mOver60, {
		conn: mockConn,
		args: [],
		usedPrefix: '.',
		command: 'stickeraudio'
	})

	assert.equal(relayedMessages.length, 0, 'No debe forjar sticker si el video supera 60s')
	assert.ok(replyText.includes('supera el límite de 60 segundos'), 'Debe advertir que supera el límite de 60 segundos')
	assert.ok(replyText.includes('65 segundos'), 'Debe mencionar la duración del video')
	assert.equal(reacted, false, 'No debe haber reaccionado con 🔊')

	// Test 9: Video exceeding 60s without metadata (buffer duration > 60s)
	const vOverPath = '/tmp/test_sa_over60s.mp4'
	await execAsync(ffmpeg, [
		'-y', '-f', 'lavfi', '-i', 'testsrc=d=62:s=160x120:r=1',
		'-c:v', 'libx264', vOverPath
	])
	const vOverBuf = await fs.readFile(vOverPath)

	relayedMessages.length = 0
	sentMessages.length = 0
	reacted = false
	replyText = ''

	const mOverBuffer = {
		chat: '12345@s.whatsapp.net',
		sender: '12345@s.whatsapp.net',
		mtype: 'videoMessage',
		msg: {
			mimetype: 'video/mp4'
		},
		download: async () => vOverBuf,
		reply: async (t) => { replyText = t },
		react: async (r) => { reacted = true }
	}

	await handler(mOverBuffer, {
		conn: mockConn,
		args: [],
		usedPrefix: '.',
		command: 'stickeraudio'
	})

	assert.equal(relayedMessages.length, 0, 'No debe forjar sticker si la duración detectada supera 60s')
	assert.ok(replyText.includes('supera el límite de 60 segundos'), 'Debe advertir que supera el límite de 60 segundos tras analizar el archivo')

	// Clean up
	await fs.unlink(v2aPath).catch(() => {})
	await fs.unlink(v2naPath).catch(() => {})
	await fs.unlink(v4aPath).catch(() => {})
	await fs.unlink(vOverPath).catch(() => {})
})
