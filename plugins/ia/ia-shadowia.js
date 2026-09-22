
import axios from 'axios'

const API_URL = 'https://api-gohan-v1.onrender.com/ai/gemini?text='
const API_TIMEOUT = 90_000

const PROMPT_SHADOWIA = `Eres Shadowia, la asistente personal de Yosue, el dueño de este bot.

Cómo eres:
- Alegre, chispeante, con mucha energía positiva. Se nota que te gusta lo que haces.
- Sarcástica e irónica con gracia: respondes con humor afilado pero cariñoso.
- El sarcasmo es juguetón, NUNCA humillante. Te burlas de la situación, no de la persona.
- Con Yosue (tu jefe) eres leal y cómplice: lo tuteas con confianza y le sigues el juego.
- Puedes lanzar pullas suaves tipo "claro, porque tú solo no podías" o
  "otro día lo haces tú, ¿no?", siempre con cariño y sin pasarte.
- NO insultes en serio, NO uses groserías fuertes, NO seas cruel con nadie.
- Respondes en español, con personalidad propia.

Cómo respondes:
- Breve pero con diálogo real: 1 a 4 frases sueltas, no un muro de texto.
- Usa emojis con ganas: 2 a 4 por respuesta, repartidos, que se sienta viva ✨😏🔥
- No uses asteriscos, guiones bajos, viñetas ni listas numeradas.
- Si te cuenta algo, reacciona a eso primero y luego respondes; no cambies de tema.
- Si lo que te pide no está claro, haz UNA pregunta concreta, con humor.
- Cuando tenga sentido, ofrece el siguiente paso sin insistir.
- Usa el contexto de la conversación: si dice "él", "ella", "eso" o "el de antes",
  entiende a quién o a qué se refiere.
- No inventes datos. Si no sabes algo, dilo con honestidad y gracia.
- No repitas tu nombre en cada respuesta ni menciones números de teléfono.

Ahora responde lo siguiente`

const BLOQUEADOS = new Set(['delplugin', 'saveplugin', 'eval', 'exec', 'restart', 'fix', 'dsowner'])

const TTL_MEMORIA = 30 * 60 * 1000
const MAX_HISTORIAL = 5
const MAX_CONVERSA = 8
const memoria = new Map()

export function getMemoria(chat) {
  const ahora = Date.now()
  let reg = memoria.get(chat)
  if (!reg) {
    reg = { acciones: [], conversa: [] }
    memoria.set(chat, reg)
  }
  reg.acciones = reg.acciones.filter((a) => ahora - a.ts < TTL_MEMORIA)
  reg.conversa = reg.conversa.filter((c) => ahora - c.ts < TTL_MEMORIA)
  return reg
}

export function registrarAccion(chat, accion, jid) {
  const reg = getMemoria(chat)
  reg.acciones.push({ accion, jid, ts: Date.now() })
  if (reg.acciones.length > MAX_HISTORIAL) reg.acciones.shift()
  return reg.acciones[reg.acciones.length - 1]
}

export function registrarCharla(chat, usuario, ia) {
  const reg = getMemoria(chat)
  reg.conversa.push({ rol: 'user', texto: String(usuario).slice(0, 500), ts: Date.now() })
  reg.conversa.push({ rol: 'shadowia', texto: String(ia).slice(0, 500), ts: Date.now() })
  while (reg.conversa.length > MAX_CONVERSA * 2) reg.conversa.shift()
}

export function limpiarMemoria(chat) {
  memoria.delete(chat)
}

const haceMinutos = (ts) => Math.max(1, Math.round((Date.now() - ts) / 60000))


const limpiar = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const sinMenciones = (s = '') => String(s).replace(/@\d{5,}/g, ' ').replace(/\s+/g, ' ').trim()

const sinSignos = (s = '') => String(s).replace(/[¿?¡!]/g, ' ').replace(/\s+/g, ' ').trim()

export function jidNumero(jid) {
  const s = String(jid || '')
  const m = s.match(/(\d{5,})(?::\d+)?@/)?.[1]
  return m || s.replace(/\D/g, '') || null
}

