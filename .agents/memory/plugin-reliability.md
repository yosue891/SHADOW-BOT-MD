---
name: Plugin dispatch reliability
description: Runtime safeguards for a large WhatsApp plugin set where one failing plugin must not silence later commands.
---

Plugin dispatch should reset stateful regular expressions before matching and isolate `all`, `before`, and command execution failures so one plugin cannot stop or silently swallow the message flow.

**Why:** A failed plugin hook or a global regular expression retaining `lastIndex` can make valid commands appear to receive no response.

**How to apply:** Preserve these safeguards when extending the dispatcher or adding plugin aliases; keep user-visible error replies inside the command execution boundary.