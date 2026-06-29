const toM = (a) => '@' + a.split('@')[0];
function handler(m, {groupMetadata}) {
  const ps = groupMetadata.participants.map((v) => v.id);
  const a = ps[Math.floor(Math.random() * ps.length)];
  let b;
  do b = ps[Math.floor(Math.random() * ps.length)];
  while (b === a);
  m.reply(`*${toM(a)}, Deberías casarte 💍 con ${toM(b)}, hacen una bonita pareja 💓*`, null, {
    mentions: [a, b],
  });
}
handler.help = ['formarpareja'];
handler.tags = ['fun'];
handler.command = ['formarpareja', 'formarparejas'];
handler.group = true;
handler.register = true;

export default handler;