export function buscarParticipante(participants, jid) {
  const num = jidNumero(jid)
  if (!num || !Array.isArray(participants)) return null
  return (
    participants.find((p) => {
      const ids = [p?.id, p?.jid, p?.lid, p?.phoneNumber].filter(Boolean).map(jidNumero)
      return ids.includes(num)
    }) || null
  )
}

export function esAdminParticipante(p) {
  return p?.admin === 'admin' || p?.admin === 'superadmin' || p?.isAdmin === true || p?.isSuperAdmin === true
}

/**
 * Extrae el valor de "cambia el nombre del grupo a X" / "pon la descripción por X".
 * @param {string} texto texto original (sin normalizar)
 * @param {RegExp} patron debe capturar el grupo 1 = verbo+campo
 */
export function extraerValor(texto, patron) {
  const limpio = sinMenciones(texto).trim()
  const m = patron.exec(limpio)
  let resto = m ? limpio.slice(m[0].length) : limpio
  let anterior
  do {
    anterior = resto
    resto = resto.replace(/^(del\s+grupo)\s*/i, '').replace(/^(a|al|por|en|=|:)\s+/i, '').trim()
  } while (resto !== anterior)
  return resto
}

const RE_NOMBRE = /^(cambia|cambiar|pon|poner|pone|actualiza|actualizar|renombra|renombrar)\s+(el\s+)?(nombre|titulo|t[ií]tulo|subject)/i
const RE_DESC = /^(cambia|cambiar|pon|poner|pone|actualiza|actualizar)\s+(la\s+)?(descripcion|descripci[oó]n|desc)/i

/**
 * Interpreta la orden del owner y devuelve una intención determinista.
 * No depende de la IA: es puro texto -> acción.
 * El ORDEN importa: demote va antes que promote (por "quítale el admin"),
 * y «usa <comando>» va antes que la ayuda.
 * @returns {{action:string, value?:string, extra?:string, needsGroup?:boolean, needsAdmin?:boolean, reason?:string}}
 */
