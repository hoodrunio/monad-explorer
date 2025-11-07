/**
 * Address Statistics/Counters API Endpoint
 * GET /api/addresses/:address/stats
 *
 * MIGRATED: Now proxies to new Indexer API /counters endpoint
 * Returns aggregate counters for the address including transaction counts.
 */

import { useIndexerUrl } from "@/services/config"

/**
 * Validate Ethereum address format
 */
function isValidAddress(address) {
	if (!address || typeof address !== 'string') return false
	return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

/**
 * Create standardized API response
 */
function createApiResponse(success, message, data = null, meta = {}, error = null) {
	const response = {
		success,
		message,
		meta: {
			timestamp: new Date().toISOString(),
			...meta
		}
	}

	if (success) {
		response.data = data
	} else {
		response.error = error
	}

	return response
}

export default defineEventHandler(async (event) => {
	try {
		// Only support GET requests
		if (getMethod(event) !== 'GET') {
			throw createError({
				statusCode: 405,
				statusMessage: 'Method not allowed'
			})
		}

		// Get address from route params
		const address = getRouterParam(event, 'address')
		
		if (!isValidAddress(address)) {
			return createApiResponse(
				false,
				'Invalid address format',
				null,
				{},
				{
					code: 'INVALID_ADDRESS',
					message: 'Address must be a valid Ethereum address (0x + 40 hex characters)',
					statusCode: 400
				}
			)
		}

		// Forward request to the new Indexer API
		const indexerUrl = useIndexerUrl()
		const apiUrl = new URL(`${indexerUrl}/addresses/${address.toLowerCase()}/counters`)

		// Make request to external API
		const response = await $fetch(apiUrl.href, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Celenium-Explorer/1.0'
			}
		})

		// Set response headers for caching
		// Counters can be cached for a moderate time as they change relatively slowly
		setResponseStatus(event, 200)
		setResponseHeader(event, 'Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the new Indexer API
		// New format: { transactions_count, token_transfers_count, gas_usage_count, validations_count }
		return response

	} catch (error) {
		// Handle different error types
		if (error.statusCode === 404) {
			return createApiResponse(
				false,
				'Address not found',
				null,
				{},
				{
					code: 'ADDRESS_NOT_FOUND',
					message: 'The specified address was not found or has no activity',
					statusCode: 404
				}
			)
		}

		if (error.statusCode === 429) {
			setResponseStatus(event, 429)
			return createApiResponse(
				false,
				'Rate limit exceeded',
				null,
				{},
				{
					code: 'RATE_LIMIT_EXCEEDED',
					message: 'Too many requests. Please try again later.',
					statusCode: 429
				}
			)
		}

		// Generic server error
		setResponseStatus(event, 500)
		return createApiResponse(
			false,
			'Failed to fetch address statistics',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching address statistics',
				statusCode: 500
			}
		)
	}
})
