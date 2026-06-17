import { WAMessageStubType } from '@whiskeysockets/baileys'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

const groupMetadataCache = new Map()
const lidCache = new Map()
const handler = m => m
handler.before = async function (m, { conn, participants, groupMetadata }) {
if (!m.messageStubType || !m.isGroup) return
const primaryBot = global.db.data.chats[m.chat].primaryBot
if (primaryBot && conn.user.jid !== primaryBot) throw !1
const chat = global.db.data.chats[m.chat]
const users = m.messageStubParameters[0]
const usuario = await resolveLidToRealJid(m?.sender, conn, m?.chat)
const groupAdmins = participants.filter(p => p.admin)

let iconBuffer = null
if (chat.detect) {
  try {
    iconBuffer = await (await fetch(icono)).buffer()
  } catch {
    iconBuffer = null
  }
}

const rcanalBase = {
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: channelRD.id,
    serverMessageId: '',
    newsletterName: channelRD.name
  },
  externalAdReply: {
    title: "𐔌 . ⋮ ᗩ ᐯ I Տ O .ᐟ ֹ ₊ ꒱",
    body: textbot,
    mediaUrl: null,
    description: null,
    previewType: "PHOTO",
    thumbnail: iconBuffer,
    jpegThumbnail: iconBuffer,
    sourceUrl: redes,
    mediaType: 1,
    renderLargerThumbnail: false
  },
  matchedText: ""
}

const pp = await conn.profilePictureUrl(m.chat, 'image').catch(_ => null) || 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg'
const nombre = `> ❀ @${usuario.split('@')[0]} Ha cambiado el nombre del grupo.\n> ✦ Ahora el grupo se llama:\n> *${m.messageStubParameters[0]}*.`
const foto = `> ❀ Se ha cambiado la imagen del grupo.\n> ✦ Acción hecha por:\n> » @${usuario.split('@')[0]}`
const edit = `> ❀ @${usuario.split('@')[0]} Ha permitido que ${m.messageStubParameters[0] == 'on' ? 'solo admins' : 'todos'} puedan configurar el grupo.`
const newlink = `> ❀ El enlace del grupo ha sido restablecido.\n> ✦ Acción hecha por:\n> » @${usuario.split('@')[0]}`
const status = `> ❀ El grupo ha sido ${m.messageStubParameters[0] == 'on' ? '*cerrado*' : '*abierto*'} Por @${usuario.split('@')[0]}\n> ✦ Ahora ${m.messageStubParameters[0] == 'on' ? '*solo admins*' : '*todos*'} pueden enviar mensaje.`
const admingp = `> ❀ @${users.split('@')[0]} Ahora es admin del grupo.\n> ✦ Acción hecha por:\n> » @${usuario.split('@')[0]}`
const noadmingp = `> ❀ @${users.split('@')[0]} Deja de ser admin del grupo.\n> ✦ Acción hecha por:\n> » @${usuario.split('@')[0]}`

if (chat.detect && m.messageStubType == 2) {
const uniqid = (m.isGroup ? m.chat : m.sender).split('@')[0]
const sessionPath = `./${sessions}/`
for (const file of await fs.promises.readdir(sessionPath)) {
if (file.includes(uniqid)) {
await fs.promises.unlink(path.join(sessionPath, file))
console.log(`${chalk.yellow.bold('✎ Delete!')} ${chalk.greenBright(`'${file}'`)}\n${chalk.redBright('Que provoca el "undefined" en el chat.')}`)
}}} if (chat.detect && m.messageStubType == 21) {
await this.sendMessage(m.chat, { text: nombre, contextInfo: { ...rcanalBase, mentionedJid: [usuario, ...groupAdmins.map(v => v.id)] } }, { quoted: null })
} if (chat.detect && m.messageStubType == 22) {
const rcanalFoto = { ...rcanalBase }
delete rcanalFoto.matchedText
await this.sendMessage(m.chat, { image: { url: pp }, caption: foto, contextInfo: { ...rcanalFoto, mentionedJid: [usuario, ...groupAdmins.map(v => v.id)] } }, { quoted: null })
} if (chat.detect && m.messageStubType == 23) {
await this.sendMessage(m.chat, { text: newlink, contextInfo: { ...rcanalBase, mentionedJid: [usuario, ...groupAdmins.map(v => v.id)] } }, { quoted: null })
} if (chat.detect && m.messageStubType == 25) {
await this.sendMessage(m.chat, { text: edit, contextInfo: { ...rcanalBase, mentionedJid: [usuario, ...groupAdmins.map(v => v.id)] } }, { quoted: null })
} if (chat.detect && m.messageStubType == 26) {
await this.sendMessage(m.chat, { text: status, contextInfo: { ...rcanalBase, mentionedJid: [usuario, ...groupAdmins.map(v => v.id)] } }, { quoted: null })
} if (chat.detect && m.messageStubType == 29) {
await this.sendMessage(m.chat, { text: admingp, contextInfo: { ...rcanalBase, mentionedJid: [usuario, users, ...groupAdmins.map(v => v.id)].filter(Boolean) } }, { quoted: null })
return
} if (chat.detect && m.messageStubType == 30) {
await this.sendMessage(m.chat, { text: noadmingp, contextInfo: { ...rcanalBase, mentionedJid: [usuario, users, ...groupAdmins.map(v => v.id)].filter(Boolean) } }, { quoted: null })
} else { 
if (m.messageStubType == 2) return
console.log({messageStubType: m.messageStubType,
messageStubParameters: m.messageStubParameters,
type: WAMessageStubType[m.messageStubType], 
})}}

export default handler

async function resolveLidToRealJid(lid, conn, groupChatId, maxRetries = 3, retryDelay = 60000) {
const inputJid = lid.toString()
if (!inputJid.endsWith("@lid") || !groupChatId?.endsWith("@g.us")) { return inputJid.includes("@") ? inputJid : `${inputJid}@s.whatsapp.net` }
if (lidCache.has(inputJid)) { return lidCache.get(inputJid) }
const lidToFind = inputJid.split("@")[0]
let attempts = 0
while (attempts < maxRetries) {
try {
const metadata = await conn?.groupMetadata(groupChatId)
if (!metadata?.participants) { throw new Error("No se obtuvieron participantes") }
for (const participant of metadata.participants) {
try {
if (!participant?.jid) continue
const contactDetails = await conn?.onWhatsApp(participant.jid)
if (!contactDetails?.[0]?.lid) continue
const possibleLid = contactDetails[0].lid.split("@")[0]
if (possibleLid === lidToFind) {
lidCache.set(inputJid, participant.jid)
return participant.jid
}} catch (e) { continue }}
lidCache.set(inputJid, inputJid)
return inputJid
} catch (e) {
if (++attempts >= maxRetries) {
lidCache.set(inputJid, inputJid)
return inputJid
}
await new Promise((resolve) => setTimeout(resolve, retryDelay))
}}
return inputJid
}
