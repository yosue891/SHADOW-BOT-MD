let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}
import fs from "fs";
import path from "path";
import axios from "axios";
const DEFAULT_AVATAR = "https://i.imgur.com/TuItj4L.png";

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function loadAvatarSafe(avatarUrl) {
  const { loadImage } = await _getCanvas();
  const localFallback = path.join(
    process.cwd(),
    "assets",
    "images",
    "pp-kosong.jpg",
  );

  try {
    if (!avatarUrl) {
      if (fs.existsSync(localFallback)) {
        const buffer = fs.readFileSync(localFallback);
        return await loadImage(buffer);
      }
      return await loadImage(DEFAULT_AVATAR);
    }

    if (
      avatarUrl === localFallback ||
      (typeof avatarUrl === "string" && avatarUrl.includes("pp-kosong"))
    ) {
      if (fs.existsSync(localFallback)) {
        const buffer = fs.readFileSync(localFallback);
        return await loadImage(buffer);
      }
    }

    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
      const response = await axios.get(avatarUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      return await loadImage(Buffer.from(response.data));
    }

    if (fs.existsSync(avatarUrl)) {
      const buffer = fs.readFileSync(avatarUrl);
      return await loadImage(buffer);
    }

    if (fs.existsSync(localFallback)) {
      const buffer = fs.readFileSync(localFallback);
      return await loadImage(buffer);
    }

    return await loadImage(DEFAULT_AVATAR);
  } catch (err) {
    try {
      if (fs.existsSync(localFallback)) {
        const buffer = fs.readFileSync(localFallback);
        return await loadImage(buffer);
      }
      return await loadImage(DEFAULT_AVATAR);
    } catch {
      return null;
    }
  }
}

function drawHexagonPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const xPos = x + r * Math.cos(angle);
    const yPos = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(xPos, yPos);
    else ctx.lineTo(xPos, yPos);
  }
  ctx.closePath();
}

async function createWideDiscordCard(
  username,
  avatarUrl,
  groupName,
  memberCount,
) {
  const { createCanvas } = await _getCanvas();
  const width = 1024;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#04150b";
  ctx.fillRect(0, 0, width, height);
  const bgGlow = ctx.createRadialGradient(width, height, 0, width, height, 600);
  bgGlow.addColorStop(0, "rgba(0, 180, 90, 0.55)");
  bgGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  const cardX = 50;
  const cardY = 50;
  const cardW = width - 100;
  const cardH = height - 100;
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 30);
  ctx.fill();
  ctx.stroke();
  const avatarSize = 180;
  const centerX = 200;
  const centerY = height / 2;
  ctx.save();
  ctx.shadowColor = "#00ff88";
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(centerX, centerY, avatarSize / 2 - 10, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  ctx.save();
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2);
  ctx.clip();

  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar)
      ctx.drawImage(
        avatar,
        centerX - avatarSize / 2,
        centerY - avatarSize / 2,
        avatarSize,
        avatarSize,
      );
  } catch (e) {
    ctx.fillStyle = "#333";
    ctx.fillRect(
      centerX - avatarSize / 2,
      centerY - avatarSize / 2,
      avatarSize,
      avatarSize,
    );
  }
  ctx.restore();
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 5;
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2 + 5);
  ctx.stroke();
  const textX = 350;
  ctx.fillStyle = "rgba(0, 255, 136, 0.16)";
  ctx.beginPath();
  ctx.roundRect(textX, 120, 170, 36, 18);
  ctx.fill();

  ctx.fillStyle = "#00ff88";
  ctx.font = "bold 18px Courier New";
  ctx.fillText("● CONNECTED", textX + 15, 144);
  ctx.font = "900 60px Arial";
  const nameMetric = ctx.measureText(username);

  // Bikin gradient khusus untuk teks
  const gradient = ctx.createLinearGradient(
    textX,
    0,
    textX + nameMetric.width,
    0,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#7dffb2");

  ctx.fillStyle = gradient;
  ctx.fillText(username, textX, 220);
  ctx.fillStyle = "#b8ffd2";
  ctx.font = "24px Arial";
  ctx.fillText(`Connected to: ${groupName}`, textX, 260);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.fillText(`MEMBERS: #${memberCount}`, textX, 320);
  ctx.beginPath();
  ctx.moveTo(width - 250, 350);
  ctx.lineTo(width - 50, 350);
  ctx.lineTo(width - 50, 340);
  ctx.strokeStyle = "rgba(0,255,136,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas.toBuffer("image/png");
}

