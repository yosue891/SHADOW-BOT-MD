

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, '../data');

const gameCache = new Map();
const gameSessions = new Map();

function loadData(filename) {
    if (gameCache.has(filename)) {
        return gameCache.get(filename);
    }
    
    const filePath = path.join(dataPath, filename);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        gameCache.set(filename, data);
        return data;
    } catch (error) {
        console.error(`Error loading ${filename}:`, error.message);
        return [];
    }
}

function getRandomItem(filename) {
    const data = loadData(filename);
    if (!data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
}

function getItemByIndex(filename, index) {
    const data = loadData(filename);
    if (!data || data.length === 0) return null;
    return data.find(item => item.index === index) || data[index] || null;
}

function searchItem(filename, query, field = 'latin') {
    const data = loadData(filename);
    if (!data || data.length === 0) return null;
    const queryLower = query.toLowerCase();
    return data.find(item => 
        item[field] && item[field].toLowerCase().includes(queryLower)
    );
}

function getAllData(filename) {
    return loadData(filename);
}

function normalizeAnswer(answer) {
    if (!answer) return '';
    return answer
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
}

function getSimilarity(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(str1, str2);
    return (maxLen - distance) / maxLen;
}

function checkAnswerAdvanced(correctAnswer, userAnswer) {
    const normalized1 = normalizeAnswer(correctAnswer);
    const normalized2 = normalizeAnswer(userAnswer);
    
    if (normalized1 === normalized2) {
        return { status: 'correct', similarity: 1 };
    }
    
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        if (normalized2.length >= normalized1.length * 0.8) {
            return { status: 'correct', similarity: 0.95 };
        }
    }
    
    const similarity = getSimilarity(normalized1, normalized2);
    
    if (similarity >= 0.85) {
        return { status: 'correct', similarity };
    }
    
    if (similarity >= 0.6) {
        return { status: 'close', similarity };
    }
    
    return { status: 'wrong', similarity };
}

function checkAnswer(correctAnswer, userAnswer) {
    const result = checkAnswerAdvanced(correctAnswer, userAnswer);
    return result.status === 'correct';
}

function getHint(answer, revealCount = 2) {
    if (!answer) return '';
    const chars = answer.split('');
    const hintChars = chars.map((char, i) => {
        if (char === ' ') return ' ';
        if (i < revealCount) return char;
        return '_';
    });
    return hintChars.join('');
}

function isSurrender(text) {
    if (!text) return false;
    const surrenderWords = [
        'rendirse', 'me rindo', 'me rindio', 'rindo', 'rendición',
        'me rindo', 'nos rendimos', 'skip', 'pasar', 'no sé',
        'no se', 'no tengo idea', 'no tengo ni idea', 'no idea', 'give up',
        'nyerah', 'aku nyerah', 'gw nyerah', 'gue nyerah', 'menyerah',
        'aku menyerah', 'gw menyerah', 'ga tau', 'gatau', 'gak tau',
        'tidak tau', 'nggak tau'
    ];
    const normalized = text.toLowerCase().trim();
    return surrenderWords.some(word => normalized === word);
}

function createSession(chatId, gameType, questionData, messageKey, timeout = 60000) {
    if (gameSessions.has(chatId)) {
        const oldSession = gameSessions.get(chatId);
        if (oldSession.timer) {
            clearTimeout(oldSession.timer);
        }
    }
    
    const session = {
        chatId,
        gameType,
        question: questionData,
        messageKey,
        startTime: Date.now(),
        timeout,
        endTime: Date.now() + timeout,
        attempts: 0,
        timer: null,
        onTimeout: null
    };
    
    gameSessions.set(chatId, session);
    return session;
}

function setSessionTimer(chatId, callback) {
    const session = gameSessions.get(chatId);
    if (!session) return;
    
    const remaining = session.endTime - Date.now();
    if (remaining <= 0) {
        callback();
        return;
    }
    
    session.timer = setTimeout(() => {
        const currentSession = gameSessions.get(chatId);
        if (currentSession && currentSession.startTime === session.startTime) {
            callback();
            gameSessions.delete(chatId);
        }
    }, remaining);
    
    session.onTimeout = callback;
}

function getSession(chatId) {
    return gameSessions.get(chatId) || null;
}

function endSession(chatId) {
    const session = gameSessions.get(chatId);
    if (session && session.timer) {
        clearTimeout(session.timer);
    }
    gameSessions.delete(chatId);
    return session;
}

function hasActiveSession(chatId) {
    return gameSessions.has(chatId);
}

function getRemainingTime(chatId) {
    const session = gameSessions.get(chatId);
    if (!session) return 0;
    const remaining = Math.max(0, session.endTime - Date.now());
    return Math.ceil(remaining / 1000);
}

function formatRemainingTime(seconds) {
    if (seconds <= 0) return '0 segundos';
    if (seconds < 60) return `${seconds} segundos`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function isReplyToGame(m, session) {
    if (!m.quoted || !session || !session.messageKey) return false;
    if (m.quoted.id === session.messageKey.id) return true;
    if (m.quoted.stanzaId === session.messageKey.id) return true;
    if (m.quoted.fromMe || m.quoted.isBaileys) return true;
    return false;
}

const GAME_REWARD = {
    limit: 5,
    balance: 1000,
    exp: 2000
};

function randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomReward() {
    return {
        limit: randBetween(3, 8),
        koin: randBetween(500, 2000),
        exp: randBetween(1000, 3000)
    };
}

function getProgressiveHint(answer, attempts) {
    if (!answer) return '';
    const chars = answer.split('');
    const totalChars = chars.filter(c => c !== ' ').length;
    const base = 2;
    const reveal = Math.min(totalChars, base + Math.floor(attempts / 2));
    let revealed = 0;
    return chars.map((char, i) => {
        if (char === ' ') return ' ';
        if (revealed < reveal) { revealed++; return char; }
        return '_';
    }).join('');
}

setInterval(() => {
    const now = Date.now();
    const MAX_AGE = 10 * 60 * 1000;
    for (const [chatId, session] of gameSessions) {
        if (now - session.startTime > MAX_AGE) {
            if (session.timer) clearTimeout(session.timer);
            gameSessions.delete(chatId);
        }
    }
}, 5 * 60 * 1000);

export { loadData, getRandomItem, getItemByIndex, searchItem, getAllData, normalizeAnswer, checkAnswer, checkAnswerAdvanced, getSimilarity, getHint, isSurrender, createSession, setSessionTimer, getSession, endSession, hasActiveSession, getRemainingTime, formatRemainingTime, isReplyToGame, GAME_REWARD, getRandomReward, getProgressiveHint }