// plugins/pago.js

const handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, {
    requestPaymentMessage: {
      amount: 50000,
      currency: 'IDR',
      note: 'Payment for order #123',
      from: '573133374132@s.whatsapp.net'
    }
  })
}

handler.help = ['pago']
handler.tags = ['tools']
handler.command = /^(pago|payment)$/i

export default handler
