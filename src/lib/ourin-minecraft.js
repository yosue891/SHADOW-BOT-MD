import {
  biomes,
  pickaxes,
  pickEnchants,
  mobData,
  RARITY_EMOJI,
  UPGRADES,
  GACHA_POOL,
  GACHA_PITY_LIMIT,
  TOKEN_SHOP,
  DAILY_REWARDS,
  GACHA_COST_COINS,
  SMELT_RECIPES,
  CRAFT_RECIPES,
  JACKPOT_POOLS,
} from "./ourin-minecraft-data.js";

function formatMoney(n) {
  if (n == null || isNaN(n)) return "0";
  const num = Number(n);
  if (num === 0) return "0";
  const s = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  let t = Math.floor(Math.log10(Math.abs(num)) / 3);
  if (t >= s.length) t = s.length - 1;
  if (t < 0) return num.toFixed(2);
  const scale = Math.pow(10, t * 3);
  return Math.round((num / scale) * 100) / 100 + s[t];
}

function parseAmount(text) {
  const u = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, QA: 1e15, QI: 1e18 };
  const m = String(text)
    .toUpperCase()
    .match(/^([\d.,]+)([A-Z]*)$/);
  if (!m) return NaN;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (u[m[2]]) n *= u[m[2]];
  return Math.floor(n);
}

class MinecraftUser {
  constructor(data) {
    this.money = data.money || 500;
    this.level = data.level || 1;
    this.exp = data.exp || 0;
    this.expToNextLevel = data.expToNextLevel || 120;
    this.usedPickaxe = data.usedPickaxe || "woodpick";
    this.pickaxes = data.pickaxes || { woodpick: { ...pickaxes.woodpick } };
    this.currentBiome = data.currentBiome || "plains";
    this.inventory = data.inventory || [];
    this.oreFound = data.oreFound || [];
    this.mobKills = data.mobKills || 0;
    this.totalEarned = data.totalEarned || 0;
    this.gachaTickets = data.gachaTickets || 0;
    this.gachaPity = data.gachaPity || 0;
    this.prestigeTokens = data.prestigeTokens || 0;
    this.prestige = data.prestige || 0;
    this.luckUpgrade = data.luckUpgrade || 0;
    this.speedUpgrade = data.speedUpgrade || 0;
    this.fortuneUpgrade = data.fortuneUpgrade || 0;
    this.combatUpgrade = data.combatUpgrade || 0;
    this.lastDaily = data.lastDaily || null;
    this.dailyStreak = data.dailyStreak || 0;
    this.miningPending = data.miningPending || [];
    this.travelFound = data.travelFound || ["plains"];
    this.streak = data.streak || 0;
    this.lastMineTime = data.lastMineTime || 0;
    this.hp = data.hp || 20;
    this.maxHp = data.maxHp || 20;
    this.atk = data.atk || 4;
    this.def = data.def || 0;
    this.combatWins = data.combatWins || 0;
    this.combatLosses = data.combatLosses || 0;
    this.blocksMined = data.blocksMined || 0;
    this.achievements = data.achievements || [];
    this.smeltQueue = data.smeltQueue || [];
  }
}

function getOrCreateMCUser(db, sender) {
  const cleanJid = sender.split("@")[0];
  if (!db.db.data.users[cleanJid]) db.setUser(sender);
  const user = db.db.data.users[cleanJid];
  if (!user.minecraft) {
    user.minecraft = new MinecraftUser({}).toObject();
    db.markDirty("users");
  }
  if (!user.minecraft.pickaxes)
    user.minecraft.pickaxes = { woodpick: { ...pickaxes.woodpick } };
  if (!user.minecraft.pickaxes.woodpick)
    user.minecraft.pickaxes.woodpick = { ...pickaxes.woodpick };
  if (!user.minecraft.travelFound) user.minecraft.travelFound = ["plains"];
  if (!user.minecraft.achievements) user.minecraft.achievements = [];
  return user;
}

