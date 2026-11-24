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
			'-i',
			rutaEntrada,
			'-c:a',
			'libopus',
			'-b:a',
			'64k',
			'-vbr',
			'on',
			'-compression_level',
			'10',
			'-application',
			'voip',
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
		{ name: 'sound', id: 34, type: 'bytes' }
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
				if (d?.sound != null) res.sound = d.sound
				if (d?.accessibilityLabel != null) res.accessibilityLabel = d.accessibilityLabel
				return res
			}
		}

		sm._audioStickerPatched = true
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

	if (item?.download) {
		const descargado = await item.download()
		if (Buffer.isBuffer(descargado)) return descargado
	}

	return await descargarBuffer(item, conn)
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
	limpiarSesionesExpiradas()
	await asegurarModificado()

	const remitente = m.sender
	const idChat = m.chat
	const claveSesion = `${idChat}_${remitente}`
	const subComando = (args[0] || '').toLowerCase()

	if (subComando === 'cancelar' || subComando === 'cancel') {
		if (SESIONES.has(claveSesion)) {
			SESIONES.delete(claveSesion)
			return m.reply('❌ Sesión de AudioSticker cancelada con éxito.')
		}

		return m.reply('ℹ️ No tienes ninguna sesión de AudioSticker activa.')
	}

	const citado = m.quoted ? m.quoted : null
	const infoCitado = citado ? citado.msg || citado : null
	const mimeCitado = infoCitado?.mimetype || ''

	const esStickerCitado =
		citado?.mtype === 'stickerMessage' ||
		mimeCitado.includes('webp') ||
		Boolean(infoCitado?.isAnimated !== undefined && !mimeCitado.includes('audio'))

	const esAudioCitado =
		citado?.mtype === 'audioMessage' ||
		mimeCitado.includes('audio') ||
		mimeCitado.includes('ogg')

	let sesion = SESIONES.get(claveSesion)

	if (!sesion && esStickerCitado && esAudioCitado) {
		return m.reply('❌ No se puede detectar sticker y audio al mismo tiempo en el mensaje citado.')
	}

	if (!sesion) {
		if (esStickerCitado) {
			const bufferSticker = await resolverBufferSticker(citado, conn)

			if (!bufferSticker) {
				return m.reply('❌ No se pudo descargar el sticker citado.')
			}

			SESIONES.set(claveSesion, {
				bufferSticker,
				bufferAudio: null,
				creadoEn: Date.now()
			})

			return m.reply(
				'✅ *Paso 1 completado:* Guardé el *Sticker*.\n\n' +
				'👉 Ahora envía o responde a un *Audio / Nota de voz* usando el mismo comando:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_Tienes 2 minutos. Usa *${usedPrefix + command} cancelar* para anular._`
			)
		}

		if (esAudioCitado) {
			const bufferAudio = await descargarBuffer(citado, conn)

			if (!bufferAudio) {
				return m.reply('❌ No se pudo descargar el audio citado.')
			}

			SESIONES.set(claveSesion, {
				bufferSticker: null,
				bufferAudio,
				creadoEn: Date.now()
			})

			return m.reply(
				'✅ *Paso 1 completado:* Guardé el *Audio*.\n\n' +
				'👉 Ahora envía o responde a un *Sticker* usando el mismo comando:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_Tienes 2 minutos. Usa *${usedPrefix + command} cancelar* para anular._`
			)
		}

		return m.reply(
			'🔊 *CREADOR DE AUDIO STICKER* 🔊\n\n' +
			'Crea stickers de WhatsApp con sonido integrado.\n\n' +
			'*¿Cómo usarlo?*\n' +
			`1️⃣ Responde a un *Sticker* con *${usedPrefix + command}*\n` +
			`2️⃣ Luego responde al *Audio* con *${usedPrefix + command}*\n\n` +
			'_También funciona al revés (primero el audio y luego el sticker)._\n\n' +
			`Para cancelar: *${usedPrefix + command} cancelar*`
		)
	}

	if (sesion.bufferSticker && !sesion.bufferAudio) {
		if (!esAudioCitado) {
			return m.reply(
				'⚠️ Ya guardé tu sticker.\n\n' +
				'👉 Ahora debes responder a un *Audio / Nota de voz* con:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_O escribe *${usedPrefix + command} cancelar* para cancelar._`
			)
		}

		const bufferAudio = await descargarBuffer(citado, conn)

		if (!bufferAudio) {
			return m.reply('❌ No se pudo descargar el audio citado.')
		}

		sesion.bufferAudio = bufferAudio
	} else if (sesion.bufferAudio && !sesion.bufferSticker) {
		if (!esStickerCitado) {
			return m.reply(
				'⚠️ Ya guardé tu audio.\n\n' +
				'👉 Ahora debes responder a un *Sticker* con:\n' +
				`*${usedPrefix + command}*\n\n` +
				`_O escribe *${usedPrefix + command} cancelar* para cancelar._`
			)
		}

		const bufferSticker = await resolverBufferSticker(citado, conn)

		if (!bufferSticker) {
			return m.reply('❌ No se pudo descargar el sticker citado.')
		}

		sesion.bufferSticker = bufferSticker
	}

	SESIONES.delete(claveSesion)

	await m.reply('⏳ *Procesando tu AudioSticker...*')

	try {
		const audioConvertido = await convertirAudioParaSticker(sesion.bufferAudio)

		const mediaSticker = await prepareWAMessageMedia(
			{
				sticker: sesion.bufferSticker
			},
			{
				upload: conn.waUploadToServer
			}
		)

		if (!mediaSticker.stickerMessage) {
			throw new Error('No se pudo preparar el mensaje del sticker.')
		}

		mediaSticker.stickerMessage.sound = audioConvertido

		const mensajeFinal = proto.Message.fromObject({
			stickerMessage: mediaSticker.stickerMessage
		})

		if (mensajeFinal?.stickerMessage) {
			mensajeFinal.stickerMessage.sound = audioConvertido
		}

		const mensajeGenerado = await conn.relayMessage(
			m.chat,
			mensajeFinal,
			{
				messageId: conn.generateMessageTag?.() || undefined
			}
		)

		return mensajeGenerado
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
