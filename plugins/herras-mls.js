const handler = async (m, { conn }) => {
    // El código HTML gigante que pasaste en la estructura
    const htmlCode = `<!DOCTYPE html><html lang="es"><head><meta charSet="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, shrink-to-fit=no"/><link rel="canonical" href="https://spotdown.org/es3/404"/><meta property="og:url" content="https://spotdown.org/es3/404"/><meta property="og:type" content="website"/><meta property="twitter:card" content="summary_large_image"/><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-status-bar-style" content="default"/><meta name="apple-mobile-web-app-title" content="Spotdown"/><meta name="application-name" content="Spotdown"/><meta name="author" content="Spotdown"/><link rel="alternate" href="https://spotdown.org/404" hrefLang="en"/><link rel="alternate" href="https://spotdown.org/es3/404" hrefLang="es"/><link rel="alternate" href="https://spotdown.org/pt/404" hrefLang="pt"/><link rel="alternate" href="https://spotdown.org/de/404" hrefLang="de"/><link rel="alternate" href="https://spotdown.org/fr/404" hrefLang="fr"/><link rel="alternate" href="https://spotdown.org/tr/404" hrefLang="tr"/><link rel="alternate" href="https://spotdown.org/hi/404" hrefLang="hi"/><link rel="alternate" href="https://spotdown.org/id/404" hrefLang="id"/><link rel="alternate" href="https://spotdown.org/it/404" hrefLang="it"/><link rel="alternate" href="https://spotdown.org/ja/404" hrefLang="ja"/><link rel="alternate" href="https://spotdown.org/ru/404" hrefLang="ru"/><link rel="alternate" href="https://spotdown.org/th/404" hrefLang="th"/><link rel="alternate" href="https://spotdown.org/nl/404" hrefLang="nl"/><link rel="alternate" href="https://spotdown.org/ar/404" hrefLang="ar"/><link rel="alternate" href="https://spotdown.org/vi/404" hrefLang="vi"/><link rel="alternate" href="https://spotdown.org/ko/404" hrefLang="ko"/><link rel="alternate" href="https://spotdown.org/pl/404" hrefLang="pl"/><link rel="alternate" href="https://spotdown.org/tl/404" hrefLang="tl"/><link rel="alternate" href="https://spotdown.org/ms/404" hrefLang="ms"/><link rel="alternate" href="https://spotdown.org/zh/404" hrefLang="zh"/><link rel="alternate" href="https://spotdown.org/bn/404" hrefLang="bn"/><link rel="alternate" href="https://spotdown.org/el/404" hrefLang="el"/><link rel="alternate" href="https://spotdown.org/404" hrefLang="x-default"/><script type="application/ld+json">{"@context":"http://schema.org","@graph":[{"@type":"WebSite","name":"Spotdown","alternateName":["Spotify downloader","Spotdown","Spotifydown","Spot down","Spotify to mp3","Spotify song downloader"],"url":"https://spotdown.org"},{"@type":"WebPage","inLanguage":"es","url":"https://spotdown.org/es3/404"},{"@type":"Organization","name":"Spotdown","alternateName":"Spotify downloader","url":"https://spotdown.org","email":"contact@spotdown.org","logo":"https://spotdown.org/images/logo.png"},{"@type":"WebApplication","name":"Spotdown","url":"https://spotdown.org/es3/404","image":"https://spotdown.org/images/spotdown.png","operatingSystem":"Windows, Linux, iOS, Android, OSX, macOS","applicationCategory":"UtilitiesApplication","featureList":["Spotify Song Downloader","Playlist Downloader","Album Downloader","Artist Downloader","Search Downloader","MP3 Downloader"],"contentRating":"Everyone","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"16786","itemReviewed":{"@type":"WebApplication","name":"Spotdown","url":"https://spotdown.org"}},"offers":{"@type":"Offer","price":"0"}}]}</script> head></html>`

    const msg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: "texto2" },
                    footer: { text: "Shadow Bot — MLS" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_code",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Ver código",
                                    title: "Código en Python",
                                    code: htmlCode // Aquí va el código que se muestra al abrir
                                })
                            }
                        ]
                    },
                    contextInfo: {
                        stanzaId: 'SUKI236A27D55592C20C',
                        participant: '261181826699458@lid',
                        quotedMessage: {
                            conversation: htmlCode // La clave es que la cita sea el mismo código
                        }
                    }
                }
            }
        }
    }

    await conn.relayMessage(m.chat, msg, { messageId: m.key.id })
}

handler.help = ['mls']
handler.tags = ['main']
handler.command = ['mls']

export default handler
