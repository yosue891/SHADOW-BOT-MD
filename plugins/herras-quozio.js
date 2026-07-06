import fetch from "node-fetch";

let handler = async (m, { conn, usedPrefix, args, command }) => {
  let text;
  if (args.length >= 1) {
    text = args.join(" ");
  } else if (m.quoted && m.quoted.text) {
    text = m.quoted.text;
  } else {
    throw `❒ Ingresa una frase o responde a un mensaje que quieras convertir en cita.\n\n✐ Ejemplo:\n${usedPrefix + command} El arte es la expresión más pura del alma.`;
  }

  const quote = await createQuote(m.name, text);

  await conn.sendFile(
    m.chat,
    quote,
    '',
    `「✦」Cita generada\n\n✐ Autor » *${m.name}*\nⴵ Estilo » *Quozio aleatorio*\n🜸 Fuente » *quozio.com*`,
    m,
    { ...rcanal }
  );
};

handler.tags = ['tools'];
handler.command = handler.help = ["quozio"];
export default handler;

// api
async function createQuote(author, message) {
  const host = "https://quozio.com/";
  let path = "api/v1/quotes";

  const body = JSON.stringify({
    author: author,
    quote: message,
  });

  const quote = await fetch(host + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body,
  }).then(res => res.json());

  const quoteId = quote["quoteId"];

  path = "api/v1/templates";
  const templates = await fetch(host + path)
    .then(res => res.json())
    .then(val => val["data"]);

  const index = Math.floor(Math.random() * templates.length);
  const templateId = templates[index]["templateId"];

  path = `api/v1/quotes/${quoteId}/imageUrls?templateId=${templateId}`;
  const imageUrl = await fetch(host + path)
    .then(res => res.json())
    .then(val => val["medium"]);

  return imageUrl;
}
