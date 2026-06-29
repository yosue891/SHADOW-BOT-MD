import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'

const exec = promisify(_exec).bind(cp)
const handler = async (m, { conn, isOwner, isROwner, command, text, usedPrefix, args }) => {
if (!isROwner) return
let o
try {
await m.react('🕒')
o = await exec(command + (text ? ' ' + text : ''))
await m.react('✔️')
} catch (e) {
o = e
await m.react('✖️')
} finally {
const { stdout, stderr } = o
if (stdout.trim()) m.reply(stdout)
if (stderr.trim()) m.reply(stderr)
}}

handler.help = ['$']
handler.tags = ['owner']
handler.customPrefix = ['$']
handler.command = new RegExp

export default handler
