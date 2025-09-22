/**
 * Contracts List API Endpoint
 * GET /api/contracts
 * 
 * List up to 100 contracts with optional filters.
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
 * Validate date string (ISO-8601)
 */
function isValidDate(dateString) {
	if (!dateString) return false
	const date = new Date(dateString)
	return !isNaN(date.getTime())
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

		// Parse query parameters
		const query = getQuery(event)
		
		// Boolean parameters
		const isVerified = query.isVerified === 'true' ? true : (query.isVerified === 'false' ? false : null)
		const hasSourceCode = query.hasSourceCode === 'true' ? true : (query.hasSourceCode === 'false' ? false : null)
		
		// Date parameters
		const createdAfter = query.createdAfter
		const createdBefore = query.createdBefore
		
		// Address parameter
		const creator = query.creator
		
		// Ordering parameters
		const orderBy = query.orderBy || 'createdAt'
		const orderDirection = query.orderDirection || 'desc'

		// Validate date parameters
		if (createdAfter && !isValidDate(createdAfter)) {
			return createApiResponse(
				false,
				'Invalid createdAfter date format',
				null,
				{},
				{
					code: 'INVALID_DATE_FORMAT',
					message: 'createdAfter must be a valid ISO-8601 date string',
					statusCode: 400
				}
			)
		}

		if (createdBefore && !isValidDate(createdBefore)) {
			return createApiResponse(
				false,
				'Invalid createdBefore date format',
				null,
				{},
				{
					code: 'INVALID_DATE_FORMAT',
					message: 'createdBefore must be a valid ISO-8601 date string',
					statusCode: 400
				}
			)
		}

		// Validate creator address
		if (creator && !isValidAddress(creator)) {
			return createApiResponse(
				false,
				'Invalid creator address format',
				null,
				{},
				{
					code: 'INVALID_CREATOR_ADDRESS',
					message: 'Creator must be a valid Ethereum address (0x + 40 hex characters)',
					statusCode: 400
				}
			)
		}

		// Validate ordering parameters
		const validOrderBy = ['createdAt', 'address', 'creator', 'isVerified']
		if (!validOrderBy.includes(orderBy)) {
			return createApiResponse(
				false,
				'Invalid orderBy parameter',
				null,
				{},
				{
					code: 'INVALID_ORDER_BY',
					message: `orderBy must be one of: ${validOrderBy.join(', ')}`,
					statusCode: 400
				}
			)
		}

		const validOrderDirection = ['asc', 'desc']
		if (!validOrderDirection.includes(orderDirection)) {
			return createApiResponse(
				false,
				'Invalid orderDirection parameter',
				null,
				{},
				{
					code: 'INVALID_ORDER_DIRECTION',
					message: 'orderDirection must be either "asc" or "desc"',
					statusCode: 400
				}
			)
		}

		// Forward request to the actual explorer API
		const explorerUrl = useExplorerURL()
		const apiUrl = new URL(`${explorerUrl}/api/contracts`)
		
		// Add query parameters
		if (isVerified !== null) apiUrl.searchParams.append('isVerified', isVerified.toString())
		if (hasSourceCode !== null) apiUrl.searchParams.append('hasSourceCode', hasSourceCode.toString())
		if (createdAfter) apiUrl.searchParams.append('createdAfter', createdAfter)
		if (createdBefore) apiUrl.searchParams.append('createdBefore', createdBefore)
		if (creator) apiUrl.searchParams.append('creator', creator)
		apiUrl.searchParams.append('orderBy', orderBy)
		apiUrl.searchParams.append('orderDirection', orderDirection)

		// Make request to external API
		const response = await $fetch(apiUrl.href, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Celenium-Explorer/1.0'
			}
		})

		// Set response headers for caching
		// Contract list can be cached for a moderate time
		setResponseStatus(event, 200)
		setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
		setResponseHeader(event, 'Content-Type', 'application/json')

		// Return the response from the external API
		return response

	} catch (error) {
		console.error('Contracts list API error:', error)

		// Handle different error types
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
			'Failed to fetch contracts list',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching contracts list',
				statusCode: 500
			}
		)
	}
})
