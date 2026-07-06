import fs from 'fs'
import path from 'path'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`⌗ Usa así: *${usedPrefix + command} nombre*`)

  const senderNumber = m.sender.replace(/[^0-9]/g, '')
  const botPath = path.join('./Sessions/SubBot', senderNumber)
  const configPath = path.join(botPath, 'config.json')

  if (!fs.existsSync(botPath)) {
    return m.reply('> ✎ Este comando es sólo para los sockets.')
  }

  let config = {}

  
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath))
    } catch (e) {
      return m.reply('> » Error al leer el config.')
    }
  }

  
  config.name = text.trim()

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    m.reply(`ꕤ︎ Nombre del socket cambiado a: *${text.trim()}*`)
  } catch (err) {
    console.error(err)
    m.reply('❌ Ocurrió un error al guardar el nombre.')
  }
}

handler.help = ['setname']
handler.tags = ['socket']
handler.command = ['setname']

export default handler
