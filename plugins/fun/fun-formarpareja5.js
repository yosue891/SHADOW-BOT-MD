let R = Math.random;
let Fl = Math.floor;
let toM = (a) => "@" + a.split("@")[0];
function handler(m, {groupMetadata}) {
  let ps = groupMetadata.participants.map((v) => v.id);
  let a = ps[Fl(R() * ps.length)];
  let b;
  do b = ps[Fl(R() * ps.length)];
  while (b === a);
  let c;
  do c = ps[Fl(R() * ps.length)];
  while (c === a || c === b);
  let d;
  do d = ps[Fl(R() * ps.length)];
  while (d === a || d === b || d === c);
  let e;
  do e = ps[Fl(R() * ps.length)];
  while (e === a || e === b || e === c || e === d);
  let f;
  do f = ps[Fl(R() * ps.length)];
  while (f === a || f === b || f === c || f === d || f === e);
  let g;
  do g = ps[Fl(R() * ps.length)];
  while (g === a || g === b || g === c || g === d || g === e || g === f);
  let h;
  do h = ps[Fl(R() * ps.length)];
  while (h === a || h === b || h === c || h === d || h === e || h === f || h === g);
  let i;
  do i = ps[Fl(R() * ps.length)];
  while (i === a || i === b || i === c || i === d || i === e || i === f || i === g || i === h);
  let j;
  do j = ps[Fl(R() * ps.length)];
  while (j === a || j === b || j === c || j === d || j === e || j === f || j === g || j === h || j === i);
  m.reply(
    `*_😍Las 5 mejores parejas del grupo😍_*
    
*_1.- ${toM(a)} y ${toM(b)}_*
- Esta pareja esta destinada a estar junta 💙

*_2.- ${toM(c)} y ${toM(d)}_*
- Esta pareja son dos pequeños tortolitos enamorados ✨

*_3.- ${toM(e)} y ${toM(f)}_*
- Ufff y que decir de esta pareja, ya hasta familia deberian tener 🤱🧑‍🍼

*_4.- ${toM(g)} y ${toM(h)}_*
- Estos ya se casaron en secreto 💍

*_5.- ${toM(i)} y ${toM(j)}_*
- Esta pareja se esta de luna de miel ✨🥵😍❤️*`,
    null,
    {
      mentions: [a, b, c, d, e, f, g, h, i, j],
    }
  );
}
handler.help = ["formarpareja5"];
handler.tags = ["fun"];
handler.command = ["formarpareja5"];
handler.register = true;
handler.group = true;
export default handler;
