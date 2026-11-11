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
      user: { id: '573127510345:1@s.whatsapp.net', name: 'MainBot' },
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
    assert.equal(main.number, '573127510345')
    assert.equal(main.canonicalJid, '573127510345@s.whatsapp.net')

    const sub = bots.find(b => !b.isMain)
    assert.ok(sub)
    assert.equal(sub.number, '584122222222')
  } finally {
    global.conn = originalGlobalConn
    global.conns = originalGlobalConns
  }
})

test('findTargetBot matches with keyword "main", "principal", "bot"', async () => {
  const activeBots = [
    { isMain: true, number: '573127510345', canonicalJid: '573127510345@s.whatsapp.net' },
    { isMain: false, number: '584122222222', canonicalJid: '584122222222@s.whatsapp.net' }
  ]

  const result1 = await findTargetBot(activeBots, { text: 'main', args: ['main'] })
  assert.equal(result1?.number, '573127510345')

  const result2 = await findTargetBot(activeBots, { text: 'principal', args: ['principal'] })
  assert.equal(result2?.number, '573127510345')

  const result3 = await findTargetBot(activeBots, { text: 'bot', args: ['bot'] })
  assert.equal(result3?.number, '573127510345')
})

test('findTargetBot resolves quoted message with Promise sender (getter in simple.js)', async () => {
  const activeBots = [
    {
      isMain: true,
      number: '573127510345',
      canonicalJid: '573127510345@s.whatsapp.net',
      lid: '111111111111@lid'
    }
  ]

  // Promise sender simulation
  const quotedPromiseSender = {
    sender: Promise.resolve('573127510345@s.whatsapp.net')
  }

  const result = await findTargetBot(activeBots, {
    quoted: quotedPromiseSender
  })
  assert.equal(result?.number, '573127510345')
})

test('findTargetBot resolves quoted message with fromMe = true', async () => {
  const mainSock = {
    user: { id: '573127510345:1@s.whatsapp.net' },
    ws: { readyState: 1 }
  }
  const activeBots = [
    {
      sock: mainSock,
      isMain: true,
      number: '573127510345',
      canonicalJid: '573127510345@s.whatsapp.net'
    }
  ]

  const quotedFromMe = {
    fromMe: true,
    key: { fromMe: true }
  }

  const result = await findTargetBot(activeBots, {
    quoted: quotedFromMe,
    currentConn: mainSock
  })
  assert.equal(result?.number, '573127510345')
})

test('findTargetBot resolves text mention @573127510345 even if mentionedJid array is empty', async () => {
  const activeBots = [
    {
      isMain: true,
      number: '573127510345',
      canonicalJid: '573127510345@s.whatsapp.net'
    }
  ]

  const result = await findTargetBot(activeBots, {
    text: '@573127510345',
    m: { text: '.setprimary @573127510345' }
  })
  assert.equal(result?.number, '573127510345')
})

test('findTargetBot resolves quoted LID mapped through group participants', async () => {
  const activeBots = [
    {
      isMain: true,
      number: '573127510345',
      canonicalJid: '573127510345@s.whatsapp.net'
    }
  ]

  const participants = [
    {
      id: '573127510345@s.whatsapp.net',
      lid: '12345678901234@lid',
      phoneNumber: '573127510345'
    }
  ]

  const result = await findTargetBot(activeBots, {
    quoted: { sender: '12345678901234@lid' },
    participants
  })
  assert.equal(result?.number, '573127510345')
})

test('handler sets main bot as primaryBot and includes delprimary and verprimary info', async () => {
  const originalGlobalConn = global.conn
  const originalGlobalConns = global.conns
  const originalDb = global.db

  try {
    global.conn = {
      user: { id: '573127510345:1@s.whatsapp.net', name: 'MainBot' },
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
      { id: '573127510345@s.whatsapp.net', phoneNumber: '573127510345' },
      { id: '584122222222@s.whatsapp.net', phoneNumber: '584122222222' }
    ]

    // Quote message sent by bot
    const fakeM = {
      chat: '120363000000000@g.us',
      text: '.setprimary',
      quoted: {
        fromMe: true,
        sender: Promise.resolve('573127510345@s.whatsapp.net')
      }
    }

    await setPrimaryHandler(fakeM, {
      conn: global.conn,
      text: '',
      args: [],
      usedPrefix: '.',
      command: 'setprimary',
      participants
    })

    assert.equal(global.db.data.chats['120363000000000@g.us'].primaryBot, '573127510345@s.whatsapp.net')
    assert.match(repliedText, /¡BOT PRINCIPAL ASIGNADO CON ÉXITO!/)
    assert.match(repliedText, /Bot Principal/)
    assert.match(repliedText, /delprimary/)
    assert.match(repliedText, /verprimary/)
    assert.deepEqual(repliedOpts.mentions, ['573127510345@s.whatsapp.net'])

    // Calling again detects it is already primary
    await setPrimaryHandler(fakeM, {
      conn: global.conn,
      text: '',
      args: [],
      usedPrefix: '.',
      command: 'setprimary',
      participants
    })
    assert.match(repliedText, /ya está configurado como el Bot Principal aquí/)
    assert.match(repliedText, /verprimary/)
    assert.match(repliedText, /delprimary/)
  } finally {
    global.conn = originalGlobalConn
    global.conns = originalGlobalConns
    global.db = originalDb
  }
})