async function createGoodbyeCard(username, avatarUrl, groupName, memberCount) {
  const { createCanvas } = await _getCanvas();
  const width = 1024;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0f0505";
  ctx.fillRect(0, 0, width, height);

  const bgGlow = ctx.createRadialGradient(width, 0, 0, width, 0, 600);
  bgGlow.addColorStop(0, "rgba(180, 0, 0, 0.4)");
  bgGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 50, 50, 0.08)";
  ctx.lineWidth = 1;
  const gridSize = 40;

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const cardX = 50;
  const cardY = 50;
  const cardW = width - 100;
  const cardH = height - 100;

  ctx.fillStyle = "rgba(50, 0, 0, 0.3)";
  ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 30);
  ctx.fill();
  ctx.stroke();

  const avatarSize = 180;
  const centerX = 200;
  const centerY = height / 2;

  ctx.save();
  ctx.shadowColor = "#ff0033";
  ctx.shadowBlur = 50;
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2 - 5);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2);
  ctx.clip();

  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar)
      ctx.drawImage(
        avatar,
        centerX - avatarSize / 2,
        centerY - avatarSize / 2,
        avatarSize,
        avatarSize,
      );
  } catch (e) {
    ctx.fillStyle = "#300";
    ctx.fillRect(
      centerX - avatarSize / 2,
      centerY - avatarSize / 2,
      avatarSize,
      avatarSize,
    );
  }
  ctx.restore();

  ctx.strokeStyle = "#ff0033";
  ctx.lineWidth = 5;
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2 + 5);
  ctx.stroke();

  const textX = 350;

  ctx.fillStyle = "rgba(255, 0, 50, 0.15)";
  ctx.beginPath();
  ctx.roundRect(textX, 120, 160, 36, 18);
  ctx.fill();

  ctx.fillStyle = "#ff0033";
  ctx.font = "bold 18px Courier New";
  ctx.fillText("● DISCONNECTED", textX + 15, 144);

  ctx.font = "900 60px Arial";
  const nameMetric = ctx.measureText(username);

  const gradient = ctx.createLinearGradient(
    textX,
    0,
    textX + nameMetric.width,
    0,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#ff4d4d");

  ctx.fillStyle = gradient;
  ctx.fillText(username, textX, 220);

  ctx.fillStyle = "#c0a0a0";
  ctx.font = "24px Arial";
  ctx.fillText(`Meninggalkan: ${groupName}`, textX, 260);

  ctx.fillStyle = "#ffcccc";
  ctx.font = "bold 20px Arial";
  ctx.fillText(`REMAINING: #${memberCount}`, textX, 320);

  ctx.beginPath();
  ctx.moveTo(width - 250, 350);
  ctx.lineTo(width - 50, 350);
  ctx.lineTo(width - 50, 340);
  ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas.toBuffer("image/png");
}