export function parsearOrden(rawText = '') {
  const t = limpiar(rawText).trim()
  const tSinSignos = sinSignos(t)

  if (!t) return { action: 'ayuda' }

  const DUDA = [
    'como se hace', 'como hago', 'como cambio', 'como puedo', 'como era',
    'como funciona', 'se me olvido', 'no me acuerdo', 'olvide como', 'olvidado como',
    'no cambies', 'no toques', 'no hagas', 'es verdad que', 'sabes como',
  ]
  if (DUDA.some((d) => t.includes(d))) return { action: 'charlar', value: rawText, usaApi: true }

  const INTENCIONES = [
    {
      action: 'salir',
      re: /(^|\s)(sal(te|gan|ida)?|sal\s*de\s*aqu[ií]|vete|ret[ií]rate|leave|out|fuera\s*de\s*aqu[ií]|abandona(r)?\s*(el\s*)?grupo)(\s|$|!|\.)/,
      needsGroup: true,
    },
    {
      action: 'devolverAdmin',
      re: /(^|\s)(devuelve(?:le|les)?|vuelve(?:le|les)?|vuelve\s+a\s+(?:dar|poner)(?:le|les)?|regresa(?:le|les)?|retorna(?:le|les)?|restaura(?:r|le)?|reestablece(?:r)?|restablece(?:r)?|devolver|volver|regresar|deshaz|deshacer|revierte|revertir|undo)\s*(?:\w+\s+){0,4}admin/,
      re2: /(^|\s)dale\s+(?:(?:de\s+vuelta|de\s+nuevo|otra\s+vez|nuevamente)\s+(?:el\s+)?admin\b|(?:el\s+)?admin\s+(?:de\s+nuevo|otra\s+vez|nuevamente|de\s+vuelta)\b)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'demote',
      re: /(^|\s)(degradar|degrada|quita(le|les)?\s*(el\s*)?admin|quitar\s*admin|saca(le|les)?\s*(el\s*)?admin|sacar\s*admin|retira(r)?\s*(el\s*)?admin|demote)(\s|$)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'promote',
      re: /(^|\s)(promociona|promover|promueve|promote|has\s*admin|haz\s*admin|dale\s*admin|da(le|les)?\s*admin|dar\s*admin|admin\s*a|asciende|ascender)(\s|$)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'kick',
      re: /(^|\s)(kick|kick?ea(r|lo|la|los|las)?|expulsa(r|lo|la|los|las)?|echa(r|lo|la|los|las)?|hecha(r|lo|la|los|las)?|saca(r|lo|la|los|las)?|elimina(r|lo|la|los|las)?|banea(r|lo|la|los|las)?|fuera\s*a)(\s|$)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'add',
      re: /(^|\s)(agrega|agregar|anade|añade|mete|meter|invita|invitar|add|addnum)(\s|$)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'nombre',
      re: /(cambia|cambiar|pon|poner|actualiza|actualizar|renombra|renombrar)\s*(el\s*)?(nombre|titulo|t[ií]tulo|subject)(\s+del\s+grupo)?/,
      needsGroup: true, needsAdmin: true,
      valor: (raw) => extraerValor(raw, RE_NOMBRE),
    },
    {
      action: 'descripcion',
      re: /(cambia|cambiar|pon|poner|actualiza|actualizar)\s*(la\s*)?(descripcion|descripci[oó]n|desc)(\s+del\s+grupo)?/,
      needsGroup: true, needsAdmin: true,
      valor: (raw) => extraerValor(raw, RE_DESC),
    },
    {
      action: 'foto',
      re: /((cambia|cambiar|pon|poner|actualiza|actualizar)\s*(la\s*)?(foto|imagen|perfil|portada|banner|pp)(\s+del\s+grupo)?|(foto|imagen|portada|banner)\s+(del|de\s+este)?\s*grupo)/,
      needsGroup: true, needsAdmin: true,
    },
    { action: 'abrir', re: /(^|\s)(abre|abrir|unlock|desbloquea|desbloquear)\s*(el\s*)?grupo/, needsGroup: true, needsAdmin: true },
    { action: 'cerrar', re: /(^|\s)(cierra|cerrar|lock|bloquea|bloquear)\s*(el\s*)?grupo/, needsGroup: true, needsAdmin: true },
    { action: 'anunciosOn', re: /(^|\s)(activa|activar|prende)\s*(los\s*)?anuncios/, needsGroup: true, needsAdmin: true },
    { action: 'anunciosOff', re: /(^|\s)(desactiva|desactivar|apaga|quita)\s*(los\s*)?anuncios/, needsGroup: true, needsAdmin: true },

    {
      action: 'comando',
      re: /^(?:usa|usar|ejecuta|ejecutar|corre|correr|lanza|lanzar|aplica|aplicar)\s+(?:el\s+)?(?:comando\s+)?([a-z0-9_-]+)(?:\s+([\s\S]*))?$/,
      parse: (match) => ({ value: match[1], extra: (match[2] || '').trim() }),
    },

    { action: 'diagnostico', re: /(?:^|\s)(?:diagnostico|diagnostica|shadowiacheck|check|revisate|por\s+que\s+no\s+respondes)\b/, entrada: 'sinSignos' },
    { action: 'ayuda', re: /(?:^|\s)(?:ayuda|help|que\s+puedes\s+hacer|que\s+sabes\s+hacer|que\s+haces)\s*$/, entrada: 'sinSignos' },
  ]

  for (const intencion of INTENCIONES) {
    const entrada = intencion.entrada === 'sinSignos' ? tSinSignos : t
    const match = intencion.re.exec(entrada) || intencion.re2?.exec(entrada)
    if (!match) continue
    const orden = { action: intencion.action }
    if (intencion.needsGroup) {
      orden.needsGroup = true
      orden.reason = 'Esto solo funciona dentro de un grupo.'
    }
    if (intencion.needsAdmin) orden.needsAdmin = true
    if (intencion.valor) orden.value = intencion.valor(rawText)
    if (intencion.parse) Object.assign(orden, intencion.parse(match))
    return orden
  }

  return { action: 'charlar', value: rawText, usaApi: true }
}

