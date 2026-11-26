import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import pb from 'protobufjs/minimal.js'
import * as baileys from '@whiskeysockets/baileys'

const Writer = pb.Writer || pb.default?.Writer

const COLOR_PRESETS = {
	// Español
	rosa: 'ff69b4',
	rosado: 'ff69b4',
	azul: '1e90ff',
	morado: '9b59b6',
	violeta: '8e44ad',
	negro: '121212',
	verde: '2ecc71',
	rojo: 'e74c3c',
	amarillo: 'f1c40f',
	naranja: 'e67e22',
	blanco: 'f5f6fa',
	cyan: '00bcd4',
	dorado: 'ffd700',
	// Inglés / Originales
	pink: 'ff69b4',
	biru: '1e90ff',
	ungu: '9b59b6',
	hitam: '121212',
	hijau: '2ecc71',
	merah: 'e74c3c',
	kuning: 'f1c40f',
	oren: 'e67e22',
	putih: 'f5f6fa',
	blue: '1e90ff',
	purple: '9b59b6',
	black: '121212',
	green: '2ecc71',
	red: 'e74c3c',
	yellow: 'f1c40f',
	orange: 'e67e22',
	white: 'f5f6fa'
}

const normId = (jid) => String(jid || '').split('@')[0].split(':')[0]

const WRAPPERS = [
	'viewOnceMessage',
	'viewOnceMessageV2',
	'viewOnceMessageV2Extension',
	'ephemeralMessage',
	'documentWithCaptionMessage',
	'editedMessage'
]

const findImageMedia = (obj, depth = 0, hint = '') => {
	if (!obj || typeof obj !== 'object' || depth > 7) return null

	if (obj.imageMessage) return findImageMedia(obj.imageMessage, depth + 1, 'image')
	if (obj.documentMessage && /^image\//i.test(obj.documentMessage.mimetype || '')) {
		return findImageMedia(obj.documentMessage, depth + 1, 'document')
	}
	for (const key of WRAPPERS) {
		if (obj[key]?.message) {
			return findImageMedia(obj[key].message, depth + 1, key === 'documentWithCaptionMessage' ? 'document' : hint)
		}
	}

	if (obj.msg && typeof obj.msg === 'object') {
		const mtype = String(obj.mtype || '')
		const next = /image/i.test(mtype) ? 'image' : /document/i.test(mtype) ? 'document' : hint
		const found = findImageMedia(obj.msg, depth + 1, next)
		if (found) return found
	}
	for (const inner of [obj.message, obj.fakeObj?.message]) {
		if (inner && typeof inner === 'object') {
			const found = findImageMedia(inner, depth + 1, hint)
			if (found) return found
		}
	}

	if (obj.mediaKey && (obj.directPath || obj.url)) {
		const mime = String(obj.mimetype || '')
		if (hint === 'image' || /^image\//i.test(mime)) {
			const dlType = hint || (/^image\/(jpeg|jpg|png|webp)$/i.test(mime) ? 'image' : 'document')
			return { media: obj, dlType }
		}
	}

	return null
}

const extractMediaTarget = (m) => {
	const quoted = m.quoted && findImageMedia(m.quoted)
	if (quoted) return { holder: m.quoted, ...quoted }
	const self = findImageMedia(m)
	return self ? { holder: m, ...self } : null
}

const getMediaBuffer = async ({ holder, media, dlType }) => {
	if (typeof holder?.download === 'function') {
		try {
			const buf = await holder.download()
			if (Buffer.isBuffer(buf) && buf.length) return buf
		} catch {}
	}
	const stream = await baileys.downloadContentFromMessage(media, dlType)
	const chunks = []
	for await (const chunk of stream) chunks.push(chunk)
	return Buffer.concat(chunks)
}

const fetchUrlBuffer = async (url) => {
	const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	if (!/^image\//i.test(res.headers.get('content-type') || '')) throw new Error('El enlace no corresponde a una imagen válida')
	return Buffer.from(await res.arrayBuffer())
}

const encryptWallpaper = (imgBuf) => {
	const mediaKey = crypto.randomBytes(32)
	const keys = Buffer.from(
		crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from('WhatsApp Chat Wallpaper Keys'), 112)
	)
	const iv = keys.subarray(0, 16)
	const cipherKey = keys.subarray(16, 48)
	const macKey = keys.subarray(48, 80)

	const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv)
	const enc = Buffer.concat([cipher.update(imgBuf), cipher.final()])
	const mac = crypto.createHmac('sha256', macKey).update(Buffer.concat([iv, enc])).digest().subarray(0, 10)
	const encFile = Buffer.concat([enc, mac])

	return {
		encFile,
		mediaKey,
		fileSha256: crypto.createHash('sha256').update(imgBuf).digest(),
		fileEncSha256: crypto.createHash('sha256').update(encFile).digest()
	}
}

