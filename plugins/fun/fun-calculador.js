const handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return conn.reply(m.chat, `En las sombras debes mencionar a un Usuario para invocar su destino.`, m);

  const percentages = Math.floor(Math.random() * 500);
  let emoji = '';
  let description = '';

  switch (command) {
    case 'gay':
      emoji = '🏳️‍🌈';
      if (percentages < 50) {
        description = `💙 Las sombras han revelado que ${text.toUpperCase()} es *${percentages}%* Gay ${emoji}\n> Bajo porcentaje... las sombras susurran: *Eres Joto, no Gay* que joto jajaja 😂.`;
      } else if (percentages > 100) {
        description = `💜 El Reino de las Sombras revela que ${text.toUpperCase()} es *${percentages}%* Gay ${emoji}\n> Incluso más gay de lo que pensábamos.`;
      } else {
        description = `🖤 El Reino de las Sombras declara que ${text.toUpperCase()} es *${percentages}%* Gay ${emoji}\n> Tu destino está marcado por el arcoíris 😂.`;
      }
      break;

    case 'lesbiana':
      emoji = '🏳️‍🌈';
      if (percentages < 50) {
        description = `👻 Las sombras han revelado que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Quizás necesites más historias románticas en la oscuridad.`;
      } else if (percentages > 100) {
        description = `❣️ El Reino de las Sombras declara que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Un amor extremo por las chicas.`;
      } else {
        description = `💗 Las sombras susurran que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Mantén el amor floreciendo bajo las estrellas.`;
      }
      break;

    case 'pajero':
    case 'pajera':
      emoji = '😏💦';
      if (percentages < 50) {
        description = `🧡 Las sombras revelan que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Tal vez necesites más hobbies en la noche oscura.`;
      } else if (percentages > 100) {
        description = `💕 El Reino sombrío declara que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Una resistencia admirable en la oscuridad.`;
      } else {
        description = `💞 Las sombras susurran que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Mantén tu entrenamiento en solitario con orgullo 😂.`;
      }
      break;

    case 'puto':
    case 'puta':
      emoji = '🔥🥵';
      if (percentages < 50) {
        description = `😼 Las sombras revelan que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Más suerte en tu próxima conquista.`;
      } else if (percentages > 100) {
        description = `😻 El Reino sombrío declara que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Estás en llamas dentro de la oscuridad.`;
      } else {
        description = `😺 Las sombras susurran que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Mantén ese encanto ardiente.`;
      }
      break;

    case 'manco':
    case 'manca':
      emoji = '💩';
      if (percentages < 50) {
        description = `🌟 Las sombras revelan que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> No eres el único en ese club sombrío.`;
      } else if (percentages > 100) {
        description = `💌 El Reino oscuro declara que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Un talento muy especial en la oscuridad.`;
      } else {
        description = `🥷 Las sombras susurran que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Mantén esa actitud valiente.`;
      }
      break;

    case 'rata':
      emoji = '🐁';
      if (percentages < 50) {
        description = `💥 Las sombras revelan que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Nada malo en disfrutar del queso sombrío.`;
      } else if (percentages > 100) {
        description = `💖 El Reino oscuro declara que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Un auténtico ratón de lujo.`;
      } else {
        description = `👑 Las sombras susurran que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Come queso con responsabilidad en la oscuridad.`;
      }
      break;

    case 'prostituto':
    case 'prostituta':
      emoji = '🫦👅';
      if (percentages < 50) {
        description = `❀ Las sombras revelan que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> El mercado sombrío está en auge.`;
      } else if (percentages > 100) {
        description = `💖 El Reino oscuro declara que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Un/a verdadero/a profesional de las sombras.`;
      } else {
        description = `✨️ Las sombras susurran que ${text.toUpperCase()} es *${percentages}%* ${command} ${emoji}\n> Siempre es hora de negocios en la oscuridad.`;
      }
      break;

    default:
      m.reply(`🍭 Comando inválido en el Reino de las Sombras.`);
  }

  const responses = [
    "🌌 El universo sombrío ha hablado.",
    "🕸️ Los científicos de las sombras lo confirman.",
    "✨ Un destino revelado desde la oscuridad."
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];

  const cal = `👻 *CALCULADORA SOMBRÍA*

${description}

➤ ${response}`.trim();

  async function loading() {
    var hawemod = [
      "《 █▒▒▒▒▒▒▒▒▒▒▒》10%",
      "《 ████▒▒▒▒▒▒▒▒》30%",
      "《 ███████▒▒▒▒▒》50%",
      "《 ██████████▒▒》80%",
      "《 ████████████》100%"
    ];

    let { key } = await conn.sendMessage(
      m.chat,
      { text: `🤍 Las sombras están calculando tu destino...`, mentions: conn.parseMention(cal) },
      { quoted: global.fkontak }
    );

    for (let i = 0; i < hawemod.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await conn.sendMessage(
        m.chat,
        { text: hawemod[i], edit: key, mentions: conn.parseMention(cal) },
        { quoted: global.fkontak }
      );
    }

    await conn.sendMessage(
      m.chat,
      { text: cal, edit: key, mentions: conn.parseMention(cal) },
      { quoted: global.fkontak }
    );
  }

  loading();
};

handler.help = ['gay <@tag>', 'lesbiana <@tag>', 'pajero <@tag>', 'pajera <@tag>', 'puto <@tag>', 'puta <@tag>', 'manco <@tag>', 'manca <@tag>', 'rata <@tag>', 'prostituta <@tag>', 'prostituto <@tag>'];
handler.tags = ['fun'];
handler.register = true;
handler.group = true;
handler.command = ['gay', 'lesbiana', 'pajero', 'pajera', 'puto', 'puta', 'manco', 'manca', 'rata', 'prostituta', 'prostituto'];

export default handler;
