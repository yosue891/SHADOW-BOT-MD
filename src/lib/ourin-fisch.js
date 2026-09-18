import {
  islands,
  fishingRod,
  rodEnchants,
  mutations,
  RARITY_EMOJI,
  RARITY_ORDER,
  UPGRADES,
  GACHA_POOL,
  GACHA_PITY_LIMIT,
  TOKEN_SHOP,
  DAILY_REWARDS,
  GACHA_COST_COINS,
} from "./ourin-fisch-data.js";

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

function getOrCreateFischUser(db, sender) {
  const cleanJid = sender.split("@")[0];
  if (!db.db.data.users[cleanJid]) db.setUser(sender);
  const user = db.db.data.users[cleanJid];
  if (!user.fisch) {
    user.fisch = {
      money: 200,
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      usedFishingRod: "basicrod",
      fishingRods: { basicrod: { ...fishingRod.basicrod } },
      currentIsland: "mousewood",
      inventory: [],
      fishFound: [],
      mutationFound: [],
      fishCaught: 0,
      totalEarned: 0,
      gachaTickets: 0,
      gachaPity: 0,
      prestigeTokens: 0,
      prestige: 0,
      luckUpgrade: 0,
      speedUpgrade: 0,
      sellUpgrade: 0,
      lastDaily: null,
      dailyStreak: 0,
      fishingPending: [],
      travelFound: ["mousewood"],
      achievements: [],
      achievementPoints: 0,
      streak: 0,
      lastFishTime: 0,
    };
    db.markDirty("users");
  }
  if (!user.fisch.fishingRods)
    user.fisch.fishingRods = { basicrod: { ...fishingRod.basicrod } };
  if (!user.fisch.fishingRods.basicrod)
    user.fisch.fishingRods.basicrod = { ...fishingRod.basicrod };
  if (!user.fisch.travelFound) user.fisch.travelFound = ["mousewood"];
  if (!user.fisch.achievements) user.fisch.achievements = [];
  return user;
}

function getRandomFish(rod, islandKey = "mousewood") {
  const islandData = islands[islandKey];
  if (!islandData) return null;
  const fishList = islandData.listFish;
  const enchant = rod?.enchant ? rodEnchants[rod.enchant] : null;
  let luckBonus = rod?.luck || 0;

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

  const adjustedFishList = fishList.map((f) => ({
    ...f,
    adjChance: rarityChance[f.rarity] || 1,
  }));

  const totalChance = adjustedFishList.reduce((a, b) => a + b.adjChance, 0);
  const roll = Math.random() * totalChance;
  let acc = 0,
    chosen = adjustedFishList[0];
  for (const fish of adjustedFishList) {
    acc += fish.adjChance;
    if (roll <= acc) {
      chosen = fish;
      break;
    }
  }

  let weight = chosen.minKg + Math.random() * (chosen.maxKg - chosen.minKg);
  if (enchant?.effect?.fishSize) weight *= enchant.effect.fishSize;
  weight = parseFloat(weight.toFixed(2));

  let totalPrice = Math.round(chosen.avgValue * weight);
  if (rod?.sellMultiplier)
    totalPrice = Math.round(totalPrice * (1 + rod.sellMultiplier));
  if (enchant?.effect?.sellMultiplier)
    totalPrice = Math.round(totalPrice * enchant.effect.sellMultiplier);

  const mutMax = rod?.comboMutations || 1;
  const mutBonus =
    (rod?.mutationsLuck || 0) + (enchant?.effect?.mutationChance || 0);
  const fishMutations = rollMutations(mutMax, mutBonus);

  const isMutated = fishMutations.some((m) => m !== "Normal");
  if (isMutated) {
    for (const mut of fishMutations) {
      if (mut !== "Normal" && mutations[mut]) {
        totalPrice = Math.round(totalPrice * mutations[mut].multiplier);
      }
    }
    chosen = { ...chosen, name: "🧬 " + chosen.name };
  }

  return {
    name: chosen.name,
    rarity: chosen.rarity,
    type: "fish",
    kg: weight,
    pricePerKg: chosen.avgValue,
    price: totalPrice,
    mutations: fishMutations,
    isMutated,
  };
}

