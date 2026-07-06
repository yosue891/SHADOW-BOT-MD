import fetch from 'node-fetch'

const regex = /^(?:https:\/\/|git@)github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/i
const handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) return conn.reply(m.chat, '❄️✨ *Discípulo de las Sombras*, entrega un enlace o nombre del repositorio de GitHub para invocar su poder.', m)
  try {
    await m.react('🎭')
    let info = ''
    let image
    let zipBuffer, zipName
    let repos = []
    const match = text.match(regex)

    if (match) {
      const [, user, repo] = match
      const repoRes = await fetch(`https://api.github.com/repos/${user}/${repo}`)
      const zipRes = await fetch(`https://api.github.com/repos/${user}/${repo}/zipball`)
      const repoData = await repoRes.json()
      zipName = zipRes.headers.get('content-disposition')?.match(/filename=(.*)/)?.[1]
      if (!zipName) zipName = `${repo}-${user}.zip`
      zipBuffer = await zipRes.buffer()
      repos.push(repoData)
      // 🎄 Imagen temática navideña con estilo Shadow Garden
      image = 'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/shadow-christmas.jpg'
    } else {
      const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(text)}`)
      const json = await res.json()
      if (!json.items.length) return conn.reply(m.chat, '🌑 Ningún repositorio emergió de las sombras...', m)
      repos = json.items
      image = await (await fetch(repos[0].owner.avatar_url)).buffer()
    }

    info += repos.map((repo, index) => `🎄✨ *Invocación ${index + 1}*
👤 Creador: ${repo.owner.login}
📂 Nombre: ${repo.name}
📅 Creado: ${formatDate(repo.created_at)}
🔄 Actualizado: ${formatDate(repo.updated_at)}
👁️ Vigilantes: ${repo.watchers}
🌱 Bifurcado: ${repo.forks}
⭐ Estrellas: ${repo.stargazers_count}
⚔️ Issues: ${repo.open_issues}
📜 Descripción: ${repo.description ? repo.description : 'Sin Descripción'}
🔗 Enlace: ${repo.clone_url}`).join('\n────────────────────\n')

    await conn.sendFile(m.chat, image, 'shadow_repo.jpg', `🌌 *Catálogo de las Sombras – Edición Navideña* 🎅\n\n${info.trim()}`, m)

    if (zipBuffer && zipName) {
      await conn.sendFile(m.chat, zipBuffer, zipName, null, m)
    }

    await m.react('✔️')
  } catch (e) {
    await m.react('✖️')
    conn.reply(m.chat, `⚠️ El ritual falló...\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`, m)
  }
}

handler.help = ['gitclone']
handler.tags = ['tools']
handler.command = ['gitclone']
handler.group = true

export default handler

function formatDate(n, locale = 'es') {
  const d = new Date(n)
  return d.toLocaleDateString(locale, { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', 
    hour: 'numeric', minute: 'numeric', second: 'numeric' 
  })
        }
