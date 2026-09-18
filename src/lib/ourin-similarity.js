async function levenshteinDistance(str1, str2) {
    const m = str1.length
    const n = str2.length
    
    if (m === 0) return n
    if (n === 0) return m
    
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
    
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            )
        }
    }
    
    return dp[m][n]
}

function damerauLevenshteinDistance(str1, str2) {
    const m = str1.length
    const n = str2.length
    
    if (m === 0) return n
    if (n === 0) return m
    
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
    
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            )
            
            if (i > 1 && j > 1 && str1[i - 1] === str2[j - 2] && str1[i - 2] === str2[j - 1]) {
                dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost)
            }
        }
    }
    
    return dp[m][n]
}

function jaroWinklerSimilarity(str1, str2) {
    if (str1 === str2) return 1.0
    
    const len1 = str1.length
    const len2 = str2.length
    
    if (len1 === 0 || len2 === 0) return 0.0
    
    const matchWindow = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0)
    
    const matches1 = new Array(len1).fill(false)
    const matches2 = new Array(len2).fill(false)
    
    let matches = 0
    let transpositions = 0
    
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchWindow)
        const end = Math.min(i + matchWindow + 1, len2)
        
        for (let j = start; j < end; j++) {
            if (matches2[j] || str1[i] !== str2[j]) continue
            matches1[i] = true
            matches2[j] = true
            matches++
            break
        }
    }
    
    if (matches === 0) return 0.0
    
    let k = 0
    for (let i = 0; i < len1; i++) {
        if (!matches1[i]) continue
        while (!matches2[k]) k++
        if (str1[i] !== str2[k]) transpositions++
        k++
    }
    
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
    
    let prefix = 0
    for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
        if (str1[i] === str2[i]) prefix++
        else break
    }
    
    return jaro + prefix * 0.1 * (1 - jaro)
}

function nGramSimilarity(str1, str2, n = 2) {
    if (!str1 || !str2) return 0
    if (str1 === str2) return 1
    
    const getNGrams = (str, n) => {
        const grams = new Set()
        const padded = ' '.repeat(n - 1) + str + ' '.repeat(n - 1)
        for (let i = 0; i < padded.length - n + 1; i++) {
            grams.add(padded.substring(i, i + n))
        }
        return grams
    }
    
    const grams1 = getNGrams(str1, n)
    const grams2 = getNGrams(str2, n)
    
    let intersection = 0
    for (const gram of grams1) {
        if (grams2.has(gram)) intersection++
    }
    
    const union = grams1.size + grams2.size - intersection
    return union === 0 ? 0 : intersection / union
}

function tokenSortRatio(str1, str2) {
    const sorted1 = str1.toLowerCase().split(/\s+/).sort().join(' ')
    const sorted2 = str2.toLowerCase().split(/\s+/).sort().join(' ')
    return getSimilarity(sorted1, sorted2)
}

function getSimilarity(str1, str2) {
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    const maxLen = Math.max(str1.length, str2.length)
    if (maxLen === 0) return 1
    return 1 - distance / maxLen
}

function getAdvancedSimilarity(str1, str2) {
    const s1 = str1.toLowerCase()
    const s2 = str2.toLowerCase()
    
    const levenshtein = getSimilarity(s1, s2)
    const jaroWinkler = jaroWinklerSimilarity(s1, s2)
    const ngram2 = nGramSimilarity(s1, s2, 2)
    const ngram3 = nGramSimilarity(s1, s2, 3)
    
    const combined = (levenshtein * 0.3) + (jaroWinkler * 0.35) + (ngram2 * 0.2) + (ngram3 * 0.15)
    
    return Math.min(1, combined)
}

function getMatchType(inputLower, cmdLower) {
    if (cmdLower === inputLower) return { type: 'exact', score: 1.0, emoji: '✅', label: 'Exacto' }
    const isShortCmd = cmdLower.length < 3
    const isLongInput = inputLower.length > 3
    if (cmdLower.startsWith(inputLower)) return { type: 'prefix', score: 0.95, emoji: '🎯', label: 'Coincide al inicio' }
    if (inputLower.startsWith(cmdLower)) {
        if (isShortCmd && isLongInput) return null 
        return { type: 'contains', score: 0.9, emoji: '📌', label: 'Comando más corto' }
    }
    if (cmdLower.includes(inputLower)) return { type: 'substring', score: 0.85, emoji: '🔗', label: 'Parte del comando' }
    if (inputLower.includes(cmdLower)) {
        if (isShortCmd && isLongInput) return null
        return { type: 'reverse-substring', score: 0.8, emoji: '📎', label: 'Comando está en la entrada' }
    }
    return null
}

