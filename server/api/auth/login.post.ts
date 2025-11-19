import { Redis } from '@upstash/redis'
import { setCookie } from 'h3'

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()
	const body = await readBody(event)

	// Validate request body
	if (!body || !body.password) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Password is required'
		})
	}

	// Check if password matches (server-side only)
	const correctPassword = config.mainnetPassword

	if (!correctPassword) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Server configuration error'
		})
	}

	if (body.password !== correctPassword) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Invalid password'
		})
	}

	// Generate session token
	const sessionToken = generateSessionToken()

	// Store session in Redis with 7-day TTL
	try {
		const redis = new Redis({
			url: process.env.KV_REST_API_URL,
			token: process.env.KV_REST_API_TOKEN,
		})

		const sessionData = {
			createdAt: new Date().toISOString(),
			ip: getRequestIP(event),
			userAgent: getRequestHeader(event, 'user-agent') || 'unknown'
		}

		// Store session with 7 days (604800 seconds) TTL
		await redis.setex(`session:${sessionToken}`, 604800, JSON.stringify(sessionData))
	} catch (error) {
		console.error('Redis session creation error:', error)
		// Continue even if Redis fails - session will be cookie-only
	}

	// Set HTTP-only cookie with 7-day expiration
	setCookie(event, 'monad_auth_session', sessionToken, {
		httpOnly: true,
		secure: true, // HTTPS only
		sameSite: 'lax',
		path: '/',
		maxAge: 604800 // 7 days in seconds
	})

	return {
		success: true,
		message: 'Authentication successful'
	}
})

/**
 * Generate a random session token
 */
function generateSessionToken(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let token = ''
	const randomValues = new Uint8Array(32)
	crypto.getRandomValues(randomValues)

	for (let i = 0; i < 32; i++) {
		token += chars[randomValues[i] % chars.length]
	}

	return token
}
