/**
 * Address Transactions API Endpoint
 * GET /api/addresses/:address/transactions
 * 
 * Retrieve transactions where the address is sender or recipient.
 * When includeTokenTransfers=true, enriches each transaction with runtime-parsed token transfers.
 */

import { useExplorerURL } from "@/services/config"

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

		// Parse query parameters
		const query = getQuery(event)
		const limit = Math.min(parseInt(query.limit) || 50, 100) // Cap at 100
		const offset = Math.max(parseInt(query.offset) || 0, 0)
		const includeTokenTransfers = query.includeTokenTransfers === 'true'

		// Forward request to the actual explorer API
		const explorerUrl = useExplorerURL()
		const apiUrl = new URL(`${explorerUrl}/api/addresses/${address}/transactions`)
		
		apiUrl.searchParams.append('limit', limit.toString())
		apiUrl.searchParams.append('offset', offset.toString())
		if (includeTokenTransfers) {
			apiUrl.searchParams.append('includeTokenTransfers', 'true')
		}

		// Make request to external API
		const response = await $fetch(apiUrl.href, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Celenium-Explorer/1.0'
			}
		})

		// Set response headers for caching
		setResponseStatus(event, 200)
		setResponseHeader(event, 'Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300')
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the external API
		// The external API should already be in the correct format
		return response

	} catch (error) {
		console.error('Address transactions API error:', error)

		// Handle different error types
		if (error.statusCode === 404) {
			return createApiResponse(
				false,
				'Address not found or has no transactions',
				null,
				{},
				{
					code: 'ADDRESS_NOT_FOUND',
					message: 'The specified address was not found or has no transaction history',
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
			'Failed to fetch address transactions',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching address transactions',
				statusCode: 500
			}
		)
	}
})
