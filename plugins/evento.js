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
        url: 'https://raw.githubusercontent.com/andresv27728/assets/main/airpods.png'
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
