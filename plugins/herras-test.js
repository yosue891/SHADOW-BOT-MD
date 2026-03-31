// plugins/test.js
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';

let handler = async (m, { conn, usedPrefix, command }) => {
  const text = `Menú principal

*Opciones:*
1. Llamar a soporte: 573133374132
2. YO SOY YO

*Opiniones:*
Opinión 1
Opinión 2`;

  const buttons = [
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: 'Ver más opciones',
        sections: [
          {
            title: 'Opciones',
            rows: [
              {
                title: 'Llamar a soporte',
                id: 'https:                      
              },
              {
                title: '//wa.me/573133374132',
              },
              {
                title: 'YO SOY YO',
                id: 'copiar_texto',
              },
            ],
          },
          {
            title: 'Opiniones',
            rows: [
              { title: 'Opinión 1', id: 'opinion1' },
              { title: 'Opinión 2', id: 'opinion2' },
            ],
          },
        ],
      }),
    },
  ];

  const message = {
    body: { text },
    footer: { text: 'Presiona una opción' },
    header: { title: 'Menú' },
    nativeFlowMessage: { buttons },
  };

  const msg = generateWAMessageFromContent(m.chat, { viewOnceMessage: { message: { interactiveMessage: message } } }, { userJid: conn.user.jid });
  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
};

handler.help = ['test'];
handler.tags = ['test'];
handler.command = /^(test)$/i;

export default handler;

                                              
let copiarHandler = async (m, { conn }) => {
  if (m.text === '// Agregar un handler para el botón de copiar
let copiarHandler = async (m, { conn }) => {
  if (m.text === 'copiar_texto') {
    await conn.sendMessage(m.chat, { text: 'YO SOY YO' });
  }
};

copiarHandler.command = /^(copiar_texto)$/i;
export { copiarHandler };
