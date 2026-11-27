import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

test('findTargetBot resolves main bot when sub-bot processes quote of main bot', async () => {
  const mainSock = {
    user: { id: '573127510345:1@s.whatsapp.net', jid: '573127510345@s.whatsapp.net', lid: '98765432101234@lid' },
    authState: { creds: { me: { id: '573127510345:1@s.whatsapp.net', lid: '98765432101234@lid' } } },
    ws: { readyState: 1 }
  }
  const subSock = {
    user: { id: '584122222222:2@s.whatsapp.net', jid: '584122222222@s.whatsapp.net', lid: '87654321098765@lid' },
    authState: { creds: { me: { id: '584122222222:2@s.whatsapp.net', lid: '87654321098765@lid' } } },
    ws: { readyState: 1 }
  }

  const activeBots = [
    {
      sock: mainSock,
      isMain: true,
      number: '573127510345',
      canonicalJid: '573127510345@s.whatsapp.net',
      lids: ['98765432101234@lid', '98765432101234']
    },
    {
      sock: subSock,
      isMain: false,
      number: '584122222222',
      canonicalJid: '584122222222@s.whatsapp.net',
      lids: ['87654321098765@lid', '87654321098765']
    }
  ]

  const quotedFromMain = {
    id: '3EB0ABCDEF123456',
    sender: '98765432101234@lid',
    fromMe: false
  }

  const result = await findTargetBot(activeBots, {
    quoted: quotedFromMain,
    currentConn: subSock
  })

  assert.equal(result?.number, '573127510345')
  assert.equal(result?.isMain, true)
})

test('setPrimaryHandler yields when target bot is another active socket', async () => {
  const originalGlobalConn = global.conn
  const originalGlobalConns = global.conns
  const originalDb = global.db

  try {
    let mainReplied = false
    let subReplied = false

    const mainSock = {
      user: { id: '573127510345:1@s.whatsapp.net' },
      ws: { readyState: 1 },
      reply: () => { mainReplied = true }
    }
    const subSock = {
      user: { id: '584122222222:1@s.whatsapp.net' },
      ws: { readyState: 1 },
      reply: () => { subReplied = true }
    }

    global.conn = mainSock
    global.conns = [subSock]
    global.db = { data: { chats: { '120363000000000@g.us': { primaryBot: null } } } }

    const fakeM = {
      chat: '120363000000000@g.us',
      text: '.setprimary main',
      quoted: null
    }

    await setPrimaryHandler(fakeM, {
      conn: subSock,
      text: 'main',
      args: ['main'],
      usedPrefix: '.',
      command: 'setprimary',
      participants: [{ id: '573127510345@s.whatsapp.net' }]
    })

    assert.equal(subReplied, false)

    await setPrimaryHandler(fakeM, {
      conn: mainSock,
      text: 'main',
      args: ['main'],
      usedPrefix: '.',
      command: 'setprimary',
      participants: [{ id: '573127510345@s.whatsapp.net' }]
    })

    assert.equal(mainReplied, true)
    assert.equal(global.db.data.chats['120363000000000@g.us'].primaryBot, '573127510345@s.whatsapp.net')
  } finally {
    global.conn = originalGlobalConn
    global.conns = originalGlobalConns
    global.db = originalDb
  }
})

test('src/handler.js silences sub-bot and does NOT wipe chat.primaryBot', async () => {
  let src = fs.readFileSync('src/handler.js', 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace(/const printModule = .*;\n/, 'const printModule = null;\n')
    .replaceAll('export async function', 'async function')
  src = src.split('let file = global.__filename')[0]

  let pluginRan = false
  const testPlugin = async function () { pluginRan = true }
  testPlugin.command = ['testcmd']

  const db = {
    data: {
      users: {},
      chats: {
        'group1@g.us': {
          primaryBot: '573127510345@s.whatsapp.net'
        }
      },
      settings: {}
    }
  }

  const mainSock = {
    user: { id: '573127510345:1@s.whatsapp.net', jid: '573127510345@s.whatsapp.net' },
    ws: { readyState: 1 },
    decodeJid: x => x
  }

  const subSock = {
    user: { id: '584122222222:2@s.whatsapp.net', jid: '584122222222@s.whatsapp.net' },
    ws: { readyState: 1 },
    chats: {},
    pushMessage: async () => {},
    getName: async () => 'User',
    decodeJid: x => x
  }

  const ctx = vm.createContext({
    global: {
      conn: mainSock,
      conns: [subSock],
      db,
      plugins: { testPlugin },
      prefix: /^[!.]/,
      owner: [],
      mods: [],
      prems: []
    },
    opts: { restrict: true, noprint: true },
    smsg: (_c, m) => m,
    console,
    path,
    join: path.join,
    fileURLToPath,
    fs,
    ws: { CLOSED: 3 },
    setTimeout,
    URL
  })

  src = src.replaceAll('import.meta.url', JSON.stringify(new URL('../src/handler.js', import.meta.url).href))
  vm.runInContext("global.prefix = /^[!.]/;", ctx)
  vm.runInContext(src, ctx)

  const groupMsg = {
    key: { id: '1', remoteJid: 'group1@g.us', participant: 'user@s.whatsapp.net' },
    id: '1',
    chat: 'group1@g.us',
    sender: 'user@s.whatsapp.net',
    isGroup: true,
    text: '!testcmd',
    pushName: 'User',
    message: { conversation: '!testcmd' }
  }

  // Sub-bot runs handler for !testcmd in group where primaryBot is mainSock
  await ctx.handler.call(subSock, { messages: [groupMsg], type: 'notify' })

  // Sub-bot must NOT run plugin
  assert.equal(pluginRan, false)
  // chat.primaryBot must NOT be wiped!
  assert.equal(db.data.chats['group1@g.us'].primaryBot, '573127510345@s.whatsapp.net')

  // Main bot runs handler for !testcmd
  mainSock.chats = {}
  mainSock.pushMessage = async () => {}
  mainSock.getName = async () => 'User'
  await ctx.handler.call(mainSock, { messages: [groupMsg], type: 'notify' })

  // Main bot DOES run plugin!
  assert.equal(pluginRan, true)
  assert.equal(db.data.chats['group1@g.us'].primaryBot, '573127510345@s.whatsapp.net')
})
