/** Services */
import { useExplorerURL } from "@/services/config"

// Get latest blocks with basic data (for preview)
export const fetchBlocks = ({ limit = 20, offset = 0, page = 1 } = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/blocks`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)
		if (page) url.searchParams.append("page", page)

		return useFetch(url.href, {
			key: `blocks-${page}-${limit}-${offset}`,
		})
	} catch (error) {
		console.error(error)
	}
}

// Get specific block details by number
export const fetchBlockByHeight = (number) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/blocks/${number}`)

		return useFetch(encodeURI(url.href), {
			key: "block_by_height",
		})
	} catch (error) {
		console.error(error)
	}
}

// Get all transactions in a block
export const fetchBlockTransactions = ({ 
	number, 
	limit = 20, 
	offset = 0, 
	includeTokenTransfers = false 
} = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/blocks/${number}/transactions`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)
		if (includeTokenTransfers) url.searchParams.append("includeTokenTransfers", includeTokenTransfers)

		return useFetch(url.href, {
			key: "block_transactions",
		})
	} catch (error) {
		console.error(error)
	}
}

// Get all logs in a block (useful for debugging)
export const fetchBlockLogs = ({ number, limit = 20, offset = 0 } = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/blocks/${number}/logs`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)

		return useFetch(url.href, {
			key: "block_logs",
		})
	} catch (error) {
		console.error(error)
	}
}

// Legacy: Get block events (maps to logs for EVM compatibility)
export const fetchBlockEvents = ({ height, limit = 20, offset = 0 } = {}) => {
	try {
		// For EVM, events are called logs
		const url = new URL(`${useExplorerURL()}/api/blocks/${height}/logs`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)

		return useFetch(url.href, {
			key: "block_events",
		})
	} catch (error) {
		console.error(error)
	}
}

// Legacy function for backward compatibility - maps to fetchBlockTransactions
export const fetchTransactionsByBlock = ({ 
	height, 
	limit, 
	offset, 
	includeTokenTransfers = false 
} = {}) => {
	return fetchBlockTransactions({ 
		number: height, 
		limit, 
		offset, 
		includeTokenTransfers 
	})
}

// Average block time (keeping for compatibility)
export const fetchAvgBlockTime = ({ from }) => {
	try {
		const url = new URL(`${useExplorerURL()}/stats/avg_block_time`)

		if (from) url.searchParams.append("from", from)

		return useFetch(url.href, {
			key: "avg_block_time",
		})
	} catch (error) {
		console.error(error)
	}
}

// Block blobs (keeping for compatibility with Celestia-based components)
export const fetchBlockBlobs = ({ height, limit }) => {
	try {
		const url = new URL(`${useServerURL()}/block/${height}/blobs`)

		if (limit) url.searchParams.append("limit", limit)

		return useFetch(url.href, {
			key: "block_blobs",
		})
	} catch (error) {
		console.error(error)
	}
} 