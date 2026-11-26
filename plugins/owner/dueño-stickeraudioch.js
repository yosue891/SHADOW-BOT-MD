import {
	prepareWAMessageMedia,
	generateWAMessageFromContent,
	proto,
	downloadMediaMessage,
	downloadContentFromMessage
} from '@whiskeysockets/baileys'
import { promises as fs } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'

const execFileAsync = promisify(execFile)

let ffmpegPathCache = null
async function obtenerRutaFfmpeg() {
	if (ffmpegPathCache) return ffmpegPathCache
	if (process.env.FFMPEG_PATH) {
		ffmpegPathCache = process.env.FFMPEG_PATH
		return process.env.FFMPEG_PATH
	}
	try {
		await execFileAsync('ffmpeg', ['-version'])
		ffmpegPathCache = 'ffmpeg'
		return 'ffmpeg'
	} catch {
		try {
			const installer = await import('@ffmpeg-installer/ffmpeg')
			const p = installer?.default?.path || installer?.path
			if (p) {
				ffmpegPathCache = p
				return p
			}
		} catch {}
	}
	ffmpegPathCache = 'ffmpeg'
	return 'ffmpeg'
}

function extractProtobufField(buffer, targetField) {
	if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer)
	let offset = 0
	while (offset < buffer.length) {
		let tag = 0
		let shift = 0
		while (offset < buffer.length) {
			const byte = buffer[offset++]
			tag |= (byte & 0x7f) << shift
			if (!(byte & 0x80)) break
			shift += 7
		}
		const fieldNum = tag >>> 3
		const wireType = tag & 7

		if (wireType === 0) {
			while (offset < buffer.length && (buffer[offset++] & 0x80)) {}
		} else if (wireType === 2) {
			let len = 0
			let lenShift = 0
			while (offset < buffer.length) {
				const byte = buffer[offset++]
				len |= (byte & 0x7f) << lenShift
				if (!(byte & 0x80)) break
				lenShift += 7
			}
			if (fieldNum === targetField) {
				return buffer.slice(offset, offset + len)
			}
			offset += len
		} else if (wireType === 1) {
			offset += 8
		} else if (wireType === 5) {
			offset += 4
		} else {
			break
		}
	}
	return null
}

function modificarProto(protoRef) {
	if (!protoRef?.Message?.StickerMessage) return

	const sm = protoRef.Message.StickerMessage
	if (sm && !sm._audioStickerPatched) {
		const origEncode = sm.encode
		if (typeof origEncode === 'function') {
			sm.encode = function (m, w) {
				const writer = origEncode.call(this, m, w)
				if (m?.audioMessage != null && protoRef.Message.AudioMessage) {
					protoRef.Message.AudioMessage.encode(m.audioMessage, writer.uint32(210).fork()).ldelim()
				}
				if (m?.sound != null) {
					writer.uint32(274).bytes(m.sound)
				}
				if (m?.accessibilityLabel != null) {
					writer.uint32(266).string(m.accessibilityLabel)
				}
				return writer
			}
		}

		const origDecode = sm.decode
		if (typeof origDecode === 'function') {
			sm.decode = function (r, l, e, n) {
				let rawBuf = null
				if (Buffer.isBuffer(r) || r instanceof Uint8Array) {
					rawBuf = Buffer.from(r)
				} else if (r?.buf && (Buffer.isBuffer(r.buf) || r.buf instanceof Uint8Array)) {
					rawBuf = Buffer.from(r.buf)
				}
				const msg = origDecode.call(this, r, l, e, n)
				if (rawBuf && !msg.sound) {
					const sound = extractProtobufField(rawBuf, 34)
					if (sound && sound.length > 0) msg.sound = sound
				}
				return msg
			}
		}

		const origFromObject = sm.fromObject
		if (typeof origFromObject === 'function') {
			sm.fromObject = function (d, n) {
				const res = origFromObject.call(this, d, n)
				if (d?.audioMessage != null) res.audioMessage = d.audioMessage
				if (d?.sound != null) res.sound = d.sound
				if (d?.accessibilityLabel != null) res.accessibilityLabel = d.accessibilityLabel
				return res
			}
		}

		sm._audioStickerPatched = true
	}

	const msgProto = protoRef.Message
	if (msgProto && !msgProto._audioStickerPatched) {
		const origMsgEncode = msgProto.encode
		if (typeof origMsgEncode === 'function') {
			msgProto.encode = function (m, w) {
				const writer = origMsgEncode.call(this, m, w)
				if (m?.audioStickerMessage != null && protoRef.Message.FutureProofMessage) {
					protoRef.Message.FutureProofMessage.encode(m.audioStickerMessage, writer.uint32(1074).fork()).ldelim()
				}
				return writer
			}
		}

		const origMsgFromObject = msgProto.fromObject
		if (typeof origMsgFromObject === 'function') {
			msgProto.fromObject = function (d, n) {
				const res = origMsgFromObject.call(this, d, n)
				if (d?.audioStickerMessage != null) res.audioStickerMessage = d.audioStickerMessage
				return res
			}
		}

		msgProto._audioStickerPatched = true
	}
}

