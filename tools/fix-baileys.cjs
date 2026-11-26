const fs = require('fs')
const path = require('path')

try {
  const liaPath = path.join(process.cwd(), 'node_modules', '@itsliaaa', 'baileys')

  // --- Shim para 'ourin' y 'ourin-baileys' desde '@itsliaaa/baileys' ---
  const targets = [
    path.join(process.cwd(), 'node_modules', 'ourin'),
    path.join(process.cwd(), 'node_modules', 'ourin-baileys'),
    path.join(process.cwd(), 'node_modules', 'baileys'),
    path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys')
  ]

  if (fs.existsSync(liaPath)) {
    for (const target of targets) {
      if (!fs.existsSync(target)) {
        try {
          const parentDir = path.dirname(target)
          if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true })
          const type = process.platform === 'win32' ? 'junction' : 'dir'
          fs.symlinkSync(path.relative(parentDir, liaPath), target, type)
          console.log(`[fix-baileys] Symlink creado: ${path.relative(process.cwd(), target)} -> @itsliaaa/baileys`)
        } catch (e) {
          try {
            fs.cpSync(liaPath, target, { recursive: true, force: true })
            console.log(`[fix-baileys] Copia creada: ${path.relative(process.cwd(), target)} desde @itsliaaa/baileys`)
          } catch {}
        }
      }
    }
  }

  // Verificar @ffmpeg-installer/ffmpeg
  const ffmpegPath = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'ffmpeg')
  if (!fs.existsSync(ffmpegPath)) {
    console.warn('[fix-baileys] ADVERTENCIA: @ffmpeg-installer/ffmpeg no encontrado. Ejecuta: npm install @ffmpeg-installer/ffmpeg')
  }
  try {
    const instDir = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer')
    if (fs.existsSync(instDir)) {
      for (const sub of fs.readdirSync(instDir)) {
        const bin = path.join(instDir, sub, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
        if (!fs.existsSync(bin)) continue
        const st = fs.statSync(bin)
        if (!(st.mode & 0o111)) {
          fs.chmodSync(bin, st.mode | 0o755)
          console.log('[fix-baileys] permiso de ejecución aplicado a:', bin)
        }
      }
    }
  } catch (e) {
    console.warn('[fix-baileys] no se pudo ajustar el permiso de ffmpeg:', e.message)
  }
} catch (e) {
  console.error('[fix-baileys] Error shim baileys:', e.message)
}

const explicit = "export { BufferJSON } from './generics.js';"

const candidates = [
  path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'index.js'),
  path.join(process.cwd(), 'node_modules', '@itsliaaa', 'baileys', 'lib', 'Utils', 'index.js'),
  path.join(process.cwd(), 'node_modules', 'ourin', 'lib', 'Utils', 'index.js'),
  path.join(process.cwd(), 'node_modules', 'ourin-baileys', 'lib', 'Utils', 'index.js')
]

for (const target of candidates) {
  if (!fs.existsSync(target)) continue
  const src = fs.readFileSync(target, 'utf8')
  if (src.includes("BufferJSON } from './generics.js'")) continue
  const needsPatch = src.includes("export * from './generics.js';") &&
    src.includes("export * from './use-sqlite-auth-state.js';")
  if (!needsPatch) continue
  try {
    fs.writeFileSync(target, src.trimEnd() + '\n' + explicit + '\n')
    console.log('[fix-baileys] Parche aplicado en:', target)
  } catch (err) {
    console.error('[fix-baileys] No se pudo parchear', target, err.message)
  }
}

const processMsgCandidates = [
  path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'process-message.js'),
  path.join(process.cwd(), 'node_modules', '@itsliaaa', 'baileys', 'lib', 'Utils', 'process-message.js'),
  path.join(process.cwd(), 'node_modules', 'ourin', 'lib', 'Utils', 'process-message.js'),
  path.join(process.cwd(), 'node_modules', 'ourin-baileys', 'lib', 'Utils', 'process-message.js')
]

for (const target of processMsgCandidates) {
  if (!fs.existsSync(target)) continue
  let src = fs.readFileSync(target, 'utf8')
  let modified = false

  const oldMap = 'message.messageStubParameters.map((a) => JSON.parse(a))'
  const newMap = 'message.messageStubParameters.map((a) => { try { return typeof a === "string" && a.trim().startsWith("{") ? JSON.parse(a) : a; } catch { return a; } })'
  if (src.includes(oldMap)) {
    src = src.replaceAll(oldMap, newMap)
    modified = true
  }

  const oldIncludes = 'const participantsIncludesMe = () => participants.find(jid => areJidsSameUser(meId, jid.phoneNumber));'
  const newIncludes = 'const participantsIncludesMe = () => participants.find(jid => areJidsSameUser(meId, typeof jid === "object" ? (jid?.phoneNumber || jid?.id) : jid));'
  if (src.includes(oldIncludes)) {
    src = src.replace(oldIncludes, newIncludes)
    modified = true
  }

  const oldSingle = 'const participant = JSON.parse(message.messageStubParameters?.[0]);'
  const newSingle = 'let participant; try { participant = JSON.parse(message.messageStubParameters?.[0]); } catch { participant = message.messageStubParameters?.[0]; }'
  if (src.includes(oldSingle)) {
    src = src.replace(oldSingle, newSingle)
    modified = true
  }

  if (modified) {
    try {
      fs.writeFileSync(target, src, 'utf8')
      console.log('[fix-baileys] Parche process-message aplicado en:', target)
    } catch (err) {
      console.error('[fix-baileys] No se pudo parchear process-message', target, err.message)
    }
  }
}

