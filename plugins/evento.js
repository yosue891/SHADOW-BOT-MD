// plugins/producto.js

const handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, {
    productMessage: {
      title: '🎧 Apple AirPods Pro (2nd Gen)',
      description: 'Active Noise Cancellation + Spatial Audio + H2 chip',
      productId: 'AIRPODS-PRO-2',
      retailerId: 'apple-store',
      url: 'https://www.apple.com/airpods-pro/',
      priceAmount1000: 249000, // 249.00 USD (formato x1000 en Baileys)
      currencyCode: 'USD',

      thumbnail: {
        url: 'https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=600&q=60'
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
