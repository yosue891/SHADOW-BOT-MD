import test from 'node:test'
import assert from 'node:assert/strict'
import setPrimaryHandler, {
  getActiveBots,
  findTargetBot,
  normalizeJid,
  extractNumber,
  isBaileysId
} from '../plugins/grupos/group-setprimary.js'

test('extractNumber and normalizeJid handle raw and device jids', () => {
  assert.equal(extractNumber('584121234567:1@s.whatsapp.net'), '584121234567')
  assert.equal(extractNumber('584121234567@s.whatsapp.net'), '584121234567')
  assert.equal(extractNumber('+58 412 123 4567'), '584121234567')
  assert.equal(normalizeJid('584121234567:2@s.whatsapp.net'), '584121234567@s.whatsapp.net')
})

test('isBaileysId identifies Baileys generated message IDs', () => {
  assert.equal(isBaileysId('3EB0D4219A425FE1'), true)
  assert.equal(isBaileysId('BAE5123456789ABC'), true)
  assert.equal(isBaileysId('SHADOWBOT123456'), true)
  assert.equal(isBaileysId('99999999999999999999999999999999'), false)
})

test('getActiveBots discovers global.conn with authState creds me lid', () => {
  const originalGlobalConn = global.conn
  const originalGlobalConns = global.conns

  try {
    global.conn = {
      user: { id: '573127510345:1@s.whatsapp.net', name: 'MainBot' },
      authState: {
        creds: {
          me: {
            id: '573127510345:1@s.whatsapp.net',
            lid: '98765432101234:0@lid'
          }
        }
      },
      ws: { readyState: 1 }
    }

    const subSock1 = {
      user: { id: '584122222222:2@s.whatsapp.net', name: 'SubBot1' },
      ws: { readyState: 1 }
    }

    global.conns = [subSock1]

    const bots = getActiveBots(global.conn)
    assert.equal(bots.length, 2)
    const main = bots.find(b => b.isMain)
    assert.ok(main)
    assert.equal(main.number, '573127510345')
    assert.ok(main.lids.includes('98765432101234@lid'))
    assert.ok(main.lids.includes('98765432101234'))
  } finally {
    global.conn = originalGlobalConn
    global.conns = originalGlobalConns
  }
})

test('findTargetBot matches with keyword "main", "principal", "bot"', async () => {
  const activeBots = [
    { isMain: true, number: '573127510345', canonicalJid: '573127510345@s.whatsapp.net', lids: [] },
    { isMain: false, number: '584122222222', canonicalJid: '584122222222@s.whatsapp.net', lids: [] }
  ]

  const result1 = await findTargetBot(activeBots, { text: 'main', args: ['main'] })
  assert.equal(result1?.number, '573127510345')

  const result2 = await findTargetBot(activeBots, { text: 'principal', args: ['principal'] })
  assert.equal(result2?.number, '573127510345')

  const result3 = await findTargetBot(activeBots, { text: 'bot', args: ['bot'] })
  assert.equal(result3?.number, '573127510345')
})

test('findTargetBot resolves quoted message when only 1 bot is active in system', async () => {
  const activeBots = [
    {
      isMain: true,
      number: '573127510345',
      canonicalJid: '573127510345@s.whatsapp.net',
      lids: ['98765432101234@lid']
    }
  ]

  const quotedFromWhatsApp = {
    id: '3EB0123456789ABC',
    sender: '98765432101234@lid'
  }

  const result = await findTargetBot(activeBots, {
    quoted: quotedFromWhatsApp
  })
  assert.equal(result?.number, '573127510345')
})

test('findTargetBot resolves quoted Baileys stanzaId', async () => {
  const mainSock = {
    user: { id: '573127510345:1@s.whatsapp.net' },
    ws: { readyState: 1 }
  }
  const activeBots = [
    {
      sock: mainSock,
      isMain: true,
      number: '573127510345',
      canonicalJid: '573127510345@s.whatsapp.net',
      lids: []
    },
    {
      isMain: false,
      number: '584122222222',
      canonicalJid: '584122222222@s.whatsapp.net',
      lids: []
    }
  ]

  const quotedWithBaileysId = {
    id: '3EB0ABCDEF123456',
    sender: 'randomlid@lid'
  }

  const result = await findTargetBot(activeBots, {
    quoted: quotedWithBaileysId,
    currentConn: mainSock
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
        id: '3EB0ABCDEF123456',
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