async function asegurarModificado() {
	modificarProto(proto)
	for (const paquete of ['kage-baileys', '@whiskeysockets/baileys', 'baileys']) {
		try {
			const modulo = await import(paquete)
			if (modulo?.proto) modificarProto(modulo.proto)
			if (modulo?.default?.proto) modificarProto(modulo.default.proto)
		} catch {}
	}
}

// Parchear protoc de inmediato al importar
asegurarModificado().catch(() => {})

async function addExif(webpBuffer, packname, author) {
	const packName = packname || global.packsticker || global.wm || 'Shadow Bot'
	const authorName = author || global.dev || 'yosue'

	try {
		const webp = await import('node-webpmux').then(m => m.default || m).catch(() => null)
		if (webp) {
			const img = new webp.Image()
			const stickerPackId = crypto.randomBytes(32).toString('hex')
			const json = {
				'sticker-pack-id': stickerPackId,
				'sticker-pack-name': packName,
				'sticker-pack-publisher': authorName,
				'emojis': ['🔊', '🎃']
			}
			const exifAttr = Buffer.from([
				0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
				0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x16, 0x00, 0x00, 0x00
			])
			const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
			const exif = Buffer.concat([exifAttr, jsonBuffer])
			exif.writeUIntLE(jsonBuffer.length, 14, 4)
			await img.load(webpBuffer)
			img.exif = exif
			return await img.save(null)
		}
	} catch {}

	try {
		const stickerPackId = crypto.randomBytes(32).toString('hex')
		const json = {
			'sticker-pack-id': stickerPackId,
			'sticker-pack-name': packName,
			'sticker-pack-publisher': authorName,
			'emojis': ['🔊', '🎃']
		}
		const exifAttr = Buffer.from([
			0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
			0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x16, 0x00, 0x00, 0x00
		])
		const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
		const exif = Buffer.concat([exifAttr, jsonBuffer])
		exif.writeUIntLE(jsonBuffer.length, 14, 4)

		const exifIndex = webpBuffer.indexOf(Buffer.from('EXIF'))
		if (exifIndex !== -1) {
			const oldExifSize = webpBuffer.readUInt32LE(exifIndex + 4)
			const padding = oldExifSize % 2 === 1 ? 1 : 0
			const before = webpBuffer.slice(0, exifIndex - 4)
			const after = webpBuffer.slice(exifIndex + 8 + oldExifSize + padding)
			const exifChunkId = Buffer.from('EXIF')
			const exifSize = Buffer.alloc(4)
			exifSize.writeUInt32LE(exif.length)
			const pad = exif.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
			const newChunk = Buffer.concat([exifChunkId, exifSize, exif, pad])
			const total = Buffer.concat([before, newChunk, after])
			total.writeUInt32LE(total.length - 8, 4)
			return total
		}

		const riffHeader = webpBuffer.slice(0, 4)
		const webpSignature = webpBuffer.slice(8, 12)
		const webpData = webpBuffer.slice(12)
		const exifChunkId = Buffer.from('EXIF')
		const exifSize = Buffer.alloc(4)
		exifSize.writeUInt32LE(exif.length)
		const pad = exif.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
		const exifChunk = Buffer.concat([exifChunkId, exifSize, exif, pad])
		const newWebpData = Buffer.concat([webpData, exifChunk])
		const newFileSize = Buffer.alloc(4)
		newFileSize.writeUInt32LE(4 + newWebpData.length)
		return Buffer.concat([riffHeader, newFileSize, webpSignature, newWebpData])
	} catch {
		return webpBuffer
	}
}

