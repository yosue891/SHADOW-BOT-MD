---
name: Ourin Baileys compatibility
description: Decision for the bot's Baileys provider and compatibility strategy.
---

The bot uses Ourin Baileys through the `@whiskeysockets/baileys` npm alias.
Existing imports should remain unchanged because the project has many plugins
that depend on Baileys message, media, interactive-button, and protobuf APIs.

**Why:** A direct package replacement would require editing dozens of plugins
and could break buttons, native-flow messages, media helpers, or sub-bot
connections. The alias preserves the current import contract while using
Ourin's implementation.

**How to apply:** Keep the alias in the dependency manifest and validate
`makeWASocket`, auth state, pairing, `proto`, message generators, media helpers,
and interactive-message exports before changing provider versions.