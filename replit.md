# SHADOW-BOT-MD

## Project overview

SHADOW-BOT-MD is a Node.js WhatsApp multi-device bot built with Baileys. The
existing command and plugin structure is preserved; the main entry point is
`src/index.js`.

## Running on Replit

1. Install dependencies with `npm install`.
2. Start the bot with `npm start`.
3. On the first start, choose QR or the 8-digit pairing code and complete the
   WhatsApp linking flow from the console.

The main session is stored under `Sessions/Principal` and is intentionally
ignored by Git. Keep the session folder between restarts so the bot does not
need to be linked again.

## User preferences

- Keep the existing SHADOW-BOT-MD name and command logic.
- Prefer small, compatible fixes over replacing the bot's structure.