async function descargarBuffer(mensaje, conn) {
	if (!mensaje) return null
	if (Buffer.isBuffer(mensaje)) return mensaje
	if (mensaje?.buffer && Buffer.isBuffer(mensaje.buffer)) return mensaje.buffer

	if (typeof mensaje.download === 'function') {
		try {
			const buff = await mensaje.download()
			if (Buffer.isBuffer(buff) && buff.length > 0) return buff
		} catch {}
	}

	try {
		if (typeof conn?.downloadMediaMessage === 'function') {
			const buff = await conn.downloadMediaMessage(mensaje)
			if (Buffer.isBuffer(buff) && buff.length > 0) return buff
		}
	} catch {}

	try {
		const buff = await downloadMediaMessage(
			mensaje,
			'buffer',
			{},
			{
				logger: conn?.logger,
				reuploadRequest: conn?.updateMediaMessage
			}
		)
		if (Buffer.isBuffer(buff) && buff.length > 0) return buff
	} catch {}

	const info =
		mensaje.msg ||
		mensaje.message?.imageMessage ||
		mensaje.message?.videoMessage ||
		mensaje.message?.audioMessage ||
		mensaje.message?.stickerMessage

	const tipo =
		mensaje.mtype ||
		(info?.mimetype ? info.mimetype.split('/')[0] : null)

	if (!tipo || !info) return null

	try {
		const stream = await downloadContentFromMessage(
			info,
			tipo.replace('Message', '')
		)
		const partes = []
		for await (const chunk of stream) {
			partes.push(chunk)
		}
		return Buffer.concat(partes)
	} catch {}

	return null
}

async function convertirMediaParaSticker(bufferMedia, esVideo = false) {
	const dirTmp = join(process.cwd(), './tmp')
	await fs.mkdir(dirTmp, { recursive: true })

	const nombreBase = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
	const rutaEntrada = join(dirTmp, `${nombreBase}_in.${esVideo ? 'mp4' : 'jpg'}`)
	const rutaSalida = join(dirTmp, `${nombreBase}_out.webp`)

	try {
		await fs.writeFile(rutaEntrada, bufferMedia)
		const ffmpegBin = await obtenerRutaFfmpeg()

		const baseCrop = esVideo
			? 'fps=10,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0'
			: 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0'
		const cmdArgs = esVideo
			? ['-y', '-i', rutaEntrada, '-t', '45', '-an', '-vf', baseCrop, '-loop', '0', '-q:v', '30', '-lossless', '0', '-compression_level', '4', '-vsync', '0', rutaSalida]
			: ['-y', '-i', rutaEntrada, '-an', '-vf', baseCrop, '-loop', '0', '-vsync', '0', rutaSalida]

		await execFileAsync(ffmpegBin, cmdArgs)

		if (esVideo) {
			const stats = await fs.stat(rutaSalida).catch(() => null)
			if (stats && stats.size > 950 * 1024) {
				const fallbackCrop = 'fps=8,scale=384:384:force_original_aspect_ratio=decrease,pad=384:384:(ow-iw)/2:(oh-ih)/2:color=white@0.0'
				const fallbackArgs = ['-y', '-i', rutaEntrada, '-t', '45', '-an', '-vf', fallbackCrop, '-loop', '0', '-q:v', '20', '-lossless', '0', '-compression_level', '4', '-vsync', '0', rutaSalida]
				await execFileAsync(ffmpegBin, fallbackArgs).catch(() => {})
			}
		}

		return await fs.readFile(rutaSalida)
	} catch {
		return bufferMedia
	} finally {
		await fs.unlink(rutaEntrada).catch(() => {})
		await fs.unlink(rutaSalida).catch(() => {})
	}
}

