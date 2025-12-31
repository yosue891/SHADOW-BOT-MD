import { promises as fs } from 'fs';

async function load() {
  const data = await fs.readFile('./lib/characters.json', 'utf-8');
  return JSON.parse(data);
}

function get(series) {
  return Object.values(series).flatMap(s => Array.isArray(s.characters) ? s.characters : []);
}

let pending = {};

let handler = async (m, { conn, usedPrefix }) => {
  if (!global.db.data.chats?.[m.chat]?.gacha && m.isGroup) {
    return m.reply(`ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con:\n» *${usedPrefix}gacha on*`);
  }
  try {
    const senderUser = global.db.data.users[m.sender];
    if (!Array.isArray(senderUser.characters)) senderUser.characters = [];

    const mentioned = await m.mentionedJid;
    const target = mentioned[0] || (m.quoted && m.quoted.sender);
    if (!target || typeof target !== "string" || !target.includes('@')) {
      return m.reply("❀ Debes mencionar a quien quieras regalarle tus personajes.");
    }

    const targetUser = global.db.data.users[target];
    if (!targetUser) {
      return m.reply("ꕥ El usuario mencionado no está registrado.");
    }
    if (!Array.isArray(targetUser.characters)) targetUser.characters = [];

    const seriesData = await load();
    const allCharacters = get(seriesData);
    const senderChars = senderUser.characters;

    const charList = senderChars.map(id => {
      const charData = global.db.data.characters?.[id] || {};
      const charInfo = allCharacters.find(c => c.id === id);
      const value = typeof charData.value === 'number'
        ? charData.value
        : typeof charInfo?.value === 'number'
        ? charInfo.value
        : 0;
      return {
        id,
        name: charData.name || charInfo?.name || "ID:" + id,
        value
      };
    });

    if (charList.length === 0) {
      return m.reply("ꕥ No tienes personajes para regalar.");
    }

    const totalValue = charList.reduce((sum, c) => sum + c.value, 0);

    const targetName = await (async () =>
      targetUser.name?.trim() ||
      (await conn.getName(target).catch(() => target.split('@')[0])))();
    const senderName = await (async () =>
      senderUser.name?.trim() ||
      (await conn.getName(m.sender).catch(() => m.sender.split('@')[0])))();

    pending[m.sender] = {
      sender: m.sender,
      to: target,
      value: totalValue,
      count: charList.length,
      ids: charList.map(c => c.id),
      chat: m.chat,
      timeout: setTimeout(() => delete pending[m.sender], 60000)
    };

    await conn.reply(
      m.chat,
      `「✿」 *${senderName}*, ¿confirmas regalar todo tu harem a *${targetName}*?\n\n❏ Personajes a transferir: *${charList.length}*\n❏ Valor total: *${totalValue.toLocaleString()}*\n\n✐ Para confirmar responde a este mensaje con "Aceptar".\n> Esta acción no se puede deshacer, revisa bien los datos antes de confirmar.`,
      m,
      { mentions: [target] }
    );
  } catch (err) {
    await conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${err.message}`,
      m
    );
  }
};

handler.before = async (m, { conn }) => {
  try {
    const trade = pending[m.sender];
    if (!trade || m.text?.trim().toLowerCase() !== "aceptar") return;
    if (m.sender !== trade.sender || trade.chat !== m.chat) return;
    if (typeof trade.to !== "string" || !trade.to.includes('@')) return;

    const senderUser = global.db.data.users[m.sender];
    const targetUser = global.db.data.users[trade.to];

    for (const id of trade.ids) {
      const char = global.db.data.characters?.[id];
      if (!char || char.user !== m.sender) continue;

      char.user = trade.to;
      if (!targetUser.characters.includes(id)) targetUser.characters.push(id);
      senderUser.characters = senderUser.characters.filter(c => c !== id);

      if (senderUser.sales?.[id]?.user === m.sender) delete senderUser.sales[id];
      if (senderUser.favorite === id) delete senderUser.favorite;
      if (global.db.data.users[m.sender]?.favorite === id) {
        delete global.db.data.users[m.sender].favorite;
      }
    }

    clearTimeout(trade.timeout);
    delete pending[m.sender];

    const targetName = await (async () =>
      targetUser.name?.trim() ||
      (await conn.getName(trade.to).catch(() => trade.to.split('@')[0])))();

    await m.reply(
      `「✿」 Has regalado con éxito todos tus personajes a *${targetName}*!\n\n> ❏ Personajes regalados: *${trade.count}*\n> ⴵ Valor total: *${trade.value.toLocaleString()}*`
    );
    return true;
  } catch (err) {
    await conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *report* para informarlo.\n\n${err.message}`,
      m
    );
  }
};

handler.help = ["giveallharem"];
handler.tags = ["gacha"];
handler.command = ["giveallharem"];
handler.group = true;

export default handler;
