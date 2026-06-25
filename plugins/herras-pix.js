let handler = async (m, { conn }) => {
  await conn.relayMessage(
    m.chat,
    {
      interactiveMessage: {
        nativeFlowMessage: {
          buttons: [
            {
              name: 'payment_info',
              buttonParamsJson: JSON.stringify({
                payment_settings: [
                  {
                    type: 'pix_static_code',
                    pix_static_code: {
                      merchant_name: 'SHADOW-BOT-MD',
                      key: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O',
                      key_type: 'EVP'
                    }
                  }
                ]
              })
            }
          ],
          messageParamsJson: '{}'
        },
        contextInfo: {}
      }
    },
    {}
  )
}

handler.command = ['pix', 'pago']

export default handler