const uploadDirect = async (conn, encFile, fileEncSha256) => {
	const mediaConn =
		(await conn.refreshMediaConn?.(false).catch(() => null)) ||
		(await conn.refreshMediaConn?.(true).catch(() => null))
	const auth = mediaConn?.auth
	const hosts = mediaConn?.hosts?.length ? mediaConn.hosts : [{ hostname: 'mmg.whatsapp.net' }]
	if (!auth) return null
	const token = fileEncSha256.toString('base64url')

	for (const h of hosts) {
		const host = h.hostname || h
		const url = `https://${host}/mms/chat-wallpaper-image/${encodeURIComponent(token)}?auth=${encodeURIComponent(auth)}&token=${encodeURIComponent(token)}`
		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/octet-stream', Origin: 'https://web.whatsapp.com' },
				body: encFile
			})
			if (!res.ok) continue
			const json = await res.json().catch(() => null)
			const directPath = json?.direct_path || json?.directPath
			if (directPath) return directPath
		} catch {}
	}

	return null
}

const uploadViaBaileys = async (conn, encFile, fileEncSha256) => {
	const tmpFile = path.join(os.tmpdir(), `wp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.enc`)
	try {
		fs.writeFileSync(tmpFile, encFile)
		const up = await conn.waUploadToServer(tmpFile, {
			fileEncSha256B64: fileEncSha256.toString('base64'),
			mediaType: 'image'
		})
		return up?.directPath || null
	} finally {
		fs.rmSync(tmpFile, { force: true })
	}
}

const uploadWallpaper = async (conn, imgBuf) => {
	const { encFile, mediaKey, fileSha256, fileEncSha256 } = encryptWallpaper(imgBuf)

	const directPath =
		(await uploadDirect(conn, encFile, fileEncSha256)) || (await uploadViaBaileys(conn, encFile, fileEncSha256))
	if (!directPath) throw new Error('El servidor CDN no devolvió directPath')

	return { directPath, mediaKey, fileEncSha256, fileSha256 }
}

const encodeChatTheme = (theme) => {
	const w = Writer.create().uint32(8).int64(theme.settingTimestampMs)

	if (theme.clearTheme) {
		w.uint32(16).bool(true)
	} else if (theme.solidColor) {
		const { backgroundLightArgb, backgroundDarkArgb, isDoodleEnabled = true } = theme.solidColor
		w.uint32(90)
			.fork()
			.uint32(13)
			.fixed32(backgroundLightArgb)
			.uint32(21)
			.fixed32(backgroundDarkArgb)
			.uint32(24)
			.bool(isDoodleEnabled)
			.ldelim()
	} else if (theme.customImage) {
		const { directPath, mediaKey, fileEncSha256, fileSha256, dimLevel = 0 } = theme.customImage
		w.uint32(106)
			.fork()
			.uint32(10)
			.string(directPath)
			.uint32(18)
			.bytes(mediaKey)
			.uint32(26)
			.bytes(fileEncSha256)
			.uint32(34)
			.bytes(fileSha256)
			.uint32(45)
			.float(dimLevel)
			.ldelim()
	}

	return w.finish()
}

