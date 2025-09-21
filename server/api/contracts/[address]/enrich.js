/**
 * Contract Enrichment API Endpoint
 * POST /api/contracts/:address/enrich
 * 
 * Queue manual metadata enrichment for a contract.
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
		// Only support POST requests
		if (getMethod(event) !== 'POST') {
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

		// Parse request body
		let body = {}
		try {
			body = await readBody(event) || {}
		} catch (error) {
			return createApiResponse(
				false,
				'Invalid JSON in request body',
				null,
				{},
				{
					code: 'INVALID_JSON',
					message: 'Request body must be valid JSON',
					statusCode: 400
				}
			)
		}

		// Validate and set defaults for body parameters
		const priority = Math.min(Math.max(parseInt(body.priority) || 1, 1), 10) // Between 1-10
		const forceRefresh = body.forceRefresh === true

		// Forward request to the actual explorer API
		const explorerUrl = useExplorerURL()
		const apiUrl = new URL(`${explorerUrl}/api/contracts/${address}/enrich`)

		// Make request to external API
		const response = await $fetch(apiUrl.href, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'User-Agent': 'Celenium-Explorer/1.0'
			},
			body: JSON.stringify({
				priority,
				forceRefresh
			})
		})

		// Set response headers
		setResponseStatus(event, 200)
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the external API
		return response

	} catch (error) {
		console.error('Contract enrichment API error:', error)

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

		if (error.statusCode === 400) {
			return createApiResponse(
				false,
				'Invalid request parameters',
				null,
				{},
				{
					code: 'INVALID_PARAMETERS',
					message: 'One or more request parameters are invalid',
					statusCode: 400
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
					message: 'Too many enrichment requests. Please try again later.',
					statusCode: 429
				}
			)
		}

		// Generic server error
		setResponseStatus(event, 500)
		return createApiResponse(
			false,
			'Failed to queue contract enrichment',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while queuing contract enrichment',
				statusCode: 500
			}
		)
	}
})
