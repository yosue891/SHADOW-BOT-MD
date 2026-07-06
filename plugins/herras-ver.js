let { downloadContentFromMessage } = (await import('@whiskeysockets/baileys'))

let handler = async (m, { conn, usedPrefix }) => {
let quoted = m.quoted
if (!quoted) return conn.reply(m.chat, `> ❐ Por favor, responde a un mensaje de una sola vez "ViewOnce" para ver su contenido.`, m)
try {
await m.react('🕒')
let viewOnceMessage = quoted.viewOnce ? quoted : quoted.mediaMessage?.imageMessage || quoted.mediaMessage?.videoMessage || quoted.mediaMessage?.audioMessage
let messageType = viewOnceMessage.mimetype || quoted.mtype
let stream = await downloadContentFromMessage(viewOnceMessage, messageType.split('/')[0])    
if (!stream) return conn.reply(m.chat, `✦ 𝖫𝗈 𝗌𝖾𝗇𝗍𝗂𝗆𝗈𝗌, 𝗇𝗈 𝗌𝖾 𝗉𝗎𝖽𝗈 𝖼𝖺𝗋𝗀𝖺𝗋 𝖾𝗅 𝖼𝗈𝗇𝗍𝖾𝗇𝗂𝖽𝗈.`, m)  
let buffer = Buffer.from([])
for await (const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}
if (messageType.includes('video')) {
await conn.sendMessage(m.chat, { video: buffer, caption: viewOnceMessage.caption || '', mimetype: 'video/mp4' }, { quoted: m })
} else if (messageType.includes('image')) {
await conn.sendMessage(m.chat, { image: buffer, caption: viewOnceMessage.caption || '' }, { quoted: m })
} else if (messageType.includes('audio')) {
await conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: viewOnceMessage.ptt || false }, { quoted: m })  
}
await m.react('✔️')
} catch (e) {
await m.react('✖️')
conn.reply(m.chat, `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`, m)
}}

handler.help = ['ver']
handler.tags = ['tools']
handler.command = ['readviewonce', 'read', 'readvo', 'ver']
//handler.coin = 52

export default handler
