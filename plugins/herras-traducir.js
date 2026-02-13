import translate from '@vitalets/google-translate-api'

var handler = async (m, { conn, usedPrefix, command, args }) => {
try {
let text = args.join(' ') || m.quoted?.text
if (!text) return conn.reply(m.chat, '《✧》 Escribe o responde un texto para traducirlo.', m)

const buttons = [
  { buttonId: `${usedPrefix + command} en ${text}`, buttonText: { displayText: '🇺🇸 Inglés' }, type: 1 },
  { buttonId: `${usedPrefix + command} es ${text}`, buttonText: { displayText: '🇪🇸 Español' }, type: 1 },
  { buttonId: `${usedPrefix + command} pt ${text}`, buttonText: { displayText: '🇧🇷 Portugués' }, type: 1 },
  { buttonId: `${usedPrefix + command} fr ${text}`, buttonText: { displayText: '🇫🇷 Francés' }, type: 1 },
  { buttonId: `${usedPrefix + command} it ${text}`, buttonText: { displayText: '🇮🇹 Italiano' }, type: 1 },
  { buttonId: `${usedPrefix + command} de ${text}`, buttonText: { displayText: '🇩🇪 Alemán' }, type: 1 }
]

if (args[0] && args[0].length === 2) {
  let lang = args[0]
  let content = args.slice(1).join(' ') || m.quoted?.text
  await m.react('🕒')
  const result = await translate(content, { to: lang, autoCorrect: true })
  await conn.reply(m.chat, `✦ Traducción (${lang}):\n\n${result.text}`, m)
  return await m.react('✔️')
}

await conn.sendMessage(
  m.chat,
  {
    text: '✦ Selecciona el idioma al que deseas traducir:',
    footer: 'Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ⚜',
    buttons,
    headerType: 1
  },
  { quoted: m }
)

} catch (e) {
await m.react('✖️')
conn.reply(
  m.chat,
  `⚠︎ Ocurrió un error ejecutando *${usedPrefix + command}*.\n\n${e.message}`,
  m
)
}}

handler.help = ['traducir']
handler.tags = ['utils']
handler.command = ['traducir']

export default handler
