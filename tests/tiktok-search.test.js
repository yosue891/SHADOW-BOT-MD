import test from "node:test"
import assert from "node:assert/strict"
import tiktokHandler from "../plugins/herramientas/searchs-tiktok.js"

test("tiktoksearch: empty query returns instructions", async () => {
  let replyText = ""
  const fakeConn = {
    reply: (chat, text) => { replyText = text }
  }
  const fakeM = {
    chat: "123@s.whatsapp.net",
    react: async () => {}
  }

  await tiktokHandler(fakeM, {
    conn: fakeConn,
    text: "",
    usedPrefix: "."
  })

  assert.ok(replyText.includes("Por favor, ingresa"), "Debe pedir término de búsqueda o enlace")
})

test("tiktoksearch: executes with APIOWO integration", async () => {
  const sent = []
  const reactions = []
  const fakeConn = {
    reply: (chat, text) => { sent.push({ type: "reply", text }) },
    sendMessage: async (chat, content, opts) => {
      sent.push({ type: "send", chat, content, opts })
      return { key: { id: "msg-id" } }
    }
  }
  const fakeM = {
    chat: "123@s.whatsapp.net",
    react: async (r) => { reactions.push(r) }
  }

  await tiktokHandler(fakeM, {
    conn: fakeConn,
    text: "gatos graciosos",
    usedPrefix: "."
  })

  assert.ok(reactions.includes("🕒"), "Debe reaccionar con 🕒 al iniciar")
  const hasNotice = sent.some(s => s.text?.includes("APIOWO"))
  assert.ok(hasNotice, "Debe mostrar aviso de búsqueda con APIOWO")
})