function findSimilarCommands(input, commands, options = {}) {
    const {
        maxResults = 5,
        minSimilarity = 0.2,
        maxDistance = 6,
        useAdvanced = true
    } = options
    
    const inputLower = (input && typeof input === 'string') ? input.toLowerCase() : ''
    const results = []
    
    for (const cmd of commands) {
        if (!cmd || typeof cmd !== 'string') continue
        const cmdLower = cmd.toLowerCase()
        
        const directMatch = getMatchType(inputLower, cmdLower)
        if (directMatch) {
            results.push({
                command: cmd,
                similarity: directMatch.score,
                distance: Math.abs(cmd.length - input.length),
                type: directMatch.type,
                emoji: directMatch.emoji,
                reason: directMatch.label
            })
            continue
        }
        
        const distance = damerauLevenshteinDistance(inputLower, cmdLower)
        const similarity = useAdvanced ? getAdvancedSimilarity(inputLower, cmdLower) : getSimilarity(inputLower, cmdLower)
        
        let bonus = 0
        if (cmdLower[0] === inputLower[0]) bonus += 0.12
        if (cmdLower.slice(0, 2) === inputLower.slice(0, 2)) bonus += 0.08
        if (cmdLower.slice(0, 3) === inputLower.slice(0, 3)) bonus += 0.05
        
        if (cmdLower.includes(inputLower.slice(0, Math.ceil(inputLower.length / 2)))) {
            bonus += 0.1
        }
        
        const consonants1 = cmdLower.replace(/[aeiou]/g, '')
        const consonants2 = inputLower.replace(/[aeiou]/g, '')
        if (consonants1 === consonants2) bonus += 0.15
        
        const finalSimilarity = Math.min(1, similarity + bonus)
        
        if (distance <= maxDistance || finalSimilarity >= minSimilarity) {
            let reason = 'Similar'
            let emoji = '🔍'
            
            if (distance === 1) {
                const transposed = inputLower.length === cmdLower.length && 
                    levenshteinDistance(inputLower, cmdLower) === 2 &&
                    damerauLevenshteinDistance(inputLower, cmdLower) === 1
                if (transposed) {
                    reason = 'Letras intercambiadas'
                    emoji = '🔄'
                } else {
                    reason = 'Error de tipeo 1 letra'
                    emoji = '✏️'
                }
            } else if (distance === 2) {
                reason = 'Error de tipeo 2 letras'
                emoji = '📝'
            } else if (finalSimilarity >= 0.85) {
                reason = 'Muy similar'
                emoji = '⭐'
            } else if (finalSimilarity >= 0.7) {
                reason = 'Bastante similar'
                emoji = '💫'
            } else if (finalSimilarity >= 0.5) {
                reason = 'Algo similar'
                emoji = '🌟'
            } else if (finalSimilarity >= 0.3) {
                reason = 'Poco similar'
                emoji = '✨'
            }
            
            results.push({
                command: cmd,
                similarity: finalSimilarity,
                distance,
                type: 'similar',
                emoji,
                reason
            })
        }
    }
    
    results.sort((a, b) => {
        if (Math.abs(b.similarity - a.similarity) > 0.05) return b.similarity - a.similarity
        if (b.type !== a.type) {
            const typePriority = { exact: 0, prefix: 1, contains: 2, substring: 3, 'reverse-substring': 4, similar: 5 }
            return typePriority[a.type] - typePriority[b.type]
        }
        return a.distance - b.distance
    })
    
    return results.slice(0, maxResults)
}

function createProgressBar(percent, length = 10) {
    const filled = Math.round(percent / (100 / length))
    const empty = length - filled
    
    const gradientFill = ['█', '▓', '▒']
    const fillChar = percent >= 75 ? gradientFill[0] : percent >= 50 ? gradientFill[1] : gradientFill[2]
    
    return fillChar.repeat(filled) + '░'.repeat(empty)
}

