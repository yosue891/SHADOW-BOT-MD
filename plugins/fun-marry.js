const handler = async (m, { conn, command, usedPrefix, text }) => {
  const users = global.db.data.users
  const userId = m.sender
  const rcanal = typeof global.rcanal !== 'undefined' ? global.rcanal : {}

  if (!users[userId]) users[userId] = {}

  if (command === 'divorce' || command === 'divorciarse') {
    const partnerId = users[userId]?.marry

    if (!partnerId) {
      return conn.sendMessage(
        m.chat,
        { text: '💔 No estás casado con nadie en el Reino de las Sombras.', ...rcanal },
        { quoted: m }
      )
    }

    await conn.sendButton(
      m.chat,
      `¿Estás seguro de que quieres romper tu pacto con @${partnerId.split('@')[0]}?`,
      'Shadow Garden',
      null,
      [
        ['SÍ, DIVORCIARME', `${usedPrefix}confirmdivorce`],
        ['NO', `${usedPrefix}canceldivorce`]
      ],
      m,
      { mentions: [partnerId] }
    )

    return
  }

  if (command === 'confirmdivorce') {
    const partnerId = users[userId]?.marry
    if (!partnerId) return

    if (users[partnerId]) users[partnerId].marry = ''
    users[userId].marry = ''

    return conn.sendMessage(
      m.chat,
      {
        text: `💔 El pacto se ha roto. @${userId.split('@')[0]} y @${partnerId.split('@')[0]} ya no están unidos.`,
        mentions: [userId, partnerId],
        ...rcanal
      },
      { quoted: m }
    )
  }

  if (command === 'marry' || command === 'casarse') {
    let partnerId =
      m.mentionedJid?.[0] ||
      m.quoted?.sender ||
      false

    if (!partnerId && text) {
      const number = text.replace(/[^0-9]/g, '')
      if (number.length > 5) {
        partnerId = number + '@s.whatsapp.net'
      }
    }

    if (!partnerId) {
      return conn.sendMessage(
        m.chat,
        {
          text: '💍 Menciona o responde a la persona con la que quieres sellar el pacto.',
          ...rcanal
        },
        { quoted: m }
      )
    }

    if (partnerId === userId) {
      return m.reply('🌌 No puedes casarte con tu propia sombra.')
    }

    if (!users[partnerId]) users[partnerId] = {}

    if (users[userId]?.marry) {
      return conn.sendMessage(
        m.chat,
        {
          text: `⚠️ Ya estás casado con @${users[userId].marry.split('@')[0]}.`,
          mentions: [users[userId].marry]
        },
        { quoted: m }
      )
    }

    if (users[partnerId]?.marry) {
      return conn.sendMessage(
        m.chat,
        {
          text: `⚠️ @${partnerId.split('@')[0]} ya tiene un pacto con alguien más.`,
          mentions: [partnerId]
        },
        { quoted: m }
      )
    }

    await conn.sendButton(
      m.chat,
      `💒 @${userId.split('@')[0]} te propone matrimonio eterno.\n\n¿Aceptas, @${partnerId.split('@')[0]}?`,
      'Tienes 50 segundos.',
      null,
      [
        ['ACEPTAR 💍', `${usedPrefix}acceptmarry ${userId}`],
        ['RECHAZAR ❌', `${usedPrefix}declinemarry ${userId}`]
      ],
      m,
      { mentions: [userId, partnerId] }
    )

    setTimeout(() => {
      if (users[userId] && !users[userId].marry) {
        conn.sendMessage(
          m.chat,
          {
            text: `🥀 @${userId.split('@')[0]}, te han dejado plantado... El tiempo expiró.`,
            mentions: [userId],
            ...rcanal
          },
          { quoted: m }
        )
      }
    }, 50000)

    return
  }

  if (command === 'acceptmarry') {
    const suitorId =
      text?.split(' ')[0] ||
      m.quoted?.sender ||
      m.message?.extendedTextMessage?.contextInfo?.participant

    if (!suitorId) return

    if (!users[suitorId]) users[suitorId] = {}

    if (users[userId]?.marry || users[suitorId]?.marry) {
      return m.reply('⚠️ Uno de los dos ya está casado.')
    }

    users[userId].marry = suitorId
    users[suitorId].marry = userId

    const gifs = [
      'https://upload.yotsuba.giize.com/u/z8dLTTgH.mp4',
      'https://upload.yotsuba.giize.com/u/wNPbiKSM.mp4',
      'https://upload.yotsuba.giize.com/u/Rop5fO1v.mp4'
    ]

    const randomGif = gifs[Math.floor(Math.random() * gifs.length)]

    return conn.sendMessage(
      m.chat,
      {
        video: { url: randomGif },
        gifPlayback: true,
        caption: `💒 『☽』 Las sombras han sellado el pacto.\n@${suitorId.split('@')[0]} y @${userId.split('@')[0]} ahora están casados.\n\n🎉🥳 *¡VIVAN LOS NOVIOSSS NJD!*`,
        mentions: [suitorId, userId]
      },
      { quoted: m }
    )
  }

  if (command === 'declinemarry') {
    const suitorId =
      text?.split(' ')[0] ||
      m.quoted?.sender ||
      m.message?.extendedTextMessage?.contextInfo?.participant

    if (!suitorId) return

    return conn.sendMessage(
      m.chat,
      {
        text: `💔 @${suitorId.split('@')[0]}, has sido rechazado en el altar.`,
        mentions: [suitorId],
        ...rcanal
      },
      { quoted: m }
    )
  }
}

handler.command = [
  'marry',
  'casarse',
  'divorce',
  'divorciarse',
  'confirmdivorce',
  'acceptmarry',
  'declinemarry'
]

handler.group = true

export default handler
