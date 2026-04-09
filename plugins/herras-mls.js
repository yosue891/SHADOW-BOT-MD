import util from 'util'

const handler = async (m, { conn }) => {
  const mlsStructure = {
    key: {
      remoteJid: '120363423514187718@g.us',
      remoteJidAlt: undefined,
      fromMe: false,
      id: 'A54F66F85457C83E39DD96F8167074CF',
      participant: '276995896258574@lid',
      participantAlt: '51928616320@s.whatsapp.net',
      addressingMode: 'lid'
    },
    message: {
      extendedTextMessage: {
        endCardTiles: [],
        text: '.ver',
        previewType: 0,
        contextInfo: {
          mentionedJid: [],
          groupMentions: [],
          statusAttributions: [],
          stanzaId: 'SUKIB9B1F886466F7EFF',
          participant: '261181826699458@lid',
          quotedMessage: { conversation: '\ntexto2' },
          quotedType: 0
        },
        inviteLinkGroupTypeV2: 0
      },
      messageContextInfo: {
        threadId: [],
        messageSecret: 'Uint8Array(32) [194, 54, 101, 187, 8, 29, 45, 248, 51, 219, 73, 183, 93, 179, 34, 5, 172, 218, 1, 238, 127, 25, 41, 79, 40, 3, 202, 116, 191, 169, 191, 159]'
      }
    },
    id: 'A54F66F85457C83E39DD96F8167074CF',
    chat: '120363423514187718@g.us',
    from: '120363423514187718@g.us',
    isGroup: true,
    sender: '276995896258574@lid',
    pushName: 'Manuel VG',
    type: 'extendedTextMessage',
    body: '.ver',
    msg: {
      key: {
        remoteJid: '120363423514187718@g.us',
        remoteJidAlt: undefined,
        fromMe: false,
        id: 'A54F66F85457C83E39DD96F8167074CF',
        participant: '276995896258574@lid',
        participantAlt: '51928616320@s.whatsapp.net',
        addressingMode: 'lid'
      },
      category: undefined,
      messageTimestamp: 1775594858,
      pushName: 'Manuel VG',
      broadcast: false,
      message: {
        extendedTextMessage: {
          endCardTiles: [],
          text: '.ver',
          previewType: 0,
          contextInfo: {
            mentionedJid: [],
            groupMentions: [],
            statusAttributions: [],
            stanzaId: 'SUKIB9B1F886466F7EFF',
            participant: '261181826699458@lid',
            quotedMessage: { conversation: '\ntexto2' },
            quotedType: 0
          },
          inviteLinkGroupTypeV2: 0
        }
      }
    },
    quoted: {
      key: {
        remoteJid: '120363423514187718@g.us',
        fromMe: false,
        id: 'SUKIB9B1F886466F7EFF',
        participant: '261181826699458@lid'
      },
      message: { conversation: '\ntexto2' },
      arg: { conversation: '\ntexto2' }
    }
  }

  const text = util.inspect(mlsStructure, { depth: null })
  await m.reply('🔍 *INSPECCIÓN DE ESTRUCTURA MLS*\n\n' + '```javascript\n' + text + '\n```')
}

handler.help = ['mls']
handler.tags = ['main']
handler.command = ['mls']

export default handler
