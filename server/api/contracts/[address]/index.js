/**
 * Smart Contract Information API Endpoint
 * GET /api/contracts/:address
 *
 * Fetch smart contract information.
 * Migrated to new Indexer API.
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

		// Normalize address to lowercase (required by new API)
		const normalizedAddress = address.toLowerCase()

		// Forward request to the new Indexer API
		const indexerUrl = useIndexerUrl()
		const apiUrl = new URL(`${indexerUrl}/smart-contracts/${normalizedAddress}`)

		// Note: New API automatically includes all data (metadata, bytecode, etc.)
		// No need for includeMetadata or includeBytecode parameters

		// Make request to external API
		const response = await $fetch(apiUrl.href, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Celenium-Explorer/1.0'
			}
		})

		// Set response headers for caching
		// Contract info can be cached longer as it doesn't change often
		setResponseStatus(event, 200)
		setResponseHeader(event, 'Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the external API
		return response

	} catch (error) {
		// Handle different error types
		if (error.statusCode === 404) {
			setResponseStatus(event, 404)
			return createApiResponse(
				false,
				'Contract not found',
				null,
				{},
				{
					code: 'CONTRACT_NOT_FOUND',
					message: 'The specified address is not a verified smart contract',
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
			'Failed to fetch smart contract information',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching smart contract information',
				statusCode: 500,
				details: process.env.NODE_ENV === 'development' ? error.message : undefined
			}
		)
	}
})
