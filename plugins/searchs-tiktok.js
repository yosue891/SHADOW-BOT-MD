import axios from 'axios'

const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_BASE = 'https://nyxdlapi.vercel.app'
const NYXDL_TT_SEARCH = 'https://nyxdlapi.vercel.app/api/search/tiktoksearch'
const MAX_VIDEOS = 12

function formatCount(n) {
  var num = Number(n || 0)
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString()
}

function getTitle(v) {
  var t = (v && v.title) || 'Sin descripción'
  if (t.length > 80) return t.slice(0, 80) + '...'
  return t
}

function getAuthor(v) {
  if (!v) return 'desconocido'
  if (v.author && typeof v.author === 'object') {
    return v.author.username || v.author.name || 'desconocido'
  }
  return v.username || v.author || 'desconocido'
}

function getStats(v) {
  var s = (v && v.statistics) || {}
  return {
    likes: s.likes || v.likes || 0,
    views: s.vistas || s.views || v.views || 0,
  }
}

function toAbsolute(u) {
  if (!u || typeof u !== 'string') return null
  var s = u.trim()
  if (!s) return null
  var abs = null
  if (/^https?:\/\//i.test(s)) abs = s
  else if (s.indexOf('//') === 0) abs = 'https:' + s
  else if (s.charAt(0) === '/') abs = NYXDL_BASE + s
  if (!abs) return null
  if (abs.indexOf(NYXDL_BASE) === 0 && abs.indexOf('apikey=') === -1) {
    abs += (abs.indexOf('?') === -1 ? '?' : '&') + 'apikey=' + encodeURIComponent(NYXDL_API_KEY)
  }
  return abs
}

export default {
  command: ['tiktoks', 'tiktoksearch', 'ttss'],
  category: 'search',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var args = ctx.args || []

    if (!args.length) {
      return m.reply('✧ Ingresa algo para buscar en TikTok.')
    }

    var query = args.join(' ').trim()

    try {
      var searchUrl =
        NYXDL_TT_SEARCH +
        '?q=' +
        encodeURIComponent(query) +
        '&apikey=' +
        encodeURIComponent(NYXDL_API_KEY)

      var res = await axios.get(searchUrl, {
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      })

      var data = res.data
      var results =
        (data && data.result && data.result.results) ||
        (data && data.result && data.result.resultados) ||
        (data && data.results) ||
        []

      if (!Array.isArray(results) || !results.length) {
        return m.reply('✘ No encontré resultados para *' + query + '*')
      }

      var usable = results
        .map(function (v) {
          var stats = getStats(v)
          return {
            url: toAbsolute(v.video || v.videoWatermarked),
            title: getTitle(v),
            author: getAuthor(v),
            likes: stats.likes,
            views: stats.views,
            link: v.url || null,
          }
        })
        .filter(function (v) {
          return !!v.url
        })
        .slice(0, MAX_VIDEOS)

      if (!usable.length) {
        return m.reply(
          '✘ Encontré resultados, pero no pude obtener los videos para *' + query + '*'
        )
      }

      await m.reply(
        '✐ Encontré *' + results.length + '* resultados. ᗴᑎᐯIᗩᑎᗪO *' + usable.length + '* ᐯIᗪᗴOՏ...'
      )

      var album = usable.map(function (v, idx) {
        var caption =
          '*ꕤ Tiktoksearch*\n' +
          '⌗» ' +
          (idx + 1) +
          '. ' +
          v.title +
          '\n' +
          '♡ @' +
          v.author +
          '\n' +
          '♡ ' +
          formatCount(v.likes) +
          ' Likes  •  ▶ ' +
          formatCount(v.views) +
          ' Views'

        return {
          video: { url: v.url },
          caption: caption,
        }
      })

      await client.sendMessage(m.chat, { album: album }, { quoted: m })
    } catch (e) {
      console.log(
        '[tiktoksearch] ERROR:',
        e && e.response && e.response.status,
        (e && e.response && e.response.data) || e.message
      )
      m.reply('❌ Error al buscar videos.\n\n' + (e.message || e))
    }
  },
}
