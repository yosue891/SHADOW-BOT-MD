/**
 * SHADOW-BOT-MD — Validador central de menciones para comandos de GIFs/anime
 * ─────────────────────────────────────────────────────────────────
 * Problema que corrige:
 *  - `m.mentionedJid` podía ser Promise (getter viejo), Array o undefined.
 *    Hacer `m.mentionedJid[0]` sin validar daba `undefined`.
 *  - Con privacy LID de WhatsApp la mención llega como `xxx@lid`.
 *    `conn.getName('xxx@lid')` devuelve "" y el caption caía a
 *    `${name || who}` mostrando el LID crudo o "undefined".
 *  - `m.quoted.sender` también puede ser @lid.
 *
 * Uso:
 *   import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'
 *   let handler = async (m, { conn, participants, groupMetadata, text, args }) => {
 *     const { who, via } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args })
 *     const name = await nombreSeguro(conn, who)
 *     const name2 = await nombreSeguro(conn, m.sender)
 *     ...
 *   }
 */

export const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '')

export function normalizeJid(jid, conn = null) {
  if (!jid) return ''
  if (typeof jid === 'object') {
    jid = jid?.lid || jid?.jid || jid?.id || jid?.phoneNumber || ''
  }
  if (typeof jid !== 'string') jid = String(jid || '')
  try {
    if (conn?.decodeJid) jid = conn.decodeJid(jid) || jid
  } catch {}
  return String(jid || '').trim().replace(/:\d+@/, '@').toLowerCase()
}

const participantNums = (p) => {
  if (!p || typeof p !== 'object') return []
  return [p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.pn, p?.phone]
    .filter(Boolean)
    .map((x) => onlyDigits(String(x).split('@')[0]))
    .filter(Boolean)
}

/**
 * Resuelve un @lid a su JID real (@s.whatsapp.net) usando la lista de
 * participantes del grupo. Si no hay mapeo, devuelve el JID normalizado
 * original (se conserva el @lid para que el tag siga funcionando).
 */
export function resolveToRealJid(jid, conn = null, participants = [], groupMetadata = null) {
  jid = normalizeJid(jid, conn)
  if (!jid || jid.includes('@g.us') || jid.includes('@newsletter')) return jid
  const list = Array.isArray(participants) && participants.length
    ? participants
    : (Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : [])
  if (!Array.isArray(list) || !list.length) return jid

  const targetDigits = onlyDigits(jid.split('@')[0])
  if (!targetDigits) return jid

  for (const p of list) {
    const nums = participantNums(p)
    if (!nums.includes(targetDigits)) continue
    // Preferir un JID real (no @lid)
    const candidatos = [p?.phoneNumber, p?.jid, p?.id, p?.pn, p?.phone]
    for (const c of candidatos) {
      if (!c) continue
      const norm = normalizeJid(c, conn)
      if (norm && !norm.endsWith('@lid') && norm.endsWith('@s.whatsapp.net')) return norm
    }
    // Si el participante solo tiene @lid, al menos devolvemos su lid normalizado
    if (p?.lid) {
      const lidNorm = normalizeJid(p.lid, conn)
      if (lidNorm) return lidNorm
    }
  }
  return jid
}

