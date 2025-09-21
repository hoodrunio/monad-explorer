/**
 * Address Balance API Endpoint
 * GET /api/addresses/:address/balance
 * 
 * Fetch on-chain balances for the address.
 * Returns either a single token balance or a batch (plus optional native balance).
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
		const tokenAddress = query.tokenAddress
		const includeNative = query.includeNative !== 'false' // Default true
		const includeMetadata = query.includeMetadata !== 'false' // Default true
		const useCache = query.useCache !== 'false' // Default true
		const blockNumber = query.blockNumber ? parseInt(query.blockNumber) : null

		// Validate token address if provided
		if (tokenAddress && !isValidAddress(tokenAddress)) {
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
		const apiUrl = new URL(`${explorerUrl}/api/addresses/${address}/balance`)
		
		if (tokenAddress) {
			apiUrl.searchParams.append('tokenAddress', tokenAddress)
		}
		apiUrl.searchParams.append('includeNative', includeNative.toString())
		apiUrl.searchParams.append('includeMetadata', includeMetadata.toString())
		apiUrl.searchParams.append('useCache', useCache.toString())
		if (blockNumber !== null) {
			apiUrl.searchParams.append('blockNumber', blockNumber.toString())
		}

		// Make request to external API
		const response = await $fetch(apiUrl.href, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Celenium-Explorer/1.0'
			}
		})

		// Set response headers for caching
		// Balance data can be cached longer if not requesting latest block
		const cacheTime = blockNumber ? 3600 : 30 // 1 hour for historical, 30s for latest
		setResponseStatus(event, 200)
		setResponseHeader(event, 'Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=300`)
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the external API
		return response

	} catch (error) {
		console.error('Address balance API error:', error)

		// Handle different error types
		if (error.statusCode === 404) {
			return createApiResponse(
				false,
				'Address not found',
				null,
				{},
				{
					code: 'ADDRESS_NOT_FOUND',
					message: 'The specified address was not found',
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
			'Failed to fetch address balance',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching address balance',
				statusCode: 500
			}
		)
	}
})
