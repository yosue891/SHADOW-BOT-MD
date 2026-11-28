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

const styles = {
	normal: 'Normal (ajuste proporcional completo 512x512)',
	crop: 'Recorte centrado 512x512',
	circle: 'Círculo (recorte redondo)',
	bw: 'Blanco y negro',
	invert: 'Invertir colores',
	blur: 'Desenfoque',
	pixel: 'Pixelado',
	sepia: 'Sepia',
	neon: 'Bordes tipo neon'
}

function parseStyle(rawOpt) {
	const opt = (rawOpt || '').toLowerCase().trim().replace(/^--?/, '')
	if (['circle', 'circulo', 'círculo', 'r', 'redondo'].includes(opt)) {
		return 'circle'
	}
	if (['crop', 'c', 'recorte', 'cuadrado'].includes(opt)) {
		return 'crop'
	}
	if (styles[opt]) {
		return opt
	}
	return 'normal'
}

function construirFiltroSticker(esVideo, style = 'normal', escala = 512, customFps = null) {
	const fps = customFps || (esVideo ? (escala === 512 ? 10 : (escala === 384 ? 8 : 6)) : 15)
	const radius = Math.floor(escala / 2)

	const baseContain =
		`fps=${fps},` +
		`scale=${escala}:${escala}:force_original_aspect_ratio=decrease,` +
		'format=rgba,' +
		`pad=${escala}:${escala}:(ow-iw)/2:(oh-ih)/2:color=white@0.0`

	const baseCoverCrop =
		`fps=${fps},` +
		`scale=${escala}:${escala}:force_original_aspect_ratio=increase,` +
		`crop=${escala}:${escala}`

	const geqCircle = `geq=lum='p(X,Y)':a='if(lte(hypot(X-${radius},Y-${radius}),${radius}),255,0)'`

	if (style === 'circle') {
		return `${baseCoverCrop},format=rgba,${geqCircle}`
	}
	if (style === 'crop') {
		return baseCoverCrop
	}
	if (style === 'bw') {
		return `${baseContain},hue=s=0`
	}
	if (style === 'invert') {
		return `${baseContain},negate`
	}
	if (style === 'blur') {
		return `${baseContain},gblur=sigma=6`
	}
	if (style === 'pixel') {
		const sp = Math.floor(escala / 4)
		return `${baseContain},scale=${sp}:${sp}:flags=neighbor,scale=${escala}:${escala}:flags=neighbor`
	}
	if (style === 'sepia') {
		return `${baseContain},colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`
	}
	if (style === 'neon') {
		return `${baseContain},edgedetect=low=0.08:high=0.2`
	}
	return baseContain
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
		mensaje.message?.stickerMessage ||
		mensaje.message?.ptvMessage ||
		mensaje.message?.documentMessage ||
		(mensaje.mediaMessage ? Object.values(mensaje.mediaMessage)[0] : null) ||
		(mensaje.url || mensaje.directPath ? mensaje : null)

	const tipo =
		mensaje.mtype ||
		mensaje.mediaType ||
		(info?.mimetype ? info.mimetype.split('/')[0] : null) ||
		'video'

	if (!tipo || !info) return null

	try {
		const tipoLimpio = tipo.replace('Message', '').toLowerCase()
		const stream = await downloadContentFromMessage(
			info,
			tipoLimpio === 'ptv' ? 'video' : tipoLimpio
		)

		const partes = []

		for await (const chunk of stream) {
			partes.push(chunk)
		}

		return Buffer.concat(partes)
	} catch {}

	return null
}

async function obtenerDuracionMedia(bufferMedia) {
	const dirTmp = join(process.cwd(), './tmp')
	await fs.mkdir(dirTmp, { recursive: true })
	const ruta = join(dirTmp, `dur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.tmp`)
	try {
		await fs.writeFile(ruta, bufferMedia)
		const ffmpegBin = await obtenerRutaFfmpeg()
		try {
			await execFileAsync(ffmpegBin, ['-i', ruta])
			return 2
		} catch (err) {
			const errStr = (err?.stderr || err?.stdout || err?.message || '').toString()
			const match = errStr.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/)
			if (match) {
				const horas = parseFloat(match[1]) || 0
				const minutos = parseFloat(match[2]) || 0
				const segundos = parseFloat(match[3]) || 0
				return horas * 3600 + minutos * 60 + segundos
			}
			return 2
		}
	} finally {
		await fs.unlink(ruta).catch(() => {})
	}
}

