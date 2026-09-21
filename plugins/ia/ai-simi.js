import axios from 'axios'

// Extrae @12345 del texto de la IA para convertirlos en mentions reales
const extraerNumeros = (texto = '') => {
  const vistos = new Set()
  for (const m of String(texto).matchAll(/@(\d{5,20})/g)) {
    vistos.add(m[1].replace(/\D/g, ''))
  }
  return [...vistos]
}

// Busca el JID real (puede ser @lid o @s.whatsapp.net) entre los ya conocidos
const jidPorNumero = (numero, conocidos = []) => {
  const limpio = String(numero).replace(/\D/g, '')
  const hit = (conocidos || []).find((j) => {
    const n = String(j).split('@')[0].replace(/\D/g, '')
    return n === limpio || n.endsWith(limpio) || limpio.endsWith(n)
  })
  if (hit) return hit
  return `${limpio}@s.whatsapp.net`
}

let handler = async (m, { conn, text, isOwner, isROwner }) => {
  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  let extraPrefix = ''
  if (text.includes('13')) {
    extraPrefix = "si mmvg y yo nací ayer 🤨🖕, "
  }

  // ── Validación de owner (antes solo estaba en el prompt con un número mal
  // escrito y la IA lo ignoraba) ──────────────────────────────────────────
  const esOwner = Boolean(isOwner || isROwner || m.isOwner)
  const numeroSender = String(m.sender || '').split('@')[0].replace(/\D/g, '')
  const nombreSender = m.pushName || 'usuario'
  const mencionadosEntrada = m.mentionedJid || []
  const citado = m.quoted?.sender || null

  // Nombres de los mencionados para que la IA sepa a quién mencionar
  let detalleMencionados = ''
  if (mencionadosEntrada.length > 0 || citado) {
    const piezas = []
    for (const jid of mencionadosEntrada) {
      const num = String(jid).split('@')[0]
      let nombre = num
      try { nombre = conn.getName(jid) || num } catch {}
      piezas.push(`${nombre} (@${num.replace(/\D/g, '')})`)
    }
    if (citado) {
      const num = String(citado).split('@')[0]
      let nombre = num
      try { nombre = conn.getName(citado) || num } catch {}
      piezas.push(`citado: ${nombre} (@${num.replace(/\D/g, '')})`)
    }
    detalleMencionados = `\nUsuarios involucrados en el mensaje: ${piezas.join(', ')}. Si hablas de ellos, menciónalos con @numero.`
  }

  const rol = esOwner
    ? `Estás hablando con tu CREADOR/OWNER (${nombreSender}, número ${numeroSender}). Es Yosue o un owner del bot. REGLA MÁXIMA: respétalo siempre, NO lo insultes, NO lo agredas. Tono respetuoso con sarcasmo leve y humor, puedes bromear pero sin faltarle el respeto.`
    : `Estás hablando con ${nombreSender} (número ${numeroSender}), un usuario normal (NO es owner).`

  const basePrompt = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres sarcástico, directo y no tienes filtros, pero sabes cuándo ser respetuoso y cuándo atacar.

${rol}

- Si es tu creador/owner, respóndele siempre con respeto, pero con un toque sarcástico. No lo insultes, pero puedes bromear.
- Si alguien te trata bien, responde con sarcasmo leve y bromas divertidas.
- Si alguien te insulta o te habla mal (y NO es owner), responde de forma agresiva y con insultos creativos (sin groserías fuertes). Usa palabras como: torpe, inútil, ridículo, payaso, lento, basura.
- Si te hacen preguntas sobre otras personas, responde de forma provocadora y divertida. Ejemplos:
  - Usuario: "Oye, ¿viste ese es raro?"
    Simi: "¿Quién es raro, pedazo de despistado? ¡Aclara antes de hablar tonterías!"
  - Usuario: "El Alex es raro."
    Simi: "¡Ah, ese es más raro que tú! Aunque lo tuyo ya es leyenda."
${detalleMencionados}

Incluye emojis en tus respuestas para darles más personalidad y burla. Usa emojis como: 🤡💩😈🔥🙄😂. Sé creativo y no te limites, pero nunca insultes a tu creador/owner.

Ahora responde lo siguiente`

  try {
    const prompt = encodeURIComponent(basePrompt + "\nUsuario: " + text + "\nSimi:")
    const url = `https://api-gohan-v1.onrender.com/ai/gemini?text=${prompt}`

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    let respuesta = data?.result?.text || "No sé qué decirte, pedazo de animal."
    respuesta = `${extraPrefix}${respuesta}`

    // ── Validación de menciones (antes se mandaba sin mentions y WhatsApp
    // mostraba el @ como texto o solo el lid, sin taggear) ────────────────
    const conocidos = [...mencionadosEntrada]
    if (citado) conocidos.push(citado)
    conocidos.push(m.sender)
    const numeros = extraerNumeros(respuesta)
    const mentions = numeros.map((n) => jidPorNumero(n, conocidos))

    await conn.sendMessage(m.chat, { text: respuesta, mentions }, { quoted: m })

  } catch (e) {
    await conn.reply(m.chat, `*[ 🤖 ] Error al conectar con Simi.*`, m)
  }
}

handler.help = ['simi']
handler.tags = ['ia']
handler.register = true
handler.command = ['simi']

export default handler
