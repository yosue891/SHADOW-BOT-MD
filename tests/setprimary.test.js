import test from 'node:test'
import assert from 'node:assert/strict'
import setPrimaryHandler, {
  getActiveBots,
  findTargetBot,
  normalizeJid,
  extractNumber
} from '../plugins/grupos/group-setprimary.js'

test('extractNumber and normalizeJid handle raw and device jids', () => {
  assert.equal(extractNumber('584121234567:1@s.whatsapp.net'), '584121234567')
  assert.equal(extractNumber('584121234567@s.whatsapp.net'), '584121234567')
  assert.equal(extractNumber('+58 412 123 4567'), '584121234567')
  assert.equal(normalizeJid('584121234567:2@s.whatsapp.net'), '584121234567@s.whatsapp.net')
})

test('getActiveBots discovers global.conn, current conn, and global.conns', () => {
  const originalGlobalConn = global.conn
  const originalGlobalConns = global.conns

  try {
    global.conn = {
      user: { id: '584121111111:1@s.whatsapp.net', name: 'MainBot' },
      ws: { readyState: 1 }
    }

    const subSock1 = {
      user: { id: '584122222222:2@s.whatsapp.net', name: 'SubBot1' },
      ws: { readyState: 1 }
    }

    const subSock2 = {
      user: { id: '584123333333@s.whatsapp.net', name: 'SubBot2' },
      ws: { readyState: 3 } // closed
    }

    global.conns = [subSock1, subSock2]

    const bots = getActiveBots(global.conn)
    assert.equal(bots.length, 2) // subSock2 is closed
    const main = bots.find(b => b.isMain)
    assert.ok(main)
    assert.equal(main.number, '584121111111')
    assert.equal(main.canonicalJid, '584121111111@s.whatsapp.net')

    const sub = bots.find(b => !b.isMain)
    assert.ok(sub)
    assert.equal(sub.number, '584122222222')
  } finally {
    global.conn = originalGlobalConn
    global.conns = originalGlobalConns
  }
})

test('findTargetBot matches with keyword "main" or "principal"', () => {
  const activeBots = [
    { isMain: true, number: '584121111111', canonicalJid: '584121111111@s.whatsapp.net' },
    { isMain: false, number: '584122222222', canonicalJid: '584122222222@s.whatsapp.net' }
  ]

  const result1 = findTargetBot(activeBots, { text: 'main', args: ['main'] })
  assert.equal(result1?.number, '584121111111')

  const result2 = findTargetBot(activeBots, { text: 'principal', args: ['principal'] })
  assert.equal(result2?.number, '584121111111')

  const result3 = findTargetBot(activeBots, { text: 'bot', args: ['bot'] })
  assert.equal(result3?.number, '584121111111')
})

test('findTargetBot matches mention and quoted sender (including group LID)', () => {
  const activeBots = [
    {
      isMain: true,
      number: '584121111111',
      canonicalJid: '584121111111@s.whatsapp.net',
      lid: '111111111111@lid'
    },
    {
      isMain: false,
      number: '584122222222',
      canonicalJid: '584122222222@s.whatsapp.net',
      lid: '222222222222@lid'
    }
  ]

  // Direct mention
  const byMention = findTargetBot(activeBots, {
    mentionedJid: ['584121111111@s.whatsapp.net']
  })
  assert.equal(byMention?.number, '584121111111')

  // Quoted message with LID matching bot.lid
  const byLid = findTargetBot(activeBots, {
    quoted: { sender: '111111111111@lid' }
  })
  assert.equal(byLid?.number, '584121111111')

  // Quoted message with unknown LID mapped via group participants
  const participants = [
    {
      id: '584122222222@s.whatsapp.net',
      lid: '999999999999@lid',
      phoneNumber: '584122222222'
    }
  ]
  const byParticipantLid = findTargetBot(activeBots, {
    quoted: { sender: '999999999999@lid' },
    participants
  })
  assert.equal(byParticipantLid?.number, '584122222222')

  // By phone number string in text
  const byPhoneNumber = findTargetBot(activeBots, {
    text: '+58 412 111 1111',
    args: ['+584121111111']
  })
  assert.equal(byPhoneNumber?.number, '584121111111')
})

