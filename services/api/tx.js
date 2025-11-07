/**
 * Transaction API Service - New Indexer API (Blockscout-compatible)
 * All endpoints use cursor-based pagination
 */

import { useIndexerUrl } from "@/services/config"
import { transformTransaction } from "@/services/utils/transforms"

/**
 * Get latest transactions with cursor-based pagination
 * @param {object} params - Query parameters
 * @param {number} params.items_count - Number of items per page (default: 50)
 * @param {string} params.filter - Filter: validated|pending (default: validated)
 * @param {string} params.type - Transaction type filter
 * @param {string} params.method - Method signature filter
 * @param {number} params.block_number - Block number cursor for pagination
 * @param {number} params.index - Transaction index cursor for pagination
 * @returns {Promise} Fetch promise with transactions data
 */
export const fetchTransactions = (params = {}) => {
	try {
		const {
			items_count = 50,
			filter = 'validated',
			type,
			method,
			block_number,
			index
		} = params

		const url = new URL(`${useIndexerUrl()}/transactions`)

		url.searchParams.append("items_count", items_count)
		if (filter) url.searchParams.append("filter", filter)
		if (type) url.searchParams.append("type", type)
		if (method) url.searchParams.append("method", method)
		if (block_number) url.searchParams.append("block_number", block_number)
		if (index !== undefined) url.searchParams.append("index", index)

		return useFetch(url.href, {
			key: `transactions-${items_count}-${block_number || 'initial'}-${index || 'initial'}`,
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
 * Get specific transaction by hash - SSR version
 * @param {string} txHash - Transaction hash
 * @returns {Promise} Fetch promise with transaction data
 */
export const fetchTxByHash = (txHash) => {
	try {
		const url = new URL(`${useIndexerUrl()}/transactions/${txHash}`)

		return useFetch(url.href, {
			key: `tx-${txHash}`,
			transform: (response) => transformTransaction(response),
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get specific transaction by hash - Client-side version
 * @param {string} txHash - Transaction hash
 * @returns {Promise} Transaction data wrapped in standard format
 */
export const fetchTxByHashClient = async (txHash) => {
	try {
		const url = new URL(`${useIndexerUrl()}/transactions/${txHash}`)
		const data = await $fetch(url.href)

		return {
			data: {
				value: transformTransaction(data)
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get token transfers for a specific transaction
 * @param {string} txHash - Transaction hash
 * @param {object} params - Query parameters
 * @param {number} params.items_count - Number of items per page
 * @param {string} params.type - Token type filter (ERC-20, ERC-721, ERC-1155)
 * @returns {Promise} Fetch promise with token transfers data
 */
export const fetchTxTokenTransfers = (txHash, params = {}) => {
	try {
		const { items_count = 50, type } = params

		const url = new URL(`${useIndexerUrl()}/transactions/${txHash}/token-transfers`)

		url.searchParams.append("items_count", items_count)
		if (type) url.searchParams.append("type", type)

		return useFetch(url.href, {
			key: `tx-token-transfers-${txHash}`,
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
 * Get internal transactions for a specific transaction
 * @param {string} txHash - Transaction hash
 * @param {object} params - Query parameters
 * @param {number} params.items_count - Number of items per page
 * @returns {Promise} Fetch promise with internal transactions data
 */
export const fetchTxInternalTransactions = (txHash, params = {}) => {
	try {
		const { items_count = 50 } = params

		const url = new URL(`${useIndexerUrl()}/transactions/${txHash}/internal-transactions`)

		url.searchParams.append("items_count", items_count)

		return useFetch(url.href, {
			key: `tx-internal-txs-${txHash}`,
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
 * Get logs (events) for a specific transaction
 * @param {string} txHash - Transaction hash
 * @param {object} params - Query parameters
 * @param {number} params.items_count - Number of items per page
 * @returns {Promise} Fetch promise with logs data
 */
export const fetchTxLogs = (txHash, params = {}) => {
	try {
		const { items_count = 50 } = params

		const url = new URL(`${useIndexerUrl()}/transactions/${txHash}/logs`)

		url.searchParams.append("items_count", items_count)

		return useFetch(url.href, {
			key: `tx-logs-${txHash}`,
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
 * Get state changes for a specific transaction (FUTURE)
 * @param {string} txHash - Transaction hash
 * @param {object} params - Query parameters
 * @param {number} params.items_count - Number of items per page
 * @returns {Promise} Fetch promise with state changes data
 */
export const fetchTxStateChanges = (txHash, params = {}) => {
	try {
		const { items_count = 50 } = params

		const url = new URL(`${useIndexerUrl()}/transactions/${txHash}/state-changes`)

		url.searchParams.append("items_count", items_count)

		return useFetch(url.href, {
			key: `tx-state-changes-${txHash}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get raw trace for a specific transaction (FUTURE)
 * @param {string} txHash - Transaction hash
 * @returns {Promise} Fetch promise with raw trace data
 */
export const fetchTxRawTrace = async (txHash) => {
	try {
		const url = new URL(`${useIndexerUrl()}/transactions/${txHash}/raw-trace`)
		const data = await $fetch(url.href)

		return {
			data: {
				value: data
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get transaction summary (FUTURE)
 * @param {string} txHash - Transaction hash
 * @returns {Promise} Fetch promise with transaction summary
 */
export const fetchTxSummary = async (txHash) => {
	try {
		const url = new URL(`${useIndexerUrl()}/transactions/${txHash}/summary`)
		const data = await $fetch(url.href)

		return {
			data: {
				value: data
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get transactions count from stats endpoint
 * @returns {Promise} Total transactions count
 */
export const fetchTxsCount = async () => {
	try {
		const url = new URL(`${useIndexerUrl()}/stats`)
		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					total_transactions: data.total_transactions,
					transactions_today: data.transactions_today,
				}
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get filtered transactions using advanced filters endpoint
 * @param {object} params - Advanced filter parameters
 * @param {string} params.transaction_types - Comma-separated list: coin_transfer,ERC-20,ERC-404,ERC-721,ERC-1155
 * @param {string} params.methods - Comma-separated 4-byte signatures like 0xa0712d68
 * @param {string} params.age_from - Timestamp in ISO 8601 format
 * @param {string} params.age_to - Timestamp in ISO 8601 format
 * @param {string} params.from_address_hashes_to_include - Comma-separated addresses
 * @param {string} params.from_address_hashes_to_exclude - Comma-separated addresses
 * @param {string} params.to_address_hashes_to_include - Comma-separated addresses
 * @param {string} params.to_address_hashes_to_exclude - Comma-separated addresses
 * @param {string} params.address_relation - 'or' | 'and'
 * @param {number} params.amount_from - Minimum amount (float)
 * @param {number} params.amount_to - Maximum amount (float)
 * @param {string} params.token_contract_address_hashes_to_include - Comma-separated token addresses
 * @param {string} params.token_contract_address_hashes_to_exclude - Comma-separated token addresses
 * @param {number} params.block_number - Block number for pagination
 * @param {number} params.transaction_index - Transaction index for pagination
 * @param {number} params.internal_transaction_index - Internal transaction index for pagination
 * @param {number} params.token_transfer_index - Token transfer index for pagination
 * @returns {Promise} Fetch promise with filtered transactions
 */
export const fetchAdvancedFilters = (params = {}) => {
	try {
		const url = new URL(`${useIndexerUrl()}/advanced-filters`)

		// Add all provided parameters to URL
		Object.entries(params).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				url.searchParams.append(key, value)
			}
		})

		// Create a unique key for caching based on filter params
		const filterKey = Object.entries(params)
			.filter(([_, value]) => value !== null && value !== undefined && value !== '')
			.map(([key, value]) => `${key}:${value}`)
			.join('_')

		return useFetch(url.href, {
			key: `advanced-filters-${filterKey || 'all'}`,
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
		console.error('Failed to fetch advanced filters:', error)
		throw error
	}
}

/**
 * Get available transaction methods for filtering
 * @returns {Promise} List of methods with method_id and name
 */
export const fetchFilterMethods = async () => {
	try {
		const url = new URL(`${useIndexerUrl()}/advanced-filters/methods`)
		const data = await $fetch(url.href)

		return {
			data: {
				value: Array.isArray(data) ? data : []
			}
		}
	} catch (error) {
		console.error('Failed to fetch filter methods:', error)
		return {
			data: {
				value: []
			}
		}
	}
}
