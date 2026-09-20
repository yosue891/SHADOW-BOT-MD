import { promises as fs } from 'fs';

async function loadCharacters() {
  const data = await fs.readFile("./lib/characters.json", "utf-8");
  return JSON.parse(data);
}

function getCharacterById(id, db) {
  return Object.values(db).flatMap(x => x.characters).find(c => c.id === id);
}

let handler = async (m, { conn, usedPrefix, command }) => {
  // 🔥 Se eliminó la verificación que mostraba el mensaje ❀

  const chatData = global.db.data.chats?.[m.chat] || {};
  if (!chatData.gacha && m.isGroup) {
    return m.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + usedPrefix + "gacha on*");
  }

  try {
    const userData = global.db.data.users[m.sender];
    const now = Date.now();

    // Cooldown de reclamo
    if (userData.lastClaim && now < userData.lastClaim) {
      const wait = Math.ceil((userData.lastClaim - now) / 1000);
      const min = Math.floor(wait / 60);
      const sec = wait % 60;
      let msg = '';
      if (min > 0) msg += min + " minuto" + (min !== 1 ? 's' : '') + " ";
      if (sec > 0 || msg === '') msg += sec + " segundo" + (sec !== 1 ? 's' : '');
      return m.reply("ꕥ Debes esperar *" + msg.trim() + "* para usar *" + (usedPrefix + command) + "* de nuevo.");
    }

    const lastCharName = chatData.lastRolledCharacter?.name || '';
    const validQuote = m.quoted?.id === chatData.lastRolledMsgId || (m.quoted?.text?.includes(lastCharName) && lastCharName);
    if (!validQuote) {
      return m.reply("❀ Debes citar un personaje válido para reclamar.");
    }

    const charId = chatData.lastRolledId;
    const dbChars = await loadCharacters();
    const char = getCharacterById(charId, dbChars);
    if (!char) return m.reply("ꕥ Personaje no encontrado en characters.json");

    if (!global.db.data.characters) global.db.data.characters = {};
    if (!global.db.data.characters[charId]) global.db.data.characters[charId] = {};
    const charData = global.db.data.characters[charId];

    charData.name = charData.name || char.name;
    charData.value = typeof charData.value === 'number' ? charData.value : char.value || 0;
    charData.votes = charData.votes || 0;

    // Protección temporal
    if (charData.reservedBy && charData.reservedBy !== m.sender && now < charData.reservedUntil) {
      let reservedName = await (async () => {
        try {
          const n = await conn.getName(charData.reservedBy);
          return n?.trim() ? n : charData.reservedBy.split('@')[0];
        } catch {
          return charData.reservedBy.split('@')[0];
        }
      })();
      const remaining = ((charData.reservedUntil - now) / 1000).toFixed(1);
      return m.reply("ꕥ Este personaje está protegido por *" + reservedName + "* durante *" + remaining + "s.*");
    }

    // Expiración
    if (charData.expiresAt && now > charData.expiresAt && !charData.user && !(charData.reservedBy && now < charData.reservedUntil)) {
      const expired = ((now - charData.expiresAt) / 1000).toFixed(1);
      return m.reply("ꕥ El personaje ha expirado » " + expired + 's.');
    }

    // Ya reclamado
    if (charData.user) {
      let claimedName = await (async () => {
        try {
          const n = await conn.getName(charData.user);
          return n?.trim() ? n : charData.user.split('@')[0];
        } catch {
          return charData.user.split('@')[0];
        }
      })();
      return m.reply("ꕥ El personaje *" + charData.name + "* ya ha sido reclamado por *" + claimedName + '*');
    }

    // Reclamar personaje
    charData.user = m.sender;
    charData.claimedAt = now;
    delete charData.reservedBy;
    delete charData.reservedUntil;
    userData.lastClaim = now + 1800000; // 30 min cooldown

    if (!Array.isArray(userData.characters)) userData.characters = [];
    if (!userData.characters.includes(charId)) userData.characters.push(charId);

    let userName = await (async () => {
      try {
        const n = await conn.getName(m.sender);
        return n?.trim() ? n : m.sender.split('@')[0];
      } catch {
        return m.sender.split('@')[0];
      }
    })();

    const charName = charData.name;
    const customMsg = userData.claimMessage;
    const ttl = typeof charData.expiresAt === "number" ? ((now - charData.expiresAt + 60000) / 1000).toFixed(1) : '∞';
    const claimText = customMsg
      ? customMsg.replace(/€user/g, '*' + userName + '*').replace(/€character/g, '*' + charName + '*')
      : '*' + charName + "* ha sido reclamado por *" + userName + '*';

    await conn.reply(m.chat, "❀ " + claimText + " (" + ttl + 's)', m);
  } catch (err) {
    await conn.reply(m.chat, "⚠︎ Se ha producido un problema.\n> Usa *" + usedPrefix + "report* para informarlo.\n\n" + err.message, m);
  }
};

handler.help = ['claim'];
handler.tags = ["gacha"];
handler.command = ["claim", 'c', 'reclamar'];
handler.group = true;

export default handler;