const messagesUtilsCandidates = [
  path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'messages.js'),
  path.join(process.cwd(), 'node_modules', '@itsliaaa', 'baileys', 'lib', 'Utils', 'messages.js'),
  path.join(process.cwd(), 'node_modules', 'ourin', 'lib', 'Utils', 'messages.js'),
  path.join(process.cwd(), 'node_modules', 'ourin-baileys', 'lib', 'Utils', 'messages.js'),
  path.join(process.cwd(), 'node_modules', 'baileys', 'lib', 'Utils', 'messages.js')
]

for (const target of messagesUtilsCandidates) {
  if (!fs.existsSync(target)) continue
  let src = fs.readFileSync(target, 'utf8')
  if (src.includes('message?.audioStickerMessage')) continue

  const oldTarget = 'message?.lottieStickerMessage ||'
  const newTarget = 'message?.lottieStickerMessage ||\n            message?.audioStickerMessage ||'

  if (src.includes(oldTarget)) {
    src = src.replace(oldTarget, newTarget)
    try {
      fs.writeFileSync(target, src, 'utf8')
      console.log('[fix-baileys] Parche getFutureProofMessage aplicado en:', target)
    } catch (err) {
      console.error('[fix-baileys] No se pudo parchear messages.js', target, err.message)
    }
  }
}

const protoCandidates = [
  path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'WAProto', 'index.js'),
  path.join(process.cwd(), 'node_modules', '@itsliaaa', 'baileys', 'WAProto', 'index.js'),
  path.join(process.cwd(), 'node_modules', 'baileys', 'WAProto', 'index.js')
]

