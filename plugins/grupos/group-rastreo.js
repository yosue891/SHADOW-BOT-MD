import { performance} from 'perf_hooks';

const handler = async (m, { conn, text}) => {
  // Detectar objetivo: por mención, respuesta o texto
  let target;
  if (m.mentionedJid && m.mentionedJid.length) {
    target = m.mentionedJid[0];
} else if (m.quoted) {
    target = m.quoted.sender;
} else {
    target = text? text: m.sender;
}

  const name = await conn.getName(target);
  const number = target.replace(/\D/g, '').slice(0, 2);

  const countryMap = {
    '58': 'Venezuela 🇻🇪',
    '57': 'Colombia 🇨🇴',
    '52': 'México 🇲🇽',
    '51': 'Perú 🇵🇪',
    '54': 'Argentina 🇦🇷',
    '55': 'Brasil 🇧🇷',
    '56': 'Chile 🇨🇱',
    '1': 'Estados Unidos 🇺🇸',
    '34': 'España 🇪🇸',
    '91': 'India 🇮🇳',
    '81': 'Japón 🇯🇵',
    '49': 'Alemania 🇩🇪',
    '33': 'Francia 🇫🇷'
};

  const country = countryMap[number] || '🌍 País desconocido';

  const loading = [
    '*💻 Iniciando rastreo digital...*',
    '*📡 Escaneando redes locales...*',
    '*🔍 Analizando paquetes UDP...*',
    '*🧠 Decodificando metadatos...*',
    '*📁 Accediendo a registros ocultos...*',
    '*💣 Inyectando comandos en el núcleo...*'
  ];

  for (let line of loading) {
    await m.reply(line);
}

  const old = performance.now();
  const neww = performance.now();
  const speed = (neww - old).toFixed(2);

  const result = `*☠ 𝙿𝙴𝚁𝚂𝙾𝙽𝙰 𝚁𝙰𝚂𝚃𝚁𝙴𝙰𝙳𝙰 𝙲𝙾𝙽 𝙴𝚇𝙸𝚃𝙾 ☠*\n*⏳ Tiempo de rastreo:* ${speed}ms

    𝙿𝙴𝚁𝚂𝙾𝙽𝙰 𝙳𝙾𝚇𝚇𝙴𝙰𝙳𝙰 𝙲𝙾𝙽 𝙴𝚇𝙸𝚃𝙾*\n*⏳ 𝙳𝙾𝚇𝚇𝙴𝙰𝙳𝙾 𝙴𝙽: ${speed} 𝚜𝚎𝚐𝚞𝚗𝚍𝚘𝚜!*

*𝚁𝙴𝚂𝚄𝙻𝚃𝙰𝙳𝙾𝚂 𝙾𝙱𝚃𝙴𝙽𝙸𝙳𝙾𝚂:*

*Nombre:* ${text}
*Ip:* 92.28.211.234
*N:* 43 7462
*W:* 12.4893
*SS NUMBER:* 6979191519182016
*IPV6:* fe80::5dcd::ef69::fb22::d9888%12 
*UPNP:* Enabled
*DMZ:* 10.112.42.15
*MAC:* 5A:78:3E:7E:00
*ISP:* Ucom unversal 
*DNS:* 8.8.8.8
*ALT DNS:* 1.1.1.8.1  
*DNS SUFFIX:* Dlink
*WAN:* 100.23.10.15
*WAN TYPE:* private nat
*GATEWAY:* 192.168.0.1
*SUBNET MASK:* 255.255.0.255
*UDP OPEN PORTS:* 8080.80
*TCP OPEN PORTS:* 443
*ROUTER VENDEDOR:* ERICCSON
*DEVICE VENDEDOR:* WIN32-X
*CONNECTION TYPE:* TPLINK COMPANY
*ICMPHOPS:* 192.168.0.1 192.168.1.1 100.73.43.4
host-132.12.32.167.ucom.com
host-132.12.111.ucom.com
36.134.67.189 216.239.78.11
Sof02s32inf14.1e100.net
*HTTP:* 192.168.3.1:433-->92.28.211.234:80
*Http:* 192.168.625-->92.28.211.455:80
*Http:* 192.168.817-->92.28.211.8:971
*Upd:* 192.168452-->92.28.211:7265288
*Tcp:* 192.168.682-->92.28.211:62227.7
*Tcp:* 192.168.725-->92.28.211:67wu2
*Tcp:* 192.168.629-->92.28.211.167:8615
*EXTERNAL MAC:* 6U:77:89:ER:O4
*MODEM JUMPS:* 64

*👤 Objetivo:* ${name}
*🌐 País detectado:* ${country}
*🔐 Estado:* Sistema comprometido

⚠ Ya perdiste... te rastreamos hasta el último paquete.`;

  await m.reply(result, null, { mentions: [target]});
};

handler.help = ['rastrear'];
handler.tags = ['grupos'];
handler.command = ['rastrear'];
handler.group = true;
handler.register = true;

export default handler;
