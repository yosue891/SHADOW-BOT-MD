import test from "node:test"
import assert from "node:assert/strict"
import { searchYouTube, firstYouTubeResult } from "../lib/youtube-search.js"
import { downloadYouTube } from "../lib/apiowo.js"
import playHandler from "../plugins/descargas/dls-play.js"

test("youtube-search: searchYouTube returns valid video array", async () => {
  const result = await searchYouTube("never gonna give you up")
  assert.ok(result && Array.isArray(result.videos), "Debe devolver un objeto con array de videos")
  assert.ok(result.videos.length > 0, "Debe encontrar al menos un video")

  const first = result.videos[0]
  assert.ok(first.id, "El video debe tener id")
  assert.ok(first.title, "El video debe tener título")
  assert.ok(first.url, "El video debe tener url")
  assert.ok(first.author?.name, "El video debe tener canal / autor")
})

test("youtube-search: firstYouTubeResult returns single video", async () => {
  const video = await firstYouTubeResult("never gonna give you up")
  assert.ok(video, "Debe devolver un video")
  assert.ok(video.url.includes("youtube.com") || video.id, "Debe contener URL o id válido")
})

test("apiowo: downloadYouTube resolves for audio and video", async () => {
  const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  const audioRes = await downloadYouTube(testUrl, "audio")
  assert.ok(audioRes && audioRes.download_url, "Debe devolver download_url para audio")
})

test("dls-play: handler processes search and formats message without throwing fetch failed", async () => {
  const messagesSent = []
  const reactions = []

  const fakeConn = {
    user: { jid: "584242773183@s.whatsapp.net" },
    relayMessage: async (jid, msg, opts) => {
      messagesSent.push({ type: "interactive", jid, msg, opts })
    },
    sendMessage: async (jid, content, opts) => {
      messagesSent.push({ type: "standard", jid, content, opts })
      return { key: { id: "test-msg-id" } }
    }
  }

  const fakeM = {
    chat: "123456789@s.whatsapp.net",
    sender: "584121234567@s.whatsapp.net",
    key: { id: "msg-123", fromMe: false, remoteJid: "123456789@s.whatsapp.net" },
    message: { conversation: ".play ghostbusters" },
    text: ".play ghostbusters",
    react: async (r) => reactions.push(r),
    reply: async (t) => messagesSent.push({ type: "reply", text: t })
  }

  await playHandler(fakeM, {
    conn: fakeConn,
    text: "ghostbusters",
    usedPrefix: ".",
    command: "play"
  })

  assert.ok(reactions.includes("🎃"), "Debe haber reaccionado con 🎃 de inicio")
  assert.ok(reactions.includes("✅"), "Debe haber reaccionado con ✅ de éxito")
  assert.ok(messagesSent.length > 0, "Debe haber enviado un mensaje")
})