for (const target of protoCandidates) {
  if (!fs.existsSync(target)) continue
  let src = fs.readFileSync(target, 'utf8')
  let modified = false

  // 1. StickerMessage.decode: case 26, 33, 34
  const oldStickerDecode = 'case 25: {\n                            m.emojis = r.string();\n                            break;\n                        }\n                    default:\n                        r.skipType(t & 7, n);\n                        break;'
  const newStickerDecode = 'case 25: {\n                            m.emojis = r.string();\n                            break;\n                        }\n                    case 26: {\n                            m.audioMessage = $root.proto.Message.AudioMessage.decode(r, r.uint32(), undefined, n + 1);\n                            break;\n                        }\n                    case 33: {\n                            m.accessibilityLabel = r.string();\n                            break;\n                        }\n                    case 34: {\n                            m.sound = r.bytes();\n                            break;\n                        }\n                    default:\n                        r.skipType(t & 7, n);\n                        break;'

  if (!src.includes('m.sound = r.bytes()') && src.includes(oldStickerDecode)) {
    src = src.replace(oldStickerDecode, newStickerDecode)
    modified = true
  }

  // 2. StickerMessage.encode: audioMessage, accessibilityLabel, sound
  const oldStickerEncode = 'if (m.emojis != null && Object.hasOwnProperty.call(m, "emojis"))\n                    w.uint32(202).string(m.emojis);\n                return w;\n            };\n\n            StickerMessage.decode'
  const newStickerEncode = 'if (m.emojis != null && Object.hasOwnProperty.call(m, "emojis"))\n                    w.uint32(202).string(m.emojis);\n                if (m.audioMessage != null && Object.hasOwnProperty.call(m, "audioMessage"))\n                    $root.proto.Message.AudioMessage.encode(m.audioMessage, w.uint32(210).fork()).ldelim();\n                if (m.accessibilityLabel != null && Object.hasOwnProperty.call(m, "accessibilityLabel"))\n                    w.uint32(266).string(m.accessibilityLabel);\n                if (m.sound != null && Object.hasOwnProperty.call(m, "sound"))\n                    w.uint32(274).bytes(m.sound);\n                return w;\n            };\n\n            StickerMessage.decode'

  if (!src.includes('w.uint32(274).bytes(m.sound)') && src.includes(oldStickerEncode)) {
    src = src.replace(oldStickerEncode, newStickerEncode)
    modified = true
  }

  // 3. Message.decode: case 134 (audioStickerMessage)
  const oldMsgDecode = 'case 127: {\n                        m.rootSecretDistributeMessage = $root.proto.Message.RootSecretDistributeMessage.decode(r, r.uint32(), undefined, n + 1);\n                        break;\n                    }\n                default:\n                    r.skipType(t & 7, n);\n                    break;'
  const newMsgDecode = 'case 127: {\n                        m.rootSecretDistributeMessage = $root.proto.Message.RootSecretDistributeMessage.decode(r, r.uint32(), undefined, n + 1);\n                        break;\n                    }\n                case 134: {\n                        m.audioStickerMessage = $root.proto.Message.FutureProofMessage.decode(r, r.uint32(), undefined, n + 1);\n                        break;\n                    }\n                default:\n                    r.skipType(t & 7, n);\n                    break;'

  if (!src.includes('m.audioStickerMessage = $root.proto.Message.FutureProofMessage.decode') && src.includes(oldMsgDecode)) {
    src = src.replace(oldMsgDecode, newMsgDecode)
    modified = true
  }

  // 4. Message.encode: audioStickerMessage (field 134)
  const oldMsgEncode = 'if (m.rootSecretDistributeMessage != null && Object.hasOwnProperty.call(m, "rootSecretDistributeMessage"))\n                $root.proto.Message.RootSecretDistributeMessage.encode(m.rootSecretDistributeMessage, w.uint32(1018).fork()).ldelim();\n            return w;\n        };\n\n        Message.decode'
  const newMsgEncode = 'if (m.rootSecretDistributeMessage != null && Object.hasOwnProperty.call(m, "rootSecretDistributeMessage"))\n                $root.proto.Message.RootSecretDistributeMessage.encode(m.rootSecretDistributeMessage, w.uint32(1018).fork()).ldelim();\n            if (m.audioStickerMessage != null && Object.hasOwnProperty.call(m, "audioStickerMessage"))\n                $root.proto.Message.FutureProofMessage.encode(m.audioStickerMessage, w.uint32(1074).fork()).ldelim();\n            return w;\n        };\n\n        Message.decode'

  if (!src.includes('$root.proto.Message.FutureProofMessage.encode(m.audioStickerMessage') && src.includes(oldMsgEncode)) {
    src = src.replace(oldMsgEncode, newMsgEncode)
    modified = true
  }

  // 5. StickerMessage.fromObject
  const oldStickerFromObj = 'if (d.emojis != null) {\n                    m.emojis = String(d.emojis);\n                }\n                return m;\n            };\n\n            StickerMessage.toObject'
  const newStickerFromObj = 'if (d.emojis != null) {\n                    m.emojis = String(d.emojis);\n                }\n                if (d.audioMessage != null) {\n                    if (typeof d.audioMessage !== "object")\n                        throw TypeError(".proto.Message.StickerMessage.audioMessage: object expected");\n                    m.audioMessage = $root.proto.Message.AudioMessage.fromObject(d.audioMessage, n + 1);\n                }\n                if (d.sound != null) {\n                    if (typeof d.sound === "string")\n                        $util.base64.decode(d.sound, m.sound = $util.newBuffer($util.base64.length(d.sound)), 0);\n                    else if (d.sound.length >= 0)\n                        m.sound = d.sound;\n                }\n                return m;\n            };\n\n            StickerMessage.toObject'

  if (!src.includes('.proto.Message.StickerMessage.audioMessage: object expected') && src.includes(oldStickerFromObj)) {
    src = src.replace(oldStickerFromObj, newStickerFromObj)
    modified = true
  }

  // 6. Message.fromObject
  const oldMsgFromObj = 'if (d.rootSecretDistributeMessage != null) {\n                if (typeof d.rootSecretDistributeMessage !== "object")\n                    throw TypeError(".proto.Message.rootSecretDistributeMessage: object expected");\n                m.rootSecretDistributeMessage = $root.proto.Message.RootSecretDistributeMessage.fromObject(d.rootSecretDistributeMessage, n + 1);\n            }\n            return m;\n        };\n\n        Message.toObject'
  const newMsgFromObj = 'if (d.rootSecretDistributeMessage != null) {\n                if (typeof d.rootSecretDistributeMessage !== "object")\n                    throw TypeError(".proto.Message.rootSecretDistributeMessage: object expected");\n                m.rootSecretDistributeMessage = $root.proto.Message.RootSecretDistributeMessage.fromObject(d.rootSecretDistributeMessage, n + 1);\n            }\n            if (d.audioStickerMessage != null) {\n                if (typeof d.audioStickerMessage !== "object")\n                    throw TypeError(".proto.Message.audioStickerMessage: object expected");\n                m.audioStickerMessage = $root.proto.Message.FutureProofMessage.fromObject(d.audioStickerMessage, n + 1);\n            }\n            return m;\n        };\n\n        Message.toObject'

  if (!src.includes('.proto.Message.audioStickerMessage: object expected') && src.includes(oldMsgFromObj)) {
    src = src.replace(oldMsgFromObj, newMsgFromObj)
    modified = true
  }

  if (modified) {
    try {
      fs.writeFileSync(target, src, 'utf8')
      console.log('[fix-baileys] Parche WAProto index.js aplicado en:', target)
    } catch (err) {
      console.error('[fix-baileys] No se pudo parchear WAProto index.js', target, err.message)
    }
  }
}
