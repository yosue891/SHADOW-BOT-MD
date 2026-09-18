import axios from 'axios'
class Pinterest {
    constructor() {
        this.api = {
            base: 'https://www.pinterest.com',
            endpoints: {
                pin: '/resource/PinResource/get/'
            }
        }
        this.headers = {
            accept: 'application/json, text/javascript, */*, q=0.01',
            referer: 'https://www.pinterest.com/',
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'x-app-version': 'f1222d7',
            'x-pinterest-appstate': 'active',
            'x-pinterest-pws-handler': 'www/[username]/[slug].js',
            'x-pinterest-source-url': '/search/pins/?rs=typed&q=xxx/',
            'x-requested-with': 'XMLHttpRequest'
        }
        this.client = axios.create({
            baseURL: this.api.base,
            headers: this.headers
        })
        this.cookies = ''

        this.client.interceptors.response.use(
            (response) => {
                const setCookieHeaders = response.headers['set-cookie']
                if (setCookieHeaders) {
                    const newCookies = setCookieHeaders.map((cookieString) => {
                        const cp = cookieString.split(';')
                        return cp[0].trim()
                    })
                    this.cookies = newCookies.join('; ')
                    this.client.defaults.headers.cookie = this.cookies
                }
                return response
            },
            (error) => Promise.reject(error)
        )
    }

    isUrl(str) {
        try {
            new URL(str)
            return true
        } catch (_) {
            return false
        }
    }

    isPin(url) {
        if (!url) return false
        const patterns = [
            /^https?:\/\/(?:[\w-]+\.)?pinterest\.[\w.]+\/pin\/[\w.-]+/,
            /^https?:\/\/pin\.it\/[\w.-]+/,
            /^https?:\/\/(?:[\w-]+\.)?pinterest\.[\w.]+\/pin\/[\d]+(?:\/)?/
        ]
        const clean = url.trim().toLowerCase()
        return patterns.some((pattern) => pattern.test(clean))
    }

    async followRedirects(url, maxRedirects = 2) {
        try {
            let currentUrl = url
            let redirectCount = 0
            while (redirectCount < maxRedirects) {
                const response = await axios.head(currentUrl, {
                    maxRedirects: 0,
                    validateStatus: (status) => status < 400 || (status >= 300 && status < 400),
                    timeout: 10000
                })
                if (response.status >= 300 && response.status < 400 && response.headers.location) {
                    currentUrl = response.headers.location
                    if (!currentUrl.startsWith('http')) {
                        const baseUrl = new URL(url)
                        currentUrl = new URL(currentUrl, baseUrl.origin).href
                    }
                    redirectCount++
                } else {
                    break
                }
            }
            return currentUrl
        } catch (error) {
            if (error.response && error.response.status >= 300 && error.response.status < 400) {
                return error.response.headers.location || url
            }
            return url
        }
    }

    async initCookies() {
        try {
            await this.client.get('/')
            return true
        } catch (error) {
            return false
        }
    }

    async download(pinUrl) {
        if (!pinUrl || !this.isUrl(pinUrl)) throw new Error('Invalid URL')

        try {
            const finalUrl = await this.followRedirects(pinUrl, 2)
            if (!this.isPin(finalUrl)) throw new Error('Not a valid Pinterest URL')

            const pinId = finalUrl.split('/pin/')[1]?.split('/')[0]?.split('?')[0]
            if (!pinId) throw new Error('Could not extract Pin ID')

            if (!this.cookies) await this.initCookies()

            const params = {
                source_url: `/pin/${pinId}/`,
                data: JSON.stringify({
                    options: { field_set_key: 'detailed', id: pinId },
                    context: {}
                }),
                _: Date.now()
            }

            const { data } = await this.client.get(this.api.endpoints.pin, { params })

            if (!data.resource_response.data) throw new Error('Pin not found')

            const pd = data.resource_response.data
            const mediaUrls = []

            if (pd.videos?.video_list) {
                const firstVideoKey = Object.keys(pd.videos.video_list)[0]
                let videoUrl = pd.videos.video_list[firstVideoKey]?.url
                if (videoUrl && firstVideoKey.includes('HLS') && videoUrl.includes('m3u8')) {
                    videoUrl = videoUrl.replace('hls', '720p').replace('m3u8', 'mp4')
                }
                mediaUrls.push({
                    type: 'video',
                    url: videoUrl,
                    thumbnail: pd.videos.video_list[firstVideoKey].thumbnail || pd.images?.orig?.url
                })
            }

            if (pd.images) {
                mediaUrls.push({
                    type: 'image',
                    url: pd.images.orig.url
                })
            }

            return {
                id: pd.id,
                title: pd.title || pd.grid_title || 'No Title',
                description: pd.description || '',
                media: mediaUrls
            }

        } catch (error) {
            throw error
        }
    }
}

const pinterestInstance = new Pinterest()

async function pinterestdl(url) {
    return await pinterestInstance.download(url)
}

export { pinterestdl, Pinterest }