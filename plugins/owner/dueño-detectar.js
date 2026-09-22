import fs from 'fs'
import path from 'path'

const RAIZ = path.join(process.cwd(), 'plugins')

function listarPlugins(dir = RAIZ, base = '', out = []) {
    let entradas = []
    try { entradas = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
    for (const e of entradas) {
        if (e.name.startsWith('.')) continue
        const rel = base ? `${base}/${e.name}` : e.name
        if (e.isDirectory()) listarPlugins(path.join(dir, e.name), rel, out)
        else if (e.name.endsWith('.js')) out.push(rel)
    }
    return out
}

let handler = async (m, { conn }) => {
    try {
        await m.react('👁️')

        const files = listarPlugins()

        let response = `⚫ *Shadow Garden – Escaneo de Corrupción* ⚫\n\n`
        response += `「 𝘌𝘭 𝘚𝘰𝘮𝘣𝘳𝘢 𝘚𝘶𝘱𝘳𝘦𝘮𝘰 𝘪𝘯𝘪𝘤𝘪𝘢 𝘦𝘭 𝘢𝘯𝘢́𝘭𝘪𝘴𝘪𝘴 」\n\n`
        response += `📂 *Plugins detectados:* ${files.length}\n`
        response += `━━━━━━━━━━━━━━━━━━━\n\n`

        let hasErrors = false
        let errorCount = 0

        for (const file of files) {
            try {
                await import(path.join(RAIZ, file))
            } catch (error) {
                hasErrors = true
                errorCount++

                const stackLines = error.stack.split('\n')
                const errorLineMatch = stackLines[0].match(/:(\d+):\d+/)
                const errorLine = errorLineMatch ? errorLineMatch[1] : 'Desconocido'

                response += `⚠️ *Corrupción detectada*\n`
                response += `📁 Archivo: *${file}*\n`
                response += `🩸 Motivo: *${error.message}*\n`
                response += `📍 Línea: *${errorLine}*\n`
                response += `━━━━━━━━━━━━━━━━━━━\n\n`
            }
        }

        if (!hasErrors) {
            response += `✨ *Todos los archivos están limpios.*\n`
            response += `⚫ La Sombra no detecta corrupción en el sistema.\n`
        } else {
            response += `🔥 *Resumen de corrupción detectada*\n`
            response += `❌ Errores totales: *${errorCount}*\n`
            response += `📂 Archivos analizados: *${files.length}*\n`
            response += `⚫ La Sombra exige corregir los archivos marcados.\n`
        }

        await m.reply(response)
        await m.react(hasErrors ? '⚠️' : '✔️')

    } catch (err) {
        await m.react('💀')
        await m.reply(
            `💀 *La Sombra detectó un fallo interno*\n\n` +
            `📝 Error: *${err.message}*`
        )
    }
}

handler.command = ['detectarsyntax', 'detectar', 'checksyntax']
handler.help = ['detectarsyntax']
handler.tags = ['owner']

export default handler
