import { totalmem, freemem } from 'os'
import osu from 'node-os-utils'
import { sizeFormatter } from 'human-readable'
import { performance } from 'perf_hooks'

const cpu = osu.cpu
const format = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`
})

var handler = async (m, { conn }) => {
  let start = performance.now()
  if (conn.sendPresenceUpdate) await conn.sendPresenceUpdate('composing', m.chat)
  let latency = (performance.now() - start).toFixed(4)

  let totalMs = process.uptime() * 1000
  let muptime = clockString(totalMs)

  let chats = Object.values(conn.chats).filter(chat => chat.isChats)
  let groups = Object.entries(conn.chats)
    .filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats)
    .map(([jid]) => jid)

  let cpuUsage = await cpu.usage()

  const now = new Date()
  const opcionesHora = { hour12: true, hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }
  const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }

  let fecha = now.toLocaleDateString('es-PE', opcionesFecha)
  let hora = now.toLocaleTimeString('es-PE', opcionesHora)

  let texto = `
❐ *Velocidad de Respuesta:*  
→ ✩ *_${latency} ms_*

✦ *Actividad:*  
→ ✿ *_${muptime}_*

ꕤ *Uso de RAM:*  
→ ⌗ *_${format(totalmem() - freemem())}_* / *_${format(totalmem())}_*

✎ *Uso de CPU:*  
→ 〄 *_${cpuUsage.toFixed(2)} %_*`

  if (m.react) m.react('🍁')
  conn.reply(m.chat, texto, m)
}

handler.help = ['speed']
handler.tags = ['info']
handler.command = ['speed', 'sped']

export default handler

function clockString(ms) {
  if (isNaN(ms)) return '--d --h --m --s'
  let d = Math.floor(ms / 86400000)
  let h = Math.floor((ms % 86400000) / 3600000)
  let m = Math.floor((ms % 3600000) / 60000)
  let s = Math.floor((ms % 60000) / 1000)
  return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
    }
