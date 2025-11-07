/**
 * Address Token Transfers API Endpoint
 * GET /api/addresses/:address/token-transfers
 *
 * MIGRATED: Now proxies to new Indexer API with cursor pagination and type filtering
 * Lists token transfer events involving the address.
 * Supports filtering by token contract and token type (ERC-20, ERC-721, ERC-1155).
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
		const index = query.index !== undefined ? parseInt(query.index) : undefined
		const token = query.token // Specific token address filter
		const type = query.type // Token type: "ERC-20", "ERC-721", "ERC-1155" or comma-separated
		const filter = query.filter // Direction filter: "to" or "from"

		// Validate token address if provided
		if (token && !isValidAddress(token)) {
			return createApiResponse(
				false,
				'Invalid token address format',
				null,
				{},
				{
					code: 'INVALID_TOKEN_ADDRESS',
					message: 'Token address must be a valid Ethereum address (0x + 40 hex characters)',
					statusCode: 400
				}
			)
		}

		// Forward request to the new Indexer API
		const indexerUrl = useIndexerUrl()
		const apiUrl = new URL(`${indexerUrl}/addresses/${address.toLowerCase()}/token-transfers`)

		apiUrl.searchParams.append('items_count', items_count.toString())
		if (block_number) {
			apiUrl.searchParams.append('block_number', block_number.toString())
		}
		if (index !== undefined) {
			apiUrl.searchParams.append('index', index.toString())
		}
		if (token) {
			apiUrl.searchParams.append('token', token.toLowerCase())
		}
		if (type) {
			apiUrl.searchParams.append('type', type)
		}
		if (filter) {
			apiUrl.searchParams.append('filter', filter)
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
		setResponseHeader(event, 'Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the external API
		return response

	} catch (error) {
		console.error('Address token transfers API error:', error)

		// Handle different error types
		if (error.statusCode === 404) {
			return createApiResponse(
				false,
				'Address not found or has no token transfers',
				null,
				{},
				{
					code: 'ADDRESS_NOT_FOUND',
					message: 'The specified address was not found or has no token transfer history',
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
			'Failed to fetch address token transfers',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching address token transfers',
				statusCode: 500
			}
		)
	}
})
