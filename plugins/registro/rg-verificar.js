import { createHash } from 'crypto'

const SelloMistico = /\|?(.*)([.|] *?)([0-9]*)$/i

let handler = async function (m, { conn, text, usedPrefix, command }) {
  const who = m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender)
  const pp = await conn.profilePictureUrl(who, 'image').catch(() => 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg')
  const user = global.db.data.users[m.sender]
  const name2 = conn.getName(m.sender)

  if (user.registered) {
    return conn.sendMessage(m.chat, {
      text: `『🎃』 Ya has sellado tu pacto sombrío en Halloween, ${name2}-kun...\n\n¿Deseas romper el sello espectral y renacer?\nUsa *${usedPrefix}unreg* para disolver el vínculo actual.`,
      buttons: [
        { buttonId: `${usedPrefix}menu`, buttonText: { displayText: '🎃 Volver al Menú 🦇' }, type: 1 },
        { buttonId: `${usedPrefix}unreg`, buttonText: { displayText: '🕯️ Romper el Sello ⚰️' }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m })
  }

  if (!SelloMistico.test(text)) {
    return m.reply(`『🎃⚠️』 El ritual de aquelarre fue mal pronunciado...\n\n✧ Formato correcto: *${usedPrefix + command} nombre.edad*\n✧ Ejemplo: *${usedPrefix + command} ${name2}.18*`)
  }

  let [_, name, __, age] = text.match(SelloMistico)
  age = parseInt(age)

  if (age > 60) {
    return m.reply("『🎃』 ¿Acaso eres un alma anciana? XD\n\nNo puedes registrarte con más de 60 años.")
  }
  if (age >= 1 && age <= 5) {
    return m.reply("『🎃』 Los infantes no deberían invocar espectros.\n\nNo puedes registrarte con menos de 6 años.")
  }
  if (isNaN(age) || age < 6) {
    return m.reply("『🎃』 Edad inválida. Debes colocar un número mayor a 5.")
  }

  user.name = `${name}⋆🎃Shadow🦇⋆`
  user.age = age
  user.regTime = +new Date()
  user.registered = true

  const sn = createHash('md5').update(m.sender).digest('hex').slice(0, 20)

  const certificadoPacto = `
╭─「 🎃 Pacto de Ultratumba • Shadow Garden 🦇 」─╮
│ ✧ *Contratista:* ${name}
│ ✧ *Edad:* ${age} años
│ ✧ *Sello Único:* ${sn}
│
├─ Mensaje de la Cripta:
│ 🕯️ Ahora puedes invocar todos los comandos de la noche.
│ 🦇 Si deseas ver tu perfil, usa *.profile*
│
╰─「 🎃 Shadow Garden Halloween 🦇 」─╯
`.trim()

  await m.react('🎃')

  await conn.sendMessage(m.chat, {
    image: { url: pp },
    caption: certificadoPacto,
    buttons: [
      { buttonId: `${usedPrefix}menu`, buttonText: { displayText: '🎃 Menú de la Cripta 🦇' }, type: 1 },
      { buttonId: `${usedPrefix}profile ${m.sender}`, buttonText: { displayText: '👤 Perfil de Sombra 🕯️' }, type: 1 }
    ],
    headerType: 4
  }, { quoted: m })

  await conn.sendMessage(m.chat, {
    document: { url: 'https://files.catbox.moe/zbyywc.jpg' }, 
    mimetype: 'application/pdf', 
    fileName: '🎃 Pacto Shadow Halloween 🦇',
    caption: '『📜🎃』 El pacto sombrío ha sido sellado con sangre en la Noche de Brujas...'
  }, { quoted: m })
}

handler.help = ['reg']
handler.tags = ['rg']
handler.command = ['verify', 'verificar', 'reg', 'register', 'registrar']

export default handler