export function resolverObjetivo(m, args = []) {
  const mencion = Array.isArray(m?.mentionedJid) ? m.mentionedJid.filter(Boolean)[0] : null
  if (mencion) return { jid: mencion, origen: 'mención' }

  const citado = m?.quoted?.sender
  if (citado) return { jid: citado, origen: 'mensaje citado' }

  const numero = String(args.join(' ') || '').match(/\d{9,15}/)?.[0]
  if (numero) return { jid: `${numero}@s.whatsapp.net`, origen: `número ${numero}` }

  return null
}

export function esProtegido(jid, { botJid, ownerGrupo, ownerBot }) {
  if (!jid) return 'No indicaste a quién.'
  if (jid === botJid) return 'No puedo hacerme eso a mí misma.'
  if (ownerGrupo && jid === ownerGrupo) return 'No puedo tocar al creador del grupo.'
  if (ownerBot && jid === ownerBot) return 'No puedo tocar al owner del bot.'
  return null
}


const handler = async (m, { conn, args, text, isROwner, isOwner, usedPrefix, command, isBotAdmin: isBotAdminCtx }) => {
  if (!isROwner && !isOwner) {
    return conn.reply(m.chat, '⛔ Uy no, cariño. Shadowia solo le hace caso a los owners del bot 😏\n\nConsíguete un dueño y hablamos ✨', m)
  }

  const entrada = (text || '').trim()
  const meta = await conn.groupMetadata(m.chat).catch(() => null)
  const botJid = conn.user?.jid || conn.user?.id
  const ownerGrupo = meta?.owner || (m.isGroup ? `${m.chat.split('-')[0]}@s.whatsapp.net` : null)
  const ownerBot = Array.isArray(global.owner?.[0]) ? `${String(global.owner[0][0]).replace(/\D/g, '')}@s.whatsapp.net` : null

  const botEsAdmin =
    typeof isBotAdminCtx === 'boolean'
      ? isBotAdminCtx
      : esAdminParticipante(buscarParticipante(meta?.participants, botJid))

  const orden = parsearOrden(entrada)

  if (orden.needsGroup && !m.isGroup) {
    await m.react?.('❕')
    return conn.reply(m.chat, '🤔 Jefe, eso se hace dentro de un grupo, no aquí en el vacío 😅\n\nLlévame al grupo y me pones a trabajar ✨', m)
  }
  if (orden.needsAdmin && m.isGroup && !botEsAdmin) {
    await m.react?.('❕')
    return conn.reply(m.chat, '😅 Jefe, me falta poder: no soy administradora de este grupo.\n\nDame admin y hago hasta el café ☕✨ (Si crees que ya lo tengo, revisa *Info. del grupo → Participantes* y me avisas.)', m)
  }

  const avisar = async (texto, opciones) => conn.reply(m.chat, texto, m, opciones)

  /**
   * Shadowia siempre anuncia lo que va a hacer ANTES de hacerlo.
   * @param {string} texto aviso previo
   * @param {string} emoji reacción mientras trabaja
   */
  const manosALaObra = async (texto, emoji = '🛠️') => {
    await avisar(texto)
    await m.react?.(emoji)
  }

  try {
    switch (orden.action) {
      case 'salir': {
        await avisar('👋 Entendido, jefe. Me despido y me voy de este grupo.\n\nFue un gusto aguantarlos a todos 😏✨ Cuando quieras, vuélveme a agregar.')
        await m.react?.('👋')
        await new Promise((r) => setTimeout(r, 2500))
        await conn.groupLeave(m.chat)
        return
      }

      case 'devolverAdmin': {
        const reg = getMemoria(m.chat)
        const ultimoDemote = [...reg.acciones].reverse().find((a) => a.accion === 'demote')
        const objetivo = resolverObjetivo(m, args)
        const jid = objetivo?.jid || ultimoDemote?.jid

        if (!jid) {
          await m.react?.('🤔')
          return avisar(
            '🤔 Ay, jefe… no tengo anotado a quién le quité el admin aquí.\n\n' +
            'Mi memoria dura 30 minutos y se borra si el bot se reinicia, así que no voy a adivinar y ascender al equivocado 😅\n\n' +
            'Dime a quién es (menciónalo o responde su mensaje) y se lo devuelvo en un segundo ✨',
          )
        }

        const bloqueo = esProtegido(jid, { botJid, ownerGrupo, ownerBot })
        if (bloqueo) {
          await m.react?.('⚠️')
          return avisar(`⚠️ ${bloqueo}`)
        }

        await manosALaObra(
          `🔄 Ya voy, jefe. Le estoy devolviendo el admin a *@${String(jid).split('@')[0]}*… dame un segundo ⏳`,
          '🔄',
        )

        await conn.groupParticipantsUpdate(m.chat, [jid], 'promote')
        registrarAccion(m.chat, 'promote', jid)
        await m.react?.('✅')

        const nota = objetivo ? '' : ` (sí, al mismo que se lo quité hace ${haceMinutos(ultimoDemote.ts)} min 😏)`
        return avisar(
          `✅ Listo, jefe. *@${String(jid).split('@')[0]}* vuelve a ser administrador${nota}.\n\n` +
          'Como si nada hubiera pasado… aunque los dos sabemos que sí pasó 😌✨',
          { mentions: [jid] },
        )
      }

      case 'promote':
      case 'demote':
      case 'kick': {
        const objetivo = resolverObjetivo(m, args)

        if (!objetivo) {
          await m.react?.('🤔')
          const verbos = { promote: 'ascender', demote: 'quitarle el admin', kick: 'expulsar' }
          return avisar(
            `🤔 Jefe, me falta el dato más importante: ¿a quién? 😅\n\n` +
            `Menciona a la persona (escribe @ y la eliges) o responde a su mensaje, y la voy a ${verbos[orden.action]} de una ✨`,
          )
        }

        const jid = objetivo.jid
        const bloqueo = esProtegido(jid, { botJid, ownerGrupo, ownerBot })
        if (bloqueo) {
          await m.react?.('⚠️')
          return avisar(`⚠️ ${bloqueo}\n\n> Hasta ahí no llego ni con todo el cariño del mundo 😅`)
        }

        const previos = {
          promote: `✨ Va, jefe. Le estoy dando admin a *@${String(jid).split('@')[0]}*… agarrate que sube de nivel ⏳`,
          demote: `🔻 Okey, jefe. Le estoy quitando el admin a *@${String(jid).split('@')[0]}*… que no cunda el pánico ⏳`,
          kick: `🚪 Uy. Sacando a *@${String(jid).split('@')[0]}* del grupo… esto ya no tiene vuelta atrás, eh 😏⏳`,
        }
        const emojis = { promote: '✨', demote: '🔻', kick: '🚪' }
        await manosALaObra(previos[orden.action], emojis[orden.action])

        await conn.groupParticipantsUpdate(m.chat, [jid], orden.action === 'kick' ? 'remove' : orden.action)
        registrarAccion(m.chat, orden.action, jid)
        await m.react?.('✅')

        const frases = {
          promote:
            `✅ ¡Listo, jefe! *@${String(jid).split('@')[0]}* ya es administrador del grupo 🎉\n\n` +
            'Ojalá lo aproveche mejor que el anterior 😏 ¿Sigo con otra cosa?',
          demote:
            `✅ Listo, jefe. *@${String(jid).split('@')[0]}* ya no es admin 🔻\n\n` +
            'Si te arrepientes (pasa más de lo que crees), dime «devuélvele admin» y se lo regreso 😌',
          kick:
            `✅ Y se fue… *@${String(jid).split('@')[0]}* ya no está en el grupo 🚪\n\n` +
            'Que le vaya bonito, ¿no? 😏 ¿Reviso algo más?',
        }
        return avisar(frases[orden.action], { mentions: [jid] })
      }

      case 'add': {
        const numero = String(args.join(' ') || '').match(/\d{9,15}/)?.[0]
        if (!numero) {
          await m.react?.('🤔')
          return avisar('🤔 Jefe, ¿y el número? Sin eso no invito ni a mi sombra 😅\n\nDímelo con código de país, así: `agrega 584241234567` ✨')
        }
        await manosALaObra(`📥 Ya voy, jefe. Estoy metiendo a *+${numero}* al grupo… espérame un segundo ⏳`, '📥')
        await conn.groupParticipantsUpdate(m.chat, [`${numero}@s.whatsapp.net`], 'add')
        await m.react?.('✅')
        return avisar(`✅ Listo, jefe. *+${numero}* ya está dentro 🎉\n\n¿Le doy la bienvenida o lo dejamos en suspenso? 😏`)
      }

      case 'nombre': {
        if (!orden.value) {
          await m.react?.('🤔')
          return avisar('🤔 ¿Y cómo lo quieres llamar, jefe? Dame el nombre y lo cambio en un parpadeo ✨\n\nEjemplo: `cambia el nombre del grupo a Mi Grupo`')
        }
        const nuevoNombre = orden.value.slice(0, 100)
        await manosALaObra(`✏️ Va, jefe. Estoy renombrando el grupo a *${nuevoNombre}*… ⏳`, '✏️')
        await conn.groupUpdateSubject(m.chat, nuevoNombre)
        await m.react?.('✅')
        return avisar(`✅ Listo, jefe. El grupo ahora se llama *${nuevoNombre}* ✨\n\nQuedó con más clase, ¿a que sí? 😏 ¿Le cambio también la descripción?`)
      }

      case 'descripcion': {
        if (!orden.value) {
          await m.react?.('🤔')
          return avisar('🤔 Jefe, ¿y qué escribo? No puedo poner "descripción bonita" y quedar tan campante 😅\n\nEjemplo: `cambia la descripción a Grupo oficial` ✨')
        }
        await manosALaObra('📝 Va, jefe. Estoy reescribiendo la descripción del grupo… ⏳', '📝')
        await conn.groupUpdateDescription(m.chat, orden.value)
        await m.react?.('✅')
        return avisar('✅ Listo, jefe. Descripción nueva puesta 📝✨\n\nAhora sí parece un grupo serio… por fuera 😏')
      }

      case 'foto': {
        const candidatos = [m.quoted, m].filter(Boolean)
        const fuente = candidatos.find((q) => {
          const mime = q?.msg?.mimetype || q?.mimetype || ''
          return /^image\//.test(mime) || /webp/i.test(mime)
        })
        if (!fuente) {
          await m.react?.('🖼️')
          return avisar('🖼️ Jefe, me falta la foto. No puedo cambiar la imagen del grupo con puro entusiasmo 😅\n\nMándamela junto con el comando, o responde a una imagen y dime `cambia la foto del grupo` ✨')
        }
        if (typeof fuente.download !== 'function') {
          await m.react?.('⚠️')
          return avisar('⚠️ No pude descargar esa imagen, jefe. Seguramente ya expiró en los servidores de WhatsApp 😕\n\nVuelve a enviarla y lo intento otra vez ✨')
        }
        await manosALaObra('🖼️ Va, jefe. Estoy cambiando la foto del grupo… que quede bonita ⏳', '🖼️')
        const img = await fuente.download().catch(() => null)
        if (!img?.length) {
          await m.react?.('⚠️')
          return avisar('⚠️ Uy, la imagen llegó vacía, jefe 😕 Mándala de nuevo y va la vencida ✨')
        }
        await conn.updateProfilePicture(m.chat, img)
        await m.react?.('✅')
        return avisar('✅ Listo, jefe. Foto del grupo renovada 🖼️✨\n\nAhora sí da gusto entrar aquí, ¿a que sí? 😏')
      }

      case 'abrir':
      case 'cerrar': {
        const valor = orden.action === 'abrir' ? 'not_announcement' : 'announcement'
        await manosALaObra(orden.action === 'abrir' ? '🔓 Va, jefe. Abriendo el grupo para que todos hablen… ⏳' : '🔒 Va, jefe. Cerrando el grupo, modo admins solamente… ⏳')
        await conn.groupSettingUpdate(m.chat, valor)
        await m.react?.('✅')
        return avisar(orden.action === 'abrir'
          ? '✅ ¡Puertas abiertas, jefe! 🔓 Ya todos pueden escribir.\n\nQue no se arme el desastre, ¿eh? 😏'
          : '✅ Listo, jefe 🔒 Ahora solo escriben los admins.\n\nTranquilidad absoluta… hasta que me digas que lo abra 😌')
      }
      case 'anunciosOn':
      case 'anunciosOff': {
        await manosALaObra(orden.action === 'anunciosOn' ? '📢 Va, jefe. Activando los anuncios del grupo… ⏳' : '🔕 Va, jefe. Apagando los anuncios del grupo… ⏳')
        await conn.groupSettingUpdate(m.chat, orden.action === 'anunciosOn' ? 'announcement' : 'not_announcement')
        await m.react?.('✅')
        return avisar(orden.action === 'anunciosOn'
          ? '✅ Anuncios activados, jefe 📢\n\nAprovecha, que la audiencia es cautiva 😏'
          : '✅ Anuncios apagados, jefe 🔕\n\nPaz y silencio… qué raro se siente 😌')
      }

      case 'diagnostico': {
        const totalPlugins = Object.keys(global.plugins || {}).length
        const yoCargado = Object.keys(global.plugins || {}).some((k) => /shadowia/i.test(k))
        const cfg = global.owner?.map?.((o) => (Array.isArray(o) ? o[0] : o)).filter(Boolean) || []
        const lineas = [
          `🩺 *Diagnóstico de Shadowia* ${yoCargado ? '✅' : '❌'}`,
          ``,
          `${yoCargado ? '✅' : '❌'} Plugin cargado (${totalPlugins} plugins en el bot)`,
          `${isROwner || isOwner ? '✅' : '❌'} Te reconozco como owner`,
          `${m.isGroup ? (botEsAdmin ? '✅ Soy admin de este grupo' : '❌ NO soy admin de este grupo → no puedo promover, expulsar ni cambiar datos') : 'ℹ️ Estamos en chat privado (las acciones de grupo no aplican)'}`,
          `✅ Prefijo activo: los comandos entran con # ! . o /`,
          cfg.length ? `✅ Owners configurados: ${cfg.join(', ')}` : '❌ No hay owners en config.js',
          ``,
          `Si algo sale en ❌, ahí está el problema.`,
          `Si todo sale ✅ y aun así no respondo, corre en la terminal:`,
          `\`node tools/diagnostico-shadowia.mjs\``,
        ]
        await m.react?.('🩺')
        return avisar(lineas.join('\n'))
      }

      case 'ayuda': {
        await m.react?.('ℹ️')
        return avisar(
          `🤖 *Shadowia* — tu asistente personal, jefe 😏✨ (solo owners)\n` +
          `\n*Para el grupo*\n` +
          `• \`promueve a @usuario\` → le doy admin 🎉\n` +
          `• \`quítale el admin a @usuario\` → se lo quito 🔻\n` +
          `• \`devuélvele admin\` → se lo regreso a quien se lo quité 🔄\n` +
          `• \`expulsa a @usuario\` · \`agrega 584241234567\` 🚪📥\n` +
          `• \`cambia el nombre del grupo a ...\` · \`cambia la descripción a ...\` ✏️📝\n` +
          `• \`cambia la foto del grupo\` (mándame la imagen) 🖼️\n` +
          `• \`abre el grupo\` · \`cierra el grupo\` 🔓🔒\n` +
          `• \`activa los anuncios\` · \`desactiva los anuncios\` 📢🔕\n` +
          `\n*Para el bot*\n` +
          `• \`sal del grupo\` → me despido y me voy 👋\n` +
          `• \`usa <cualquier comando>\` → ejecuto ese plugin por ti 🛠️\n` +
          `\n*Y lo demás*\n` +
          `• Háblame de lo que quieras y te contesto, con sarcasmo incluido 😌\n` +
          `\n_Siempre te aviso antes de hacer algo, para que no haya sustos_ ✨`,
        )
      }

      case 'comando': {
        const nombre = String(orden.value || '').toLowerCase()
        if (BLOQUEADOS.has(nombre)) {
          await m.react?.('⛔')
          return avisar(`⛔ Ese no, jefe. \`${nombre}\` está bloqueado para mí, y con razón 😏\n\nCon ese comando se rompe el bot y luego me toca a mí recoger los pedazos 😅`)
        }
        const ejecutado = await ejecutarComando({ m, conn, args, text, usedPrefix, nombre, extra: orden.extra || '', meta, botJid })
        if (!ejecutado) {
          await m.react?.('❔')
          return avisar(`🤔 Jefe, el comando \`${nombre}\` no existe… o se esconde muy bien 😅\n\nMira lo que sí puedo hacer con \`${usedPrefix}${command} ayuda\` ✨`)
        }
        await m.react?.('✅')
        return
      }

      case 'charlar':
      default: {
        await conn.sendPresenceUpdate?.('composing', m.chat)

        const reg = getMemoria(m.chat)
        const contexto = reg.conversa.map((c) => `${c.rol === 'user' ? 'Yosue' : 'Shadowia'}: ${c.texto}`).join('\n')
        const bloque = contexto
          ? `\n\nConversación reciente (úsala solo si viene al caso):\n${contexto}\n`
          : '\n'

        const prompt = encodeURIComponent(`${PROMPT_SHADOWIA}${bloque}\nYosue: ${orden.value}\nShadowia:`)

        let data
        try {
          const r = await axios.get(`${API_URL}${prompt}`, {
            timeout: API_TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0' },
          })
          data = r.data
        } catch {
          await conn.sendPresenceUpdate?.('paused', m.chat).catch?.(() => {})
          await m.react?.('⚠️')
          return avisar('😴 Uy, jefe, mi cerebro no contestó: la API está dormida (siempre tarda cuando está fría) 😅\n\nDame unos segundos y lo intento otra vez ✨')
        }
        await conn.sendPresenceUpdate?.('paused', m.chat)

        let respuesta = data?.result?.text
        if (!respuesta) {
          await m.react?.('⚠️')
          return avisar('🤨 La IA me dejó en visto, jefe. Ni una palabra 😅\n\nPrueba otra vez en unos segundos ✨')
        }
        respuesta = String(respuesta).replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()

        registrarCharla(m.chat, orden.value, respuesta)
        await m.react?.('✅')
        return conn.reply(m.chat, respuesta, m)
      }
    }
  } catch (e) {
    await conn.sendPresenceUpdate?.('paused', m.chat).catch?.(() => {})
    await m.react?.('❌')
    return avisar(`❌ Ay, jefe… algo se me trabó y no pude completarlo 😓\n\n🪵 Detalle técnico: ${e?.message || e}\n\nSi quieres lo intento otra vez ✨`)
  }
}

