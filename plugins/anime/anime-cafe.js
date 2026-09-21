const CAFE_VIDEOS = [
  'https://u.pone.rs/wrdixhdu.mp4',
  'https://u.pone.rs/lsvklqjq.mp4',
  'https://u.pone.rs/xzsgbdlb.mp4',
  'https://u.pone.rs/sjlogmhw.mp4',
  'https://u.pone.rs/cwurrbtn.mp4'
]

const UA = 'ShadowBot/1.0 (+https://github.com/yosue891/SHADOW-BOT-MD)'

function mezclar(lista) {
  const c = [...lista]
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[c[i], c[j]] = [c[j], c[i]]
  }
  return c
}

function esMp4Valido(buf) {
  if (!buf || buf.length < 1024) return false
  const ascii = buf.subarray(4, 8).toString('ascii')
  if (ascii === 'ftyp') return true
  if (buf.subarray(0, 4).toString('ascii').startsWith('GIF8')) return true
  return false
}

async function descargarVideo(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (!esMp4Valido(buf)) throw new Error('no es video válido')
    return buf
  } finally {
    clearTimeout(t)
  }
}

let handler = async (m, { conn, usedPrefix }) => {
    let who;

    if (m.mentionedJid.length > 0) {
        who = m.mentionedJid[0];
    } else if (m.quoted) {
        who = m.quoted.sender;
    } else {
        who = m.sender;
    }

    let name = conn.getName(who);
    let name2 = conn.getName(m.sender);
    m.react('☕'); // Reacción con emoji de café

    let str;
    if (m.mentionedJid.length > 0 || m.quoted) {
        str = `☕ \`${name2}\` *está disfrutando una taza de café con* \`${name || who}\`. ¡Qué momento delicioso!`;
    } else {
        str = `☕ \`${name2}\` *se toma una taza de café solo*. A veces, el café en solitario sabe mejor. ☕`.trim();
    }

    if (m.isGroup) {
        // Se descarga en el bot y se manda el buffer (no la URL): así no
        // depende de que los servidores de WhatsApp puedan descargar pone.rs.
        // Se prueban los videos en orden aleatorio hasta que uno funcione.
        let enviado = false
        let ultimoError = null
        for (const url of mezclar(CAFE_VIDEOS)) {
            try {
                const buf = await descargarVideo(url)
                try {
                    await conn.sendMessage(m.chat, { video: buf, mimetype: 'video/mp4', gifPlayback: true, caption: str, mentions: [who] }, { quoted: m });
                } catch (e) {
                    // Si falla como GIF, reintento como video normal
                    console.warn('[anime-cafe] gifPlayback falló, reintento sin gifPlayback:', e.message)
                    await conn.sendMessage(m.chat, { video: buf, mimetype: 'video/mp4', caption: str, mentions: [who] }, { quoted: m });
                }
                console.log(`[anime-cafe] enviado ${url} (${Math.round(buf.length / 1024)} KB)`)
                enviado = true
                break
            } catch (e) {
                ultimoError = e
                console.warn('[anime-cafe] falló', url, ':', e.message)
            }
        }
        if (!enviado) {
            console.error('[anime-cafe] ningún video funcionó:', ultimoError?.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    } else {
        await conn.sendMessage(m.chat, { text: str }, { quoted: m });
    }
};

handler.help = ['coffee/cafe @tag'];
handler.tags = ['anime'];
handler.command = ['coffee', 'cafe', 'taza'];
handler.group = true;

export default handler;                               
