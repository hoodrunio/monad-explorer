/**
 * Format transaction type from snake_case to Title Case
 * @param {string} type - Transaction type in snake_case (e.g., "coin_transfer")
 * @returns {string} Formatted type in Title Case (e.g., "Coin Transfer")
 */
export const formatTransactionType = (type) => {
	if (!type) return ""
	return type
		.split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")
}

/**
 * Get display information for transaction type/method
 * Uses priority: syscall reward check > transaction_types > method > fallback
 * @param {Object} tx - Transaction object
 * @returns {Object} Display info with display, hasMultiple, additionalCount, allTypes, source
 */
export const getTransactionDisplayInfo = (tx) => {
	// Priority 0: Check for Syscall Reward (special case)
	// gas_used = 0 AND to.hash = 0x0000000000000000000000000000000000001000
	if (tx.gas_used === "0" && tx.to?.hash?.toLowerCase() === "0x0000000000000000000000000000000000001000") {
		return {
			display: "Syscall Reward",
			hasMultiple: false,
			additionalCount: 0,
			allTypes: ["Syscall Reward"],
			source: 'syscall'
		}
	}

	// Priority 1: Use transaction_types if available and not empty
	if (tx.transaction_types && tx.transaction_types.length > 0) {
		const types = tx.transaction_types
		const primaryType = formatTransactionType(types[0])
		const hasMultiple = types.length > 1
		const additionalCount = types.length - 1
		const allTypes = types.map(formatTransactionType)

		return {
			display: primaryType,
			hasMultiple,
			additionalCount,
			allTypes,
			source: 'types'
		}
	}

	// Priority 2: Use method if available
	if (tx.method) {
		return {
			display: tx.method,
			hasMultiple: false,
			additionalCount: 0,
			allTypes: [tx.method],
			source: 'method'
		}
	}

	// Priority 3: Fallback to "Contract Call"
	return {
		display: "Contract Call",
		hasMultiple: false,
		additionalCount: 0,
		allTypes: ["Contract Call"],
		source: 'fallback'
	}
}
