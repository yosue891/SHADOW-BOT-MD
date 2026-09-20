const handler = async (m, { conn }) => {
  let txt = '';
  try {    
    const groups = Object.entries(conn.chats).filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats);
    const totalGroups = groups.length;
    for (let i = 0; i < groups.length; i++) {
      const [jid, chat] = groups[i];
      const groupMetadata = ((conn.chats[jid] || {}).metadata || (await conn.groupMetadata(jid).catch((_) => null))) || {};
      const participants = groupMetadata.participants || [];
      const bot = participants.find((u) => conn.decodeJid(u.id) === conn.user.jid) || {};
      const isBotAdmin = bot?.admin || false;
      const isParticipant = participants.some((u) => conn.decodeJid(u.id) === conn.user.jid);
      const participantStatus = isParticipant ? '👤 Participante' : '❌ Ex participante';
      const totalParticipants = participants.length;
      txt += `*◉ Grupo ${i + 1}*
      *➤ Nombre:* ${await conn.getName(jid)}
      *➤ ID:* ${jid}
      *➤ Admin:* ${isBotAdmin ? '✔ Sí' : '❌ No'}
      *➤ Estado:* ${participantStatus}
      *➤ Total de Participantes:* ${totalParticipants}
      *➤ Link:* ${isBotAdmin ? `https://chat.whatsapp.com/${await conn.groupInviteCode(jid) || '--- (Error) ---'}` : '--- (No admin) ---'}\n\n`;
    }
    m.reply(`🎄🌌 *Shadow Garden Reporte Navideño de Grupos* 🎅\n\n❄️ *—◉ Total de dominios vigilados:* ${totalGroups}\n\n${txt}\n✨ Las sombras celebran bajo la nieve, pero nunca dejan de observar...`.trim());
  } catch {
    const groups = Object.entries(conn.chats).filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats);
    const totalGroups = groups.length;
    for (let i = 0; i < groups.length; i++) {
      const [jid, chat] = groups[i];
      const groupMetadata = ((conn.chats[jid] || {}).metadata || (await conn.groupMetadata(jid).catch((_) => null))) || {};
      const participants = groupMetadata.participants || [];
      const bot = participants.find((u) => conn.decodeJid(u.id) === conn.user.jid) || {};
      const isBotAdmin = bot?.admin || false;
      const isParticipant = participants.some((u) => conn.decodeJid(u.id) === conn.user.jid);
      const participantStatus = isParticipant ? '👤 Participante' : '❌ Ex participante';
      const totalParticipants = participants.length;    
      txt += `*◉ Grupo ${i + 1}*
      *➤ Nombre:* ${await conn.getName(jid)}
      *➤ ID:* ${jid}
      *➤ Admin:* ${isBotAdmin ? '✔ Sí' : '❌ No'}
      *➤ Estado:* ${participantStatus}
      *➤ Total de Participantes:* ${totalParticipants}
      *➤ Link:* ${isBotAdmin ? '--- (Error) ---' : '--- (No admin) ---'}\n\n`;
    }
    m.reply(`🎄👾 *Shadow Garden Reporte Navideño de Grupos* 🌌\n\n❄️ *—◉ Total de dominios vigilados:* ${totalGroups}\n\n${txt}\n✨ Incluso en navidad, las sombras nunca descansan...`.trim());
  }    
};
handler.help = ['groups', 'grouplist'];
handler.tags = ['owner'];
handler.command = ['listgroup', 'gruposlista', 'grouplist', 'listagrupos']
handler.rowner = true;
handler.private = true

export default handler;
