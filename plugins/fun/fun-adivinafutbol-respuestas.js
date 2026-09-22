/*
 * ⚽ RESPUESTAS del minijuego "Adivina el Jugador"
 *
 * Plugin aparte a propósito: usa customPrefix '' para que los jugadores
 * respondan escribiendo SOLO la letra (a / b / c / d), sin prefijo.
 *
 * Si las letras fueran comandos normales (.a .b .c .d) chocarían con
 * plugins que ya existen: 'c' es gacha-reclamar y 'd' es economia-dep,
 * y el handler ejecuta TODOS los plugins que coinciden (no hay break),
 * así que se dispararían los dos a la vez.
 *
 * customPrefix '' hace match con cualquier mensaje y no consume texto
 * (handler.js: usedPrefix = match[0][0]; noPrefix = text.replace('', '')),
 * así que 'command' sale como la primera palabra del mensaje.
 * Solo reacciona a a/b/c/d y solo si hay una partida viva en ese chat.
 */

import { partidas, responder } from './fun-adivinafutbol.js'

const LETRAS = ['a', 'b', 'c', 'd']

let handler = async (m, ctx) => {
  const partida = partidas.get(m.chat)
  if (!partida || !partida.actual) return
  return responder(m, ctx, partida, ctx.command)
}

handler.customPrefix = ''
handler.tags = ['game']
handler.command = LETRAS
handler.group = true

export default handler
