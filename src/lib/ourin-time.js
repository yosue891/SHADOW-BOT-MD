import moment from 'moment-timezone'
const TIMEZONE = 'Asia/Jakarta'

moment.locale('id')

function now() {
    return moment.tz(TIMEZONE)
}

function formatTime(format = 'HH:mm:ss') {
    return moment.tz(TIMEZONE).format(format)
}

function formatDate(format = 'DD-MM-YYYY') {
    return moment.tz(TIMEZONE).format(format)
}

function formatDateTime(format = 'DD-MM-YYYY HH:mm:ss') {
    return moment.tz(TIMEZONE).format(format)
}

function formatFull(format = 'dddd, DD MMMM YYYY HH:mm:ss') {
    return moment.tz(TIMEZONE).format(format)
}

function getHour() {
    return parseInt(moment.tz(TIMEZONE).format('HH'), 10)
}

function getMinute() {
    return parseInt(moment.tz(TIMEZONE).format('mm'), 10)
}

function getCurrentTimeString() {
    return moment.tz(TIMEZONE).format('HH:mm')
}

function fromTimestamp(timestamp, format = 'DD-MM-YYYY HH:mm:ss') {
    return moment(timestamp).tz(TIMEZONE).format(format)
}

function getLocalDateObject() {
    return moment.tz(TIMEZONE).toDate()
}

export { now, formatTime, formatDate, formatDateTime, formatFull, getHour, getMinute, getCurrentTimeString, fromTimestamp, getLocalDateObject, TIMEZONE }