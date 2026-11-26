import { AIRich } from '../../src/lib/ourin-builder.js'

const handler = async (m, { conn }) => {
  const canalId = global.idcanal || global.channelRD?.id || '120363403739366547@newsletter'
  const canalName = global.channelRD?.name || 'SHADOW-BOT'

  const rich = new AIRich(conn)
    .setContextInfo({
      forwardedNewsletterMessageInfo: {
        newsletterJid: canalId,
        serverMessageId: 100,
        newsletterName: canalName
      }
    })
    .addText(
      `💭 *Meta AI — Thoughts & Steps*\n\n` +
      `*Paso 1:* Análisis del tema y definición de objetivos.\n` +
      `*Paso 2:* Consulta de fuentes y documentación oficial.\n` +
      `*Paso 3:* Síntesis y estructuración de la respuesta.\n\n` +
      `🔗 *Fuentes consultadas:*\n` +
      `> • *Coffee — Wikipedia:* https://en.wikipedia.org/wiki/Coffee\n` +
      `> • *GitHub:* https://github.com\n` +
      `> • *Healthline Nutrition:* https://www.healthline.com/nutrition/coffee-benefits`
    )
    .addTip('full step • popio steps')
    .addSuggest([
      '¿Qué beneficios tiene el café?',
      'Ver fuentes en GitHub',
      'Más información'
    ])

  await rich.send(m.chat, { quoted: m, includesUnifiedResponse: false })
}

handler.command = ['prueba2']
handler.tags = ['pruebas']
handler.help = ['prueba2']

export default handler
