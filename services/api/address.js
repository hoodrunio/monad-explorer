/** Address API Services */
import { useExplorerURL } from "@/services/config"

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
 * @param {string} address - Ethereum address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchAddressTransactions = (address, {
	limit = 50,
	offset = 0,
	includeTokenTransfers = false
} = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/addresses/${normalizedAddress}/transactions`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)
		if (includeTokenTransfers) url.searchParams.append("includeTokenTransfers", includeTokenTransfers)

		return useFetch(url.href, {
			key: `address-transactions-${address}-${limit}-${offset}-${includeTokenTransfers}`,
		})
	} catch (error) {
		console.error('Failed to fetch address transactions:', error)
		throw error
	}
}

/**
 * Get transactions for an address (sent or received) - Client-side version
 * @param {string} address - Ethereum address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchAddressTransactionsClient = async (address, {
	limit = 50,
	offset = 0,
	includeTokenTransfers = false
} = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/addresses/${normalizedAddress}/transactions`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)
		if (includeTokenTransfers) url.searchParams.append("includeTokenTransfers", includeTokenTransfers)

		const data = await $fetch(url.href)
		return { data: { value: data } }
	} catch (error) {
		console.error('Failed to fetch address transactions:', error)
		throw error
	}
}

/**
 * Get token transfers for an address
 * @param {string} address - Ethereum address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchAddressTokenTransfers = (address, {
	tokenAddress = null,
	limit = 50,
	offset = 0
} = {}) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	if (tokenAddress && !isValidAddress(tokenAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/addresses/${address}/token-transfers`)

		if (tokenAddress) url.searchParams.append("tokenAddress", tokenAddress)
		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)

		return useFetch(url.href, {
			key: `address-token-transfers-${address}-${tokenAddress || 'all'}-${limit}-${offset}`,
		})
	} catch (error) {
		console.error('Failed to fetch address token transfers:', error)
		throw error
	}
}

/**
 * Get balances for an address - SSR version
 * @param {string} address - Ethereum address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchAddressBalance = (address, {
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
		const url = new URL(`${useExplorerURL()}/api/addresses/${normalizedAddress}/balance`)

		if (normalizedTokenAddress) url.searchParams.append("tokenAddress", normalizedTokenAddress)
		if (includeNative !== undefined) url.searchParams.append("includeNative", includeNative.toString())
		if (includeMetadata !== undefined) url.searchParams.append("includeMetadata", includeMetadata.toString())
		if (useCache !== undefined) url.searchParams.append("useCache", useCache.toString())
		if (blockNumber) url.searchParams.append("blockNumber", blockNumber.toString())

		return useFetch(url.href, {
			key: `address-balance-${address}-${tokenAddress || 'all'}-${blockNumber || 'latest'}`,
		})
	} catch (error) {
		console.error('Failed to fetch address balance:', error)
		throw error
	}
}

/**
 * Get balances for an address - Client-side version
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
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	if (tokenAddress && !isValidAddress(tokenAddress)) {
		throw new Error('Invalid token address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/addresses/${address}/balance`)

		if (tokenAddress) url.searchParams.append("tokenAddress", tokenAddress)
		if (includeNative !== undefined) url.searchParams.append("includeNative", includeNative.toString())
		if (includeMetadata !== undefined) url.searchParams.append("includeMetadata", includeMetadata.toString())
		if (useCache !== undefined) url.searchParams.append("useCache", useCache.toString())
		if (blockNumber) url.searchParams.append("blockNumber", blockNumber.toString())

		const data = await $fetch(url.href)
		return { data: { value: data } }
	} catch (error) {
		console.error('Failed to fetch address balance:', error)
		throw error
	}
}

/**
 * Get internal transactions for an address
 * @param {string} address - Ethereum address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchAddressInternalTransactions = (address, {
	limit = 50,
	offset = 0,
	includeFailedCalls = false,
	maxDepth = 10
} = {}) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/addresses/${address}/internal-transactions`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)
		if (includeFailedCalls) url.searchParams.append("includeFailedCalls", includeFailedCalls.toString())
		if (maxDepth) url.searchParams.append("maxDepth", maxDepth.toString())

		return useFetch(url.href, {
			key: `address-internal-transactions-${address}-${limit}-${offset}-${includeFailedCalls}`,
		})
	} catch (error) {
		console.error('Failed to fetch address internal transactions:', error)
		throw error
	}
}

/**
 * Get statistics for an address - SSR version
 * @param {string} address - Ethereum address
 * @returns {Promise} - API response
 */
export const fetchAddressStats = (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/addresses/${normalizedAddress}/stats`)

		return useFetch(url.href, {
			key: `address-stats-${address}`,
		})
	} catch (error) {
		console.error('Failed to fetch address stats:', error)
		throw error
	}
}

/**
 * Get statistics for an address - Client-side version
 * @param {string} address - Ethereum address
 * @returns {Promise} - API response
 */
export const fetchAddressStatsClient = async (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/addresses/${normalizedAddress}/stats`)

		const data = await $fetch(url.href)
		return { data: { value: data } }
	} catch (error) {
		console.error('Failed to fetch address stats:', error)
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
		console.error('Failed to fetch native balance:', error)
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
		console.error('Failed to fetch token balance:', error)
		throw error
	}
}

/**
 * Check if address has any activity
 * @param {string} address - Ethereum address
 * @returns {Promise<boolean>} - True if address has transactions
 */
export const hasAddressActivity = async (address) => {
	if (!isValidAddress(address)) {
		return false
	}

	try {
		const stats = await fetchAddressStats(address)
		return stats.data?.value?.data?.stats?.transactionCount?.total > 0
	} catch (error) {
		console.error('Failed to check address activity:', error)
		return false
	}
}

/**
 * Get address overview (combines multiple endpoints) - SSR version
 * @param {string} address - Ethereum address
 * @returns {Promise} - Combined address data
 */
export const fetchAddressOverview = async (address) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	try {
		// Fetch multiple endpoints in parallel
		const [balance, stats, recentTx] = await Promise.allSettled([
			fetchAddressBalance(address, { includeNative: true, includeMetadata: true }),
			fetchAddressStats(address),
			fetchAddressTransactions(address, { limit: 5, includeTokenTransfers: true })
		])

		return {
			address,
			balance: balance.status === 'fulfilled' ? balance.value : null,
			stats: stats.status === 'fulfilled' ? stats.value : null,
			recentTransactions: recentTx.status === 'fulfilled' ? recentTx.value : null,
			success: true
		}
	} catch (error) {
		console.error('Failed to fetch address overview:', error)
		throw error
	}
}

/**
 * Get address overview (combines multiple endpoints) - Client-side version
 * @param {string} address - Ethereum address
 * @returns {Promise} - Combined address data
 */
export const fetchAddressOverviewClient = async (address) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid address format')
	}

	try {
		// Fetch multiple endpoints in parallel
		const [balance, stats, recentTx] = await Promise.allSettled([
			fetchAddressBalanceClient(address, { includeNative: true, includeMetadata: true }),
			fetchAddressStatsClient(address),
			fetchAddressTransactionsClient(address, { limit: 5, includeTokenTransfers: true })
		])

		return {
			address,
			balance: balance.status === 'fulfilled' ? balance.value : null,
			stats: stats.status === 'fulfilled' ? stats.value : null,
			recentTransactions: recentTx.status === 'fulfilled' ? recentTx.value : null,
			success: true
		}
	} catch (error) {
		console.error('Failed to fetch address overview:', error)
		throw error
	}
}
