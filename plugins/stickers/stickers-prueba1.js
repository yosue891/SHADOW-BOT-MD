import {
	prepareWAMessageMedia,
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

if (!global.audioStickerSessions) {
	global.audioStickerSessions = new Map()
}

const SESIONES = global.audioStickerSessions

function limpiarSesionesExpiradas() {
	const ahora = Date.now()

	for (const [clave, sesion] of SESIONES.entries()) {
		if (ahora - sesion.creadoEn > 2 * 60 * 1000) {
			SESIONES.delete(clave)
		}
	}
}

async function obtenerRutaFfmpeg() {
	if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH
	try {
		const installer = await import('@ffmpeg-installer/ffmpeg')
		const p = installer?.default?.path || installer?.path
		if (p) return p
	} catch {}
	return 'ffmpeg'
}

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

		const baseCrop = 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0'
		const cmdArgs = esVideo
			? ['-y', '-i', rutaEntrada, '-t', '8', '-an', '-vf', baseCrop, '-loop', '0', '-fps_mode', 'passthrough', rutaSalida]
			: ['-y', '-i', rutaEntrada, '-an', '-vf', baseCrop, '-loop', '0', '-fps_mode', 'passthrough', rutaSalida]

		await execFileAsync(ffmpegBin, cmdArgs)
		return await fs.readFile(rutaSalida)
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
			'-t', '15',
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
	} finally {
		await fs.unlink(rutaEntrada).catch(() => {})
		await fs.unlink(rutaSalida).catch(() => {})
	}
}

