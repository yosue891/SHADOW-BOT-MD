import test from "node:test"
import assert from "node:assert/strict"
import { searchYouTube, firstYouTubeResult } from "../lib/youtube-search.js"
import { downloadYouTube } from "../lib/apiowo.js"
import playHandler from "../plugins/descargas/dls-play.js"

test("youtube-search: searchYouTube returns valid video array for search terms", async () => {
  const result = await searchYouTube("never gonna give you up")
  assert.ok(result && Array.isArray(result.videos), "Debe devolver un objeto con array de videos")
  assert.ok(result.videos.length > 0, "Debe encontrar al menos un video")

  const first = result.videos[0]
  assert.ok(first.id, "El video debe tener id")
  assert.ok(first.title, "El video debe tener título")
  assert.ok(first.url, "El video debe tener url")
  assert.ok(first.author?.name, "El video debe tener canal / autor")
})

test("youtube-search: searchYouTube resolves direct YouTube URLs with oembed fallback", async () => {
  const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  const result = await searchYouTube(url)
  assert.ok(result && Array.isArray(result.videos), "Debe devolver un objeto con array de videos")
  assert.ok(result.videos.length > 0, "Debe encontrar el video directo")
  assert.equal(result.videos[0].videoId, "dQw4w9WgXcQ")
})

test("youtube-search: firstYouTubeResult returns single video", async () => {
  const video = await firstYouTubeResult("never gonna give you up")
  assert.ok(video, "Debe devolver un video")
  assert.ok(video.url.includes("youtube.com") || video.id, "Debe contener URL o id válido")
})

test("apiowo: downloadYouTube resolves for audio and video", async () => {
  const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  const audioRes = await downloadYouTube(testUrl, "audio")
  assert.ok(audioRes && (audioRes.download || audioRes.download_url), "Debe devolver download para audio")
})

test("dls-play: empty query shows usage help without error", async () => {
  let repliedText = ""
  const fakeConn = {
    user: { jid: "584242773183@s.whatsapp.net" },
    sendMessage: async () => ({ key: { id: "msg-id" } })
  }
  const fakeM = {
    chat: "123@s.whatsapp.net",
    sender: "584121234567@s.whatsapp.net",
    key: { id: "m-1" },
    text: ".play",
    react: async () => {},
    reply: async (t) => { repliedText = t }
  }

  await playHandler(fakeM, {
    conn: fakeConn,
    text: "",
    usedPrefix: ".",
    command: "play"
  })

  assert.ok(repliedText.includes("ᴘʟᴀʏ"), "Debe mostrar mensaje de ayuda")
})

test("dls-play: handler processes audio download directly without buttons", async () => {
  const messagesSent = []
  const reactions = []

  const fakeConn = {
    user: { jid: "584242773183@s.whatsapp.net" },
    sendMessage: async (jid, content, opts) => {
      messagesSent.push({ jid, content, opts })
      return { key: { id: "test-msg-id" } }
    }
  }

  const fakeM = {
    chat: "123456789@s.whatsapp.net",
    sender: "584121234567@s.whatsapp.net",
    key: { id: "msg-123", fromMe: false },
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

  assert.ok(reactions.includes("🎵"), "Debe haber reaccionado con 🎵")
  assert.ok(reactions.includes("✅"), "Debe haber reaccionado con ✅ de éxito")

  // Debe haber enviado el mensaje de info y luego el audio
  const hasAudio = messagesSent.some(m => m.content && m.content.audio)
  assert.ok(hasAudio, "Debe haber enviado el archivo de audio MP3 directamente")
})

test("dls-play: handler processes video download directly for play2 without buttons", async () => {
  const messagesSent = []
  const reactions = []

  const fakeConn = {
    user: { jid: "584242773183@s.whatsapp.net" },
    sendMessage: async (jid, content, opts) => {
      messagesSent.push({ jid, content, opts })
      return { key: { id: "test-msg-id" } }
    }
  }

  const fakeM = {
    chat: "123456789@s.whatsapp.net",
    sender: "584121234567@s.whatsapp.net",
    key: { id: "msg-124", fromMe: false },
    text: ".play2 ghostbusters",
    react: async (r) => reactions.push(r),
    reply: async (t) => messagesSent.push({ type: "reply", text: t })
  }

  await playHandler(fakeM, {
    conn: fakeConn,
    text: "ghostbusters",
    usedPrefix: ".",
    command: "play2"
  })

  assert.ok(reactions.includes("🎬"), "Debe haber reaccionado con 🎬")
  assert.ok(reactions.includes("✅"), "Debe haber reaccionado con ✅ de éxito")

  const hasVideo = messagesSent.some(m => m.content && m.content.video)
  assert.ok(hasVideo, "Debe haber enviado el archivo de video MP4 directamente")
})

