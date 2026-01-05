import fs from 'fs';
import path from 'path';

let handler = async (m, { conn, usedPrefix }) => {
  let who = (m.mentionedJid && m.mentionedJid.length > 0)
    ? m.mentionedJid[0]
    : (m.quoted ? m.quoted.sender : m.sender);

  const name = await conn.getName(who).catch(() => who.split('@')[0]);
  const name2 = await conn.getName(m.sender).catch(() => m.sender.split('@')[0]);

  if (typeof m.react === 'function') m.react('👋');

  let str;
  if (m.mentionedJid && m.mentionedJid.length > 0) {
    str = `\`${name2}\` *hola* \`${name || who}\` *¿cómo estás?*`;
  } else if (m.quoted) {
    str = `\`${name2}\` *hola* \`${name || who}\` *¿cómo te encuentras hoy?*`;
  } else {
    str = `\`${name2}\` *saluda a todos los integrantes del grupo, ¿cómo se encuentran?*`.trim();
  }

  if (m.isGroup) {
    const videos = [
      'https://files.catbox.moe/2akfd1.mp4',
      'https://files.catbox.moe/95gidx.mp4',
      'https://files.catbox.moe/f31dxs.mp4',
      'https://files.catbox.moe/ia2xt1.mp4',
      'https://files.catbox.moe/5p0m2e.mp4',
      'https://files.catbox.moe/2akfd1.mp4', // duplicada en tu lista, la mantenemos
      'https://files.catbox.moe/u1ljt8.mp4',
      'https://files.catbox.moe/d9z71j.mp4',
      'https://files.catbox.moe/ng6lk2.mp4',
      'https://files.catbox.moe/s7fm8r.mp4'
    ];
    const video = videos[Math.floor(Math.random() * videos.length)];

    const mentions = who ? [who] : [];
    await conn.sendMessage(
      m.chat,
      { video: { url: video }, gifPlayback: true, caption: str, mentions },
      { quoted: m }
    );
  }
};

handler.help = ['hello/hola @tag'];
handler.tags = ['anime'];
handler.command = ['hello', 'hola'];
handler.group = true;

export default handler;
