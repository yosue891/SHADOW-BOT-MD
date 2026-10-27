import axios from 'axios'
import crypto from 'crypto'
import { generateWAMessageFromContent, generateWAMessage } from '@whiskeysockets/baileys'

const APIOWO_BASE = 'https://apiowo.vercel.app'
const APIOWO_TOKEN = 'owner_80a9012df01c86f611910967a547f74c185cf39848f10e09'
const NYX_PIN_URL = 'https://nyxdlapi.vercel.app/api/search/pinterest'
const NYX_API_KEY = 'nyx_41yhfMefym8Jf09qN400MX9Xopw_ERDN'

async function searchPinterest(query) {
  // 1. Prioridad: APIOWO Pinterest (rápido y con imágenes en alta resolución)
  try {
    const { data } = await axios.get(`${APIOWO_BASE}/api/pinterest`, {
      params: { q: query },
      headers: {
        'x-api-key': APIOWO_TOKEN,
        'Authorization': `Bearer ${APIOWO_TOKEN}`,
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 15000
    })

    const items = data?.items || data?.result || data?.results || []
    if (Array.isArray(items) && items.length > 0) {
      return items
        .filter(v => v?.image || v?.image_small || v?.download || v?.descarga)
        .slice(0, 8)
        .map((v, i) => ({
          title: v.title || v.desc || `Imagen de Pinterest ${i + 1}`,
          author: v.author || 'Pinterest',
          image: v.image || v.image_small || v.download || v.descarga,
          pinUrl: v.link || v.url || 'https://pinterest.com'
        }))
    }
  } catch (errApiowo) {
    console.warn('[PINTEREST APIOWO warning]:', errApiowo?.message || errApiowo)
  }

  // 2. Respaldo secundario: Nyx API
  try {
    const { data } = await axios.get(NYX_PIN_URL, {
      params: { q: query, query, limit: 8, apikey: NYX_API_KEY },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 25000
    })

    const list = data?.result?.results || data?.results
    if (data?.status && Array.isArray(list)) {
      return list
        .filter(v => (!v?.tipo || /imagen|image/i.test(v.tipo)) && (v?.descarga || v?.image || v?.download))
        .slice(0, 8)
        .map((v, i) => ({
          title: v.titulo || `Imagen de Pinterest ${i + 1}`,
          author: v.autor || 'Desconocido',
          image: v.descarga || v.image || v.download,
          pinUrl: v.url || 'https://pinterest.com'
        }))
    }
  } catch (errNyx) {
    console.warn('[PINTEREST Nyx warning]:', errNyx?.message || errNyx)
  }

  return []
}

let handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `☽ *Discípulo de las Sombras*, ingresa lo que deseas invocar desde Pinterest.`,
      m
    )
  }

  await m.react('🗡️')

  await conn.reply(
    m.chat,
    `☽ *Las Sombras buscan tus imágenes en Pinterest...* preparando álbum.`,
    m
  )

  try {
    const results = await searchPinterest(text)

    if (!results.length) {
      await m.react('❌')
      return conn.reply(
        m.chat,
        `☽ No se encontraron resultados para "*${text}*"`,
        m
      )
    }

    const count = Math.min(results.length, 6)
    const selected = results.slice(0, count)

    // Formatear items para el álbum
    const medias = selected.map((item, i) => {
      const head = i === 0 ? `📎 *Resultados de Pinterest:* ${text}\n\n` : ''
      const foot = i === selected.length - 1 ? `\n☽ Procesado por Shadow Bot` : ''
      return {
        type: 'image',
        data: { url: item.image },
        caption: `${head}☽ Imagen [${i + 1}/${selected.length}]\n𖣔 Título: ${item.title}\n𖣔 Enlace: ${item.pinUrl}${foot}`
      }
    })

    // Caso 1 sola imagen
    if (medias.length === 1) {
      await conn.sendMessage(m.chat, {
        image: medias[0].data,
        caption: medias[0].caption
      }, { quoted: m })
      await m.react('✅')
      return
    }

    // Caso Álbum (múltiples imágenes)
    let albumSent = false

    // Método A: sendAdonix (álbum nativo en lib/simple.js)
    if (typeof conn.sendAdonix === 'function') {
      try {
        await conn.sendAdonix(m.chat, medias, { quoted: m, delay: 400 })
        albumSent = true
      } catch (errAdonix) {
        console.warn('[PINTEREST sendAdonix error]:', errAdonix?.message)
      }
    }

    // Método B: Generador nativo Baileys de AlbumMessage con messageAssociation
    if (!albumSent) {
      try {
        const opener = generateWAMessageFromContent(
          m.chat,
          {
            messageContextInfo: { messageSecret: crypto.randomBytes(32) },
            albumMessage: {
              expectedImageCount: medias.length,
              expectedVideoCount: 0
            }
          },
          {
            userJid: conn.user?.id || conn.user?.jid,
            quoted: m,
            upload: conn.waUploadToServer
          }
        )

        await conn.relayMessage(opener.key.remoteJid, opener.message, { messageId: opener.key.id })

        for (const item of medias) {
          const msg = await generateWAMessage(
            opener.key.remoteJid,
            { image: item.data, caption: item.caption || '' },
            { upload: conn.waUploadToServer }
          )
          msg.message.messageContextInfo = {
            messageSecret: crypto.randomBytes(32),
            messageAssociation: {
              associationType: 1,
              parentMessageKey: opener.key
            }
          }
          await conn.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id })
          await new Promise(res => setTimeout(res, 350))
        }
        albumSent = true
      } catch (errNative) {
        console.warn('[PINTEREST native albumMessage error]:', errNative?.message)
      }
    }

    // Método C: Respaldo final en caso de clientes que no soporten album
    if (!albumSent) {
      for (let i = 0; i < medias.length; i++) {
        await conn.sendMessage(m.chat, {
          image: medias[i].data,
          caption: medias[i].caption
        }, { quoted: i === 0 ? m : undefined })
        if (i < medias.length - 1) {
          await new Promise(res => setTimeout(res, 500))
        }
      }
    }

    await m.react('✅')
  } catch (e) {
    console.error('[PINTEREST handler error]:', e)
    await m.react('❌')
    return conn.reply(
      m.chat,
      `⛔ *Las Sombras fallaron... intenta nuevamente más tarde.*\n> Detalle: ${e.message}`,
      m
    )
  }
}

handler.help = ['pinterest', 'pin']
handler.tags = ['search']
handler.command = ['pinterest', 'pin']

export default handler
