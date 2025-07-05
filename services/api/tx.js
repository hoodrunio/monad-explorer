/** Services */
import { useExplorerURL } from "@/services/config"

// Get latest transactions with basic data (for preview)
export const fetchTransactions = ({ limit = 20, offset = 0, page = 1 } = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/transactions`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)
		if (page) url.searchParams.append("page", page)

		return useFetch(url.href, {
			key: "transactions",
		})
	} catch (error) {
		console.error(error)
	}
}

// Get enriched transaction with runtime-parsed token transfers
export const fetchTxByHash = (hash, {
	includeTokenTransfers = true,
	includeTokenMetadata = true,
	includeDecodedLogs = true,
	includeInternalTransactions = true
} = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/transactions/${hash}`)

		if (includeTokenTransfers) url.searchParams.append("includeTokenTransfers", includeTokenTransfers)
		if (includeTokenMetadata) url.searchParams.append("includeTokenMetadata", includeTokenMetadata)
		if (includeDecodedLogs) url.searchParams.append("includeDecodedLogs", includeDecodedLogs)
		if (includeInternalTransactions) url.searchParams.append("includeInternalTransactions", includeInternalTransactions)

		return useFetch(url.href, {
			key: "transaction",
		})
	} catch (error) {
		console.error(error)
	}
}

// Get token transfers for a specific transaction
export const fetchTxTokenTransfers = (hash, { includeMetadata = false } = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/transactions/${hash}/token-transfers`)

		if (includeMetadata) url.searchParams.append("includeMetadata", includeMetadata)

		return useFetch(url.href, {
			key: "tx_token_transfers",
		})
	} catch (error) {
		console.error(error)
	}
}

// Get internal transactions for a specific transaction (on-demand tracing)
export const fetchTxInternalTransactions = (hash, {
	includeFailedCalls = false,
	maxDepth = 10,
	filterByAddress = null
} = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/transactions/${hash}/internal-transactions`)

		if (includeFailedCalls) url.searchParams.append("includeFailedCalls", includeFailedCalls)
		if (maxDepth) url.searchParams.append("maxDepth", maxDepth)
		if (filterByAddress) url.searchParams.append("filterByAddress", filterByAddress)

		return useFetch(url.href, {
			key: "tx_internal_transactions",
		})
	} catch (error) {
		console.error(error)
	}
}

// Quick check if transaction has internal transactions (lightweight)
export const fetchTxHasInternalTransactions = async (hash) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/transactions/${hash}/has-internal-transactions`)

		const data = await $fetch(url.href)
		return data
	} catch (error) {
		console.error(error)
	}
}

// Legacy functions for backward compatibility

// Legacy: Transaction messages (mapped to token transfers for EVM)
export const fetchTxMessages = async (hash) => {
	return fetchTxTokenTransfers(hash, { includeMetadata: true })
}

// Legacy: Transaction events (mapped to decoded logs for EVM)
export const fetchTxEvents = async ({ hash, limit, offset }) => {
	try {
		const tx = await fetchTxByHash(hash, { 
			includeDecodedLogs: true,
			includeTokenTransfers: false,
			includeTokenMetadata: false,
			includeInternalTransactions: false
		})

		if (tx.data?.value?.decodedLogs) {
			const logs = tx.data.value.decodedLogs
			const start = offset || 0
			const end = start + (limit || logs.length)
			return {
				data: logs.slice(start, end),
				total: logs.length
			}
		}

		return { data: [], total: 0 }
	} catch (error) {
		console.error(error)
	}
}

// Legacy: Transactions count
export const fetchTxsCount = () => {
	try {
		const url = new URL(`${useExplorerURL()}/stats/tx_count`)

		return useFetch(url.href, {
			key: "transactions_count",
		})
	} catch (error) {
		console.error(error)
	}
}

// Legacy: Transactions by block (now handled in block.js)
export const fetchTransactionsByBlock = ({ 
	height, 
	limit, 
	offset, 
	includeTokenTransfers = false,
	// Legacy params that we'll ignore for EVM compatibility
	sort, from, to, status, type, excluded_types
} = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/blocks/${height}/transactions`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)
		if (includeTokenTransfers) url.searchParams.append("includeTokenTransfers", includeTokenTransfers)

		return useFetch(url.href, {
			key: "transactions_by_block",
		})
	} catch (error) {
		console.error(error)
	}
}
