const codigosArabes = ['+212', '+971', '+20', '+966', '+964', '+963', '+973', '+968', '+974'];
const regexArabe = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const regexComando = /^[\/!#.]/;

global.advertenciasArabes = global.advertenciasArabes || {};

export async function before(m, { conn, isOwner, isROwner}) {
  try {
    if (
      m.isBaileys ||
      m.isGroup ||
!m.message ||
!m.sender ||
      typeof m.text!== 'string' ||
      isOwner ||
      isROwner
) return false;

    const numero = m.sender;
    const texto = m.text;
    const numeroLimpio = numero.replace(/[^0-9]/g, '');

    const esArabe = regexArabe.test(texto) || codigosArabes.some(pref => numeroLimpio.startsWith(pref.replace('+', '')));
    const esComando = regexComando.test(texto);

    if (esArabe &&!esComando) {
      global.advertenciasArabes[numero] = (global.advertenciasArabes[numero] || 0) + 1;
      const advertencias = global.advertenciasArabes[numero];

      if (advertencias>= 2) {
        await m.reply(`
🌌 *[PROCEDIMIENTO SOMBRA: BLOQUEO FINAL]* 💀
══════════════════════
🔍 *Unidad de rastreo: Shadow Protocol v2.0*
📛 Entidad detectada: ${numero}
📄 Infracción: Comunicación no autorizada (2/2)

☠️ Activando [BLACKOUT-OMEGA]...
🔒 Estado: *Entidad neutralizada*

🧩 Registro sellado. Acceso denegado.
══════════════════════`);
        await conn.updateBlockStatus(m.sender, 'block');
        console.log(`[☠️ ENTIDAD BLOQUEADA] ${numero}`);
        delete global.advertenciasArabes[numero];
} else {
        await m.reply(`
⚠️ *[PRIMERA ALERTA DE SOMBRA ${advertencias}/2]* ⚠️
══════════════════════
🕸️ Sistema de defensa activado.
📄 Comunicación sospechosa interceptada.

📌 Solo comandos autorizados permitidos:
Ej: */menu*, */help*, */code*,!info

🧬 Próxima infracción ejecutará *protocolo de eliminación*.
══════════════════════`);
        console.log(`[⚠️ ALERTA SOMBRA ${advertencias}/2] ${numero}`);
}

      return false;
}

    return true;

} catch (e) {
    console.error('[💀 ERROR EN EL NÚCLEO DE SOMBRA]', e);
    return true;
}
}