async function convertirAudioParaSticker(bufferAudio) {
	const dirTmp = join(process.cwd(), './tmp')
	await fs.mkdir(dirTmp, { recursive: true })

	const nombreBase = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
	const rutaEntrada = join(dirTmp, `${nombreBase}_in.tmp`)
	const rutaSalida = join(dirTmp, `${nombreBase}_out.opus`)

	try {
		await fs.writeFile(rutaEntrada, bufferAudio)
		const ffmpegBin = await obtenerRutaFfmpeg()

		await execFileAsync(ffmpegBin, [
			'-y',
			'-i', rutaEntrada,
			'-vn',
			'-t', '45',
			'-c:a', 'libopus',
			'-b:a', '64k',
			'-vbr', 'on',
			'-ar', '48000',
			'-ac', '1',
			'-compression_level', '10',
			'-application', 'voip',
			rutaSalida
		])

		return await fs.readFile(rutaSalida)
	} catch {
		return bufferAudio
	} finally {
		await fs.unlink(rutaEntrada).catch(() => {})
		await fs.unlink(rutaSalida).catch(() => {})
	}
}

async function resolverBufferSticker(item, conn) {
	if (!item) return null
	if (Buffer.isBuffer(item)) return item
	if (item?.buffer && Buffer.isBuffer(item.buffer)) return item.buffer

	const info = item?.msg || item
	const mime = info?.mimetype || ''
	const esVideo = /video/.test(mime) || item?.mtype === 'videoMessage'
	const esImagen = /image/.test(mime) || item?.mtype === 'imageMessage'

	let descargado = null
	if (typeof item?.download === 'function') {
		descargado = await item.download().catch(() => null)
	}
	if (!descargado) {
		descargado = await descargarBuffer(item, conn)
	}

	if (!descargado || !Buffer.isBuffer(descargado)) return null

	if (esImagen || esVideo || !mime.includes('webp')) {
		try {
			return await convertirMediaParaSticker(descargado, esVideo)
		} catch {
			return descargado
		}
	}

	return descargado
}

async function extraerAudioDeSticker(quoted, conn) {
	if (!quoted) return null

	const msgInfo = quoted.msg || quoted
	const messageContent = quoted.message || {}

	// 1. Directamente en sound (Buffer o Uint8Array decodificado en StickerMessage)
	if (msgInfo?.sound && (Buffer.isBuffer(msgInfo.sound) || msgInfo.sound instanceof Uint8Array)) {
		return Buffer.from(msgInfo.sound)
	}

	const sm = messageContent?.stickerMessage || messageContent?.audioStickerMessage?.message?.stickerMessage
	if (sm?.sound && (Buffer.isBuffer(sm.sound) || sm.sound instanceof Uint8Array)) {
		return Buffer.from(sm.sound)
	}

	// 2. En audioMessage adjunto dentro del stickerMessage
	const audioMsg = msgInfo?.audioMessage || sm?.audioMessage
	if (audioMsg) {
		try {
			const stream = await downloadContentFromMessage(audioMsg, 'audio')
			const chunks = []
			for await (const chunk of stream) chunks.push(chunk)
			const buf = Buffer.concat(chunks)
			if (buf.length > 0) return buf
		} catch (e) {
			console.error('Error al descargar audioMessage del sticker:', e)
		}
	}

	// 3. Extracción manual por si el buffer binario sin decodificar contiene el tag 34 (sound)
	const rawCandidate = msgInfo?._raw || quoted?._raw || quoted?.rawMessage
	if (rawCandidate) {
		const extracted = extractProtobufField(rawCandidate, 34)
		if (extracted && extracted.length > 0) return extracted
	}

	return null
}

async function tienePistaDeAudio(bufferMedia) {
	const dirTmp = join(process.cwd(), './tmp')
	await fs.mkdir(dirTmp, { recursive: true })
	const ruta = join(dirTmp, `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp4`)
	try {
		await fs.writeFile(ruta, bufferMedia)
		const ffmpegBin = await obtenerRutaFfmpeg()
		try {
			await execFileAsync(ffmpegBin, ['-i', ruta])
			return false
		} catch (err) {
			const errStr = (err?.stderr || '').toString()
			return /Stream #.*Audio:/i.test(errStr)
		}
	} finally {
		await fs.unlink(ruta).catch(() => {})
	}
}

