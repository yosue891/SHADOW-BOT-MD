import axios from 'axios'
import config from '../../config.js'
const BASE_URL = 'https://api.jasaotp.id/v1'
const CACHE_TTL = 300000

let countryCache = null
let countryCacheTime = 0
let serviceCache = {}
let serviceCacheTime = {}

function getApiKey() {
    const key = config.jasaotp?.apiKey
    if (!key) throw new Error('API key de JasaOTP no configurada en config.js')
    return key
}

function isEnabled() {
    return !!config.jasaotp?.apiKey
}

function getMarkup() {
    return config.jasaotp?.markup || 2000
}

function getTimeout() {
    return config.jasaotp?.timeout || 300
}

async function getBalance() {
    const { data } = await axios.get(`${BASE_URL}/balance.php`, {
        params: { api_key: getApiKey() },
        timeout: 15000
    })

    if (!data.success) throw new Error(data.message || 'Error al verificar saldo')
    return data.data.saldo
}

async function getCountries() {
    const now = Date.now()
    if (countryCache && (now - countryCacheTime) < CACHE_TTL) {
        return countryCache
    }

    const { data } = await axios.get(`${BASE_URL}/negara.php`, { timeout: 15000 })

    if (!data.success) throw new Error(data.message || 'Error al obtener lista de países')

    countryCache = data.data
    countryCacheTime = now
    return data.data
}

async function getServices(countryId) {
    const now = Date.now()
    const cacheKey = String(countryId)

    if (serviceCache[cacheKey] && (now - (serviceCacheTime[cacheKey] || 0)) < CACHE_TTL) {
        return serviceCache[cacheKey]
    }

    const { data } = await axios.get(`${BASE_URL}/layanan.php`, {
        params: { negara: countryId },
        timeout: 15000
    })

    const services = data[cacheKey] || data.data?.[cacheKey] || data[countryId] || {}

    if (Object.keys(services).length === 0) {
        throw new Error('No hay servicios disponibles para este país')
    }

    serviceCache[cacheKey] = services
    serviceCacheTime[cacheKey] = now
    return services
}

async function getOperators(countryId) {
    const { data } = await axios.get(`${BASE_URL}/operator.php`, {
        params: { negara: countryId },
        timeout: 15000
    })

    if (!data.success) throw new Error(data.message || 'Error al obtener lista de operadores')

    const operators = data.data?.[String(countryId)] || data.data || []
    return Array.isArray(operators) ? operators : Object.values(operators)
}

async function createOrder(countryId, service, operator) {
    const { data } = await axios.get(`${BASE_URL}/order.php`, {
        params: {
            api_key: getApiKey(),
            negara: countryId,
            layanan: service,
            operator: operator
        },
        timeout: 30000
    })

    if (!data.success) throw new Error(data.message || 'Error al crear pedido OTP')

    return {
        orderId: data.data.order_id,
        number: data.data.number
    }
}

async function checkSms(orderId) {
    const { data } = await axios.get(`${BASE_URL}/sms.php`, {
        params: {
            api_key: getApiKey(),
            id: orderId
        },
        timeout: 15000
    })

    if (!data.success) return null
    return data.data?.otp || null
}

async function cancelOrder(orderId) {
    const { data } = await axios.get(`${BASE_URL}/cancel.php`, {
        params: {
            api_key: getApiKey(),
            id: orderId
        },
        timeout: 15000
    })

    if (!data.success) throw new Error(data.message || 'Error al cancelar el pedido')

    return {
        orderId: data.data?.order_id,
        refundedAmount: data.data?.refunded_amount || 0
    }
}

function formatPrice(num) {
    return num.toLocaleString('id-ID')
}

export { isEnabled, getApiKey, getMarkup, getTimeout, getBalance, getCountries, getServices, getOperators, createOrder, checkSms, cancelOrder, formatPrice }