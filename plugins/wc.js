/**
 * PLUGIN: Welcome Banner
 * ------------------------------------------------------
 * Genera un banner de bienvenida usando la API de yosoyyo-api-ofc
 * y obtiene automáticamente la foto de perfil de WhatsApp del usuario.
 *
 * Uso básico:
 *   .welcome2
 *   .welcome2 @usuario
 *
 * Personalización (todo opcional, se puede combinar):
 *   .welcome2 --bg=https://imagen-de-fondo.jpg
 *   .welcome2 --texto1="Bienvenido crack" --texto2="Pasa y disfruta"
 *   .welcome2 --colorTexto1=#ff0000 --colorBorde=#00ff00
 *   .welcome2 --tamTexto1=60 --tamTexto2=28
 *   .welcome2 --x1=500 --y1=350 --x2=500 --y2=420
 *   .welcome2 --tamPerfil=220 --xPerfil=500 --yPerfil=200
 *   .welcome2 --grosorBorde=10 --ancho=1000 --alto=500
 *
 * Ejemplo completo:
 *   .welcome @usuario --texto1="Hola Carlos" --texto2="Bienvenido al grupo" --colorBorde=#ff00ff
 * ------------------------------------------------------
 */

const axios = require('axios')

const API_BASE = 'https://yosoyyo-api-ofc.onrender.com/api/image/welcome-banner'
const API_KEY = 'Andresv27728' // key gratuita, cámbiala si tienes una propia

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

module.exports = {
  command: ['welcome2', 'bienvenida2', 'banner2'],
  description: 'Genera un banner de bienvenida personalizado con la foto de perfil del usuario',
  category: 'group',

  /**
   * @param {object} ctx
   * @param {object} ctx.sock        - instancia de Baileys (makeWASocket)
   * @param {object} ctx.msg         - mensaje completo recibido
   * @param {string} ctx.from        - JID del chat
   * @param {string} ctx.text        - texto del comando (todo lo que sigue después del comando)
   * @param {string[]} ctx.args      - args separados por espacio (sin parsear)
   * @param {string[]} ctx.mentions  - JIDs mencionados en el mensaje (@usuario)
   * @param {string} ctx.sender      - JID de quien envía el mensaje
   */
  async run({ sock, msg, from, text, mentions, sender }) {
    try {
      // 1. Determinar de quién es la foto de perfil:
      //    si mencionan a alguien (@usuario) se usa esa persona,
      //    si no, se usa la del que envía el comando.
      const targetJid = (mentions && mentions.length > 0) ? mentions[0] : sender

      // 2. Obtener nombre para mostrar (push name o número)
      const targetNumber = targetJid.split('@')[0]
      let targetName = targetNumber
      try {
        // Si tienes guardado el pushName en algún store, úsalo aquí.
        // Por defecto se usa el número.
        targetName = msg.pushName || targetNumber
      } catch (e) {}

      // 3. Obtener la foto de perfil real de WhatsApp
      let profileUrl
      try {
        profileUrl = await sock.profilePictureUrl(targetJid, 'image')
      } catch (e) {
        // Si el usuario no tiene foto de perfil o es privada, se usa una por defecto
        profileUrl = 'https://i.imgur.com/0mYNUYR.png'
      }

      // 4. Parsear los parámetros opcionales que el usuario escribió
      const opts = parseArgs(text || '')

      // 5. Armar los parámetros finales, con valores por defecto sensatos
      const params = {
        width: opts.ancho || 1000,
        height: opts.alto || 500,
        backgroundUrl: opts.bg || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&h=500&q=80',
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

      // 6. Armar la URL final codificando bien cada parámetro
      const query = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString()

      const finalUrl = `${API_BASE}?${query}`

      // 7. Descargar la imagen generada por la API
      const response = await axios.get(finalUrl, { responseType: 'arraybuffer' })
      const imageBuffer = Buffer.from(response.data)

      // 8. Enviar el banner al chat
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: `👋 ¡Bienvenido/a @${targetNumber}!`,
        mentions: [targetJid]
      }, { quoted: msg })

    } catch (error) {
      console.error('[welcome-banner] Error:', error.message)
      await sock.sendMessage(from, {
        text: '❌ Ocurrió un error generando el banner de bienvenida. Intenta de nuevo o revisa la URL/foto de perfil.'
      }, { quoted: msg })
    }
  }
}
