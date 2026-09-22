/* Respuestas al panel de fútbol sin prefijo.
 * before se ejecuta antes de que src/handler.js descarte mensajes sin prefijo.
 * No registrar a/b/c/d como comandos: .c y .d son de gacha y economía.
 */
import { partidas, responder } from './fun-adivinafutbol.js'

const handler = async () => {}

handler.before = async function (m, ctx) {
  if (!m.isGroup || m.isBaileys) return false
  const partida = partidas.get(m.chat)
  if (!partida?.actual || !m.quoted) return false
  const chat = ctx.chat || global.db?.data?.chats?.[m.chat]
  const user = global.db?.data?.users?.[m.sender]
  if (chat?.isBanned || (user?.banned && !ctx.isMods)) return false
  if (chat?.modoadmin && !(ctx.isAdmin || ctx.isOwner || ctx.isMods)) return false
  await responder(m, ctx, partida, m.text)
  return false
}

handler.tags = ['game']
handler.group = true

export default handler
