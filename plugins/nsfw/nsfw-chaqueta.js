let handler = async (m, { conn, usedPrefix, command }) => {
  const chat = global.db.data.chats[m.chat];
  if (!chat.nsfw) {
    return conn.reply(
      m.chat,
      `🌑 Las sombras protegen este reino...\n❄️ El modo *NSFW* está desactivado, no puedes usar *${command}*.`,
      m
    );
  }

  let who =
    m.quoted?.sender ||
    (m.mentionedJid && m.mentionedJid[0]) ||
    (m.fromMe ? conn.user.jid : m.sender);

  const emoji = "🔥";

  let chaqueta = [
    `${emoji} Iniciando chaqueta...`,
    `╭━━╮╭╭╭╮
┃▔╲┣╈╈╈╈━━━╮
┃┈┈▏╰╯╯╯╭╮━┫
┃┈--╭━━━━╈╈━╯
╰━━╯        ╰╯`,
    `╭━━╮   ╭╭╭╮
┃▔╲┣━━╈╈╈╈━━╮
┃┈┈▏   ╰╯╯╯╭╮┫
┃┈--╭━━━━━━╈╈╯
╰━━╯        ╰╯`,
    `╭━━╮╭╭╭╮
┃▔╲┣╈╈╈╈━━━╮
┃┈┈▏╰╯╯╯╭╮━┫
┃┈--╭━━━━╈╈━╯
╰━━╯        ╰╯`,
    `╭━━╮   ╭╭╭╮
┃▔╲┣━━╈╈╈╈━━╮
┃┈┈▏   ╰╯╯╯╭╮┫
┃┈--╭━━━━━━╈╈╯
╰━━╯        ╰╯`,
    `╭━━╮╭╭╭╮
┃▔╲┣╈╈╈╈━━━╮
┃┈┈▏╰╯╯╯╭╮━┫
┃┈--╭━━━━╈╈━╯
╰━━╯        ╰╯`,
    `╭━━╮   ╭╭╭╮
┃▔╲┣━━╈╈╈╈━━╮
┃┈┈▏   ╰╯╯╯╭╮┫
┃┈--╭━━━━━━╈╈╯
╰━━╯        ╰╯`,
    `╭━━╮╭╭╭╮
┃▔╲┣╈╈╈╈━━━╮
┃┈┈▏╰╯╯╯╭╮━┫
┃┈--╭━━━━╈╈━╯
╰━━╯        ╰╯`,
    `╭━━╮   ╭╭╭╮
┃▔╲┣━━╈╈╈╈━━╮
┃┈┈▏   ╰╯╯╯╭╮┫
┃┈--╭━━━━━━╈╈╯
╰━━╯        ╰╯`,
    `╭━━╮╭╭╭╮
┃▔╲┣╈╈╈╈━━━╮
┃┈┈▏╰╯╯╯╭╮━┫
┃┈--╭━━━━╈╈━╯
╰━━╯        ╰╯`,
    `╭━━╮   ╭╭╭╮
┃▔╲┣━━╈╈╈╈━━╮
┃┈┈▏   ╰╯╯╯╭╮┫
┃┈--╭━━━━━━╈╈╯
╰━━╯        ╰╯`,
    `╭━━╮╭╭╭╮
┃▔╲┣╈╈╈╈━━━╮
┃┈┈▏╰╯╯╯╭╮━┫
┃┈--╭━━━━╈╈━╯
╰━━╯        ╰╯`,
    `╭━━╮   ╭╭╭╮
┃▔╲┣━━╈╈╈╈━━╮
┃┈┈▏   ╰╯╯╯╭╮┫
┃┈--╭━━━━━━╈╈╯
╰━━╯        ╰╯`,
    `              .               .   ╭
╭━━╮╭╭╭╮           ╭ ╯
┃▔╲┣╈╈╈╈━━━╮╭╯╭
┃┈┈▏╰╯╯╯╭╮━┫  
┃┈--╭━━━━╈╈━╯╰╮╰
╰━━╯        ╰╯...-    ╰ ╮
   .         . .  .  .. . . .  . .. .  ╰

🔥 *@${m.sender.split('@')[0]} se ha corrido gracias a @${who.split('@')[0]}.*`
  ];

  let { key } = await conn.sendMessage(m.chat, { text: `${emoji} Iniciando Chaqueta...` });

  for (let frame of chaqueta) {
    await conn.sendMessage(m.chat, {
      text: frame,
      edit: key,
      mentions: conn.parseMention(frame)
    });
  }
};

handler.command = ['jalame', 'jalamela', 'chaqueteame', 'chaqueta'];
handler.group = true;
handler.register = true;

export default handler;
