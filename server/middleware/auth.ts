import { getCookie, setCookie } from 'h3'
import { Redis } from '@upstash/redis'

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()

	// Check if authentication is enabled via environment variable
	// Set MAINNET_AUTH_ENABLED=false in production to disable auth after public launch
	if (!config.mainnetAuthEnabled) {
		return // Authentication disabled - allow all access
	}

	const url = getRequestURL(event)
	const hostname = url.hostname

	// Check if this is mainnet based on hostname
	// Note: localhost is included for testing purposes
	const isMainnet = hostname === 'monad.hoodscan.io' || hostname === 'localhost'

	// Skip auth for non-mainnet environments
	if (!isMainnet) {
		return
	}

	// Skip auth for login/logout endpoints
	const path = url.pathname
	if (path.startsWith('/api/auth/')) {
		return
	}

	// Skip auth for static assets
	if (path.startsWith('/_nuxt/') || path.startsWith('/api/_content/') || path.match(/\.(ico|png|jpg|jpeg|svg|css|js|json)$/)) {
		return
	}

	// Check for auth session cookie
	const sessionToken = getCookie(event, 'monad_auth_session')

	if (!sessionToken) {
		// No session - redirect to login page
		if (!path.startsWith('/auth/login')) {
			return sendRedirect(event, '/auth/login', 302)
		}
		return
	}

	// Verify session token from Redis
	if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
		try {
			const redis = new Redis({
				url: process.env.KV_REST_API_URL,
				token: process.env.KV_REST_API_TOKEN,
			})

			const session = await redis.get(`session:${sessionToken}`)
			if (!session) {
				// Session expired or invalid - clear cookie and redirect to login
				setCookie(event, 'monad_auth_session', '', {
					maxAge: 0,
					httpOnly: true,
					secure: true,
					sameSite: 'lax',
					path: '/'
				})
				if (!path.startsWith('/auth/login')) {
					return sendRedirect(event, '/auth/login', 302)
				}
			}
		} catch (error) {
			console.error('Redis session check error:', error)
			// Allow access on Redis errors to avoid blocking the site
		}
	}

	// Session valid or Redis unavailable - allow access
})
