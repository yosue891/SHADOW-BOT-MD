import { delay } from "@whiskeysockets/baileys"

let handler = async (m, { conn, text, args, isAdmin, isBotAdmin }) => {
  if (!m.isGroup) {
    await conn.sendMessage(m.chat, { text: '⚔️ *Este ritual solo puede ejecutarse dentro de un dominio grupal.*' })
    return
  }

  if (!isAdmin) {
    await conn.sendMessage(m.chat, { text: '🌑 *No posees la autoridad para sellar el portal. Solo los elegidos pueden hacerlo.*' })
    return
  }

  if (!isBotAdmin) {
    await conn.sendMessage(m.chat, { text: '🕶️ *Aún sin el rango de administrador, no puedo manipular las puertas del reino.*' })
    return
  }

  if (!args[0]) {
    await conn.sendMessage(m.chat, { text: '⏳ *Invoca el sello correctamente:* !cerrar 10 segundos | !cerrar 5 minutos | !cerrar 1 hora' })
    return
  }

  let tiempoTexto = text.toLowerCase()
  let tiempoMs

  if (tiempoTexto.includes("segundo")) {
    let segundos = parseInt(args[0])
    if (isNaN(segundos) || segundos <= 0) {
      await conn.sendMessage(m.chat, { text: '🕰️ *El abismo exige un número válido de segundos.*' })
      return
    }
    tiempoMs = segundos * 1000

  } else if (tiempoTexto.includes("minuto")) {
    let minutos = parseInt(args[0])
    if (isNaN(minutos) || minutos <= 0) {
      await conn.sendMessage(m.chat, { text: '🕰️ *El abismo exige un número válido de minutos.*' })
      return
    }
    tiempoMs = minutos * 60 * 1000

  } else if (tiempoTexto.includes("hora")) {
    let horas = parseInt(args[0])
    if (isNaN(horas) || horas <= 0) {
      await conn.sendMessage(m.chat, { text: '🕰️ *El abismo exige un número válido de horas.*' })
      return
    }
    tiempoMs = horas * 60 * 60 * 1000

  } else {
    await conn.sendMessage(m.chat, { text: '❄️ *Debes especificar segundos, minutos u horas. La oscuridad no tolera imprecisiones.*' })
    return
  }

  await conn.groupSettingUpdate(m.chat, 'announcement')
  await conn.sendMessage(m.chat, {
    text: `🔒 *El portal ha sido sellado por ${args[0]} ${tiempoTexto.includes("segundo") ? "segundo(s)" : tiempoTexto.includes("minuto") ? "minuto(s)" : "hora(s)"}.*\n\n🌑 *La sombra observa... el silencio domina el dominio.*`
  })

  await delay(tiempoMs)

  await conn.groupSettingUpdate(m.chat, 'not_announcement')
  await conn.sendMessage(m.chat, { text: '✨ *El sello se ha disipado. El dominio vuelve a abrirse bajo la mirada de la sombra.*' })
}

handler.help = ['cerrar <número> segundos/minutos/horas']
handler.tags = ['grupos']
handler.command = ['cerrar']
handler.group = true
handler.admin = true

export default handler
