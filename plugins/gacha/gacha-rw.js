import fetch from 'node-fetch';
import { promises as fs } from 'fs';

async function loadCharacters() {
  try {
    await fs.access("./lib/characters.json");
  } catch {
    await fs.writeFile("./lib/characters.json", '{}');
  }
  const data = await fs.readFile("./lib/characters.json", 'utf-8');
  return JSON.parse(data);
}

function flattenCharacters(obj) {
  return Object.values(obj).flatMap(x => Array.isArray(x.characters) ? x.characters : []);
}

function getSeriesNameByCharacter(db, id) {
  return Object.entries(db).find(([, v]) => Array.isArray(v.characters) && v.characters.some(c => String(c.id) === String(id)))?.[1]?.name || 'Desconocido';
}

async function buscarImagenDelirius(tag) {
  const q = String(tag).trim().toLowerCase().replace(/\s+/g, '_');
  const urls = [
    'https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=' + q,
    'https://danbooru.donmai.us/posts.json?tags=' + q,
    global.APIs.delirius.url + "/search/gelbooru?query=" + q
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': "Mozilla/5.0", 'Accept': "application/json" } });
      const type = res.headers.get("content-type") || '';
      if (!res.ok || !type.includes("json")) continue;
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.post || json?.data || [];
      const imgs = arr.map(x => x?.file_url || x?.large_file_url || x?.image || x?.media_asset?.variants?.[0]?.url)
                      .filter(u => typeof u === "string" && /\.(jpe?g|png)$/.test(u));
      if (imgs.length) return imgs;
    } catch {}
  }
  return [];
}

const handler = async (m, { conn, usedPrefix, command }) => {
  // 🔥 Se eliminó la verificación que mostraba el mensaje ❀
  
  const chats = global.db.data.chats;
  if (!chats[m.chat]) chats[m.chat] = {};
  const chatData = chats[m.chat];
  if (!chatData.characters) chatData.characters = {};
  
  if (!chatData.gacha && m.isGroup) {
    return m.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + usedPrefix + "gacha on*");
  }

  const userData = global.db.data.users[m.sender];
  const now = Date.now();
  if (userData.lastRoll && now < userData.lastRoll) {
    const wait = Math.ceil((userData.lastRoll - now) / 1000);
    const min = Math.floor(wait / 60);
    const sec = wait % 60;
    let msg = '';
    if (min > 0) msg += min + " minuto" + (min !== 1 ? 's' : '') + " ";
    if (sec > 0 || msg === '') msg += sec + " segundo" + (sec !== 1 ? 's' : '');
    return m.reply("ꕥ Debes esperar *" + msg.trim() + "* para usar *" + (usedPrefix + command) + "* de nuevo.");
  }

  try {
    const dbChars = await loadCharacters();
    const allChars = flattenCharacters(dbChars);
    const char = allChars[Math.floor(Math.random() * allChars.length)];
    const id = String(char.id);
    const serie = getSeriesNameByCharacter(dbChars, char.id);
    const tag = String(char.tags?.[0] || '').trim().toLowerCase().replace(/\s+/g, '_');
    const imgs = await buscarImagenDelirius(tag);
    const img = imgs[Math.floor(Math.random() * imgs.length)];
    if (!img) return m.reply("ꕥ No se encontró imágenes para el personaje *" + char.name + '*.');

    if (!global.db.data.characters) global.db.data.characters = {};
    if (!global.db.data.characters[id]) global.db.data.characters[id] = {};
    const charData = global.db.data.characters[id];
    const prev = global.db.data.characters?.[id] || {};
    charData.name = String(char.name || "Sin nombre");
    charData.value = typeof prev.value === "number" ? prev.value : Number(char.value) || 100;
    charData.votes = Number(charData.votes || prev.votes || 0);
    charData.reservedBy = m.sender;
    charData.reservedUntil = now + 20000;
    charData.expiresAt = now + 60000;

    const claimedBy = charData.user ? (global.db.data.users[charData.user]?.name?.trim() || (await conn.getName(charData.user).catch(() => charData.user.split('@')[0]))) : 'desconocido';
    const caption = "❀ Nombre » *" + charData.name + "*\n⚥ Género » *" + (char.gender || 'Desconocido') + "*\n✰ Valor » *" + charData.value.toLocaleString() + "*\n♡ Estado » *" + (charData.user ? "Reclamado por " + claimedBy : "Libre") + "*\n❖ Fuente » *" + serie + '*';

    const sent = await conn.sendFile(m.chat, img, charData.name + ".jpg", caption, m);
    chatData.lastRolledId = id;
    chatData.lastRolledMsgId = sent.key?.id || null;
    chatData.lastRolledCharacter = { id, name: charData.name, media: img };
    userData.lastRoll = now + 900000;
  } catch (err) {
    await conn.reply(m.chat, "⚠︎ Se ha producido un problema.\n> Usa " + usedPrefix + "report para informarlo.\n\n" + err.message, m);
  }
};

handler.help = ['rw', "rollwaifu"];
handler.tags = ['gacha'];
handler.command = ["rollwaifu", 'rw', "roll"];
handler.group = true;

export default handler;