function rollMutations(maxCount = 1, bonus = 0) {
  const found = [];
  for (const [name, data] of Object.entries(mutations)) {
    if (found.length >= maxCount) break;
    const finalChance = Math.pow(data.chance, 0.5) + (bonus || 0);
    if (Math.random() < finalChance) found.push(name);
  }
  return found.length > 0 ? found : ["Normal"];
}

function addRodExp(fischUser, rodKey, amount) {
  const rod = fischUser.fishingRods[rodKey];
  if (!rod || rod.level >= rod.maxLevel) return null;
  rod.exp = (rod.exp || 0) + amount;
  let levelUp = false;
  const statsIncreased = [];
  while (rod.exp >= rod.expToNextLevel && rod.level < rod.maxLevel) {
    rod.exp -= rod.expToNextLevel;
    rod.level += 1;
    rod.luck = parseFloat((rod.luck + 0.01).toFixed(3));
    rod.speed = parseFloat((rod.speed + 0.01).toFixed(3));
    rod.expToNextLevel = Math.floor(rod.expToNextLevel * 1.5);
    levelUp = true;
    statsIncreased.push(`Luck +1%, Speed +1%`);
  }
  if (levelUp)
    return `🎣 Rod *${rod.name}* naik ke level ${rod.level}!\n✨ ${statsIncreased.join(", ")}`;
  return null;
}

function addPlayerExp(fischUser, amount) {
  fischUser.exp = (fischUser.exp || 0) + amount;
  let levelUp = false;
  while (fischUser.exp >= fischUser.expToNextLevel && fischUser.level < 9999) {
    fischUser.exp -= fischUser.expToNextLevel;
    fischUser.level += 1;
    fischUser.expToNextLevel = Math.floor(fischUser.expToNextLevel * 1.3);
    levelUp = true;
  }
  return levelUp;
}

function getUpgradedStats(fischUser, rod) {
  const luckBonus = UPGRADES.luck.effect(fischUser.luckUpgrade || 0);
  const speedBonus = UPGRADES.speed.effect(fischUser.speedUpgrade || 0);
  const sellBonus = UPGRADES.sell.effect(fischUser.sellUpgrade || 0);
  const prestigeBonus = (fischUser.prestige || 0) * 0.05;
  return {
    luck: (rod.luck || 0) + luckBonus + prestigeBonus,
    speed: Math.min((rod.speed || 0) + speedBonus, 0.98),
    sellMultiplier: (rod.sellMultiplier || 0) + sellBonus,
  };
}

function doGachaPull(fischUser) {
  const isPity = (fischUser.gachaPity || 0) >= GACHA_PITY_LIMIT;
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
  fischUser.gachaPity = isSSR ? 0 : (fischUser.gachaPity || 0) + 1;
  return { item, isSSR, pity: isPity };
}

function getStreakBonus(streak) {
  if (streak >= 100) return { mult: 3.0, luckAdd: 0.15 };
  if (streak >= 50) return { mult: 2.0, luckAdd: 0.05 };
  if (streak >= 20) return { mult: 1.5 };
  if (streak >= 10) return { mult: 1.35, luckAdd: 0.05 };
  if (streak >= 5) return { mult: 1.2 };
  if (streak >= 3) return { mult: 1.1 };
  return { mult: 1.0 };
}

