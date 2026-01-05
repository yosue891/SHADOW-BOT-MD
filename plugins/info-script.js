import moment from 'moment-timezone'
import fetch from 'node-fetch'

let handler = async (m, { conn }) => {
  try {
    let res = await fetch('https://api.github.com/repos/yosue891/SHADOW-BOT-MD')
    if (!res.ok) throw new Error('Error al obtener datos del repositorio Shadow-BOT-MD')
    let json = await res.json()

    let txt = `*🌑🎄  S H A D O W - B O T - M D  🎄🌑*\n\n`
    txt += `⚔️  *Nombre del Proyecto* : ${json.name}\n`
    txt += `👀  *Observadores en las Sombras* : ${json.watchers_count}\n`
    txt += `📦  *Tamaño del Dominio* : ${(json.size / 1024).toFixed(2)} MB\n`
    txt += `🕰️  *Última Invocación* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`
    txt += `🔗  *Portal Secreto* : ${json.html_url}\n`
    txt += `🌌  *Clones en las Sombras* : ${json.forks_count}\n`
    txt += `⭐  *Estrellas en la Oscuridad* : ${json.stargazers_count}\n\n`
    txt += `❄️🎁 *"En las sombras, incluso en Navidad, el poder se oculta tras la calma..."* 🎁❄️\n\n`
    txt += `👑  *Creador*: Yosue`

    await conn.sendMessage(m.chat, {
      text: txt,
      contextInfo: {
        externalAdReply: {
          title: "Shadow-BOT-MD",
          body: "El poder oculto en las sombras 🎄",
          thumbnailUrl: 'https://files.catbox.moe/owpjte.jpg',
          sourceUrl: json.html_url, 
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m })

  } catch {
    await conn.reply(m.chat, `🌑🎄 ¡Gomen! Ocurrió un error al acceder al dominio de las sombras. ❄️`, m)
  }
}

handler.help = ['script']
handler.tags = ['main']
handler.command = ['script', 'sc']
handler.register = true

export default handler
