/**
 * PLUGIN: Welcome Banner
 * ------------------------------------------------------
 * Genera un banner de bienvenida usando la API de yosoyyo-api-ofc
 * y obtiene automáticamente la foto de perfil de WhatsApp del usuario.
 *
 * Uso básico:
 *   .welcome
 *   .welcome @usuario
 *
 * Por defecto el fondo se elige al azar entre varias imágenes predefinidas.
 * Personalización (todo opcional, se puede combinar):
 *   .welcome --bg=https://imagen-de-fondo.jpg   (fuerza un fondo específico)
 *   .welcome --texto1="Bienvenido crack" --texto2="Pasa y disfruta"
 *   .welcome --colorTexto1=#ff0000 --colorBorde=#00ff00
 *   .welcome --tamTexto1=60 --tamTexto2=28
 *   .welcome --x1=500 --y1=350 --x2=500 --y2=420
 *   .welcome --tamPerfil=220 --xPerfil=500 --yPerfil=200
 *   .welcome --grosorBorde=10 --ancho=1000 --alto=500
 *
 * Ejemplo completo:
 *   .welcome @usuario --texto1="Hola Carlos" --texto2="Bienvenido al grupo" --colorBorde=#ff00ff
 * ------------------------------------------------------
 */

import fetch from 'node-fetch'

const API_BASE = 'https://yosoyyo-api-ofc.onrender.com/api/image/welcome-banner'
const API_KEY = 'Andresv27728' // key gratuita, cámbiala si tienes una propia

// Fondos por defecto: si el usuario no pasa --bg=, se elige uno al azar de esta lista.
// Puedes agregar/quitar URLs aquí cuando quieras.
const DEFAULT_BACKGROUNDS = [
  'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/f1daa4-1770608515673.jpg',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&h=500&q=80'
]

const getRandomBackground = () =>
  DEFAULT_BACKGROUNDS[Math.floor(Math.random() * DEFAULT_BACKGROUNDS.length)]

const escapeXml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/**
 * Parsea argumentos estilo --clave=valor del texto del comando.
 * Soporta valores con espacios si van entre comillas: --texto1="hola mundo"
 */
function parseArgs(text) {
  const args = {}
  const regex = /--(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const key = match[1]
    const value = match[2] ?? match[3] ?? match[4]
    args[key] = value
  }
  return args
}

let handler = async (m, { conn, text }) => {
  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    // 1. Determinar de quién es la foto de perfil:
    //    si mencionan a alguien (@usuario) o responden un mensaje, se usa esa persona,
    //    si no, se usa la del que envía el comando.
    const mentioned = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null
    const quoted = m.quoted ? m.quoted.sender : null
    const targetJid = mentioned || quoted || m.sender

    const targetNumber = targetJid.split('@')[0]
    const targetName = escapeXml(conn.getName(targetJid) || targetNumber)

    // 2. Obtener la foto de perfil real de WhatsApp
    let profileUrl
    try {
      profileUrl = await conn.profilePictureUrl(targetJid, 'image')
    } catch (e) {
      // Si el usuario no tiene foto de perfil o es privada, se usa una por defecto
      profileUrl = 'https://i.imgur.com/0mYNUYR.png'
    }

    // 3. Parsear los parámetros opcionales que el usuario escribió
    const opts = parseArgs(text || '')

    // 4. Armar los parámetros finales, con valores por defecto sensatos
    const params = {
      width: opts.ancho || 1000,
      height: opts.alto || 500,
      backgroundUrl: opts.bg || getRandomBackground(),
      profileUrl: profileUrl,
      profileSize: opts.tamPerfil || 200,
      profileX: opts.xPerfil || 500,
      profileY: opts.yPerfil || 200,
      borderColor: opts.colorBorde || '#00ffff',
      borderWidth: opts.grosorBorde || 8,
      text1: opts.texto1 || `Bienvenido ${targetName}`,
      text1Size: opts.tamTexto1 || 50,
      text1Color: opts.colorTexto1 || '#ffffff',
      text1X: opts.x1 || 500,
      text1Y: opts.y1 || 350,
      text2: opts.texto2 || 'Disfruta tu estancia',
      text2Size: opts.tamTexto2 || 30,
      text2Color: opts.colorTexto2 || '#ffffff',
      text2X: opts.x2 || 500,
      text2Y: opts.y2 || 420,
      apiKey: opts.apiKey || API_KEY
    }

    // 5. Armar la URL final codificando bien cada parámetro
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString()

    const finalUrl = `${API_BASE}?${query}`

    // 6. Descargar la imagen generada por la API
    const response = await fetch(finalUrl)
    if (!response.ok) throw new Error(`La API respondió con estado ${response.status}`)
    const imageBuffer = Buffer.from(await response.arrayBuffer())

    const groupMetadata = m.isGroup ? await conn.groupMetadata(m.chat) : {}
    const groupName = groupMetadata.subject || 'el Grupo'
    const groupSize = groupMetadata.participants ? groupMetadata.participants.length : 'N/A'
    const desc = groupMetadata.desc?.toString() || 'Sin descripción'
    const chat = global.db?.data?.chats?.[m.chat]
    const mensaje = (chat?.sWelcome || 'Edita con el comando "setwelcome"').replace(/{usuario}/g, `@${targetNumber}`).replace(/{grupo}/g, `*${groupName}*`).replace(/{desc}/g, `${desc}`)
    const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })

    // 7. Enviar el banner al chat
    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption: `❀ Bienvenido a *"_${groupName}_"*\n✰ _Usuario_ » @${targetNumber}\n● ${mensaje}\n◆ _Ahora somos ${groupSize} Miembros._\nꕥ Fecha » ${fecha}\n૮꒰ ˶• ᴗ •˶꒱a Disfruta tu estadía en el grupo!\n> *➮ Puedes usar _#help_ para ver la lista de comandos.*`,
      mentions: [targetJid]
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (error) {
    console.error('[welcome-banner] Error:', error)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await conn.sendMessage(m.chat, {
      text: `❌ Ocurrió un error generando el banner de bienvenida.\n\n${error?.message || error}`
    }, { quoted: m })
  }
}

handler.help = ['welcome', 'welcome @usuario']
handler.tags = ['group']
handler.command = ['welcome', 'bienvenida', 'banner']

export default handler