function collectFromObject(obj, out = [], depth = 0) {
  if (!obj || depth > 6) return out
  if (Array.isArray(obj)) {
    for (const v of obj) collectFromObject(v, out, depth + 1)
    return out
  }
  if (typeof obj !== 'object') return out
  if (Array.isArray(obj.mentionedJid)) {
    for (const j of obj.mentionedJid) if (j) out.push(j)
  }
  if (obj.contextInfo && typeof obj.contextInfo === 'object') {
    collectFromObject(obj.contextInfo, out, depth + 1)
  }
  for (const k of ['message', 'msg', 'quotedMessage', 'ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'extendedTextMessage', 'conversation']) {
    if (obj[k]) collectFromObject(obj[k], out, depth + 1)
  }
  return out
}

/** Extrae menciones crudas soportando Promise, Array, string u objeto. */
export async function getRawMentions(m) {
  let raw = []
  try {
    let mj = m?.mentionedJid
    if (mj && typeof mj.then === 'function') mj = await mj
    if (Array.isArray(mj) && mj.length) raw.push(...mj)
    else if (typeof mj === 'string' && mj) raw.push(mj)
  } catch {}
  if (!raw.length) {
    try {
      const direct = m?.msg?.contextInfo?.mentionedJid
      if (Array.isArray(direct) && direct.length) raw.push(...direct)
    } catch {}
  }
  if (!raw.length) {
    try {
      const found = collectFromObject(m?.message || {})
      if (found.length) raw.push(...found)
    } catch {}
  }
  if (!raw.length) {
    try {
      const found2 = collectFromObject(m?.msg || {})
      if (found2.length) raw.push(...found2)
    } catch {}
  }
  // Normalizar a strings y deduplicar
  const limpios = []
  for (const j of raw) {
    const s = typeof j === 'object' ? (j?.lid || j?.jid || j?.id || '') : String(j || '')
    if (s && typeof s === 'string' && s.includes('@')) limpios.push(s)
  }
  return [...new Set(limpios)]
}

/**
 * Resuelve a quién va dirigido el comando.
 * Orden: mención → citado → número en texto/args → remitente.
 * Nunca devuelve undefined: como mínimo devuelve m.sender normalizado.
 * @returns {Promise<{who:string, via:'mention'|'quoted'|'text'|'self', hasMention:boolean}>}
 */
export async function resolverObjetivo(m, { conn = null, participants = [], groupMetadata = null, text = '', args = [] } = {}) {
  const senderNorm = normalizeJid(m?.sender, conn) || 'unknown@s.whatsapp.net'

  // 1) Mención
  try {
    const raw = await getRawMentions(m)
    if (raw.length) {
      const who = resolveToRealJid(raw[0], conn, participants, groupMetadata)
      if (who && !who.includes('@g.us')) return { who, via: 'mention', hasMention: true }
    }
  } catch {}

  // 2) Mensaje citado
  try {
    const q = m?.quoted
    const qcand = q?.sender || q?.participant || q?.key?.participant || q?.key?.remoteJid
    if (qcand && !String(qcand).endsWith('@g.us')) {
      const who = resolveToRealJid(qcand, conn, participants, groupMetadata)
      if (who && !who.includes('@g.us')) return { who, via: 'quoted', hasMention: false }
    }
  } catch {}
  // Fallback: participant crudo del contextInfo citado
  try {
    const qp = m?.msg?.contextInfo?.participant
    if (qp && !String(qp).endsWith('@g.us')) {
      const who = resolveToRealJid(qp, conn, participants, groupMetadata)
      if (who && !who.includes('@g.us')) return { who, via: 'quoted', hasMention: false }
    }
  } catch {}

  // 3) Número escrito en texto/args (@123, 123456789, etc.)
  try {
    const list = Array.isArray(participants) && participants.length
      ? participants
      : (Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : [])
    const candidatos = []
    if (Array.isArray(args) && args.length) candidatos.push(...args)
    if (text) candidatos.push(...String(text).split(/\s+/))
    // También buscar @digits dentro del texto del mensaje
    const cuerpo = String(m?.text || m?.body || text || '')
    const arrobas = cuerpo.match(/@(\d{5,20})/g) || []
    for (const a of arrobas) candidatos.push(a.slice(1))
    for (const c of candidatos) {
      const digits = onlyDigits(c)
      if (digits.length < 7 || digits.length > 16) continue
      if (Array.isArray(list) && list.length) {
        const found = list.find((p) => participantNums(p).some((n) => n === digits || n.endsWith(digits) || digits.endsWith(n)))
        if (found) {
          const real = found.phoneNumber || found.jid || found.id
          if (real) {
            const norm = resolveToRealJid(real, conn, list, null)
            if (norm && !norm.includes('@g.us')) return { who: norm, via: 'text', hasMention: true }
          }
        }
      }
      // Sin mapeo: asumir número de teléfono (solo si el JID original no era @lid)
      return { who: `${digits}@s.whatsapp.net`, via: 'text', hasMention: true }
    }
  } catch {}

  // 4) Uno mismo
  const selfWho = resolveToRealJid(senderNorm, conn, participants, groupMetadata) || senderNorm
  return { who: selfWho, via: 'self', hasMention: false }
}

/**
 * Devuelve el JID con el que el grupo identifica al usuario, en el formato
 * que el grupo usa para direccionar a sus participantes
 * (groupMetadata.addressingMode: 'lid' → @lid, 'pn' → @s.whatsapp.net).
 *
 * Ese es el JID que debe ir en contextInfo.mentionedJid Y en el texto
 * (token @userpart) para que el cliente pinte el tag con el nombre del
 * usuario en vez de mostrar el LID crudo.
 */
export function jidParaTag(jid, conn = null, participants = [], groupMetadata = null) {
  const norm = normalizeJid(jid, conn)
  if (!norm || norm.includes('@g.us') || norm.includes('@newsletter')) return norm
  const list = Array.isArray(participants) && participants.length
    ? participants
    : (Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : [])
  if (!Array.isArray(list) || !list.length) return norm

  const targetDigits = onlyDigits(norm.split('@')[0])
  if (!targetDigits) return norm

  for (const p of list) {
    const candidatos = [p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.pn, p?.phone]
      .filter(Boolean)
      .map((x) => normalizeJid(x, conn))
    if (!candidatos.some((c) => onlyDigits(c.split('@')[0]) === targetDigits)) continue

    // JID "preferred" del participante en este grupo (Contact.id)
    const preferido = normalizeJid(p?.id ?? p?.jid, conn)
    if (preferido && preferido.includes('@')) return preferido

    // Fallback: según el addressingMode del grupo
    const modo = String(groupMetadata?.addressingMode || '').toLowerCase()
    const lid = normalizeJid(p?.lid, conn)
    const pn = normalizeJid(p?.phoneNumber ?? p?.pn ?? p?.phone, conn)
    if (modo === 'lid') return lid || pn || norm
    return pn || lid || norm
  }
  return norm
}

/**
 * Nombre seguro para mostrar en captions. Nunca devuelve undefined,
 * ni "" vacío, ni el JID crudo con @. Como mínimo devuelve +digits o "Usuario".
 */
export async function nombreSeguro(conn, jid) {
  const norm = normalizeJid(jid, conn)
  const digits = onlyDigits(norm.split('@')[0])
  const fallback = digits && digits.length >= 5 ? `+${digits}` : 'Usuario'
  if (!norm || norm.includes('@g.us')) return fallback
  try {
    const dbName = global?.db?.data?.users?.[norm]?.name || global?.db?.data?.users?.[jid]?.name
    if (typeof dbName === 'string' && dbName.trim() && dbName.trim().toLowerCase() !== 'undefined') {
      return dbName.trim()
    }
  } catch {}
  try {
    let n = conn?.getName ? conn.getName(norm) : ''
    if (n && typeof n.then === 'function') n = await n
    if (typeof n === 'string') {
      n = n.trim()
      if (n && n.toLowerCase() !== 'undefined' && !n.includes('@lid') && !n.includes('@s.whatsapp.net')) return n
    }
  } catch {}
  // Último intento con el JID sin normalizar (por si el caché usa otra forma)
  try {
    if (jid && String(jid) !== norm) {
      let n2 = conn?.getName ? conn.getName(jid) : ''
      if (n2 && typeof n2.then === 'function') n2 = await n2
      if (typeof n2 === 'string') {
        n2 = n2.trim()
        if (n2 && n2.toLowerCase() !== 'undefined' && !n2.includes('@lid') && !n2.includes('@s.whatsapp.net')) return n2
      }
    }
  } catch {}
  return fallback
}

export default { onlyDigits, normalizeJid, resolveToRealJid, getRawMentions, resolverObjetivo, nombreSeguro, jidParaTag }