MinecraftUser.prototype.toObject = function () {
  return {
    money: this.money,
    level: this.level,
    exp: this.exp,
    expToNextLevel: this.expToNextLevel,
    usedPickaxe: this.usedPickaxe,
    pickaxes: this.pickaxes,
    currentBiome: this.currentBiome,
    inventory: this.inventory,
    oreFound: this.oreFound,
    mobKills: this.mobKills,
    totalEarned: this.totalEarned,
    gachaTickets: this.gachaTickets,
    gachaPity: this.gachaPity,
    prestigeTokens: this.prestigeTokens,
    prestige: this.prestige,
    luckUpgrade: this.luckUpgrade,
    speedUpgrade: this.speedUpgrade,
    fortuneUpgrade: this.fortuneUpgrade,
    combatUpgrade: this.combatUpgrade,
    lastDaily: this.lastDaily,
    dailyStreak: this.dailyStreak,
    miningPending: this.miningPending,
    travelFound: this.travelFound,
    streak: this.streak,
    lastMineTime: this.lastMineTime,
    hp: this.hp,
    maxHp: this.maxHp,
    atk: this.atk,
    def: this.def,
    combatWins: this.combatWins,
    combatLosses: this.combatLosses,
    blocksMined: this.blocksMined,
    achievements: this.achievements,
    smeltQueue: this.smeltQueue,
  };
};

function getRandomOre(pickaxe, biomeKey = "plains") {
  const biomeData = biomes[biomeKey];
  if (!biomeData) return null;
  const oreList = biomeData.listOre;
  const enchant = pickaxe?.enchant ? pickEnchants[pickaxe.enchant] : null;
  let luckBonus = pickaxe?.luck || 0;
  if (enchant?.effect?.luck) luckBonus *= enchant.effect.luck;

  const rarityChance = {
    common: 1000,
    uncommon: 400 + luckBonus * 200,
    rare: 100 + luckBonus * 80,
    epic: 20 + luckBonus * 30,
    legendary: 5 + luckBonus * 15,
    mythic: 1 + luckBonus * 8,
    godly: 0.5 + luckBonus * 5,
    exotic: 0.3 + luckBonus * 4,
    secret: 1 + luckBonus * 10,
    extinct: 0.1 + luckBonus * 2,
    special: 0.05 + luckBonus * 1,
  };

  const adjustedOreList = oreList.map((o) => ({
    ...o,
    adjChance: rarityChance[o.rarity] || 1,
  }));

  const totalChance = adjustedOreList.reduce((a, b) => a + b.adjChance, 0);
  const roll = Math.random() * totalChance;
  let acc = 0,
    chosen = adjustedOreList[0];
  for (const ore of adjustedOreList) {
    acc += ore.adjChance;
    if (roll <= acc) {
      chosen = ore;
      break;
    }
  }

  let stack =
    chosen.minStack +
    Math.floor(Math.random() * (chosen.maxStack - chosen.minStack + 1));
  if (enchant?.effect?.fortune)
    stack = Math.ceil(stack * enchant.effect.fortune);
  if (pickaxe?.fortuneBonus)
    stack = Math.ceil(stack * (1 + pickaxe.fortuneBonus));

  let totalPrice = Math.round(chosen.avgValue * stack);
  if (pickaxe?.sellMultiplier)
    totalPrice = Math.round(totalPrice * (1 + pickaxe.sellMultiplier));
  if (enchant?.effect?.sellMultiplier)
    totalPrice = Math.round(totalPrice * enchant.effect.sellMultiplier);

  return {
    name: chosen.name,
    rarity: chosen.rarity,
    type: "ore",
    stack,
    pricePerUnit: chosen.avgValue,
    price: totalPrice,
  };
}

function addPickExp(mcUser, pickKey, amount) {
  const pick = mcUser.pickaxes[pickKey];
  if (!pick || pick.level >= pick.maxLevel) return null;
  pick.exp = (pick.exp || 0) + amount;
  let levelUp = false;
  const statsIncreased = [];
  while (pick.exp >= pick.expToNextLevel && pick.level < pick.maxLevel) {
    pick.exp -= pick.expToNextLevel;
    pick.level += 1;
    pick.luck = parseFloat((pick.luck + 0.01).toFixed(3));
    pick.speed = parseFloat((pick.speed + 0.01).toFixed(3));
    pick.fortuneBonus = parseFloat((pick.fortuneBonus + 0.005).toFixed(4));
    pick.expToNextLevel = Math.floor(pick.expToNextLevel * 1.5);
    levelUp = true;
    statsIncreased.push("Luck +1%, Speed +1%, Fortune +0.5%");
  }
  if (levelUp)
    return `⛏️ Pickaxe *${pick.name}* naik ke level ${pick.level}!\n✨ ${statsIncreased.join(", ")}`;
  return null;
}