let handler = async (m, { conn, text, usedPrefix, command, isOwner, isROwner }) => {
	const reply = (t) =>
		typeof m.reply === 'function' ? m.reply(t) : conn.sendMessage(m.chat, { text: t }, { quoted: m })
	const react = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})

	if (!m.chat.endsWith('@g.us')) {
		return reply('❌ Este comando solo puede ser utilizado dentro de un grupo.')
	}

	const meta = await conn.groupMetadata(m.chat).catch(() => null)
	if (!meta) return reply('❌ Error al obtener los metadatos del grupo.')

	const me = conn.authState?.creds?.me || conn.user || {}
	const senderIds = new Set([m.sender, m.key?.participant].map(normId).filter(Boolean))
	const botIds = new Set([me.id, me.lid].map(normId).filter(Boolean))

	const isAdminOf = (ids) =>
		meta.participants?.some(
			(p) =>
				(p.admin === 'admin' || p.admin === 'superadmin') &&
				[p.id, p.lid, p.phoneNumber].map(normId).some((x) => x && ids.has(x))
		)
	const isSenderAdmin = isAdminOf(senderIds)
	const isBotAdmin = isAdminOf(botIds)

	if (!isSenderAdmin && !isOwner && !isROwner) {
		return reply('❌ Solo los Administradores del grupo o el Owner del bot pueden cambiar el tema del grupo.')
	}

	if (meta.restrict && !isBotAdmin) {
		return reply('❌ Haz al bot Administrador del grupo para que pueda actualizar el tema.')
	}

	const q = (text || '').trim()
	const mediaTarget = extractMediaTarget(m)
	const urlMatch = q.match(/^(https?:\/\/\S+)$/i)

	if (!q && !mediaTarget) {
		return reply(
			`🎨 *CAMBIAR TEMA & WALLPAPER DEL GRUPO*\n\n` +
			`• *Color Hex:* ${usedPrefix}${command} #ff69b4\n` +
			`• *Colores rápidos:* ${usedPrefix}${command} rosa\n` +
			`  _(rosa, azul, morado, negro, verde, rojo, amarillo, naranja, blanco, cyan, dorado)_\n` +
			`• *Fondo con Imagen:* Responde a una foto/documento o envía un enlace de imagen + ${usedPrefix}${command}\n` +
			`• *Restablecer por defecto:* ${usedPrefix}${command} reset`
		)
	}

	const isReset = /^(reset|hapus|clear|limpar|restablecer|borrar)$/i.test(q)
	const presetHex = COLOR_PRESETS[q.toLowerCase()]
	const hexInput = presetHex || (/^#?[0-9a-f]{6}$/i.test(q) ? q.replace('#', '') : null)

	if (!isReset && !hexInput && !mediaTarget && !urlMatch) {
		return reply(
			`Formato no reconocido. Usa un código hex (\`#ff69b4\`), un nombre de color (\`rosa\`), responde a una imagen o escribe \`${usedPrefix}${command} reset\``
		)
	}

	await react('⏳')

	try {
		const theme = { settingTimestampMs: Date.now() }
		let modeLabel = ''

		if (isReset) {
			theme.clearTheme = true
			modeLabel = 'Restablecido al tema por defecto'
		} else if (hexInput) {
			const cor = (0xff000000 | parseInt(hexInput, 16)) >>> 0
			theme.solidColor = { backgroundLightArgb: cor, backgroundDarkArgb: cor, isDoodleEnabled: true }
			modeLabel = `Color #${hexInput.toUpperCase()}`
		} else {
			const imgBuf = mediaTarget ? await getMediaBuffer(mediaTarget) : await fetchUrlBuffer(urlMatch[1])
			if (!Buffer.isBuffer(imgBuf) || !imgBuf.length) {
				throw new Error('El buffer de la imagen está vacío o falló la descarga')
			}

			const up = await uploadWallpaper(conn, imgBuf)
			theme.customImage = { ...up, dimLevel: 0 }
			modeLabel = mediaTarget ? `Wallpaper (${mediaTarget.dlType})` : 'Wallpaper desde URL'
		}

		const msg = Writer.create()
			.uint32(98)
			.fork()
			.uint32(16)
			.int32(34)
			.uint32(242)
			.bytes(encodeChatTheme(theme))
			.ldelim()
			.finish()

		const modo = meta.addressingMode || (me.lid ? 'lid' : 'pn')
		const meId = modo === 'lid' && me.lid ? me.lid : me.id

		const repo = conn.signalRepository || conn.repository
		if (!repo?.encryptGroupMessage) {
			throw new Error('El repositorio de cifrado Signal no está disponible en esta sesión.')
		}

		const { ciphertext } = await repo.encryptGroupMessage({
			group: m.chat,
			data: baileys.writeRandomPadMax16(msg),
			meId
		})

		const sendNodeFn = conn.sendNode || conn.ws?.sendNode
		if (typeof sendNodeFn !== 'function') {
			throw new Error('La conexión de WhatsApp no tiene disponible la función sendNode.')
		}

		await sendNodeFn.call(conn, {
			tag: 'message',
			attrs: {
				id: baileys.generateMessageIDV2(me.id),
				to: m.chat,
				type: 'media',
				addressing_mode: modo
			},
			content: [
				{
					tag: 'enc',
					attrs: { v: '2', type: 'skmsg', mediatype: 'chat_theme' },
					content: ciphertext
				}
			]
		})

		await react('✅')
		return reply(`✅ *Tema del grupo actualizado con éxito:*\n> ${modeLabel}`)
	} catch (err) {
		await react('❌')
		return reply(`❌ Error al cambiar el tema del grupo:\n${err.message}`)
	}
}

handler.help = ['tema <color/reset>']
handler.tags = ['group']
handler.command = /^(tema|settema|theme|temagc|wallgp|wallpapergp)$/i
handler.group = true

export default handler
