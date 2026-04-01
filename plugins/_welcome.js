import fs from 'fs'
import { WAMessageStubType } from '@whiskeysockets/baileys'

const newsletterJid = '120363423523597117@newsletter';
const newsletterName = '👑 SHADOW-BOT-MD| ᴄʜᴀɴɴᴇʟ-ʙᴏᴛ 🌌';
const packname = 'shadow-BOT-MD'

// Configuración completa de la imagen (JSON tal cual lo pediste)
const welcomeConfig = {
  "status": 200,
  "api_name": "YOSOYYO",
  "tool": "welcome_banner_generator",
  "message": "Imagen generada con Ã©xito.",
  "creator": "YO SOY YO",
  "data": {
    "width": 1000,
    "height": 500,
    "backgroundUrl": "https://files.catbox.moe/gbp5x3.jpg",
    "profileUrl": "https://unavatar.io/github/yosue891 ",
    "profileSize": 200,
    "profileX": 500,
    "profileY": 200,
    "borderColor": "#00ffff",
    "borderWidth": 8,
    "texts": [
      {
        "text": "Bienvenido Usuario",
        "x": 500,
        "y": 350,
        "size": 50,
        "color": "#ffffff",
        "font": "Arial",
        "bold": true,
        "align": "center"
      },
      {
        "text": "Disfruta tu estancia",
        "x": 500,
        "y": 420,
        "size": 30,
        "color": "#ffffff",
        "font": "Arial",
        "bold": false,
        "align": "center"
      }
    ]
  }
};

const iconos = [
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165065152-94d843.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165081580-660d44.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165160074-de0e81.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165128396-b5e568.jpg',
];

const getRandomIcono = () => iconos[Math.floor(Math.random() * iconos.length)];

async function generarBienvenida({ conn, userId, groupMetadata, chat }) {
  const username = `@${userId.split('@')[0]}`;
  const fecha = new Date().toLocaleDateString("es-ES", { timeZone: "America/Santo_Dominico", day: 'numeric', month: 'long', year: 'numeric' });
  const groupSize = groupMetadata.participants.length + 1;
  const desc = groupMetadata.desc?.toString() || 'Sin descripción';

  let caption;
  if (chat.welcomeText) {
    caption = chat.welcomeText
      .replace(/@user/g, username)
      .replace(/@subject/g, groupMetadata.subject)
      .replace(/@desc/g, desc);
  } else {
    const defaultWelcomeMessage = `╭─「 👻 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐈𝐍𝐈𝐂𝐈𝐎 」─╮

@user ha sido convocado por las sombras...
Bienvenid@ al dominio secreto de *@subject*.

Tu llegada no es casual. Cada paso será observado.
Tu poder será forjado en silencio. Tu lealtad, puesta a prueba.

╰─「 🌌 𝐈𝐍𝐅𝐎 𝐃𝐄𝐋 𝐆𝐑𝐔𝐏𝐎 」─╯
🧿 Miembros: ${groupSize}
📅 Fecha: ${fecha}
📜 Descripción:
${desc}

> Usa *#setwelcome* para personalizar este mensaje.`;

    caption = defaultWelcomeMessage
      .replace(/@user/g, username)
      .replace(/@subject/g, groupMetadata.subject);
  }
  return { caption, mentions: [userId] };
}

async function generarDespedida({ conn, userId, groupMetadata, chat }) {
  const username = `@${userId.split('@')[0]}`;
  const fecha = new Date().toLocaleDateString("es-ES", { timeZone: "America/Santo_Domingo", day: 'numeric', month: 'long', year: 'numeric' });
  const groupSize = groupMetadata.participants.length - 1;

  let caption;
  if (chat.byeText) {
    caption = chat.byeText
      .replace(/@user/g, username)
      .replace(/@subject/g, groupMetadata.subject);
  } else {
    const defaultByeMessage = `╭─「 🌌 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐑𝐄𝐓𝐈𝐑𝐀𝐃𝐀 」─╮

@user ha abandonado el círculo de las sombras.
Su presencia se desvanece... como todo lo que no deja huella.

Grupo: *@subject*

Que su memoria permanezca en silencio.
Las sombras no olvidan, pero tampoco lloran.

╰─「 🌌 𝐄𝐒𝐓𝐀𝐃𝐎 𝐀𝐂𝐓𝐔𝐀𝐋 」─╯
📉 Miembros: ${groupSize}
📅 Fecha: ${fecha}

> Usa *#setbye* para personalizar este mensaje.`;

    caption = defaultByeMessage
      .replace(/@user/g, username)
      .replace(/@subject/g, groupMetadata.subject);
  }
  return { caption, mentions: [userId] };
}

let handler = m => m;

handler.before = async function (m, { conn, participants, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return !0;

  const chat = global.db.data.chats[m.chat];
  if (!chat) return !0;

  const primaryBot = chat.botPrimario;
  if (primaryBot && conn.user.jid !== primaryBot) return !0;

  const userId = m.messageStubParameters[0];

  if (chat.welcome && m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD) {
    const { caption, mentions } = await generarBienvenida({ conn, userId, groupMetadata, chat });
    const contextInfo = {
      mentionedJid: mentions,
      isForwarded: true,
      forwardingScore: 999,
      forwardedNewsletterMessageInfo: {
        newsletterJid,
        newsletterName,
        serverMessageId: -1
      },
      externalAdReply: {
        title: packname,
        body: '🌌 𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 𝐭𝐞 𝐝𝐚 𝐥𝐚 𝐛𝐢𝐞𝐧𝐯𝐞𝐧𝐢𝐝𝐚...',
        thumbnailUrl: getRandomIcono(),
        sourceUrl: global.redes,
        mediaType: 1,
        renderLargerThumbnail: false
      }
    };
    
    // Se usa la URL del background del JSON para la imagen
    await conn.sendMessage(m.chat, { image: { url: welcomeConfig.data.backgroundUrl }, caption, contextInfo }, { quoted: null });
  }

  if (chat.welcome && (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE)) {
    const { caption, mentions } = await generarDespedida({ conn, userId, groupMetadata, chat });
    const contextInfo = {
      mentionedJid: mentions,
      isForwarded: true,
      forwardingScore: 999,
      forwardedNewsletterMessageInfo: {
        newsletterJid,
        newsletterName,
        serverMessageId: -1
      },
      externalAdReply: {
        title: packname,
        body: '🌌 𝐋𝐚𝐬 𝐬𝐨𝐦𝐛𝐫𝐚𝐬 𝐬𝐞 𝐜𝐢𝐞𝐫𝐫𝐚𝐧 𝐬𝐢𝐧 𝐫𝐞𝐦𝐨𝐫𝐬𝐨...',
        thumbnailUrl: getRandomIcono(),
        sourceUrl: global.redes,
        mediaType: 1,
        renderLargerThumbnail: false
      }
    };
    
    await conn.sendMessage(m.chat, { image: { url: welcomeConfig.data.backgroundUrl }, caption, contextInfo }, { quoted: null });
  }
};

export { generarBienvenida, generarDespedida };
export default handler;
