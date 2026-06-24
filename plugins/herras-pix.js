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
                      merchant_name: 'texto1',
                      key: 'texto2',
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
