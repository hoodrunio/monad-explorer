/**
 * Smart Contracts List API Endpoint
 * GET /api/contracts
 *
 * List verified smart contracts with cursor-based pagination.
 * Migrated to new Indexer API.
 */

import { useIndexerUrl } from "@/services/config"

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

		// Parse query parameters for new API
		const query = getQuery(event)

		// New API parameters
		const q = query.q || query.search // Search query
		const filter = query.filter // Language filter: vyper | solidity | yul
		const items_count = query.items_count ? parseInt(query.items_count) : 50
		const smart_contract_id = query.smart_contract_id ? parseInt(query.smart_contract_id) : null

		// Validate items_count
		if (isNaN(items_count) || items_count < 1 || items_count > 100) {
			return createApiResponse(
				false,
				'Invalid items_count parameter',
				null,
				{},
				{
					code: 'INVALID_ITEMS_COUNT',
					message: 'items_count must be between 1 and 100',
					statusCode: 400
				}
			)
		}

		// Validate filter if provided
		const validFilters = ['vyper', 'solidity', 'yul']
		if (filter && !validFilters.includes(filter.toLowerCase())) {
			return createApiResponse(
				false,
				'Invalid filter parameter',
				null,
				{},
				{
					code: 'INVALID_FILTER',
					message: `filter must be one of: ${validFilters.join(', ')}`,
					statusCode: 400
				}
			)
		}

		// Validate smart_contract_id if provided
		if (smart_contract_id !== null && (isNaN(smart_contract_id) || smart_contract_id < 1)) {
			return createApiResponse(
				false,
				'Invalid smart_contract_id parameter',
				null,
				{},
				{
					code: 'INVALID_CURSOR',
					message: 'smart_contract_id must be a positive integer',
					statusCode: 400
				}
			)
		}

		// Forward request to the new Indexer API
		const indexerUrl = useIndexerUrl()
		const apiUrl = new URL(`${indexerUrl}/smart-contracts`)

		// Add query parameters
		apiUrl.searchParams.append('items_count', items_count.toString())
		if (q) apiUrl.searchParams.append('q', q)
		if (filter) apiUrl.searchParams.append('filter', filter.toLowerCase())
		if (smart_contract_id) apiUrl.searchParams.append('smart_contract_id', smart_contract_id.toString())

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
		// New API returns: { items: [...], next_page_params: {...} }
		return response

	} catch (error) {
		console.error('Smart contracts list API error:', error)

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
			'Failed to fetch smart contracts list',
			null,
			{},
			{
				code: 'INTERNAL_SERVER_ERROR',
				message: 'An internal server error occurred while fetching smart contracts list',
				statusCode: 500,
				details: process.env.NODE_ENV === 'development' ? error.message : undefined
			}
		)
	}
})
