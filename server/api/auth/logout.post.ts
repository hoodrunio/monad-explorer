import { Redis } from '@upstash/redis'
import { getCookie, setCookie } from 'h3'

export default defineEventHandler(async (event) => {
	// Get session token from cookie
	const sessionToken = getCookie(event, 'monad_auth_session')

	if (sessionToken) {
		// Delete session from Redis
		try {
			const redis = new Redis({
				url: process.env.KV_REST_API_URL,
				token: process.env.KV_REST_API_TOKEN,
			})

			await redis.del(`session:${sessionToken}`)
		} catch (error) {
			console.error('Redis session deletion error:', error)
			// Continue even if Redis fails
		}
	}

	// Clear the session cookie
	setCookie(event, 'monad_auth_session', '', {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 0 // Expire immediately
	})

	return {
		success: true,
		message: 'Logged out successfully'
	}
})
