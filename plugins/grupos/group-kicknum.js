const handler = async (m, { conn, args, participants, command }) => {
  const prefix = args[0]
  if (!prefix || !prefix.startsWith('+')) {
    return m.reply(`⚠️ ❄️ Las sombras festivas exigen un prefijo válido.\nEjemplo: *.${command} +52*`)
  }

  const botNumber = conn.user.id.split(':')[0]

  const groupMetadata = await conn.groupMetadata(m.chat)
  const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id)

  const matching = participants.filter(p => 
    p.id.startsWith(prefix.replace('+', '')) &&
    p.id !== botNumber &&
    !admins.includes(p.id)
  )

  if (command === 'listnum' || command === 'listanum') {
    if (matching.length === 0) return m.reply(`👻🌌 Las sombras no encontraron almas con el prefijo ${prefix}...`)

    const lista = matching.map((p, i) => `${i + 1}. wa.me/${p.id.split('@')[0]}`).join('\n')
    return m.reply(`🔎 ❄️ *Shadow Garden Reporte Navideño* 🎄\n\nSe han detectado usuarios con el prefijo ${prefix}:\n\n${lista}\n\n✨ Las sombras vigilan incluso en estas fiestas.`)
  }

  if (command === 'kicknum') {
    if (matching.length === 0) return m.reply(`👻🌌 Ningún espíritu con el prefijo ${prefix} fue hallado para ser expulsado.`)

    for (let p of matching) {
      await conn.groupParticipantsUpdate(m.chat, [p.id], 'remove').catch(_ => null)
    }
    return m.reply(`✅ 🎄 *Shadow Garden ha expulsado ${matching.length} alma(s) con el prefijo ${prefix}.*\n\n🌌 Ja... así es como las sombras celebran la navidad: con disciplina y silencio.`)
  }
}

handler.command = ['kicknum', 'listnum', 'listanum']
handler.group = true
handler.botAdmin = true // Tú puedes quitar esta línea si no quieres validación att:shadow uwu

export default handler