function addPlayerExp(mcUser, amount) {
  mcUser.exp = (mcUser.exp || 0) + amount;
  let levelUp = false;
  while (mcUser.exp >= mcUser.expToNextLevel && mcUser.level < 9999) {
    mcUser.exp -= mcUser.expToNextLevel;
    mcUser.level += 1;
    mcUser.expToNextLevel = Math.floor(mcUser.expToNextLevel * 1.3);
    mcUser.maxHp = 20 + Math.floor(mcUser.level * 2);
    mcUser.hp = mcUser.maxHp;
    mcUser.atk = 4 + Math.floor(mcUser.level * 0.5);
    levelUp = true;
  }
  return levelUp;
}

function getUpgradedStats(mcUser, pick) {
  const luckBonus = UPGRADES.luck.effect(mcUser.luckUpgrade || 0);
  const speedBonus = UPGRADES.speed.effect(mcUser.speedUpgrade || 0);
  const fortuneBonus = UPGRADES.fortune.effect(mcUser.fortuneUpgrade || 0);
  const combatBonus = UPGRADES.combat.effect(mcUser.combatUpgrade || 0);
  const prestigeBonus = (mcUser.prestige || 0) * 0.05;
  return {
    luck: (pick.luck || 0) + luckBonus + prestigeBonus,
    speed: Math.min((pick.speed || 0) + speedBonus, 0.98),
    fortune: (pick.fortuneBonus || 0) + fortuneBonus,
    sellMultiplier: pick.sellMultiplier || 0,
    combat: (mcUser.atk || 4) * (1 + combatBonus),
  };
}

function getStreakBonus(streak) {
  if (streak >= 100) return { mult: 3.5, luckAdd: 0.15 };
  if (streak >= 50) return { mult: 2.5, luckAdd: 0.05 };
  if (streak >= 20) return { mult: 1.6 };
  if (streak >= 10) return { mult: 1.4, luckAdd: 0.05 };
  if (streak >= 5) return { mult: 1.25 };
  if (streak >= 3) return { mult: 1.1 };
  return { mult: 1.0 };
}

function doGachaPull(mcUser) {
  const isPity = (mcUser.gachaPity || 0) >= GACHA_PITY_LIMIT;
  const pool = isPity
    ? GACHA_POOL.filter((x) => x.rarity === "ssr")
    : GACHA_POOL;
  const totalW = pool.reduce((a, b) => a + b.weight, 0);
  let roll = Math.random() * totalW,
    acc = 0;
  let item = pool[0];
  for (const p of pool) {
    acc += p.weight;
    if (roll <= acc) {
      item = p;
      break;
    }
  }
  const isSSR = item.rarity === "ssr";
  mcUser.gachaPity = isSSR ? 0 : (mcUser.gachaPity || 0) + 1;
  return { item, isSSR, pity: isPity };
}

