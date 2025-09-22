/**
 * Contract Metadata API Endpoint
 * GET /api/contracts/:address/metadata
 * 
 * Returns only the metadata payload for the contract.
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
				'Invalid contract address format',
				null,
				{},
				{
					code: 'INVALID_CONTRACT_ADDRESS',
					message: 'Address must be a valid Ethereum address (0x + 40 hex characters)',
					statusCode: 400
				}
			)
		}

		// Parse query parameters
		const query = getQuery(event)
		const blockNumber = query.blockNumber ? parseInt(query.blockNumber) : null
		const includeAnalysis = query.includeAnalysis !== 'false' // Default true

		// Validate block number if provided
		if (blockNumber !== null && (isNaN(blockNumber) || blockNumber < 0)) {
			return createApiResponse(
				false,
				'Invalid block number',
				null,
				{},
				{
					code: 'INVALID_BLOCK_NUMBER',
					message: 'Block number must be a non-negative integer',
					statusCode: 400
				}
			)
		}

		// Forward request to the actual explorer API
		const explorerUrl = useExplorerURL()
		const apiUrl = new URL(`${explorerUrl}/api/contracts/${address}/metadata`)
		
		if (blockNumber !== null) {
			apiUrl.searchParams.append('blockNumber', blockNumber.toString())
		}
		apiUrl.searchParams.append('includeAnalysis', includeAnalysis.toString())

		// Make request to external API
		const response = await $fetch(apiUrl.href, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Celenium-Explorer/1.0'
			}
		})

		// Set response headers for caching
		// Metadata can be cached longer for historical blocks
		const cacheTime = blockNumber ? 3600 : 300 // 1 hour for historical, 5 min for latest
		setResponseStatus(event, 200)
		setResponseHeader(event, 'Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=600`)
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the external API
		return response

	} catch (error) {
		console.error('Contract metadata API error:', error)

		// Handle different error types
		if (error.statusCode === 404) {
			return createApiResponse(
				false,
				'Address is not a contract',
				null,
				{},
				{
					code: 'NOT_A_CONTRACT',
					message: 'The specified address is not a contract',
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
			'Failed to fetch contract metadata',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching contract metadata',
				statusCode: 500
			}
		)
	}
})
