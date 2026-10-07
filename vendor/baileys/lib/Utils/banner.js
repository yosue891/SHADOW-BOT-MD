import { readFileSync } from 'fs';
import { join } from 'path';

const YO_SOY_YO_LOGO = [
    '               ⠠⡀ ⡀',
    '              ⠱⣄⠘⣆',
    '      ⣀  ⢢⣤⣀⣦⣄⡀⠙⣶⡘⢷⣄',
    '    ⣀⣀⣨⣿⣿⣿⣿⣿⣿⣿⣿⣷⣿⣿⣯⣿⣷⣄',
    '   ⢀⣽⣿⣿⣿⣿⠟⠛⠛⠛⠛⠻⢿⣿⣿⣿⣿⣿⣿⣷⣄',
    '  ⠘⣻⣿⣿⡿⠋        ⠈⠙⢿⣿⣿⣿⣿⢿⣷⡀',
    '  ⣴⣿⣿⣿⡇            ⠙⣿⣿⣿⣷⣽⣷⣄',
    '   ⣾⣿⣿⣇             ⠈⠛⢿⣿⣿⣿⣯⠁',
    '  ⠐⠛⢿⣿⣿⣦⡀              ⠉⠻⣿⣿⣷⣄⡀',
    '    ⠘⠟⠿⣿⣿⣦⣀              ⠈⢿⣿⣿⠇',
    '       ⠈⠙⠻⣿⣷⣦⣄⡀           ⡼⠟⠋',
    '           ⠈⠙⠻⢿⣷⣶⣄',
    '               ⠈⠙⠻⣿⣦⡀',
    '                   ⠙⢿⡄',
    '                     ⢻⡄',
    '                     ⠈⡇'
];

const GRADIENT_FROM = [167, 85, 247];
const GRADIENT_TO = [34, 211, 238];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const supportsColor = stream => {
    if (process.env.NO_COLOR || process.env.NODE_DISABLE_COLORS) return false;
    if (process.env.FORCE_COLOR) return true;
    return !!stream.isTTY;
};

const paint = (text, t) => {
    const [r, g, b] = GRADIENT_FROM.map((from, i) => Math.round(from + (GRADIENT_TO[i] - from) * t));
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
};

const buildLines = version => [
    '',
    ...YO_SOY_YO_LOGO,
    '',
    `   YO SOY YO BAILEYS   v${version}`,
    '   fork de Baileys · github.com/Andresv27728/baileys-beta',
    ''
];

let alreadyPrinted = false;

const printBanner = async (options = {}) => {
    let version = '2.0';
    try {
        const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
        version = pkg.version || version;
    } catch {}
    const {
        stream = process.stdout,
        frameMs = 45,
        once = true
    } = options;
    if (once && alreadyPrinted) return;
    alreadyPrinted = true;
    const animate = options.animate !== undefined ? options.animate : !!stream.isTTY;
    const color = supportsColor(stream);
    const lines = buildLines(version);
    for (let i = 0; i < lines.length; i++) {
        const t = i / (lines.length - 1);
        stream.write((color ? paint(lines[i], t) : lines[i]) + '\n');
        if (animate) await sleep(frameMs);
    }
};

export {
    YO_SOY_YO_LOGO,
    printBanner
};