function doCombat(mcUser, mobKey) {
  const mobDef = mobData[mobKey];
  if (!mobDef) return null;
  if ((mcUser.level || 1) < mobDef.minLevel)
    return { error: `⬆️ ¡Nivel insuficiente! Necesitas Lv.${mobDef.minLevel}` };
  if ((mcUser.hp || 20) <= 0) mcUser.hp = mcUser.maxHp || 20;

  const playerAtk = mcUser.atk + (mcUser.combatUpgrade || 0) * 3;
  const mobHp = mobDef.hp;
  const mobAtk = mobDef.atk;
  let pHp = mcUser.hp;
  let mHp = mobHp;
  const log = [];

  while (pHp > 0 && mHp > 0) {
    const pDmg = Math.max(1, playerAtk - Math.floor(Math.random() * 2));
    mHp -= pDmg;
    log.push(`⚔️ Tú: -${pDmg} HP a ${mobDef.name}`);
    if (mHp <= 0) break;
    const mDmg = Math.max(
      1,
      mobAtk - (mcUser.def || 0) - Math.floor(Math.random() * 2),
    );
    pHp -= mDmg;
    log.push(`💥 ${mobDef.name}: -${mDmg} HP a ti`);
  }

  const won = mHp <= 0;
  mcUser.hp = Math.max(1, pHp);

  if (won) {
    mcUser.combatWins = (mcUser.combatWins || 0) + 1;
    mcUser.mobKills = (mcUser.mobKills || 0) + 1;
    const drops = [];
    for (const drop of mobDef.drops) {
      if (Math.random() * 100 < drop.chance) {
        const val = Math.round(
          drop.value * (1 + (mcUser.fortuneUpgrade || 0) * 0.1),
        );
        drops.push({ name: drop.name, value: val });
        mcUser.inventory = [
          ...(mcUser.inventory || []),
          { name: drop.name, price: val, type: "drop" },
        ];
      }
    }
    const expGain = mobDef.expReward;
    addPlayerExp(mcUser, expGain);
    return {
      won,
      drops,
      expGain,
      log: log.slice(-4),
      mobName: mobDef.name,
      rarity: mobDef.rarity,
    };
  } else {
    mcUser.combatLosses = (mcUser.combatLosses || 0) + 1;
    return {
      won,
      drops: [],
      expGain: 0,
      log: log.slice(-4),
      mobName: mobDef.name,
      rarity: mobDef.rarity,
    };
  }
}

function doSmelt(mcUser) {
  if (!mcUser.inventory || mcUser.inventory.length === 0)
    return { smelted: [], totalValue: 0 };
  const smelted = [];
  const remaining = [];
  let totalValue = 0;
  for (const item of mcUser.inventory) {
    const recipe = SMELT_RECIPES[item.name];
    if (recipe) {
      const newVal = Math.round(item.price * recipe.valueMult);
      smelted.push({ from: item.name, to: recipe.result, value: newVal });
      totalValue += newVal;
    } else {
      remaining.push(item);
    }
  }
  mcUser.inventory = remaining;
  return { smelted, totalValue, count: smelted.length };
}

function doCraft(mcUser, recipeKey) {
  const recipe = CRAFT_RECIPES[recipeKey];
  if (!recipe) return { error: "🛠️ ¡Receta no encontrada!" };
  if ((mcUser.level || 1) < recipe.requiredLevel)
    return { error: `⬆️ ¡Nivel insuficiente! Necesitas Lv.${recipe.requiredLevel}` };

  const invNames = (mcUser.inventory || []).map((i) => i.name);
  const tempInv = [...invNames];
  for (const [ingName, count] of Object.entries(recipe.ingredients)) {
    let found = 0;
    for (let i = 0; i < tempInv.length; i++) {
      if (tempInv[i] === ingName) {
        found++;
        tempInv[i] = null;
        if (found >= count) break;
      }
    }
    if (found < count)
      return {
        error: `🧪 ¡Faltan materiales! ${ingName} necesitas ${count}, tienes ${found}`,
      };
  }

  mcUser.inventory = (mcUser.inventory || []).filter(
    (_, idx) => tempInv[idx] !== null,
  );
  mcUser.inventory.push({
    name: recipe.name,
    price: recipe.value,
    type: "crafted",
  });
  return { success: true, item: recipe.name, value: recipe.value };
}

function doJackpotPull(mcUser, poolId) {
  const pool = JACKPOT_POOLS.find((p) => p.id === poolId);
  if (!pool) return null;
  const totalW = pool.rewards.reduce((a, b) => a + b.weight, 0);
  let roll = Math.random() * totalW,
    acc = 0;
  let chosen = pool.rewards[0];
  for (const r of pool.rewards) {
    acc += r.weight;
    if (roll <= acc) {
      chosen = r;
      break;
    }
  }
  const value = Math.round(
    chosen.min + Math.random() * (chosen.max - chosen.min),
  );
  return { pool, reward: chosen, value };
}

