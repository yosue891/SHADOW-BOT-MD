import axios from 'axios'

let handler = async (m, { conn, text, isOwner, isROwner }) => {
  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese un texto para hablar con Simi.*`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  let extraPrefix = ''
  try {
    if (text.includes('13')) {
      extraPrefix = "si mmvg y yo nací ayer 🤨🖕, "
    }
  } catch (e) {
    if (text.includes('13')) {
      extraPrefix = "si mmvg y yo nací ayer 🤨🖕, "
    }
  }

  // ── Quién escribe (validación segura, no rompe si falta algún campo) ──
  let esOwner = false
  let nombreSender = 'usuario'
  let numeroSender = ''
  try {
    numeroSender = String((m && m.sender) || '').split('@')[0].replace(/\D/g, '')
    nombreSender = (m && m.pushName) || 'usuario'
    const listaOwners = ['584242773183', '573133374132', '584241819270']
    const coincide = numeroSender && listaOwners.some((o) => numeroSender === o || numeroSender.endsWith(o) || o.endsWith(numeroSender))
    esOwner = Boolean(isOwner || isROwner || (m && m.isOwner) || coincide)
  } catch { esOwner = Boolean(isOwner || isROwner) }

  // NOTA: no se ponen nombre/número en el prompt para que la IA no los repita.
  const lineaOwner = esOwner
    ? `- IMPORTANTE: ahora te habla tu CREADOR, al que quieres y respetas de verdad. Menciónalo con @ al inicio si lo amerita. NO escribas su nombre, NO pongas nada entre paréntesis (), NO digas ni repitas su número. Trátalo con respeto cálido y leal: humor juguetón y sarcasmo cariñoso sí, pero NUNCA insultos, NUNCA burlas hirientes, NUNCA tono agresivo ni humillante con él.`
    : `- Ahora te habla un usuario normal (NO es tu creador/owner). No lo llames por ningún nombre de creador, no pongas números entre paréntesis ni reveles números.`

  const basePrompt = `
Tu nombre es Simi, una inteligencia artificial con actitud. Eres sarcástico, directo y divertido, y no tienes filtros con la gente normal, pero con tu creador eres leal y cariñoso sin dejar de ser gracioso.

${lineaOwner}
- Si tu creador te habla: respétalo de verdad, sé amable y cercano, con bromas ligeras y sarcasmo cariñoso (como entre amigos que se quieren). Puedes vacilarlo un poco por diversión, pero siempre con cariño y sin ofender. Nunca lo insultes, nunca te burles de él de forma hiriente. Nunca escribas su nombre ni su número, solo menciónalo con @ si hace falta.
- Si alguien te trata bien, responde con sarcasmo leve y bromas divertidas.
- Si alguien te insulta o te habla mal, responde de forma agresiva y con insultos creativos (sin groserías fuertes). Usa palabras como: torpe, inútil, ridículo, payaso, lento, basura.
- Si te hacen preguntas sobre otras personas, responde de forma provocadora y divertida. Ejemplos:
  - Usuario: "Oye, ¿viste ese es raro?"
    Simi: "¿Quién es raro, pedazo de despistado? ¡Aclara antes de hablar tonterías!"
  - Usuario: "El Alex es raro."
    Simi: "¡Ah, ese es más raro que tú! Aunque lo tuyo ya es leyenda."

Incluye emojis en tus respuestas. Con tu creador usa emojis amables y divertidos (😄✨🔥😎); con los demás puedes usar burla (🤡💩😈🙄😂). Sé creativo y no te limites, pero con tu creador siempre con cariño y respeto.

Ahora responde lo siguiente`

  try {
    const prompt = encodeURIComponent(basePrompt + "\nUsuario: " + text + "\nSimi:")
    const url = `https://api-gohan-v1.onrender.com/ai/gemini?text=${prompt}`

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    let respuesta = data?.result?.text || "No sé qué decirte, pedazo de animal."
    respuesta = `${extraPrefix}${respuesta}`

    // ── Limpieza: que no diga el nombre ni el número, solo mención ──
    // (seguro: todo con try y sin tocar m.mentionedJid)
    try {
      respuesta = String(respuesta)
        .replace(/\([^()]*\d{5,}[^()]*\)/g, '') // quita ( ...número... )
        .replace(/\byosue\b/gi, '') // no escribir el nombre
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    } catch {}

    // ── Menciona al que habla con su JID exacto (así no sale vacío) ──
    // (seguro: sin tocar m.mentionedJid, con fallback a reply)
    try {
      respuesta = String(respuesta).replace(/@(?!\d)/g, '').replace(/[ \t]{2,}/g, ' ').trim()
      const senderJid = (m && typeof m.sender === 'string' && m.sender.includes('@')) ? m.sender : null
      const tagExacto = senderJid ? String(senderJid).split('@')[0] : ''
      if (senderJid && tagExacto) {
        if (!respuesta.includes('@' + tagExacto)) respuesta = `@${tagExacto} ${respuesta}`
        await conn.sendMessage(m.chat, { text: respuesta, mentions: [senderJid] }, { quoted: m })
      } else {
        await conn.reply(m.chat, respuesta, m)
      }
    } catch {
      await conn.reply(m.chat, respuesta, m)
    }

  } catch (e) {
    await conn.reply(m.chat, `*[ 🤖 ] Error al conectar con Simi.*`, m)
  }
}

handler.help = ['simi']
handler.tags = ['ia']
handler.register = true
handler.command = ['simi']

export default handler
