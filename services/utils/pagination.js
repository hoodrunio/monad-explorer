/**
 * Pagination utilities for cursor-based pagination (New Indexer API)
 */

/**
 * Creates a cursor pagination state manager
 * @param {number} itemsCount - Default items per page
 * @returns {object} Pagination state and methods
 */
export const createCursorPagination = (itemsCount = 20) => {
	const state = {
		items: ref([]),
		nextPageParams: ref(null),
		isLoading: ref(false),
		hasMore: computed(() => state.nextPageParams.value !== null),
	}

	return state
}

/**
 * Build pagination parameters for API request
 * @param {object} nextPageParams - Next page params from previous response
 * @param {number} itemsCount - Items per page
 * @returns {object} Query parameters
 */
export const buildPaginationParams = (nextPageParams = null, itemsCount = 20) => {
	if (nextPageParams) {
		return nextPageParams
	}
	return { items_count: itemsCount }
}

/**
 * Check if there are more pages available
 * @param {object|null} nextPageParams - Next page params from API
 * @returns {boolean}
 */
export const hasMorePages = (nextPageParams) => {
	return nextPageParams !== null && nextPageParams !== undefined
}

/**
 * Serialize cursor params for URL query string
 * @param {object} nextPageParams - Next page params
 * @returns {string} Serialized params
 */
export const serializeCursorParams = (nextPageParams) => {
	if (!nextPageParams) return ''
	return btoa(JSON.stringify(nextPageParams))
}

/**
 * Deserialize cursor params from URL query string
 * @param {string} serialized - Serialized params
 * @returns {object|null} Deserialized params
 */
export const deserializeCursorParams = (serialized) => {
	if (!serialized) return null
	try {
		return JSON.parse(atob(serialized))
	} catch (error) {
		return null
	}
}

/**
 * Merge items for infinite scroll / load more pattern
 * @param {Array} currentItems - Current items array
 * @param {Array} newItems - New items to append
 * @param {string} uniqueKey - Key to check for duplicates (e.g., 'hash', 'id')
 * @returns {Array} Merged array without duplicates
 */
export const mergeItems = (currentItems, newItems, uniqueKey = 'hash') => {
	const existingKeys = new Set(currentItems.map(item => item[uniqueKey]))
	const uniqueNewItems = newItems.filter(item => !existingKeys.has(item[uniqueKey]))
	return [...currentItems, ...uniqueNewItems]
}
