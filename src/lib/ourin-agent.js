import { Agent, setGlobalDispatcher } from 'undici'
import { cpus } from 'os'
const cpuCount = cpus().length

function initializeAgent() {
    setGlobalDispatcher(
        new Agent({
            connections: Math.max(5, cpuCount * 2),
            pipelining: 1,
            keepAliveTimeout: 5_000,
            keepAliveMaxTimeout: 60_000,
            connectTimeout: 10_000,
            bodyTimeout: 30_000,
            headersTimeout: 30_000,
            maxRedirections: 3
        })
    )
}

export { initializeAgent }