async function resolverJidCanal(input, conn) {
	if (!input) return null
	const textTrim = String(input).trim()
	if (/@newsletter$/i.test(textTrim)) return textTrim

	const inviteMatch =
		textTrim.match(/channel\/([A-Za-z0-9_-]+)/i) ||
		textTrim.match(/invite\/([A-Za-z0-9_-]+)/i)

	const inviteCode = inviteMatch?.[1]
	if (inviteCode && typeof conn?.newsletterMetadata === 'function') {
		try {
			const meta = await conn.newsletterMetadata('invite', inviteCode)
			return meta?.id || meta?.jid || meta?.newsletter?.jid || null
		} catch {}
	}
	return null
}

async function forjarYEnviarAudioStickerCanal(conn, canalDestino, bufferSticker, bufferAudio, packName, authorName) {
	const audioConvertido = await convertirAudioParaSticker(bufferAudio)
	const stickerConExif = await addExif(bufferSticker, packName, authorName)

	const uploadNewsletter = (readStream, opts) =>
		conn.waUploadToServer(readStream, {
			...opts,
			newsletter: true
		})

	let mediaSticker = null
	let mediaAudio = null

	try {
		;[mediaSticker, mediaAudio] = await Promise.all([
			prepareWAMessageMedia(
				{ sticker: stickerConExif },
				{ jid: canalDestino, upload: uploadNewsletter }
			),
			prepareWAMessageMedia(
				{
					audio: audioConvertido,
					mimetype: 'audio/ogg; codecs=opus',
					ptt: true
				},
				{ jid: canalDestino, upload: uploadNewsletter }
			)
		])
	} catch (e) {
		console.error('Error al preparar media para canal:', e)
	}

	const descripcionSticker = `${packName} • ${authorName}`

	if (mediaSticker?.stickerMessage) {
		if (mediaAudio?.audioMessage) {
			mediaSticker.stickerMessage.audioMessage = mediaAudio.audioMessage
		}
		mediaSticker.stickerMessage.sound = audioConvertido
		mediaSticker.stickerMessage.accessibilityLabel = descripcionSticker
		mediaSticker.stickerMessage.emojis = '🔊'

		const mensajeFinal = proto.Message.fromObject({
			stickerMessage: mediaSticker.stickerMessage,
			audioStickerMessage: {
				message: {
					stickerMessage: mediaSticker.stickerMessage
				}
			}
		})

		if (mensajeFinal?.stickerMessage) {
			if (mediaAudio?.audioMessage) {
				mensajeFinal.stickerMessage.audioMessage = mediaAudio.audioMessage
			}
			mensajeFinal.stickerMessage.sound = audioConvertido
			mensajeFinal.stickerMessage.accessibilityLabel = descripcionSticker
			mensajeFinal.stickerMessage.emojis = '🔊'
		}

		try {
			const msg = generateWAMessageFromContent(canalDestino, mensajeFinal, {
				userJid: conn.user?.id || conn.user?.jid
			})
			await conn.relayMessage(canalDestino, msg.message, { messageId: msg.key.id })
		} catch (relayErr) {
			console.error('Fallback a sendMessage sticker directo:', relayErr)
			await conn.sendMessage(canalDestino, { sticker: stickerConExif })
		}
	} else {
		await conn.sendMessage(canalDestino, { sticker: stickerConExif })
	}

	// Enviar también la pista de audio al canal para asegurar reproducción en todos los clientes
	try {
		await conn.sendMessage(canalDestino, {
			audio: audioConvertido,
			mimetype: 'audio/ogg; codecs=opus',
			ptt: true
		})
	} catch (audioErr) {
		console.error('Error al enviar pista de audio al canal:', audioErr)
	}

	return true
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
	await asegurarModificado()

	const canalPorDefecto = global.idcanal || global.channelRD?.id || '120363403739366547@newsletter'
	const canalNombre = global.channelRD?.name || global.botname || '🎃 SHADOW GARDEN • HALLOWEEN 🦇'

	// Resolver canal destino si el usuario especificó uno por texto
	let canalDestino = canalPorDefecto
	if (text && (/@newsletter$/i.test(text.trim()) || text.includes('whatsapp.com/channel/'))) {
		const resJid = await resolverJidCanal(text, conn)
		if (resJid) canalDestino = resJid
	}

	const packName = global.packsticker || global.wm || 'Shadow Bot'
	const authorName = global.dev || 'yosue'

	const objetivo = m.quoted ? m.quoted : null

	if (!objetivo) {
		return m.reply(
			`🎃🦇 *[ STICKER CON AUDIO AL CANAL ]* 🦇🎃\n\n` +
			`👉 *Debes responder a un sticker con audio usando:*\n` +
			`> *${usedPrefix + command}*\n\n` +
			`📢 *Destino:* ${canalNombre}\n` +
			`🆔 *ID:* \`${canalPorDefecto}\``
		)
	}

	const infoObjetivo = objetivo.msg || objetivo
	const mimeObjetivo = infoObjetivo?.mimetype || ''

	const esSticker =
		objetivo.mtype === 'stickerMessage' ||
		mimeObjetivo.includes('webp') ||
		Boolean(infoObjetivo?.isAnimated !== undefined && !mimeObjetivo.includes('audio') && !mimeObjetivo.includes('video'))

	const esVideo =
		objetivo.mtype === 'videoMessage' ||
		/video/.test(mimeObjetivo)

	if (!esSticker && !esVideo) {
		return m.reply(
			`⚠️ *Tipo de mensaje no válido.*\n\n` +
			`👉 Por favor, responde directamente a un *sticker con audio* (o video con audio) usando:\n` +
			`> *${usedPrefix + command}*`
		)
	}

	await m.react('⏳')

	// Caso A: Respondiendo a un sticker con audio integrado
	if (esSticker) {
		const bufferAudio = await extraerAudioDeSticker(objetivo, conn)

		if (!bufferAudio || bufferAudio.length === 0) {
			await m.react('❌')
			return m.reply(
				`❌ *Este sticker no tiene audio integrado.*\n\n` +
				`Asegúrate de responder a un sticker con sonido (por ejemplo, generado con *${usedPrefix}stickeraudio* o con audio de WhatsApp).`
			)
		}

		try {
			const bufferSticker = await resolverBufferSticker(objetivo, conn)
			if (!bufferSticker) {
				await m.react('❌')
				return m.reply('❌ No se pudo descargar el sticker citado.')
			}

			await forjarYEnviarAudioStickerCanal(
				conn,
				canalDestino,
				bufferSticker,
				bufferAudio,
				packName,
				authorName
			)

			await m.react('✅')
			return m.reply(
				`✅ *¡Sticker con audio enviado exitosamente al canal oficial!*\n\n` +
				`📢 *Canal:* ${canalNombre}\n` +
				`🆔 *ID:* \`${canalDestino}\``
			)
		} catch (error) {
			console.error('Error al transferir sticker con audio al canal:', error)
			await m.react('❌')
			return m.reply(`❌ Ocurrió un error al enviar al canal:\n> ${error.message}`)
		}
	}

	// Caso B: Respondiendo a un video con audio (conversión y envío directo en 1 paso)
	if (esVideo) {
		try {
			const videoBuffer = await descargarBuffer(objetivo, conn)
			if (!videoBuffer) {
				await m.react('❌')
				return m.reply('❌ No se pudo descargar el video citado.')
			}

			const tieneAudio = await tienePistaDeAudio(videoBuffer)
			if (!tieneAudio) {
				await m.react('❌')
				return m.reply('❌ El video no tiene pista de audio.')
			}

			const bufferSticker = await convertirMediaParaSticker(videoBuffer, true)
			await forjarYEnviarAudioStickerCanal(
				conn,
				canalDestino,
				bufferSticker,
				videoBuffer,
				packName,
				authorName
			)

			await m.react('✅')
			return m.reply(
				`✅ *¡Sticker con audio enviado exitosamente al canal oficial!*\n\n` +
				`📢 *Canal:* ${canalNombre}\n` +
				`🆔 *ID:* \`${canalDestino}\``
			)
		} catch (error) {
			console.error('Error al procesar video para canal:', error)
			await m.react('❌')
			return m.reply(`❌ Ocurrió un error al enviar al canal:\n> ${error.message}`)
		}
	}
}

handler.help = ['sach', 'stickeraudioch', 'saudiocanal']
handler.tags = ['owner']
handler.command = [
	'sach',
	'stickeraudioch',
	'saudiocanal',
	'stickeraudiocanal',
	'schanel',
	'schannel',
	'saudioch'
]
handler.owner = true

export default handler
