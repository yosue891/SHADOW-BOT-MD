// plugins/producto.js

const handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, {
    productMessage: {
      title: '🎧 Apple AirPods Pro (2nd Gen)',
      description: 'Active Noise Cancellation + Spatial Audio + H2 chip',
      productId: 'AIRPODS-PRO-2',
      retailerId: 'apple-store',
      url: 'https://www.apple.com/airpods-pro/',

      priceAmount1000: 249000,
      currencyCode: 'USD',

      // ✅ Imagen estable (GitHub raw, no bloquea stream)
      thumbnail: {
        url: 'data:image/webp;base64,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'
      },

      body: '🔥 Apple AirPods Pro 2 disponibles ahora',
      footer: 'Apple Official Store',

      buttons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🛒 Buy Now',
            id: 'buy_airpods_pro_2'
          })
        }
      ]
    }
  })
}

handler.help = ['producto']
handler.tags = ['tools']
handler.command = /^(producto|product)$/i

export default handler
