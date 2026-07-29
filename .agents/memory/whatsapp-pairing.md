---
name: WhatsApp pairing stability
description: Manual pairing must use one code request and one socket until the user finishes linking.
---

Manual WhatsApp linking is sensitive to socket replacement: requesting a pairing code from multiple lifecycle paths or reconnecting after the code is displayed invalidates the code before the user can enter it.

**Why:** Baileys can emit connection events while the initial socket is still becoming usable, so duplicate pairing requests race each other and make the console appear to repeatedly close the session.

**How to apply:** Keep the pairing-code request in one guarded path, and do not reload or replace the socket during manual linking after a code has been issued. Only start a new attempt manually after the user has had time to use or abandon the code.