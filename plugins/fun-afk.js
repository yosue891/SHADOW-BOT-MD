import fetch from 'node-fetch'

export async function before(m, { conn }) {
  const primaryBot = global.db.data.chats[m.chat].primaryBot
  if (primaryBot && conn.user.jid !== primaryBot) throw !1

  const user = global.db.data.users[m.sender]
  user.afk = user.afk || -1
  user.afkReason = user.afkReason || ''

  const thumb = await (await fetch("https://i.postimg.cc/rFfVL8Ps/image.jpg")).buffer()

  const shadow_xyz = {
    key: {
      remoteJid: "status@broadcast",
      fromMe: false,
      id: "ShadowCatalogAFK",
      participant: "0@s.whatsapp.net"
    },
    message: {
      productMessage: {
        product: {
          productImage: {
            mimetype: "image/jpeg",
            jpegThumbnail: thumb
          },
          title: "WhatsApp Business • Estado",
          description: "Shadow team",
          currencyCode: "USD",
          priceAmount1000: 0000,
          retailerId: "ShadowCore",
          productImageCount: 1
        },
        businessOwnerJid: "584242773183@s.whatsapp.net"
      }
    }
  }

  const formatTiempo = (ms) => {
    if (typeof ms !== 'number' || isNaN(ms)) return 'desconocido'
    const h = Math.floor(ms / 3600000)
    const min = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const parts = []
    if (h) parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`)
    if (min) parts.push(`${min} ${min === 1 ? 'minuto' : 'minutos'}`)
    if (s || (!h && !min)) parts.push(`${s} ${s === 1 ? 'segundo' : 'segundos'}`)
    return parts.join(' ')
  }

  // Cuando el usuario vuelve del AFK
  if (typeof user.afk === 'number' && user.afk > -1) {
    const ms = Date.now() - user.afk
    const tiempo = formatTiempo(ms)

    await conn.sendMessage(
      m.chat,
      {
        text:
          `🌑 *Discípulo de las Sombras*\n` +
          `Has regresado del reino de la inactividad.\n` +
          `○ Motivo » *${user.afkReason || 'sin especificar'}*\n` +
          `○ Tiempo ausente » *${tiempo}*`
      },
      { quoted: shadow_xyz }
    )

    user.afk = -1
    user.afkReason = ''
  }

  // Aviso cuando mencionas a alguien AFK
  const quoted = m.quoted ? await m.quoted.sender : null
  const jids = [...new Set([...(await m.mentionedJid || []), ...(quoted ? [quoted] : [])])]

  for (const jid of jids) {
    const target = global.db.data.users[jid]
    if (!target || typeof target.afk !== 'number' || target.afk < 0) continue

    const ms = Date.now() - target.afk
    const tiempo = formatTiempo(ms)

    await conn.sendMessage(
      m.chat,
      {
        text:
          `🌑 *Invocación Sombría*\n` +
          `El usuario ${await conn.getName(jid)} está AFK.\n` +
          `○ Motivo: ${target.afkReason || 'sin especificar'}\n` +
          `○ Tiempo ausente: ${tiempo}`
      },
      { quoted: shadow_xyz }
    )
  }

  return true
}