async function createWelcomeCardV4(
  username,
  avatarUrl,
  groupName,
  memberCount,
) {
  const { createCanvas } = await _getCanvas();
  const width = 1024;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background - Modern Dark Blue/Purple gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#0f0c29");
  bgGradient.addColorStop(0.5, "#302b63");
  bgGradient.addColorStop(1, "#24243e");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.beginPath();
  ctx.arc(width, 0, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, height, 200, 0, Math.PI * 2);
  ctx.fill();

  // Glassmorphism Card
  ctx.save();
  const cardX = 50,
    cardY = 50,
    cardW = width - 100,
    cardH = height - 100;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Avatar
  const avatarSize = 180;
  const avatarX = 150;
  const avatarY = height / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar)
      ctx.drawImage(
        avatar,
        avatarX - avatarSize / 2,
        avatarY - avatarSize / 2,
        avatarSize,
        avatarSize,
      );
  } catch {
    ctx.fillStyle = "#ccc";
    ctx.fillRect(
      avatarX - avatarSize / 2,
      avatarY - avatarSize / 2,
      avatarSize,
      avatarSize,
    );
  }
  ctx.restore();

  // Avatar Border
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#00d2ff";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Text Info
  const textStart = 300;

  // Welcome Label
  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "#00d2ff";
  ctx.fillText("WELCOME", textStart, 160);

  // Username
  ctx.font = "bold 60px Arial";
  ctx.fillStyle = "#ffffff";
  const cleanUsername =
    username.length > 15 ? username.substring(0, 15) + "..." : username;
  ctx.fillText(cleanUsername, textStart, 230);

  // Group Name
  ctx.font = "30px Arial";
  ctx.fillStyle = "#a0a0a0";
  ctx.fillText("to " + groupName, textStart, 280);

  // Member Count Tag
  const tagY = 320;
  const tagText = `Member #${memberCount}`;
  ctx.font = "bold 24px Arial";
  const tagWidth = ctx.measureText(tagText).width + 40;

  drawRoundedRect(ctx, textStart, tagY, tagWidth, 40, 20);
  ctx.fillStyle = "rgba(0, 210, 255, 0.15)";
  ctx.fill();
  ctx.strokeStyle = "#00d2ff";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#00d2ff";
  ctx.fillText(tagText, textStart + 20, tagY + 28);

  return canvas.toBuffer("image/png");
}

async function createGoodbyeCardV4(
  username,
  avatarUrl,
  groupName,
  memberCount,
) {
  const { createCanvas } = await _getCanvas();
  const width = 1024;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background - Dark Red/Black gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#1a0b0b");
  bgGradient.addColorStop(0.5, "#4a0e0e");
  bgGradient.addColorStop(1, "#240b0b");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.beginPath();
  ctx.arc(width, 0, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, height, 200, 0, Math.PI * 2);
  ctx.fill();

  // Glassmorphism Card
  ctx.save();
  const cardX = 50,
    cardY = 50,
    cardW = width - 100,
    cardH = height - 100;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 50, 50, 0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Avatar
  const avatarSize = 180;
  const avatarX = 150;
  const avatarY = height / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar)
      ctx.drawImage(
        avatar,
        avatarX - avatarSize / 2,
        avatarY - avatarSize / 2,
        avatarSize,
        avatarSize,
      );
  } catch {
    ctx.fillStyle = "#ccc";
    ctx.fillRect(
      avatarX - avatarSize / 2,
      avatarY - avatarSize / 2,
      avatarSize,
      avatarSize,
    );
  }
  ctx.restore();

  // Avatar Border
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#ff3333";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Text Info
  const textStart = 300;

  // Goodbye Label
  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "#ff3333";
  ctx.fillText("GOODBYE", textStart, 160);

  // Username
  ctx.font = "bold 60px Arial";
  ctx.fillStyle = "#ffffff";
  const cleanUsername =
    username.length > 15 ? username.substring(0, 15) + "..." : username;
  ctx.fillText(cleanUsername, textStart, 230);
  ctx.font = "30px Arial";
  ctx.fillStyle = "#a0a0a0";
  ctx.fillText("from " + groupName, textStart, 280);
  const tagY = 320;
  const tagText = `Remaining #${memberCount}`;
  ctx.font = "bold 24px Arial";
  const tagWidth = ctx.measureText(tagText).width + 40;

  drawRoundedRect(ctx, textStart, tagY, tagWidth, 40, 20);
  ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
  ctx.fill();
  ctx.strokeStyle = "#ff3333";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#ff3333";
  ctx.fillText(tagText, textStart + 20, tagY + 28);

  return canvas.toBuffer("image/png");
}

export {
  createWideDiscordCard,
  createGoodbyeCard,
  createWelcomeCardV4,
  createGoodbyeCardV4,
};
