import { diagnosticar, reaccionesDisponibles } from '../../lib/anime-media.js'

/**
 * Diagnóstico de los GIFs de anime.
 *
 * Comprueba desde TU servidor (no desde otro lado) si el bot puede:
 *   • usar fetch (Node 18+ o node-fetch)
 *   • ejecutar ffmpeg para convertir GIF → MP4
 *   • conectarse a cada API de reacciones anime
 *
 * Uso:
 *   .animediag            → prueba las 8 acciones de los comandos reparados
 *   .animediag todo       → prueba todas las acciones soportadas
 *   .animediag kill       → prueba una acción concreta
 */
const handler = async (m, { conn, args, usedPrefix, command }) => {
  const opcion = (args[0] || '').toLowerCase()
  let acciones = ['kill', 'sip', 'cuddle', 'bite', 'peek', 'lappillow', 'stare', 'pat', 'yawn']

  if (opcion === 'todo' || opcion === 'all') acciones = reaccionesDisponibles
  else if (opcion && reaccionesDisponibles.includes(opcion)) acciones = [opcion]
  else if (opcion) {
    return m.reply(`❌ No conozco la acción *${opcion}*.\n\n• Uso: *${usedPrefix}${command}* (acciones de comandos)\n• *${usedPrefix}${command} todo* (todas)\n• Acciones: ${reaccionesDisponibles.join(', ')}`)
  }

  await m.react('🔎')
  await m.reply(`🔎 *Probando las APIs desde este servidor...*\n(esto puede tardar unos segundos: ${acciones.length} acción(es))`)

  try {
    const { texto, fallos, acciones: total } = await diagnosticar(acciones)
    const estado = fallos === 0
      ? '✅ *Todo funcionando:* los comandos mandarán GIF.'
      : fallos >= total
        ? '❌ *Ninguna API responde desde este servidor:* revisa salida de red/firewall.'
        : `⚠️ *${fallos} de ${total} con problemas:* los demás sí mandan GIF.`
    await m.reply(`${texto}\n\n${estado}`)
    await m.react(fallos === 0 ? '✅' : '⚠️')
  } catch (e) {
    await m.react('❌')
    await m.reply(`❌ Error en el diagnóstico: ${e.message}`)
  }
}

handler.help = ['animediag [acción|todo]']
handler.tags = ['anime']
handler.command = ['animediag', 'testanime', 'diaganime']
handler.rowner = true

export default handler
