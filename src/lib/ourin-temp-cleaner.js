import fs from 'fs'
import path from 'path'
import { logger } from './ourin-logger.js'
const CLEAN_INTERVAL = 30 * 60 * 1000
const TEMP_DIRS = ['temp', 'tmp']

let cleanerTimer = null

function startTempCleaner() {
    if (cleanerTimer) return

    cleanerTimer = setInterval(() => {
        let totalCleaned = 0
        for (const dir of TEMP_DIRS) {
            const dirPath = path.join(process.cwd(), dir)
            if (!fs.existsSync(dirPath)) continue

            try {
                const files = fs.readdirSync(dirPath)
                for (const file of files) {
                    try {
                        fs.unlinkSync(path.join(dirPath, file))
                        totalCleaned++
                    } catch {}
                }
            } catch {}
        }
        if (totalCleaned > 0) {
            logger.system('temp', `cleaned ${totalCleaned} file(s)`)
        }
    }, CLEAN_INTERVAL)

    if (cleanerTimer.unref) cleanerTimer.unref()
    logger.success('temp', `auto-clean every ${CLEAN_INTERVAL / 60000}m`)
}

function stopTempCleaner() {
    if (cleanerTimer) {
        clearInterval(cleanerTimer)
        cleanerTimer = null
    }
}

export { startTempCleaner, stopTempCleaner }