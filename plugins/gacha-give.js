let handler = async (m, { conn, args, usedPrefix }) => {
  if (!global.db.data.chats?.[m.chat]?.gacha && m.isGroup) {
    return m.reply(`ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con:\n» *${usedPrefix}gacha on*`);
  }
  try {
    const senderUser = global.db.data.users[m.sender];
    if (!Array.isArray(senderUser.characters)) senderUser.characters = [];

    if (!args.length) {
      return m.reply("❀ Debes escribir el nombre del personaje y citar o mencionar al usuario que lo recibirá");
    }

    const mentioned = m.mentionedJid;
    const target = mentioned[0] || (m.quoted && m.quoted.sender);
    if (!target) {
      return m.reply("❀ Debes mencionar o citar el mensaje del destinatario.");
    }

    // Nombre del personaje
    const charName = m.quoted
      ? args.join(" ").toLowerCase().trim()
      : args.slice(0, -1).join(" ").toLowerCase().trim();

    // Buscar personaje reclamado por el remitente
    const charId = Object.keys(global.db.data.characters).find(id => {
      const c = global.db.data.characters[id];
      return typeof c.name === "string" && c.name.toLowerCase() === charName && c.user === m.sender;
    });

    if (!charId) {
      return m.reply(`ꕥ No se encontró el personaje *${charName}* o no está reclamado por ti.`);
    }

    const char = global.db.data.characters[charId];
    if (!senderUser.characters.includes(charId)) {
      return m.reply(`ꕥ *${char.name}* no está reclamado por ti.`);
    }

    const targetUser = global.db.data.users[target];
    if (!targetUser) {
      return m.reply("ꕥ El usuario mencionado no está registrado.");
    }
    if (!Array.isArray(targetUser.characters)) targetUser.characters = [];

    // Transferencia
    if (!targetUser.characters.includes(charId)) {
      targetUser.characters.push(charId);
    }
    senderUser.characters = senderUser.characters.filter(id => id !== charId);
    char.user = target;

    // Limpiar favoritos/ventas
    if (senderUser.sales?.[charId]?.user === m.sender) delete senderUser.sales[charId];
    if (senderUser.favorite === charId) delete senderUser.favorite;
    if (global.db.data.users[m.sender]?.favorite === charId) delete global.db.data.users[m.sender].favorite;

    const senderName = await (async () =>
      senderUser.name?.trim() ||
      (await conn.getName(m.sender).catch(() => m.sender.split('@')[0])))();
    const targetName = await (async () =>
      targetUser.name?.trim() ||
      (await conn.getName(target).catch(() => target.split('@')[0])))();

    await conn.reply(
      m.chat,
      `❀ *${char.name}* ha sido regalado a *${targetName}* por *${senderName}*.`,
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

handler.help = ["regalar"];
handler.tags = ["gacha"];
handler.command = ["givechar", "givewaifu", "regalar"];
handler.group = true;

export default handler;
