/** Token API Services */
import { useIndexerUrl } from "@/services/config"

/**
 * Validate Ethereum address format
 * @param {string} address - Address to validate
 * @returns {boolean} - True if valid address format
 */
const isValidAddress = (address) => {
	if (!address || typeof address !== 'string') return false
	return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Get list of tokens - SSR version
 * @param {Object} params - Query parameters
 * @param {string} params.q - Search query (token name/symbol)
 * @param {string} params.type - Token types: "ERC-20", "ERC-721", "ERC-1155" or comma-separated
 * @param {Object} params - Cursor pagination params from next_page_params
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchTokens = (params = {}) => {
	try {
		const { q, type, ...paginationParams } = params
		const url = new URL(`${useIndexerUrl()}/tokens`)

		if (q) url.searchParams.append("q", q)
		if (type) url.searchParams.append("type", type)

		// Add pagination params if provided (from next_page_params)
		// Note: null values must be sent as empty string for cursor-based pagination to work
		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined) {
				url.searchParams.append(key, paginationParams[key] === null ? '' : paginationParams[key])
			}
		})

		return useFetch(url.href, {
			key: `tokens-list-${q || 'all'}-${type || 'all'}-${JSON.stringify(paginationParams)}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items,
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get list of tokens - Client-side version
 * @param {Object} params - Query parameters
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchTokensClient = async (params = {}) => {
	try {
		const { q, type, ...paginationParams } = params
		const url = new URL(`${useIndexerUrl()}/tokens`)

		if (q) url.searchParams.append("q", q)
		if (type) url.searchParams.append("type", type)

		// Add pagination params if provided (from next_page_params)
		// Note: null values must be sent as empty string for cursor-based pagination to work
		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined) {
				url.searchParams.append(key, paginationParams[key] === null ? '' : paginationParams[key])
			}
		})

		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					items: data.items || [],
					next_page_params: data.next_page_params || null,
				}
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get token info by address - SSR version
 * @param {string} address - Token contract address
 * @returns {Promise} - API response with token info
 */
export const fetchTokenById = (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}`)

		return useFetch(url.href, {
			key: `token-${address}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get token info by address - Client-side version
 * @param {string} address - Token contract address
 * @returns {Promise} - API response with token info
 */
export const fetchTokenByIdClient = async (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}`)
		const data = await $fetch(url.href)

		return { data: { value: data } }
	} catch (error) {
		throw error
	}
}

/**
 * Get token holders - SSR version
 * @param {string} address - Token contract address
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with holders list
 */
export const fetchTokenHolders = (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/holders`)

		// Note: null values must be sent as empty string for cursor-based pagination to work
		Object.keys(params).forEach(key => {
			if (params[key] !== undefined) {
				url.searchParams.append(key, params[key] === null ? '' : params[key])
			}
		})

		return useFetch(url.href, {
			key: `token-holders-${address}-${JSON.stringify(params)}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items,
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get token holders - Client-side version
 * @param {string} address - Token contract address
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with holders list
 */
export const fetchTokenHoldersClient = async (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/holders`)

		// Note: null values must be sent as empty string for cursor-based pagination to work
		Object.keys(params).forEach(key => {
			if (params[key] !== undefined) {
				url.searchParams.append(key, params[key] === null ? '' : params[key])
			}
		})

		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					items: data.items || [],
					next_page_params: data.next_page_params || null,
				}
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get token transfers - SSR version
 * @param {string} address - Token contract address
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with transfers list
 */
export const fetchTokenTransfers = (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const paginationParams = params || {}
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/transfers`)

		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined && paginationParams[key] !== null) {
				url.searchParams.append(key, paginationParams[key])
			}
		})

		return useFetch(url.href, {
			key: `token-transfers-${address}-${JSON.stringify(paginationParams)}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items,
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get token transfers - Client-side version
 * @param {string} address - Token contract address
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with transfers list
 */
export const fetchTokenTransfersClient = async (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const paginationParams = params || {}
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/transfers`)

		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined && paginationParams[key] !== null) {
				url.searchParams.append(key, paginationParams[key])
			}
		})

		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					items: data.items || [],
					next_page_params: data.next_page_params || null,
				}
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get token counters/statistics - SSR version
 * @param {string} address - Token contract address
 * @returns {Promise} - API response with token counters
 */
export const fetchTokenCounters = (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/counters`)

		return useFetch(url.href, {
			key: `token-counters-${address}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get token counters/statistics - Client-side version
 * @param {string} address - Token contract address
 * @returns {Promise} - API response with token counters
 */
export const fetchTokenCountersClient = async (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/counters`)
		const data = await $fetch(url.href)

		return { data: { value: data } }
	} catch (error) {
		throw error
	}
}

/**
 * Get NFT instances for a token/collection - SSR version
 * @param {string} address - Token/collection contract address
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with NFT instances
 */
export const fetchTokenInstances = (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const paginationParams = params || {}
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances`)

		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined && paginationParams[key] !== null) {
				url.searchParams.append(key, paginationParams[key])
			}
		})

		return useFetch(url.href, {
			key: `token-instances-${address}-${JSON.stringify(paginationParams)}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items,
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get NFT instances for a token/collection - Client-side version
 * @param {string} address - Token/collection contract address
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with NFT instances
 */
export const fetchTokenInstancesClient = async (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const paginationParams = params || {}
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances`)

		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined && paginationParams[key] !== null) {
				url.searchParams.append(key, paginationParams[key])
			}
		})

		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					items: data.items || [],
					next_page_params: data.next_page_params || null,
				}
			}
		}
	} catch (error) {
		throw error
	}
}
