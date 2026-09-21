const VARIANTS = {
  v1: { id: 1, name: 'ORIGINAL SHADOW', desc: 'Texto simple original del bot (preservado)', emoji: '🌌' },
  v2: { id: 2, name: 'PREMIUM', desc: 'Documento con cita de contacto falsa', emoji: '🖼️' },
  v3: { id: 3, name: 'TITANIUM', desc: 'Imagen con caption (adaptado, original era video)', emoji: '📨' },
  v4: { id: 4, name: 'LV', desc: 'Vista previa con canal newsletter', emoji: '💼' },
  v5: { id: 5, name: 'FAKE ORDER', desc: 'Texto con mensaje de pedido citado falso', emoji: '🛒' },
  v6: { id: 6, name: 'SIMPLE DOCUMENT', desc: 'Documento citando mensaje original', emoji: '📄' },
  v7: { id: 7, name: 'FAKE LOCATION', desc: 'Texto con mensaje de ubicación citado falso', emoji: '📍' },
  v8: { id: 8, name: 'FAKE SIGNUP', desc: 'Texto con mensaje de registro citado falso', emoji: '🥠' },
  v9: { id: 9, name: 'FAKE ORDER 2', desc: 'Mensaje de pedido estilo catálogo', emoji: '🍙' },
  v10: { id: 10, name: 'PAYMENT', desc: 'Recibo de factura (solicitud de pago)', emoji: '💳' },
  v11: { id: 11, name: 'ANIMATED BOT NAME', desc: 'Animación con el nombre del bot (riesgo de ban)', emoji: '🌀' }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const getSettings = () => {
    if (!global.db?.data?.settings) return {}
    if (!global.db.data.settings[conn.user.jid]) global.db.data.settings[conn.user.jid] = {}
    return global.db.data.settings[conn.user.jid]
  }
  const variant = (args?.[0] || '').toLowerCase()
  if (variant) {
    const selected = VARIANTS[variant]
    if (!selected) return m.reply(`❌ *VARIANTE NO VÁLIDA*\n\nUso: *v1* a *v11*\nEjemplo: *${usedPrefix}${command} v5*`)
    const s = getSettings()
    s.replyVariant = selected.id
    let warn = ''
    if (selected.id === 11) warn = `\n\n⚠ *V11 ADVERTENCIA:*\n_El uso de esta animación puede provocar ban del número, lentitud y spam en consola._`
    return m.reply(`✅ *VARIANTE DE RESPUESTA CAMBIADA*\n\n${selected.emoji} *V${selected.id} — ${selected.name}*\n_${selected.desc}_` + warn)
  }
  const s = getSettings()
  const current = Number(s.replyVariant || 1)
  let txt = `💬📨 *REPLY VARIANT — SHADOW-BOT-MD*\n\nConfigura cómo responde el bot 💬✨\nVariante activa: *V${current} — ${VARIANTS['v' + current]?.name || 'Desconocida'}* 🎯\n\n`
  for (const [key, val] of Object.entries(VARIANTS)) {
    const mark = val.id === current ? ' ✓' : ''
    txt += `${val.emoji} *${key.toUpperCase()}${mark}* — ${val.name}\n_${val.desc}_\n\n`
  }
  txt += `⚠ *ADVERTENCIA:*\n_V11 (Animación) puede provocar ban, lentitud y spam en consola._\n\n> Usa *${usedPrefix}${command} v1* para volver a la *ORIGINAL* 🌌\n> Ejemplo: *${usedPrefix}${command} v5*`
  return m.reply(txt)
}

handler.help = ['setreply <v1-v11>']
handler.tags = ['owner']
handler.command = ['setreply', 'replyvariant', 'replystyle']
handler.rowner = true

export default handler
