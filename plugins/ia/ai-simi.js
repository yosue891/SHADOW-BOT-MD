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
  // (getName puede ser sync o async según la versión: se soportan ambos)
  const resolverNombre = async (jid) => {
    const num = String(jid).split('@')[0]
    try {
      const n = await conn.getName(jid)
      return (typeof n === 'string' && n.trim()) ? n : num
    } catch { return num }
  }
  let detalleMencionados = ''
  if (mencionadosEntrada.length > 0 || citado) {
    const piezas = []
    for (const jid of mencionadosEntrada) {
      const num = String(jid).split('@')[0].replace(/\D/g, '')
      const nombre = await resolverNombre(jid)
      piezas.push(`${nombre} (@${num})`)
    }
    if (citado) {
      const num = String(citado).split('@')[0].replace(/\D/g, '')
      const nombre = await resolverNombre(citado)
      piezas.push(`citado: ${nombre} (@${num})`)
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

  // ── 1) Conexión con la API (primaria + respaldo) ───────────────────────
  let respuesta
  let ultimoErrorApi = null
  // Primaria: gohan/gemini (la original)
  try {
    // La API es GET: si el texto es muy largo la URL falla, se recorta
    const textoRecortado = String(text).slice(0, 500)
    const prompt = encodeURIComponent(basePrompt + "\nUsuario: " + textoRecortado + "\nSimi:")
    const url = `https://api-gohan-v1.onrender.com/ai/gemini?text=${prompt}`

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 25000
    })

    respuesta = data?.result?.text
    if (!respuesta || typeof respuesta !== 'string' || !respuesta.trim()) {
      throw new Error('API sin texto (' + JSON.stringify(data).slice(0, 120) + ')')
    }
    respuesta = `${extraPrefix}${respuesta.trim()}`
  } catch (e) {
    ultimoErrorApi = e
    console.error('[simi] API primaria falló:', e.message, e.response?.status || '', JSON.stringify(e.response?.data || {}).slice(0, 200), '→ probando respaldo')
  }

  // Respaldo: pollinations (sin<System> porque con system da 500; va en el texto)
  if (!respuesta) {
    try {
      const textoRecortado = String(text).slice(0, 400)
      const prompt2 = `Responde como Simi, IA sarcástica y directa${esOwner ? ', hablando con tu creador Yosue al que respetas' : ''}: ${textoRecortado}`
      const url2 = `https://text.pollinations.ai/${encodeURIComponent(prompt2)}?model=openai`
      const r2 = await axios.get(url2, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 25000, responseType: 'text' })
      const t2 = typeof r2.data === 'string' ? r2.data.trim() : String(r2.data || '').trim()
      if (!t2) throw new Error('respaldo sin texto')
      respuesta = `${extraPrefix}${t2}`
      console.log('[simi] respaldo pollinations OK')
    } catch (e2) {
      console.error('[simi] respaldo falló:', e2.message)
      const detalle = ultimoErrorApi ? ultimoErrorApi.message : e2.message
      await conn.reply(m.chat, `*[ 🤖 ] Error al conectar con Simi.*\n> ${detalle}*`, m)
      return
    }
  }

  // ── 2) Envío con menciones validadas (si el envío con mentions falla,
  // se reintenta sin mentions para no dejar al usuario sin respuesta) ─────
  const conocidos = [...mencionadosEntrada]
  if (citado) conocidos.push(citado)
  conocidos.push(m.sender)
  const numeros = extraerNumeros(respuesta)
  const mentions = numeros.map((n) => jidPorNumero(n, conocidos))

  try {
    await conn.sendMessage(m.chat, { text: respuesta, mentions }, { quoted: m })
  } catch (e) {
    console.error('[simi] sendMessage con mentions falló:', e.message, '→ reintento sin mentions')
    try {
      await conn.sendMessage(m.chat, { text: respuesta }, { quoted: m })
    } catch (e2) {
      console.error('[simi] sendMessage sin mentions falló:', e2.message, '→ reply final')
      await conn.reply(m.chat, respuesta, m)
    }
  }
}

handler.help = ['simi']
handler.tags = ['ia']
handler.register = true
handler.command = ['simi']

export default handler
