import fetch from "node-fetch";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    const prompt = args.join(" ").trim();

    if (!prompt)
      throw new Error(
        `Usage: ${usedPrefix}${command} <prompt>\n\nExample:\n${usedPrefix}${command} A woman giving a motivation quote`
      );

    // 🌀 Start generation
    const msg = await conn.sendMessage(m.chat, {
      text: `🎥 *Veo3-v3 Generation Started...*\n🧠 Prompt: ${prompt}\n⏳ Please wait...`,
    });

    // 🔹 Create generation task
    const create = await fetch(
      `https://omegatech-api.dixonomega.tech/api/ai/Veo3-v3?prompt=${encodeURIComponent(prompt)}`
    ).then((res) => res.json());

    if (!create?.success || !create?.task_id)
      throw new Error(`❌ Failed to create task.\nResponse: ${JSON.stringify(create)}`);

    const taskId = create.task_id;
    const checkUrl = `https://omegatech-api.dixonomega.tech/api/ai/Veo3-v3-status?task_id=${taskId}`;

    // 🔄 Poll for completion
    let videoUrl;
    const dots = ["◐", "◓", "◑", "◒"];

    for (let i = 0; i < 60; i++) {
      const status = await fetch(checkUrl).then((r) => r.json()).catch(() => ({}));

      if (status?.status?.toLowerCase() === "success" && status?.video_url) {
        videoUrl = status.video_url;
        break;
      }

      await conn.sendMessage(m.chat, {
        edit: msg.key,
        text: `${dots[i % dots.length]} *Generating video...*\n🧠 Prompt: ${prompt}\nProgress: ${
          status?.status || "Pending"
        }`,
      });

      await new Promise((r) => setTimeout(r, 5000));
    }

    if (!videoUrl)
      throw new Error("⚠️ Generation pending or failed. Try again later.");

    // 🧩 Send result
    await conn.sendMessage(m.chat, { delete: msg.key });
    await conn.sendMessage(
      m.chat,
      {
        video: { url: videoUrl },
        caption: `✅ *Veo3-v3 Video Generated!*\n🧠 *Prompt:* ${prompt}\n🎞️ *Source:* OMEGATECH API`,
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("💀 Veo3-v3 Error:", e);
    m.reply(`💀 *Veo3-v3 Generation Failed.*\n⚙️ Error: ${e.message}\n🌐 API by *OMEGATECH*`);
  }
};

handler.help = ["veo3 <prompt>"];
handler.tags = ["ai"];
handler.command = /^veo3$/i;
handler.premium = false;
handler.limit = true;

export default handler;
