const gameQueue = new Map()
const QUEUE_DELAY = 500
const BATCH_WINDOW = 1000

function getQueueKey(chatId, command) {
    return `${chatId}_${command}`
}

function addToQueue(chatId, command, sender, timestamp) {
    const key = getQueueKey(chatId, command)
    if (!gameQueue.has(key)) {
        gameQueue.set(key, {
            requests: [],
            processing: false,
            lastProcess: 0
        })
    }
    
    const queue = gameQueue.get(key)
    queue.requests.push({ sender, timestamp })
    
    return queue
}

function shouldBatch(chatId, command) {
    const key = getQueueKey(chatId, command)
    const queue = gameQueue.get(key)
    if (!queue) return false
    
    if (queue.requests.length >= 3) return true
    
    const now = Date.now()
    const recentRequests = queue.requests.filter(r => now - r.timestamp < BATCH_WINDOW)
    return recentRequests.length >= 3
}

function getQueuePosition(chatId, command, sender) {
    const key = getQueueKey(chatId, command)
    const queue = gameQueue.get(key)
    if (!queue) return 0
    
    const index = queue.requests.findIndex(r => r.sender === sender)
    return index + 1
}

function clearQueue(chatId, command) {
    const key = getQueueKey(chatId, command)
    gameQueue.delete(key)
}

function isQueueProcessing(chatId, command) {
    const key = getQueueKey(chatId, command)
    const queue = gameQueue.get(key)
    return queue?.processing || false
}

function setQueueProcessing(chatId, command, processing) {
    const key = getQueueKey(chatId, command)
    const queue = gameQueue.get(key)
    if (queue) {
        queue.processing = processing
        if (processing) queue.lastProcess = Date.now()
    }
}

function getWaitTime(chatId, command) {
    const key = getQueueKey(chatId, command)
    const queue = gameQueue.get(key)
    if (!queue) return 0
    
    return Math.max(0, queue.requests.length * QUEUE_DELAY)
}

async function processWithSmartQueue(chatId, command, sender, callback) {
    const queue = addToQueue(chatId, command, sender, Date.now())
    
    if (shouldBatch(chatId, command) && !queue.processing) {
        setQueueProcessing(chatId, command, true)
        
        const waitTime = getWaitTime(chatId, command)
        if (waitTime > 0) {
            await new Promise(r => setTimeout(r, waitTime))
        }
        
        try {
            const result = await callback()
            return result
        } finally {
            setQueueProcessing(chatId, command, false)
            queue.requests = queue.requests.filter(r => r.sender !== sender)
        }
    } else {
        const position = getQueuePosition(chatId, command, sender)
        const delay = position * QUEUE_DELAY
        
        if (delay > 0) {
            await new Promise(r => setTimeout(r, delay))
        }
        
        try {
            const result = await callback()
            return result
        } finally {
            queue.requests = queue.requests.filter(r => r.sender !== sender)
        }
    }
}

function getActiveGamesCount(chatId) {
    let count = 0
    for (const [key] of gameQueue) {
        if (key.startsWith(chatId)) {
            count++
        }
    }
    return count
}

export { addToQueue, shouldBatch, getQueuePosition, clearQueue, isQueueProcessing, setQueueProcessing, getWaitTime, processWithSmartQueue, getActiveGamesCount, QUEUE_DELAY, BATCH_WINDOW }