test('findTargetBot returns null for regular non-bot user', () => {
  const activeBots = [
    { isMain: true, number: '584121111111', canonicalJid: '584121111111@s.whatsapp.net' }
  ]

  const result = findTargetBot(activeBots, {
    mentionedJid: ['584129999999@s.whatsapp.net']
  })
  assert.equal(result, null)
})

test('handler sets main bot as primaryBot in chat and sends confirmation', async () => {
  const originalGlobalConn = global.conn
  const originalGlobalConns = global.conns
  const originalDb = global.db

  try {
    global.conn = {
      user: { id: '584121111111:1@s.whatsapp.net', name: 'MainBot' },
      ws: { readyState: 1 },
      reply: (chat, text, m, opts) => {
        repliedText = text
        repliedOpts = opts
      }
    }
    const subSock = {
      user: { id: '584122222222:1@s.whatsapp.net', name: 'SubBot' },
      ws: { readyState: 1 },
      reply: (chat, text, m, opts) => {
        repliedText = text
        repliedOpts = opts
      }
    }
    global.conns = [subSock]

    global.db = {
      data: {
        chats: {
          '120363000000000@g.us': {
            primaryBot: null
          }
        }
      }
    }

    let repliedText = ''
    let repliedOpts = {}

    const participants = [
      { id: '584121111111@s.whatsapp.net', phoneNumber: '584121111111' },
      { id: '584122222222@s.whatsapp.net', phoneNumber: '584122222222' }
    ]

    // 1. From subbot, user executes ".setprimary main" -> selects MainBot
    await setPrimaryHandler({
      chat: '120363000000000@g.us',
      mentionedJid: [],
      quoted: null
    }, {
      conn: subSock,
      text: 'main',
      args: ['main'],
      usedPrefix: '.',
      command: 'setprimary',
      participants
    })

    assert.equal(global.db.data.chats['120363000000000@g.us'].primaryBot, '584121111111@s.whatsapp.net')
    assert.match(repliedText, /¡CONFIGURACIÓN ACTUALIZADA!/)
    assert.match(repliedText, /Bot Principal/)
    assert.deepEqual(repliedOpts.mentions, ['584121111111@s.whatsapp.net'])

    // 2. Calling again detects it is already primary
    await setPrimaryHandler({
      chat: '120363000000000@g.us',
      mentionedJid: ['584121111111@s.whatsapp.net'],
      quoted: null
    }, {
      conn: global.conn,
      text: '',
      args: [],
      usedPrefix: '.',
      command: 'setprimary',
      participants
    })
    assert.match(repliedText, /ya está configurado como el Bot Principal aquí/)

    // 3. User targets sub-bot with ".setprimary @584122222222"
    await setPrimaryHandler({
      chat: '120363000000000@g.us',
      mentionedJid: ['584122222222@s.whatsapp.net'],
      quoted: null
    }, {
      conn: global.conn,
      text: '',
      args: [],
      usedPrefix: '.',
      command: 'setprimary',
      participants
    })
    assert.equal(global.db.data.chats['120363000000000@g.us'].primaryBot, '584122222222@s.whatsapp.net')
    assert.match(repliedText, /Sub-Bot/)

    // 4. Mentioning a non-bot user returns error message
    await setPrimaryHandler({
      chat: '120363000000000@g.us',
      mentionedJid: ['584129999999@s.whatsapp.net'],
      quoted: null
    }, {
      conn: global.conn,
      text: '',
      args: [],
      usedPrefix: '.',
      command: 'setprimary',
      participants
    })
    assert.match(repliedText, /El usuario indicado no es un Bot activo del sistema/)
  } finally {
    global.conn = originalGlobalConn
    global.conns = originalGlobalConns
    global.db = originalDb
  }
})
