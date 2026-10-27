import test from "node:test"
import assert from "node:assert/strict"
import pinterestHandler from "../plugins/herramientas/searchs-pinterest.js"

test("pinterest: empty query returns prompt", async () => {
  let repliedText = ""
  const fakeConn = {
    reply: (chat, text) => { repliedText = text }
  }
  const fakeM = {
    chat: "123@s.whatsapp.net",
    react: async () => {}
  }

  await pinterestHandler(fakeM, {
    conn: fakeConn,
    text: ""
  })

  assert.ok(repliedText.includes("ingresa lo que deseas"), "Debe pedir qué buscar")
})

test("pinterest: sends images as album with sendAdonix", { timeout: 20000 }, async () => {
  let sendAdonixCalled = false
  let mediasSent = []
  const reactions = []

  const fakeConn = {
    reply: () => {},
    sendAdonix: async (chat, medias) => {
      sendAdonixCalled = true
      mediasSent = medias
      return { key: { id: "album-id" } }
    },
    sendMessage: async () => ({ key: { id: "msg-id" } }),
    relayMessage: async () => {},
    user: { id: "123@s.whatsapp.net" }
  }

  const fakeM = {
    chat: "123@s.whatsapp.net",
    react: async (r) => { reactions.push(r) }
  }

  await pinterestHandler(fakeM, {
    conn: fakeConn,
    text: "gatos"
  })

  assert.ok(reactions.includes("🗡️"), "Debe reaccionar con 🗡️")
  assert.ok(reactions.includes("✅"), "Debe haber completado con ✅")
  assert.ok(sendAdonixCalled, "Debe haber invocado sendAdonix para enviar como álbum")
  assert.ok(mediasSent.length >= 2, "El álbum debe tener 2 o más imágenes")
})