const JACKPOT_POOLS = [
  {
    id: "mini",
    name: "Mini Jackpot",
    cost: 500000,
    weight: 60,
    rewards: [
      { type: "coins", min: 1e6, max: 5e6, weight: 40 },
      { type: "energi", min: 5, max: 20, weight: 25 },
      { type: "limit", min: 5, max: 15, weight: 20 },
      { type: "tickets", min: 1, max: 3, weight: 10 },
      { type: "exp_boost", min: 1, max: 3, weight: 5 },
    ],
  },
  {
    id: "mega",
    name: "Mega Jackpot",
    cost: 5000000,
    weight: 30,
    rewards: [
      { type: "coins", min: 1e8, max: 5e8, weight: 30 },
      { type: "energi", min: 20, max: 100, weight: 20 },
      { type: "limit", min: 15, max: 50, weight: 20 },
      { type: "tickets", min: 3, max: 10, weight: 15 },
      { type: "premium_7d", min: 1, max: 1, weight: 10 },
      { type: "exp_boost", min: 3, max: 10, weight: 5 },
    ],
  },
  {
    id: "ultra",
    name: "Ultra Jackpot",
    cost: 50000000,
    weight: 9,
    rewards: [
      { type: "coins", min: 1e9, max: 9e9, weight: 25 },
      { type: "energi", min: 100, max: 500, weight: 15 },
      { type: "limit", min: 50, max: 200, weight: 15 },
      { type: "premium_30d", min: 1, max: 1, weight: 10 },
      { type: "partner_7d", min: 1, max: 1, weight: 5 },
      { type: "tokens", min: 50, max: 200, weight: 20 },
      { type: "tickets", min: 10, max: 50, weight: 10 },
    ],
  },
  {
    id: "legend",
    name: "Legendary Jackpot",
    cost: 500000000,
    weight: 1,
    rewards: [
      { type: "coins", min: 1e9, max: 9e9, weight: 20 },
      { type: "limit", min: 200, max: 999, weight: 15 },
      { type: "energi", min: 500, max: 9999, weight: 10 },
      { type: "premium_30d", min: 1, max: 1, weight: 15 },
      { type: "partner_30d", min: 1, max: 1, weight: 5 },
      { type: "tokens", min: 200, max: 1000, weight: 20 },
      { type: "unlimited_energi", min: 1, max: 1, weight: 5 },
      { type: "unlimited_limit", min: 1, max: 1, weight: 5 },
      { type: "tickets", min: 50, max: 200, weight: 5 },
    ],
  },
];

function doJackpotPull(fischUser, poolId) {
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

function applyJackpotReward(db, fischUser, sender, result) {
  const type = result.reward.type;
  const val = result.value;
  const f = fischUser;
  let applied = {};
  switch (type) {
    case "coins":
      f.money = (f.money || 0) + val;
      applied = { desc: `+${formatMoney(val)} Coins`, type };
      break;
    case "energi": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.energi = (user.energi || 0) + val;
        db.markDirty("users");
      }
      applied = { desc: `+${val} Energi`, type };
      break;
    }
    case "limit": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.limit = (user.limit || 0) + val;
        db.markDirty("users");
      }
      applied = { desc: `+${val} Limit`, type };
      break;
    }
    case "tickets":
      f.gachaTickets = (f.gachaTickets || 0) + val;
      applied = { desc: `+${val} Gacha Tickets`, type };
      break;
    case "tokens":
      f.prestigeTokens = (f.prestigeTokens || 0) + val;
      applied = { desc: `+${val} Prestige Tokens`, type };
      break;
    case "exp_boost": {
      const boost = Math.floor(f.expToNextLevel * val * 0.5);
      f.exp = (f.exp || 0) + boost;
      applied = { desc: `+${formatMoney(boost)} EXP (x${val} boost)`, type };
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
      applied = { desc: `Premium ${days} Hari!`, type };
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
      applied = { desc: `Partner ${days} Hari!`, type };
      break;
    }
    case "unlimited_energi": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.energi = -1;
        db.markDirty("users");
      }
      applied = { desc: `UNLIMITED Energi!`, type };
      break;
    }
    case "unlimited_limit": {
      const cleanJid = sender.split("@")[0];
      const user = db.db.data.users[cleanJid];
      if (user) {
        user.limit = -1;
        db.markDirty("users");
      }
      applied = { desc: `UNLIMITED Limit!`, type };
      break;
    }
    default:
      applied = { desc: `Mystery Reward!`, type: "mystery" };
  }
  return applied;
}

export {
  formatMoney,
  parseAmount,
  getOrCreateFischUser,
  getRandomFish,
  addRodExp,
  addPlayerExp,
  getUpgradedStats,
  doGachaPull,
  getStreakBonus,
  JACKPOT_POOLS,
  doJackpotPull,
  applyJackpotReward,
};
