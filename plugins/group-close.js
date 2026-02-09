import fetch from 'node-fetch'

let handler = async (m, { conn, command }) => {
  if (!m.isGroup) {
    return m.reply('🌑⚠️ *Este comando solo puede usarse en grupos.*')
  }

  const groupMetadata = await conn.groupMetadata(m.chat)

  // 🔑 FUNCIÓN PARA NORMALIZAR JID
  const normalize = jid => jid.split('@')[0]

  const admins = groupMetadata.participants
    .filter(p => p.admin)
    .map(p => normalize(p.id))

  const sender = normalize(m.sender)

  if (!admins.includes(sender)) {
    return m.reply('🌑⚠️ *Solo los administradores del grupo pueden usar este comando.*')
  }

  const chatId = m.chat
  const action = command.toLowerCase()

  const imgClose = 'https://files.catbox.moe/nnnyne.jpg'
  const imgOpen  = 'https://files.catbox.moe/guofgb.jpg'

  const selectedImage = action === 'open' ? imgOpen : imgClose
  const thumb = await (await fetch(selectedImage)).buffer()

  const businessHeader = {
    key: {
      participants: '0@s.whatsapp.net',
      fromMe: false,
      id: 'ShadowGarden'
    },
    message: {
      locationMessage: {
        name: `⚔️ ${action.toUpperCase()} — Shadow Garden`,
        jpegThumbnail: thumb,
        vcard:
          'BEGIN:VCARD\n' +
          'VERSION:3.0\n' +
          'N:;Shadow Garden;;;\n' +
          'FN:Shadow Garden\n' +
          'ORG:Shadow Garden\n' +
          'TITLE:AI Control\n' +
          'item1.TEL;waid=5804242773183:+58 0424-2773183\n' +
          'item1.X-ABLabel:Creador\n' +
          'X-WA-BIZ-DESCRIPTION:Control del Reino de las Sombras\n' +
          'X-WA-BIZ-NAME:Shadow Garden\n' +
          'END:VCARD'
      }
    },
    participant: '0@s.whatsapp.net'
  }

  if (action === 'close') {
    await conn.groupSettingUpdate(chatId, 'announcement')
    await conn.sendMessage(
      chatId,
      {
        text: '🌑⚔️ *El Shadow Garden ha sellado el grupo...*\n🕷️ Solo los administradores pueden hablar ahora.'
      },
      { quoted: businessHeader }
    )
  }

  if (action === 'open') {
    await conn.groupSettingUpdate(chatId, 'not_announcement')
    await conn.sendMessage(
      chatId,
      {
        text: '🌑✨ *El Shadow Garden ha liberado el grupo...*\n⚔️ Las voces vuelven a resonar en la oscuridad.'
      },
      { quoted: businessHeader }
    )
  }
}

handler.help = ['close', 'open']
handler.tags = ['group']
handler.command = ['close', 'open']
handler.group = true
handler.botAdmin = true

export default handler
