const handler = async (m, { conn }) => {

 await conn.relayMessage( m.chat,
    {
      interactiveMessage: {
        header: {
          title: "Anuncio de Facebook"
        },
        body: {
          text: "¡Hola, ! ¿Cómo podemos ayudarte?"
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "inapp_signup",
              buttonParamsJson: "{}"
            }
          ],
          messageParamsJson: ""
        },
      contextInfo: {}
      }
      },
      {
      }
      )

}

handler.command = ['prods']
export default handler