async function convertirMediaParaSticker(bufferMedia, esVideo = false, style = 'normal') {
	const dirTmp = join(process.cwd(), './tmp')
	await fs.mkdir(dirTmp, { recursive: true })

	const nombreBase = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
	const rutaEntrada = join(dirTmp, `${nombreBase}_in.${esVideo ? 'mp4' : 'jpg'}`)
	const rutaSalida = join(dirTmp, `${nombreBase}_out.webp`)

	try {
		await fs.writeFile(rutaEntrada, bufferMedia)
		const ffmpegBin = await obtenerRutaFfmpeg()

		const vf = construirFiltroSticker(esVideo, style, 512)
		const cmdArgs = esVideo
			? ['-y', '-i', rutaEntrada, '-t', '7', '-an', '-vf', vf, '-loop', '0', '-q:v', '30', '-lossless', '0', '-compression_level', '4', '-vsync', '0', rutaSalida]
			: ['-y', '-i', rutaEntrada, '-an', '-vf', vf, '-loop', '0', '-vsync', '0', rutaSalida]

		await execFileAsync(ffmpegBin, cmdArgs)

		if (esVideo) {
			let stats = await fs.stat(rutaSalida).catch(() => null)
			if (stats && stats.size > 950 * 1024) {
				const fallbackVf1 = construirFiltroSticker(true, style, 384, 8)
				const fallbackArgs1 = ['-y', '-i', rutaEntrada, '-t', '7', '-an', '-vf', fallbackVf1, '-loop', '0', '-q:v', '20', '-lossless', '0', '-compression_level', '4', '-vsync', '0', rutaSalida]
				await execFileAsync(ffmpegBin, fallbackArgs1).catch(() => {})

				stats = await fs.stat(rutaSalida).catch(() => null)
				if (stats && stats.size > 950 * 1024) {
					const fallbackVf2 = construirFiltroSticker(true, style, 288, 6)
					const fallbackArgs2 = ['-y', '-i', rutaEntrada, '-t', '6', '-an', '-vf', fallbackVf2, '-loop', '0', '-q:v', '15', '-lossless', '0', '-compression_level', '4', '-vsync', '0', rutaSalida]
					await execFileAsync(ffmpegBin, fallbackArgs2).catch(() => {})
				}
			}
		}

		return await fs.readFile(rutaSalida)
	} finally {
		await fs.unlink(rutaEntrada).catch(() => {})
		await fs.unlink(rutaSalida).catch(() => {})
	}
}