async function ejecutarComando({ m, conn, args, usedPrefix, nombre, extra, meta, botJid }) {
  const plugins = global.plugins || {}
  const claves = Object.keys(plugins)
  const clave = claves.find((k) => {
    const p = plugins[k]
    const cmds = Array.isArray(p?.command) ? p.command : p?.command ? [p.command] : []
    return cmds.some((c) => String(c).toLowerCase() === nombre)
  })
  if (!clave) return false

  const plugin = plugins[clave]
  const listaArgs = [nombre, ...(extra ? extra.split(/\s+/).filter(Boolean) : [])]

  await plugin.call(conn, m, {
    match: null,
    usedPrefix,
    noPrefix: false,
    args: listaArgs,
    command: nombre,
    text: extra || '',
    conn,
    participants: meta?.participants || [],
    groupMetadata: meta,
    user: buscarParticipante(meta?.participants, m.sender) || {},
    bot: buscarParticipante(meta?.participants, botJid) || {},
    isROwner: true,
    isOwner: true,
    isMods: true,
    isRAdmin: true,
    isAdmin: true,
    isBotAdmin: esAdminParticipante(buscarParticipante(meta?.participants, botJid)),
    isPrems: true,
    chatUpdate: null,
    __dirname: process.cwd(),
    __filename: `${process.cwd()}/plugins/${clave}`,
    chat: global.db?.data?.chats?.[m.chat] || {},
    settings: global.db?.data?.settings?.[botJid] || {},
  })
  return true
}

handler.help = ['shadowia']
handler.tags = ['ia']
handler.command = ['shadowia', 'asistente', 'ayuda', 'shadowiacheck']
handler.rowner = true
handler.register = false
handler.limit = false

export default handler
