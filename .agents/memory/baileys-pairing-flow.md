---
name: Baileys pairing flow
description: Durable guidance for keeping WhatsApp pairing-code sessions stable.
---

The pairing code must be requested from the same ready socket that was created
after the login method and phone number are known. Do not replace that socket
while the code is still active; rotating it can invalidate the code and appear
as an immediate connection-closed failure.

**Why:** An unauthenticated Baileys channel is short-lived and pairing state is
bound to the socket. Readiness checks that rely on nonstandard convenience
properties can also miss an open WebSocket.

**How to apply:** Keep one guarded pairing request, accept the WebSocket
`readyState === 1` as an open state, and use delayed, bounded reconnection only
after the current pairing window expires or WhatsApp reports an unrecoverable
authentication error.