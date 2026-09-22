import { partidas, responder, textoDeRespuesta, procesarInvitacion } from './fun-adivinafutbol.js'

const handler = async () => {}

handler.before = async function (m, ctx) {
  if (!m.isGroup || m.isBaileys) return false
  const partida = partidas.get(m.chat)
  if (!partida || (!partida.actual && partida.fase !== 'pendiente')) return false
  const entrada = textoDeRespuesta(m)
  if (!entrada) return false
  const chat = ctx.chat || global.db?.data?.chats?.[m.chat]
  const user = global.db?.data?.users?.[m.sender]
  if (chat?.isBanned || (user?.banned && !ctx.isMods)) return false
  if (chat?.modoadmin && !(ctx.isAdmin || ctx.isOwner || ctx.isMods)) return false
  if (partida.fase === 'pendiente') {
    await (partida.procesarInvitacion || procesarInvitacion)(m, ctx, partida, entrada)
    return false
  }
  await (partida.responder || responder)(m, ctx, partida, entrada)
  return false
}

handler.tags = ['game']
handler.group = true

export default handler
