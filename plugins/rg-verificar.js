import { createHash } from 'crypto'

const SelloMistico = /\|?(.*)([.|] *?)([0-9]*)$/i

let handler = async function (m, { conn, text, usedPrefix, command }) {
  const who = m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender)
  const pp = await conn.profilePictureUrl(who, 'image').catch(() => 'https://files.catbox.moe/xr2m6u.jpg')
  const user = global.db.data.users[m.sender]
  const name2 = conn.getName(m.sender)

  if (user.registered) {
    return conn.sendMessage(m.chat, {
      text: `『☽』 Ya has sellado un pacto, ${name2}-kun...\n\n¿Deseas romper el sello y renacer?\nUsa *${usedPrefix}unreg* para disolver el vínculo actual.`,
      buttons: [
        { buttonId: `${usedPrefix}menu`, buttonText: { displayText: '⚔️ Volver al Menú' }, type: 1 },
        { buttonId: `${usedPrefix}unreg`, buttonText: { displayText: '🌌 Romper el Sello' }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m })
  }

  if (!SelloMistico.test(text)) {
    return m.reply(`『⚠️』 El ritual fue mal pronunciado...\n\n✧ Formato correcto: *${usedPrefix + command} nombre.edad*\n✧ Ejemplo: *${usedPrefix + command} ${name2}.18*`)
  }

  let [_, name, __, age] = text.match(SelloMistico)
  age = parseInt(age)

  if (age > 60) {
    return m.reply("『☽』 Acaso eres un viejo? XD\n\nNo puedes registrarte con más de 60 años.")
  }
  if (age >= 1 && age <= 5) {
    return m.reply("『☽』 Los bebés no deberían jugar con el bot.\n\nNo puedes registrarte con menos de 6 años.")
  }
  if (isNaN(age) || age < 6) {
    return m.reply("『☽』 Edad inválida. Debes colocar un número mayor a 5.")
  }

  user.name = `${name}⋆⟡Shadow⟡⋆`
  user.age = age
  user.regTime = +new Date()
  user.registered = true

  const sn = createHash('md5').update(m.sender).digest('hex').slice(0, 20)

  const certificadoPacto = `
╭─「 ☽ Pacto Shadow ☽ 」─╮
│ ✧ *Nombre:* ${name}
│ ✧ *Edad:* ${age} años
│ ✧ *Sello Único:* ${sn}
│
├─ Mensaje:
│ ⚔️ Ahora puedes usar todos los comandos del bot.
│ 🌌 Si deseas ver tu perfil, usa *.profile*
│
╰─「 Shadow Garden 」─╯
`.trim()

  await m.react('🌑')

  await conn.sendMessage(m.chat, {
    image: { url: pp },
    caption: certificadoPacto,
    buttons: [
      { buttonId: `${usedPrefix}menu`, buttonText: { displayText: '🌌 Volver al Menú' }, type: 1 },
      { buttonId: `${usedPrefix}profile ${m.sender}`, buttonText: { displayText: 'Perfil del grupo xd' }, type: 1 }
    ],
    headerType: 4,
    contextInfo: {
      externalAdReply: {
        title: '☽ Pacto Shadow Completado ☽',
        body: 'El poder oculto ha sido sellado...',
        thumbnailUrl: pp,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: m })

  await conn.sendMessage(m.chat, {
    document: { url: 'https://files.catbox.moe/zbyywc.jpg' }, 
    mimetype: 'application/pdf', 
    fileName: '☽ Pacto Shadow ☽',
    caption: '『📜』 El pacto ha sido sellado con éxito...'
  }, { quoted: m })
}

handler.help = ['reg']
handler.tags = ['rg']
handler.command = ['verify', 'verificar', 'reg', 'register', 'registrar']

export default handler
