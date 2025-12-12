/*
	* Create By Fede Uchiha 
	* GitHub https://github.com/dev-fedexyro
	* Whatsapp: https://whatsapp.com/channel/0029VbBG4i2GE56rSgXsqw2W
*/
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

let handler = async (m, { conn, command, args, text, groupMetadata }) => {
  let targetId
  let title = '🌱 Obtener LID'
  let targetLID = null

  if (m.quoted) {
    targetId = m.quoted.sender
    if (m.quoted.participant && m.quoted.participant.lid) {
        targetLID = m.quoted.participant.lid
    }
} else if (text) {
    const mentionMatch = text.match(/@(\d+)/)
    if (mentionMatch) {
      targetId = mentionMatch[1] + '@s.whatsapp.net'
      if (groupMetadata && groupMetadata.participants) {
          const participant = groupMetadata.participants.find(p => p.id === targetId)
          if (participant && participant.lid) {
              targetLID = participant.lid
          }
      }
} else {
      const number = text.replace(/\D/g, '')
      if (number.length > 7) {
        targetId = number + '@s.whatsapp.net'
}
}
}

  if (!targetId) {
    targetId = m.sender
    title = '👤 \`DATOS DEL USUARIO\` 🌵'
    if (groupMetadata && groupMetadata.participants) {
        const participant = groupMetadata.participants.find(p => p.id === m.sender)
        
        if (participant && participant.lid) { 
            targetLID = participant.lid
        }
    }
}

  const jidResult = targetId
  const numberClean = jidResult.split('@')[0]

  if (!targetLID) {
    targetLID = `${numberClean}@lid`
  }

  const fkontak = {
    key: {
      participants: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
      fromMe: false,
      id: 'Halo'
},
    message: {
      contactMessage: {
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
}
},
    participant: '0@s.whatsapp.net'
}

  const icons = 'https://files.catbox.moe/mwhyfm.jpg'
  const md = 'https://github.com/dev-fedexyro'

  const caption = `
════════════════════
🌱 *LID (ID Vinculado):*
\`${targetLID}\`
════════════════════

Toca el botón para copiar el LID o visitar el canal.
`.trim()

  let pp
  try {
    pp = await conn.profilePictureUrl(jidResult, 'image')
  } catch {
    pp = icons
  }

  const buttons = [
    {
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({ 
        display_text: `Copiar LID`, 
        copy_code: targetLID
      })
    },
    { 
      name: "cta_url", 
      buttonParamsJson: JSON.stringify({ 
        display_text: "canal de shadow 🌌", 
        url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O" 
      })
    }
  ];

  let imageBuffer;
  try {
      imageBuffer = await (await fetch(pp)).buffer();
  } catch (error) {
      console.error("Error al obtener la imagen de perfil:", error);
      imageBuffer = await (await fetch(icons)).buffer();
  }

  const { imageMessage } = await generateWAMessageContent({ image: imageBuffer }, { upload: conn.waUploadToServer })

  const interactive = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
        message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
                footer: proto.Message.InteractiveMessage.Footer.create({ text: `LID Consultado` }),
                header: proto.Message.InteractiveMessage.Header.fromObject({ 
                    title: title,
                    hasMediaAttachment: true, 
                    imageMessage: imageMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ 
                    buttons, 
                    messageParamsJson: '' 
                })
            })
        }
    }
}, { quoted: fkontak });

await conn.relayMessage(m.chat, interactive.message, { messageId: interactive.key.id })

}

handler.tags = ['group']
handler.help = ['lid', 'lidnum', 'lid <@mención|número>']
handler.command = ['lid', 'lidnum']

export default handler