async function convertirAudioParaSticker(bufferAudio, duracionSugerida = 2) {
	const dirTmp = join(process.cwd(), './tmp')
	await fs.mkdir(dirTmp, { recursive: true })

	const nombreBase = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
	const rutaEntrada = join(dirTmp, `${nombreBase}_in.tmp`)
	const rutaSalida = join(dirTmp, `${nombreBase}_out.opus`)

	try {
		await fs.writeFile(rutaEntrada, bufferAudio)
		const ffmpegBin = await obtenerRutaFfmpeg()

		try {
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
			const stats = await fs.stat(rutaSalida).catch(() => null)
			if (stats && stats.size > 200) {
				return await fs.readFile(rutaSalida)
			}
		} catch {
			// Si falla la extracción directa (video sin pista de audio, GIF o pista no reconocida),
			// se genera una pista de audio silenciosa con la duración adecuada para que WhatsApp reconozca el AudioSticker
			const dur = Math.min(Math.max(Number(duracionSugerida) || 2, 1), 7)
			await execFileAsync(ffmpegBin, [
				'-y',
				'-f', 'lavfi',
				'-i', 'anullsrc=channel_layout=mono:sample_rate=48000',
				'-t', String(dur),
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
		}

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

async function resolverBufferSticker(item, conn, style = 'normal') {
	if (!item) return null

	if (Buffer.isBuffer(item)) return item
	if (item?.buffer && Buffer.isBuffer(item.buffer)) return item.buffer

	const info = item?.msg || item
	const mime = info?.mimetype || ''
	const esVideo =
		item?.mtype === 'videoMessage' ||
		item?.mtype === 'ptvMessage' ||
		/video/.test(mime) ||
		(info?.seconds !== undefined && !mime.includes('audio') && !/audio/.test(item?.mtype || ''))
	const esImagen =
		item?.mtype === 'imageMessage' ||
		/image/.test(mime)

	let descargado = null
	if (typeof item?.download === 'function') {
		descargado = await item.download().catch(() => null)
	}
	if (!descargado) {
		descargado = await descargarBuffer(item, conn)
	}

	if (!descargado || !Buffer.isBuffer(descargado)) return null

	// Si es imagen o video, o si se especificó un estilo diferente a normal, convertir
	if (esImagen || esVideo || style !== 'normal' || !mime.includes('webp')) {
		try {
			return await convertirMediaParaSticker(descargado, esVideo, style)
		} catch {
			return descargado
		}
	}

	return descargado
}

async function forjarYEnviarAudioSticker(conn, idChat, bufferSticker, bufferAudio, packName, authorName, quotedMsg, duracionSugerida = 2) {
	const audioConvertido = await convertirAudioParaSticker(bufferAudio, duracionSugerida)
	const stickerConExif = await addExif(bufferSticker, packName, authorName)

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

	const sentSticker = await conn.relayMessage(
		idChat,
		mensajeFinal,
		{
			messageId: conn.generateMessageTag?.() || undefined
		}
	)

	await conn.sendMessage(
		idChat,
		{
			audio: audioConvertido,
			mimetype: 'audio/ogg; codecs=opus',
			ptt: true
		},
		{ quoted: quotedMsg }
	)

	return sentSticker
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
	limpiarSesionesExpiradas()
	await asegurarModificado()

	const remitente = m.sender
	const idChat = m.chat
	const claveSesion = `${idChat}_${remitente}`
	const rawOpt = (args[0] || '').toLowerCase().trim()
	const opt = rawOpt.replace(/^--?/, '')

	const packName = global.packsticker || global.wm || 'Shadow Bot'
	const authorName = global.dev || 'yosue'

	if (opt === 'list' || opt === 'help' || opt === 'estilos') {
		const listText =
			'🎃🦇 _Lista de estilos y ángulos para AudioSticker_ (*stickeraudio* <estilo>)\n\n' +
			Object.keys(styles).map(k => `• *${usedPrefix + command} ${k}* — ${styles[k]}`).join('\n') +
			`\n\n• *${usedPrefix + command} list*`
		return conn.sendMessage(idChat, { text: listText }, { quoted: m })
	}

	if (opt === 'cancelar' || opt === 'cancel') {
		if (SESIONES.has(claveSesion)) {
			SESIONES.delete(claveSesion)
			return m.reply('🎃❌ _Sesión de AudioSticker cancelada con éxito._')
		}

		return m.reply('ℹ️ No tienes ninguna sesión de AudioSticker activa.')
	}

	const style = parseStyle(opt)

	const objetivo = m.quoted ? m.quoted : m
	const infoObjetivo = objetivo ? objetivo.msg || objetivo : null
	const mimeObjetivo = infoObjetivo?.mimetype || ''

	const esVideo =
		objetivo?.mtype === 'videoMessage' ||
		objetivo?.mtype === 'ptvMessage' ||
		/video/.test(mimeObjetivo) ||
		(infoObjetivo?.seconds !== undefined && !mimeObjetivo.includes('audio') && !/audio/.test(objetivo?.mtype || ''))

	const esAudio =
		objetivo?.mtype === 'audioMessage' ||
		/audio|ogg/.test(mimeObjetivo)

	const esStickerOImagen =
		objetivo?.mtype === 'stickerMessage' ||
		objetivo?.mtype === 'imageMessage' ||
		mimeObjetivo.includes('webp') ||
		mimeObjetivo.includes('image') ||
		Boolean(infoObjetivo?.isAnimated !== undefined && !mimeObjetivo.includes('audio'))

	let sesion = SESIONES.get(claveSesion)

	// Caso especial: Video (Método rápido de 1 solo paso sin sesión previa)
	// Funciona para videos largos o de poca duración (2s, 4s, etc.), con audio o sin audio (fallback silencioso)
	// y aplica los tamaños y ángulos exactos del comando .s (normal, circle, crop, etc.)
	if (!sesion && esVideo) {
		const videoBuffer = await descargarBuffer(objetivo, conn)
		if (videoBuffer) {
			await m.reply('⏳ *Forjando tu Sello Arcano con audio directamente desde el video...*')
			try {
				const duracion = (infoObjetivo?.seconds && Number(infoObjetivo.seconds) > 0)
					? Number(infoObjetivo.seconds)
					: await obtenerDuracionMedia(videoBuffer)
				const bufferSticker = await convertirMediaParaSticker(videoBuffer, true, style)
				await forjarYEnviarAudioSticker(conn, idChat, bufferSticker, videoBuffer, packName, authorName, m, duracion)
				await m.react?.('🔊').catch(() => {})
				return
			} catch (error) {
				console.error('Error al procesar video en stickeraudio:', error)
				return m.reply(`❌ Ocurrió un error al procesar el video:\n${error.message}`)
			}
		}
	}

	if (!sesion) {
		if (esStickerOImagen || esVideo) {
			const bufferSticker = await resolverBufferSticker(objetivo, conn, style)

			if (!bufferSticker) {
				return m.reply('❌ No se pudo descargar ni procesar el sticker/imagen.')
			}

			SESIONES.set(claveSesion, {
				bufferSticker,
				bufferAudio: null,
				style,
				creadoEn: Date.now()
			})

			return m.reply(
				'🎃🦇 *[ SHADOW GARDEN • STICKER CON AUDIO ]* 🦇🎃\n\n' +
				'✅ *Paso 1 completado:* Guardé tu *Sticker* con el sello de *' + packName + '*.\n\n' +
				'👉 Ahora responde al *Audio / Nota de voz* usando el comando:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_Tienes 2 minutos. Usa *${usedPrefix + command} cancelar* para anular._`
			)
		}

		if (esAudio) {
			const bufferAudio = await descargarBuffer(objetivo, conn)

			if (!bufferAudio) {
				return m.reply('❌ No se pudo descargar el audio.')
			}

			SESIONES.set(claveSesion, {
				bufferSticker: null,
				bufferAudio,
				style,
				creadoEn: Date.now()
			})

			return m.reply(
				'🎃🦇 *[ SHADOW GARDEN • STICKER CON AUDIO ]* 🦇🎃\n\n' +
				'✅ *Paso 1 completado:* Guardé tu *Audio*.\n\n' +
				'👉 Ahora responde al *Sticker* o imagen usando el comando:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_Tienes 2 minutos. Usa *${usedPrefix + command} cancelar* para anular._`
			)
		}

		return m.reply(
			'🎃🦇 *[ SHADOW GARDEN • STICKER CON AUDIO ]* 🦇🎃\n\n' +
			'Forja sellos sombríos con audio integrado de WhatsApp manteniendo proporciones, tamaños y ángulos de *.s*.\n\n' +
			'*¿Cómo usarlo?*\n' +
			'📹 *1. Modo directo (1 paso):*\n' +
			`• Responde a un *Video* con *${usedPrefix + command} [estilo]* para convertirlo en sticker con audio al instante (incluso videos cortos de 2s o 4s).\n\n` +
			'🎴 *2. Modo combinado (2 pasos):*\n' +
			`• 1️⃣ Responde a un *Sticker* (o imagen) con *${usedPrefix + command} [estilo]*\n` +
			`• 2️⃣ Luego responde al *Audio / Nota de voz* con *${usedPrefix + command}*\n` +
			'_(También funciona al revés: primero audio y luego sticker)_\n\n' +
			'📐 *Estilos y ángulos disponibles:*\n' +
			`• *normal:* Ajuste proporcional completo 512x512 (por defecto)\n` +
			`• *circle / redondo:* Recorte circular 512x512\n` +
			`• *crop / cuadrado:* Recorte centrado 512x512\n` +
			`• *bw, invert, blur, pixel, sepia, neon*\n\n` +
			`• Ver lista completa: *${usedPrefix + command} list*\n` +
			`• Para cancelar: *${usedPrefix + command} cancelar*`
		)
	}

	if (sesion.bufferSticker && !sesion.bufferAudio) {
		if (!esAudio && !esVideo) {
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
		if (!esStickerOImagen && !esVideo) {
			return m.reply(
				'⚠️ Ya guardé tu audio.\n\n' +
				'👉 Ahora debes responder a un *Sticker* o imagen con:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_O escribe *${usedPrefix + command} cancelar* para cancelar._`
			)
		}

		const estiloFinal = style !== 'normal' ? style : (sesion.style || 'normal')
		const bufferSticker = await resolverBufferSticker(objetivo, conn, estiloFinal)

		if (!bufferSticker) {
			return m.reply('❌ No se pudo descargar el sticker.')
		}

		sesion.bufferSticker = bufferSticker
	}

	SESIONES.delete(claveSesion)

	await m.reply('⏳ *Forjando tu Sello Arcano con audio...*')

	try {
		await forjarYEnviarAudioSticker(conn, idChat, sesion.bufferSticker, sesion.bufferAudio, packName, authorName, m)
		await m.react?.('🔊').catch(() => {})
	} catch (error) {
		console.error('Error al enviar el AudioSticker:', error)
		return m.reply(`❌ Ocurrió un error al crear el AudioSticker:\n${error.message}`)
	}
}

handler.help = ['stickeraudio [estilo]', 'audiosticker [estilo]']
handler.tags = ['sticker']
handler.command = [
	'stickeraudio',
	'audiosticker',
	'stikeraudio',
	'figurinhasom',
	'saudio'
]

export default handler
