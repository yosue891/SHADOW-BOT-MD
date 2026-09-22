const baseCoinReward = 10000;

var handler = async (m, { conn }) => {
    let user = global.db.data.users[m.sender] || {};
    user.christmas = user.christmas || 0;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const isDecember = currentDate.getMonth() === 11; 

    const cooldown = 365 * 24 * 60 * 60 * 1000;
    let timeRemaining = user.christmas + cooldown - currentDate.getTime();

    if (!isDecember) {
        return m.reply(`🎄 ¡Solo puedes reclamar tu regalo navideño en diciembre! Vuelve en diciembre de ${currentYear}.`);
    }

    if (timeRemaining > 0) {
        return m.reply(`🎅 Ya reclamaste tu regalo navideño este año. Vuelve en:\n *${msToTime(timeRemaining)}*`);
    }

    let coinReward = pickRandom([5000, 10000, 15000, 20000]);

    user.coin = (user.coin || 0) + coinReward;

    m.reply(`
┏━━━━━━━━━━━━━━━━━━━┓
🌑🎄 *S H A D O W - B O T* 🎄🌑
┗━━━━━━━━━━━━━━━━━━━┛

✨ En las sombras de la Navidad,
Shadow te recompensa con su poder oculto...

💸 Has recibido: *${coinReward} pesos*

🎅 UwU ¡Feliz Navidad desde las sombras! 🎄
`);

    user.christmas = new Date().getTime();
}

handler.help = ['navidad', 'christmas'];
handler.tags = ['rpg'];
handler.command = ['navidad', 'christmas'];
handler.group = true;
handler.register = true;

export default handler;

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function msToTime(duration) {
    var days = Math.floor(duration / (1000 * 60 * 60 * 24));
    var hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    return `${days} días ${hours} horas ${minutes} minutos`;
}