function formatSuggestionMessage(inputCommand, suggestions, prefix = '.', m) {
    if (suggestions.length === 0) return null
    
    const topMatch = suggestions[0]
    const topPercent = Math.round(topMatch.similarity * 100)
    
    const getConfidenceLevel = (percent) => {
        if (percent >= 85) return { text: 'Muy Alto', emoji: '🟢' }
        if (percent >= 70) return { text: 'Alto', emoji: '🟡' }
        if (percent >= 50) return { text: 'Medio', emoji: '🟠' }
        return { text: 'Bajo', emoji: '🔴' }
    }
    
    const confidence = getConfidenceLevel(topPercent)

    let msg2 = `👋 Hola *${m.pushName}*!
    
Parece que estás buscando el comando \`${inputCommand}\` 🤔

Lo siento mucho, pero el comando \`${inputCommand}\` aún no está disponible en nuestro sistema. 🥺
¿Quizás hubo un pequeño error de tipeo? 😅👇`
    return {
        message: msg2,
        interactiveButtons: suggestions.slice(0, 2).map((s, i) => {
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: `Probar: ${prefix}${s.command}`,
                    id: `${prefix}${s.command}`
                })
            }
        })
    }
    
    // let msg = `╭━━━━『 ❌ *ᴄᴏᴍᴍᴀɴᴅ ɴᴏᴛ ꜰᴏᴜɴᴅ* 』━━━━╮\n\n`
    // msg += `┃ 🔎 *ɪɴᴘᴜᴛ:* \`${prefix}${inputCommand}\`\n`
    // msg += `┃ 📊 *ꜰᴏᴜɴᴅ:* ${suggestions.length} saran\n`
    // msg += `┃ 🎯 *ᴛᴏᴘ ᴍᴀᴛᴄʜ:* \`${prefix}${topMatch.command}\`\n`
    // msg += `┃ ${confidence.emoji} *ᴄᴏɴꜰɪᴅᴇɴᴄᴇ:* ${topPercent}% (${confidence.text})\n\n`
    // msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`
    
    // msg += `╭┈┈⬡「 💡 *sᴀʀᴀɴ ᴄᴏᴍᴍᴀɴᴅ* 」`
    
    // suggestions.forEach((s, i) => {
    //     const matchPercent = Math.round(s.similarity * 100)
    //     const bar = createProgressBar(matchPercent)
    //     const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
        
    //     msg += `┃\n`
    //     msg += `┃ ${medal} *\`${prefix}${s.command}\`*\n`
    //     msg += `┃   ├ ${bar} *${matchPercent}%*\n`
    //     msg += `┃   ├ ${s.emoji} _${s.reason}_\n`
    //     msg += `┃   └ 📏 Jarak: ${s.distance} karakter\n`
    // })
    
    // msg += `╰┈┈⬡\n\n`
    
    // msg += `╭┈┈⬡「 ℹ️ *ᴛɪᴘs* 」\n`
    // msg += `┃ • Pilih command dari daftar di atas\n`
    // msg += `┃ • Ketik \`${prefix}menu\` untuk daftar lengkap\n`
    // msg += `┃ • Ketik \`${prefix}help <cmd>\` untuk bantuan\n`
    // msg += `╰┈┈⬡`
    
    // return msg
}

function formatSuggestionButtons(inputCommand, suggestions, prefix = '.') {
    if (suggestions.length === 0) return []
    
    return suggestions.slice(0, 10).map((s, i) => {
        const matchPercent = Math.round(s.similarity * 100)
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
        
        return {
            header: `${medal} ${prefix}${s.command}`,
            title: `${s.emoji} ${s.reason} • ${matchPercent}% coincide`,
            description: `Haz clic en el comando para probar`,
            id: `${prefix}${s.command}`
        }
    })
}

function createSuggestionResponse(inputCommand, suggestions, prefix = '.') {
    const message = formatSuggestionMessage(inputCommand, suggestions, prefix)
    const buttons = formatSuggestionButtons(inputCommand, suggestions, prefix)
    
    return {
        message,
        buttons,
        hasSuggestions: suggestions.length > 0,
        topSuggestion: suggestions[0] || null,
        confidence: suggestions[0] ? Math.round(suggestions[0].similarity * 100) : 0
    }
}

function fuzzyMatch(input, commands, threshold = 0.3) {
    return findSimilarCommands(input, commands, { minSimilarity: threshold, useAdvanced: true })
        .filter(r => r.similarity >= threshold)
}

export { levenshteinDistance, damerauLevenshteinDistance, jaroWinklerSimilarity, nGramSimilarity, tokenSortRatio, getSimilarity, getAdvancedSimilarity, findSimilarCommands, formatSuggestionMessage, formatSuggestionButtons, createSuggestionResponse, createProgressBar, fuzzyMatch }