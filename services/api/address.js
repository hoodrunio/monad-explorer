/** Address API Services */
import { useExplorerURL, useIndexerUrl } from "@/services/config"
import { transformAddressCounters, transformTransaction } from "@/services/utils/transforms"

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
 * Get transactions for an address (sent or received) - SSR version
 * MIGRATED: Now uses new Indexer API with cursor pagination
 * @param {string} address - Ethereum address
 * @param {Object} params - Query parameters
 * @param {number} params.items_count - Number of items per page (default: 50)
 * @param {number} params.block_number - Block number cursor for pagination
 * @param {number} params.index - Transaction index cursor for pagination
 * @param {string} params.filter - Filter transactions by direction: "to" or "from"
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchAddressTransactions = (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const { items_count = 50, block_number, index, filter } = params
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/transactions`)

		url.searchParams.append("items_count", items_count)
		if (block_number) url.searchParams.append("block_number", block_number)
		if (index !== undefined) url.searchParams.append("index", index)
		if (filter) url.searchParams.append("filter", filter)

		return useFetch(url.href, {
			key: `address-transactions-${address}-${items_count}-${block_number || 'initial'}-${index || ''}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items.map(transformTransaction),
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
 * Get transactions for an address (sent or received) - Client-side version
 * MIGRATED: Now uses new Indexer API with cursor pagination
 * @param {string} address - Ethereum address
 * @param {Object} params - Query parameters
 * @param {number} params.items_count - Number of items per page (default: 50)
 * @param {number} params.block_number - Block number cursor for pagination
 * @param {number} params.index - Transaction index cursor for pagination
 * @param {string} params.filter - Filter transactions by direction: "to" or "from"
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchAddressTransactionsClient = async (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const { items_count = 50, block_number, index, filter } = params
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/transactions`)

		url.searchParams.append("items_count", items_count)
		if (block_number) url.searchParams.append("block_number", block_number)
		if (index !== undefined) url.searchParams.append("index", index)
		if (filter) url.searchParams.append("filter", filter)

		const data = await $fetch(url.href)

		// Transform response to match expected format
		const transformed = {
			items: data.items ? data.items.map(transformTransaction) : [],
			next_page_params: data.next_page_params || null,
		}

		return { data: { value: transformed } }
	} catch (error) {
		throw error
	}
}

/**
 * Get token transfers for an address
 * MIGRATED: Now uses new Indexer API with cursor pagination and type filtering
 * @param {string} address - Ethereum address
 * @param {Object} params - Query parameters
 * @param {number} params.items_count - Number of items per page (default: 50)
 * @param {number} params.block_number - Block number cursor for pagination
 * @param {number} params.index - Transfer index cursor for pagination
 * @param {string} params.token - Specific token address to filter (optional)
 * @param {string} params.type - Token types: "ERC-20", "ERC-721", "ERC-1155" or comma-separated (optional)
 * @param {string} params.filter - Filter transfers by direction: "to" or "from" (optional)
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchAddressTokenTransfers = (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const { items_count = 50, block_number, index, token, type, filter } = params
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/token-transfers`)

		url.searchParams.append("items_count", items_count)
		if (block_number) url.searchParams.append("block_number", block_number)
		if (index !== undefined) url.searchParams.append("index", index)
		if (token) url.searchParams.append("token", token.toLowerCase())
		if (type) url.searchParams.append("type", type) // e.g., "ERC-20,ERC-721,ERC-1155"
		if (filter) url.searchParams.append("filter", filter)

		return useFetch(url.href, {
			key: `address-token-transfers-${address}-${items_count}-${block_number || 'initial'}-${type || 'all'}`,
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
 * Get balances for an address - SSR version
 * HYBRID: Tries new Indexer API first, falls back to old API if fails
 * @param {string} address - Ethereum address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchAddressBalance = async (address, {
	tokenAddress = null,
	includeNative = true,
	includeMetadata = true,
	useCache = true,
	blockNumber = null
} = {}) => {
	const normalizedAddress = address?.toLowerCase()
	const normalizedTokenAddress = tokenAddress?.toLowerCase()

	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	if (tokenAddress && !isValidAddress(normalizedTokenAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		// Try new Indexer API first
		const newApiUrl = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}`)

		try {
			const response = await $fetch(newApiUrl.href)
			// Transform new API response to match old format
			return {
				data: ref({
					data: {
						nativeBalance: response.coin_balance || "0",
						// Add other fields as needed from new API
					}
				})
			}
		} catch (newApiError) {
			// Fallback to old API
			const oldApiUrl = new URL(`${useExplorerURL()}/api/addresses/${normalizedAddress}/balance`)

			if (normalizedTokenAddress) oldApiUrl.searchParams.append("tokenAddress", normalizedTokenAddress)
			if (includeNative !== undefined) oldApiUrl.searchParams.append("includeNative", includeNative.toString())
			if (includeMetadata !== undefined) oldApiUrl.searchParams.append("includeMetadata", includeMetadata.toString())
			if (useCache !== undefined) oldApiUrl.searchParams.append("useCache", useCache.toString())
			if (blockNumber) oldApiUrl.searchParams.append("blockNumber", blockNumber.toString())

			return useFetch(oldApiUrl.href, {
				key: `address-balance-${address}-${tokenAddress || 'all'}-${blockNumber || 'latest'}`,
			})
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get balances for an address - Client-side version
 * HYBRID: Tries new Indexer API first, falls back to old API if fails
 * @param {string} address - Ethereum address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchAddressBalanceClient = async (address, {
	tokenAddress = null,
	includeNative = true,
	includeMetadata = true,
	useCache = true,
	blockNumber = null
} = {}) => {
	const normalizedAddress = address?.toLowerCase()

	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	if (tokenAddress && !isValidAddress(tokenAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		// Try new Indexer API first
		const newApiUrl = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}`)

		try {
			const response = await $fetch(newApiUrl.href)
			// Transform new API response to match old format
			return {
				data: {
					value: {
						data: {
							nativeBalance: response.coin_balance || "0",
							// Add other fields as needed from new API
						}
					}
				}
			}
		} catch (newApiError) {
			// Fallback to old API
			const oldApiUrl = new URL(`${useExplorerURL()}/api/addresses/${normalizedAddress}/balance`)

			if (tokenAddress) oldApiUrl.searchParams.append("tokenAddress", tokenAddress)
			if (includeNative !== undefined) oldApiUrl.searchParams.append("includeNative", includeNative.toString())
			if (includeMetadata !== undefined) oldApiUrl.searchParams.append("includeMetadata", includeMetadata.toString())
			if (useCache !== undefined) oldApiUrl.searchParams.append("useCache", useCache.toString())
			if (blockNumber) oldApiUrl.searchParams.append("blockNumber", blockNumber.toString())

			const data = await $fetch(oldApiUrl.href)
			return { data: { value: data } }
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get internal transactions for an address
 * MIGRATED: Now uses new Indexer API with cursor pagination
 * NOTE: includeFailedCalls and maxDepth parameters removed from new API
 * @param {string} address - Ethereum address
 * @param {Object} params - Query parameters
 * @param {number} params.items_count - Number of items per page (default: 50)
 * @param {number} params.block_number - Block number cursor for pagination
 * @param {number} params.transaction_index - Transaction index cursor
 * @param {number} params.index - Internal transaction index cursor
 * @param {string} params.filter - Filter by direction: "to" or "from" (optional)
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchAddressInternalTransactions = (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const { items_count = 50, block_number, transaction_index, index, filter } = params
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/internal-transactions`)

		url.searchParams.append("items_count", items_count)
		if (block_number) url.searchParams.append("block_number", block_number)
		if (transaction_index !== undefined) url.searchParams.append("transaction_index", transaction_index)
		if (index !== undefined) url.searchParams.append("index", index)
		if (filter) url.searchParams.append("filter", filter)

		return useFetch(url.href, {
			key: `address-internal-transactions-${address}-${items_count}-${block_number || 'initial'}`,
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
 * Get statistics/counters for an address - SSR version
 * MIGRATED: Now uses new Indexer API /counters endpoint
 * @param {string} address - Ethereum address
 * @returns {Promise} - API response
 */
export const fetchAddressStats = (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/counters`)

		return useFetch(url.href, {
			key: `address-counters-${address}`,
			transform: (response) => {
				if (response) {
					return transformAddressCounters(response)
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get statistics/counters for an address - Client-side version
 * MIGRATED: Now uses new Indexer API /counters endpoint
 * @param {string} address - Ethereum address
 * @returns {Promise} - API response
 */
export const fetchAddressStatsClient = async (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/counters`)

		const data = await $fetch(url.href)
		const transformed = transformAddressCounters(data)
		return { data: { value: transformed } }
	} catch (error) {
		throw error
	}
}

/**
 * Get native token balance for an address (lightweight)
 * @param {string} address - Ethereum address
 * @returns {Promise} - API response with native balance only
 */
export const fetchAddressNativeBalance = async (address) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	try {
		const result = await fetchAddressBalance(address, {
			tokenAddress: null,
			includeNative: true,
			includeMetadata: false,
			useCache: true
		})

		// Extract just the native balance from the response
		if (result.data?.value?.data?.nativeBalance) {
			return {
				address,
				balance: result.data.value.data.nativeBalance,
				success: true
			}
		}

		return {
			address,
			balance: "0",
			success: false
		}
	} catch (error) {
		return {
			address,
			balance: "0",
			success: false,
			error: error.message
		}
	}
}

/**
 * Get ERC-20 token balance for an address
 * @param {string} address - Ethereum address
 * @param {string} tokenAddress - ERC-20 token contract address
 * @returns {Promise} - API response with token balance
 */
export const fetchAddressTokenBalance = async (address, tokenAddress) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	if (!isValidAddress(tokenAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const result = await fetchAddressBalance(address, {
			tokenAddress,
			includeNative: false,
			includeMetadata: true,
			useCache: true
		})

		return result
	} catch (error) {
		throw error
	}
}

/**
 * Check if address has any activity
 * MIGRATED: Now uses new counters response format
 * @param {string} address - Ethereum address
 * @returns {Promise<boolean>} - True if address has transactions
 */
export const hasAddressActivity = async (address) => {
	if (!isValidAddress(address)) {
		return false
	}

	try {
		const stats = await fetchAddressStats(address)
		// New API returns transactions_count directly at root level
		const txCount = stats.data?.value?.transactions_count || 0
		return txCount > 0
	} catch (error) {
		return false
	}
}

/**
 * Get address overview (combines multiple endpoints) - SSR version
 * MIGRATED: Partially migrated - balance uses OLD API, stats & transactions use NEW API
 * @param {string} address - Ethereum address
 * @returns {Promise} - Combined address data
 */
export const fetchAddressOverview = async (address) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	try {
		// Fetch multiple endpoints in parallel
		// NOTE: Balance uses OLD API (backward compatibility), others use NEW Indexer API
		const [balance, stats, recentTx] = await Promise.allSettled([
			fetchAddressBalance(address, { includeNative: true, includeMetadata: true }), // OLD API
			fetchAddressStats(address), // NEW API - counters
			fetchAddressTransactions(address, { items_count: 5 }) // NEW API - cursor pagination
		])

		return {
			address,
			balance: balance.status === 'fulfilled' ? balance.value : null,
			stats: stats.status === 'fulfilled' ? stats.value : null,
			recentTransactions: recentTx.status === 'fulfilled' ? recentTx.value : null,
			success: true
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get address overview (combines multiple endpoints) - Client-side version
 * MIGRATED: Partially migrated - balance uses OLD API, stats & transactions use NEW API
 * @param {string} address - Ethereum address
 * @returns {Promise} - Combined address data
 */
export const fetchAddressOverviewClient = async (address) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	try {
		// Fetch multiple endpoints in parallel
		// NOTE: Balance uses OLD API (backward compatibility), others use NEW Indexer API
		const [balance, stats, recentTx] = await Promise.allSettled([
			fetchAddressBalanceClient(address, { includeNative: true, includeMetadata: true }), // OLD API
			fetchAddressStatsClient(address), // NEW API - counters
			fetchAddressTransactionsClient(address, { items_count: 5 }) // NEW API - cursor pagination
		])

		return {
			address,
			balance: balance.status === 'fulfilled' ? balance.value : null,
			stats: stats.status === 'fulfilled' ? stats.value : null,
			recentTransactions: recentTx.status === 'fulfilled' ? recentTx.value : null,
			success: true
		}
	} catch (error) {
		throw error
	}
}
