const handler = async (m, { conn, command }) => {
  try {
    // Decoración navideña con estilo Shadow
    let txt = 
`┏━━━━━━━━━━━━━━━━━━━┓
🎄 *Reino de las Sombras Navideñas* 🎄
┗━━━━━━━━━━━━━━━━━━━┛

🌌 *Invocaste el poder oculto...*  
✨ Aquí están los guardianes y creadores del bot:

👑 *Dueño Principal (Shadow Master)*  
📱 +58 424-2773183

🕯️ *Colaborador de las Sombras*  
📱 +504 9373-2693

━━━━━━━━━━━━━━━━━━━━━━
🎅 *Ellos son los arquitectos del Reino* 🎅
❄️ Gracias a su guía, las sombras siguen vivas.
━━━━━━━━━━━━━━━━━━━━━━

🎄✨ *Creado por Yosue uwu* ✨🎄`;

    await conn.reply(m.chat, txt, m, {
      contextInfo: {
        externalAdReply: {
          title: '🎄 Shadow Bot - Creadores 🎅',
          body: 'Los números de los maestros de las sombras',
          thumbnailUrl: global.michipg || 'https://n.uguu.se/ZZHiiljb.jpg',
          mediaType: 1,
          renderLargerThumbnail: false,
          sourceUrl: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O'
        }
      }
    });
  } catch (e) {
    console.error(e);
    conn.reply(m.chat, "👻 Error al invocar a los creadores...", m);
  }
};

handler.command = ['owner', 'creador'];
export default handler;
