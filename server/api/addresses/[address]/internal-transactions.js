/**
 * Address Internal Transactions API Endpoint
 * GET /api/addresses/:address/internal-transactions
 *
 * MIGRATED: Now proxies to new Indexer API with cursor pagination
 * Traces internal calls (value transfers, delegate calls, etc.) touching the address.
 * NOTE: includeFailedCalls and maxDepth parameters removed from new API
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

		// Parse query parameters (cursor-based pagination)
		const query = getQuery(event)
		const items_count = Math.min(parseInt(query.items_count) || 50, 100) // Cap at 100
		const block_number = query.block_number ? parseInt(query.block_number) : undefined
		const transaction_index = query.transaction_index !== undefined ? parseInt(query.transaction_index) : undefined
		const index = query.index !== undefined ? parseInt(query.index) : undefined
		const filter = query.filter // Direction filter: "to" or "from"

		// Forward request to the new Indexer API
		const indexerUrl = useIndexerUrl()
		const apiUrl = new URL(`${indexerUrl}/addresses/${address.toLowerCase()}/internal-transactions`)

		apiUrl.searchParams.append('items_count', items_count.toString())
		if (block_number) {
			apiUrl.searchParams.append('block_number', block_number.toString())
		}
		if (transaction_index !== undefined) {
			apiUrl.searchParams.append('transaction_index', transaction_index.toString())
		}
		if (index !== undefined) {
			apiUrl.searchParams.append('index', index.toString())
		}
		if (filter) {
			apiUrl.searchParams.append('filter', filter)
		}

		// Make request to external API with longer timeout for tracing
		const response = await $fetch(apiUrl.href, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Celenium-Explorer/1.0'
			},
			timeout: 30000 // 30 seconds timeout for tracing operations
		})

		// Set response headers for caching
		// Internal transactions can be cached longer as they don't change
		setResponseStatus(event, 200)
		setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the external API
		return response

	} catch (error) {
		console.error('Address internal transactions API error:', error)

		// Handle timeout errors specifically
		if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
			setResponseStatus(event, 504)
			return createApiResponse(
				false,
				'Request timeout while tracing internal transactions',
				null,
				{},
				{
					code: 'TRACE_TIMEOUT',
					message: 'The tracing operation timed out. This address may have too many internal transactions to process quickly.',
					statusCode: 504
				}
			)
		}

		// Handle different error types
		if (error.statusCode === 404) {
			return createApiResponse(
				false,
				'Address not found or has no internal transactions',
				null,
				{},
				{
					code: 'ADDRESS_NOT_FOUND',
					message: 'The specified address was not found or has no internal transaction history',
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
			'Failed to fetch address internal transactions',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching address internal transactions',
				statusCode: 500
			}
		)
	}
})
