import { cpus } from 'os'
import { exec } from 'child_process'
import { logger } from './ourin-logger.js'
const CONCURRENCY = Math.max(2, cpus().length)
const TIMEOUT = 60_000

let queue = []
let running = 0

function runNext() {
    while (running < CONCURRENCY && queue.length > 0) {
        const task = queue.shift()
        running++
        task.execute()
            .then(task.resolve)
            .catch(task.reject)
            .finally(() => {
                running--
                runNext()
            })
    }
}

function queueFFmpeg(command) {
    return new Promise((resolve, reject) => {
        const execute = () => new Promise((res, rej) => {
            const child = exec(command, { maxBuffer: 50 * 1024 * 1024 })
            let timedOut = false
            let stderr = ''

            const timer = setTimeout(() => {
                timedOut = true
                child.kill('SIGKILL')
            }, TIMEOUT)

            child.stderr?.on('data', (chunk) => {
                stderr += chunk
                if (stderr.length > 2000) stderr = stderr.slice(-2000)
            })

            child.on('close', (code) => {
                clearTimeout(timer)
                if (timedOut) return rej(new Error(`FFmpeg timeout (${TIMEOUT / 1000}s)`))
                if (code !== 0) return rej(new Error(`FFmpeg exit code ${code}: ${stderr.split('\n').pop()}`))
                res()
            })

            child.on('error', (err) => {
                clearTimeout(timer)
                rej(err)
            })
        })

        queue.push({ execute, resolve, reject })
        runNext()
    })
}

function getQueueStats() {
    return {
        running,
        queued: queue.length,
        concurrency: CONCURRENCY
    }
}

export { queueFFmpeg, getQueueStats, CONCURRENCY }