function modificarProto(protoRef) {
	if (!protoRef?.Message?.StickerMessage) return

	const camposRequeridos = [
		{ name: 'accessibilityLabel', id: 33, type: 'string' },
		{ name: 'sound', id: 34, type: 'bytes' },
		{ name: 'audioMessage', id: 26, type: '.proto.Message.AudioMessage' }
	]

	for (const campo of camposRequeridos) {
		const yaExiste = protoRef.Message.StickerMessage.fields?.[campo.name]

		if (!yaExiste) {
			protoRef.Message.StickerMessage.fields = {
				...protoRef.Message.StickerMessage.fields,
				[campo.name]: {
					type: campo.type,
					id: campo.id
				}
			}
		}
	}

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

	// Si es imagen o video, convertir a formato WebP sticker como en .s
	if (esImagen || esVideo || !mime.includes('webp')) {
		try {
			return await convertirMediaParaSticker(descargado, esVideo)
		} catch {
			return descargado
		}
	}

	return descargado
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
	limpiarSesionesExpiradas()
	await asegurarModificado()

	const remitente = m.sender
	const idChat = m.chat
	const claveSesion = `${idChat}_${remitente}`
	const subComando = (args[0] || '').toLowerCase()

	const packName = global.packsticker || global.wm || 'Shadow Bot'
	const authorName = global.dev || 'yosue'

	if (subComando === 'cancelar' || subComando === 'cancel') {
		if (SESIONES.has(claveSesion)) {
			SESIONES.delete(claveSesion)
			return m.reply('🎃❌ _Sesión de AudioSticker cancelada con éxito._')
		}

		return m.reply('ℹ️ No tienes ninguna sesión de AudioSticker activa.')
	}

	const objetivo = m.quoted ? m.quoted : m
	const infoObjetivo = objetivo ? objetivo.msg || objetivo : null
	const mimeObjetivo = infoObjetivo?.mimetype || ''

	const esStickerOImagen =
		objetivo?.mtype === 'stickerMessage' ||
		objetivo?.mtype === 'imageMessage' ||
		mimeObjetivo.includes('webp') ||
		mimeObjetivo.includes('image') ||
		Boolean(infoObjetivo?.isAnimated !== undefined && !mimeObjetivo.includes('audio'))

	const esAudioOVideo =
		objetivo?.mtype === 'audioMessage' ||
		objetivo?.mtype === 'videoMessage' ||
		mimeObjetivo.includes('audio') ||
		mimeObjetivo.includes('ogg') ||
		mimeObjetivo.includes('video')

	let sesion = SESIONES.get(claveSesion)

	if (!sesion && esStickerOImagen && esAudioOVideo && !mimeObjetivo.includes('webp')) {
		// Mensaje ambiguo con ambos tipos en uno solo
	}

	if (!sesion) {
		if (esStickerOImagen) {
			const bufferSticker = await resolverBufferSticker(objetivo, conn)

			if (!bufferSticker) {
				return m.reply('❌ No se pudo descargar ni procesar el sticker/imagen.')
			}

			SESIONES.set(claveSesion, {
				bufferSticker,
				bufferAudio: null,
				creadoEn: Date.now()
			})

			return m.reply(
				'🎃🦇 *[ SHADOW GARDEN • SELLOS CON AUDIO ]* 🦇🎃\n\n' +
				'✅ *Paso 1 completado:* Guardé tu *Sticker* con el sello de *' + packName + '*.\n\n' +
				'👉 Ahora responde al *Audio / Nota de voz* usando el comando:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_Tienes 2 minutos. Usa *${usedPrefix + command} cancelar* para anular._`
			)
		}

		if (esAudioOVideo) {
			const bufferAudio = await descargarBuffer(objetivo, conn)

			if (!bufferAudio) {
				return m.reply('❌ No se pudo descargar el audio.')
			}

			SESIONES.set(claveSesion, {
				bufferSticker: null,
				bufferAudio,
				creadoEn: Date.now()
			})

			return m.reply(
				'🎃🦇 *[ SHADOW GARDEN • SELLOS CON AUDIO ]* 🦇🎃\n\n' +
				'✅ *Paso 1 completado:* Guardé tu *Audio*.\n\n' +
				'👉 Ahora responde al *Sticker* o imagen usando el comando:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_Tienes 2 minutos. Usa *${usedPrefix + command} cancelar* para anular._`
			)
		}

		return m.reply(
			'🎃🦇 *[ SHADOW GARDEN • SELLOS CON AUDIO ]* 🦇🎃\n\n' +
			'Forja sellos sombríos con audio integrado de WhatsApp.\n\n' +
			'*¿Cómo usarlo?*\n' +
			`1️⃣ Responde a un *Sticker* (o imagen) con *${usedPrefix + command}*\n` +
			`2️⃣ Luego responde al *Audio / Nota de voz* con *${usedPrefix + command}*\n\n` +
			'_También funciona al revés (primero el audio y luego el sticker)._\n\n' +
			`Para cancelar: *${usedPrefix + command} cancelar*`
		)
	}

	if (sesion.bufferSticker && !sesion.bufferAudio) {
		if (!esAudioOVideo) {
			return m.reply(
				'⚠️ Ya guardé tu sticker.\n\n' +
				'👉 Ahora debes responder a un *Audio / Nota de voz* con:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_O escribe *${usedPrefix + command} cancelar* para cancelar._`
			)
		}

		const bufferAudio = await descargarBuffer(objetivo, conn)

		if (!bufferAudio) {
			return m.reply('❌ No se pudo descargar el audio.')
		}

		sesion.bufferAudio = bufferAudio
	} else if (sesion.bufferAudio && !sesion.bufferSticker) {
		if (!esStickerOImagen) {
			return m.reply(
				'⚠️ Ya guardé tu audio.\n\n' +
				'👉 Ahora debes responder a un *Sticker* o imagen con:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_O escribe *${usedPrefix + command} cancelar* para cancelar._`
			)
		}

		const bufferSticker = await resolverBufferSticker(objetivo, conn)

		if (!bufferSticker) {
			return m.reply('❌ No se pudo descargar el sticker.')
		}

		sesion.bufferSticker = bufferSticker
	}

	SESIONES.delete(claveSesion)

	await m.reply('⏳ *Forjando tu Sello Arcano con audio...*')

	try {
		const audioConvertido = await convertirAudioParaSticker(sesion.bufferAudio)

		// Aplicar la descripción EXIF exacta de los stickers generados con el comando .s
		const stickerConExif = await addExif(sesion.bufferSticker, packName, authorName)

		// 1. Subir a los servidores de WhatsApp tanto el sticker (con EXIF de .s) como el audio
		const [mediaSticker, mediaAudio] = await Promise.all([
			prepareWAMessageMedia(
				{ sticker: stickerConExif },
				{ upload: conn.waUploadToServer }
			),
			prepareWAMessageMedia(
				{
					audio: audioConvertido,
					mimetype: 'audio/ogg; codecs=opus',
					ptt: true
				},
				{ upload: conn.waUploadToServer }
			)
		])

		if (!mediaSticker?.stickerMessage) {
			throw new Error('No se pudo preparar el mensaje del sticker en WhatsApp.')
		}

		const descripcionSticker = `${packName} • ${authorName}`

		// 2. Asociar el audioMessage y la descripción del sticker (como en el comando .s)
		if (mediaAudio?.audioMessage) {
			mediaSticker.stickerMessage.audioMessage = mediaAudio.audioMessage
		}
		mediaSticker.stickerMessage.sound = audioConvertido
		mediaSticker.stickerMessage.accessibilityLabel = descripcionSticker
		mediaSticker.stickerMessage.emojis = '🔊'

		// 3. Empaquetar con audioStickerMessage (FutureProofMessage campo 134) y stickerMessage (campo 26)
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

		// 4. Enviar el AudioSticker nativo mediante relayMessage
		const sentSticker = await conn.relayMessage(
			m.chat,
			mensajeFinal,
			{
				messageId: conn.generateMessageTag?.() || undefined
			}
		)

		// 5. Enviar el audio como nota de voz (PTT) vinculado al sticker para garantizar reproducción en cualquier versión de WhatsApp
		await conn.sendMessage(
			m.chat,
			{
				audio: audioConvertido,
				mimetype: 'audio/ogg; codecs=opus',
				ptt: true
			},
			{ quoted: m }
		)

		await m.react?.('🔊').catch(() => {})
		return sentSticker
	} catch (error) {
		console.error('Error al enviar el AudioSticker:', error)
		return m.reply(`❌ Ocurrió un error al crear el AudioSticker:\n${error.message}`)
	}
}

handler.help = ['prueba1', 'audiosticker']
handler.tags = ['sticker']
handler.command = [
	'prueba1',
	'audiosticker',
	'stikeraudio',
	'stickeraudio',
	'figurinhasom',
	'saudio'
]

export default handler
