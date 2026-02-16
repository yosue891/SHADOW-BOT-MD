import fetch from 'node-fetch'

export const before = async (m, { conn }) => {
  try {

    if (!global.db.data.users[m.sender]) return true
    const user = global.db.data.users[m.sender]

    if (!global.db.data.chats[m.chat])
      global.db.data.chats[m.chat] = {}

    user.afk = typeof user.afk === 'number' ? user.afk : -1
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
            priceAmount1000: 0,
            retailerId: "ShadowCore",
            productImageCount: 1
          },
          businessOwnerJid: "584242773183@s.whatsapp.net"
        }
      }
    }

    const formatTiempo = (ms) => {
      const h = Math.floor(ms / 3600000)
      const min = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      return `${h ? h + 'h ' : ''}${min ? min + 'm ' : ''}${s ? s + 's' : ''}`.trim()
    }

    if (user.afk > -1) {
      const tiempo = formatTiempo(Date.now() - user.afk)

      await conn.sendMessage(m.chat, {
        text:
          `🌑 *Discípulo de las Sombras*\n` +
          `Has regresado.\n` +
          `○ Motivo » ${user.afkReason || 'sin especificar'}\n` +
          `○ Tiempo » ${tiempo}`
      }, { quoted: shadow_xyz })

      user.afk = -1
      user.afkReason = ''
    }

    const jids = m.mentionedJid || []
    for (const jid of jids) {
      const target = global.db.data.users[jid]
      if (!target || target.afk < 0) continue

      const tiempo = formatTiempo(Date.now() - target.afk)

      await conn.sendMessage(m.chat, {
        text:
          `🌑 *Invocación Sombría*\n` +
          `${await conn.getName(jid)} está AFK\n` +
          `○ Motivo: ${target.afkReason || 'sin especificar'}\n` +
          `○ Tiempo: ${tiempo}`
      }, { quoted: shadow_xyz })
    }

    return true

  } catch (e) {
    console.log(e)
    return true
  }
}

export const disabled = false