function applyJackpotReward(db, mcUser, sender, result) {
  const type = result.reward.type;
  const val = result.value;
  const f = mcUser;
  let applied = {};
  switch (type) {
    case "coins":
      f.money = (f.money || 0) + val;
      applied = { desc: `💰 +${formatMoney(val)} Coins`, type };
      break;
    case "energi": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.energi = (user.energi || 0) + val;
        db.markDirty("users");
      }
      applied = { desc: `⚡ +${val} Energi`, type };
      break;
    }
    case "limit": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.limit = (user.limit || 0) + val;
        db.markDirty("users");
      }
      applied = { desc: `📌 +${val} Limit`, type };
      break;
    }
    case "tickets":
      f.gachaTickets = (f.gachaTickets || 0) + val;
      applied = { desc: `🎟️ +${val} Boletos de Gacha`, type };
      break;
    case "tokens":
      f.prestigeTokens = (f.prestigeTokens || 0) + val;
      applied = { desc: `🪙 +${val} Fichas de Prestigio`, type };
      break;
    case "exp_boost": {
      const boost = Math.floor(f.expToNextLevel * val * 0.5);
      f.exp = (f.exp || 0) + boost;
      applied = { desc: `⭐ +${formatMoney(boost)} EXP (x${val} boost)`, type };
      break;
    }
    case "premium_7d":
    case "premium_30d": {
      const days = type === "premium_7d" ? 7 : 30;
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        const now = Date.now();
        const existingExpiry = user.premiumExpiry
          ? new Date(user.premiumExpiry).getTime()
          : 0;
        const start = existingExpiry > now ? existingExpiry : now;
        user.premiumExpiry = new Date(start + days * 86400000).toISOString();
        user.isPremium = true;
        db.markDirty("users");
      }
      applied = { desc: `👑 Premium ${days} Días!`, type };
      break;
    }
    case "partner_7d":
    case "partner_30d": {
      const days = type === "partner_7d" ? 7 : 30;
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        const now = Date.now();
        const existingExpiry = user.partnerExpiry
          ? new Date(user.partnerExpiry).getTime()
          : 0;
        const start = existingExpiry > now ? existingExpiry : now;
        user.partnerExpiry = new Date(start + days * 86400000).toISOString();
        user.isPartner = true;
        db.markDirty("users");
      }
      applied = { desc: `🤝 Partner ${days} Días!`, type };
      break;
    }
    case "unlimited_energi": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.energi = -1;
        db.markDirty("users");
      }
      applied = { desc: `♾️ UNLIMITED Energi!`, type };
      break;
    }
    case "unlimited_limit": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.limit = -1;
        db.markDirty("users");
      }
      applied = { desc: `♾️ UNLIMITED Limit!`, type };
      break;
    }
    case "owner_reward": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.isPremium = true;
        user.isPartner = true;
        user.premiumExpiry = new Date(
          Date.now() + 365 * 86400000,
        ).toISOString();
        user.partnerExpiry = new Date(
          Date.now() + 365 * 86400000,
        ).toISOString();
        user.energi = -1;
        user.limit = -1;
        db.markDirty("users");
      }
      applied = {
        desc: `🔥 ¡RECOMPENSA DE OWNER! Premium+Partner 1 Año + ¡ILIMITADO!`,
        type,
      };
      break;
    }
    default:
      applied = { desc: `🎁 ¡Recompensa Misteriosa!`, type: "mystery" };
  }
  return applied;
}

function getAvailableMobs(mcUser) {
  const level = mcUser.level || 1;
  const biome = mcUser.currentBiome || "plains";
  const available = [];
  for (const [key, mob] of Object.entries(mobData)) {
    if (level >= mob.minLevel) available.push({ key, ...mob });
  }
  return available;
}

function healPlayer(mcUser) {
  const cost = Math.floor((mcUser.maxHp - mcUser.hp) * 500);
  if (mcUser.hp >= mcUser.maxHp) return { error: "❤️ ¡HP ya está lleno!" };
  if ((mcUser.money || 0) < cost)
    return { error: `💸 ¡Dinero insuficiente! Necesitas ${formatMoney(cost)}` };
  mcUser.money -= cost;
  mcUser.hp = mcUser.maxHp;
  return { success: true, cost, hp: mcUser.hp };
}

export {
  formatMoney,
  parseAmount,
  MinecraftUser,
  getOrCreateMCUser,
  getRandomOre,
  addPickExp,
  addPlayerExp,
  getUpgradedStats,
  getStreakBonus,
  doGachaPull,
  doCombat,
  doSmelt,
  doCraft,
  doJackpotPull,
  applyJackpotReward,
  getAvailableMobs,
  healPlayer,
  JACKPOT_POOLS,
};
