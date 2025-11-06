/**
 * Data transformation utilities for API responses
 */

/**
 * Parse ISO 8601 timestamp to Date object
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {Date|null} Date object or null if invalid
 */
export const parseISOTimestamp = (isoTimestamp) => {
	if (!isoTimestamp) return null
	try {
		return new Date(isoTimestamp)
	} catch (error) {
		console.error('Failed to parse timestamp:', error)
		return null
	}
}

/**
 * Parse ISO timestamp to Unix timestamp (seconds)
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {number|null} Unix timestamp in seconds
 */
export const isoToUnixTimestamp = (isoTimestamp) => {
	const date = parseISOTimestamp(isoTimestamp)
	return date ? Math.floor(date.getTime() / 1000) : null
}

/**
 * Safe parse numeric string to BigInt
 * @param {string|number} value - Numeric string or number
 * @returns {bigint|null} BigInt value or null if invalid
 */
export const parseBigInt = (value) => {
	if (value === null || value === undefined || value === '') return null
	try {
		return BigInt(value.toString())
	} catch (error) {
		console.error('Failed to parse BigInt:', error)
		return null
	}
}

/**
 * Safe parse numeric string to Number (for display purposes)
 * Use only for values that won't overflow JavaScript number precision
 * @param {string|number} value - Numeric string or number
 * @returns {number|null} Number value or null if invalid
 */
export const parseNumericString = (value) => {
	if (value === null || value === undefined || value === '') return null
	const num = Number(value)
	return isNaN(num) ? null : num
}

/**
 * Format gas percentage
 * @param {string|number} gasUsed - Gas used
 * @param {string|number} gasLimit - Gas limit
 * @returns {number|null} Percentage (0-100)
 */
export const calculateGasPercentage = (gasUsed, gasLimit) => {
	const used = parseNumericString(gasUsed)
	const limit = parseNumericString(gasLimit)

	if (used === null || limit === null || limit === 0) return null
	return (used / limit) * 100
}

/**
 * Transform block response from new API to frontend format
 * @param {object} block - Block data from API
 * @returns {object} Transformed block
 */
export const transformBlock = (block) => {
	if (!block) return null

	return {
		...block,
		// Ensure numeric fields are properly parsed
		height: parseNumericString(block.height),
		timestamp: block.timestamp, // Keep ISO format, parse when needed
		gas_used: block.gas_used, // Keep as string for precision
		gas_limit: block.gas_limit, // Keep as string for precision
		gas_used_percentage: block.gas_used_percentage ||
			calculateGasPercentage(block.gas_used, block.gas_limit),
		size: parseNumericString(block.size),
		base_fee_per_gas: block.base_fee_per_gas, // Keep as string
		burnt_fees: block.burnt_fees, // Keep as string
		transactions_count: parseNumericString(block.transactions_count) ||
			parseNumericString(block.tx_count),
	}
}

/**
 * Transform transaction response from new API to component-compatible format
 * @param {object} tx - Transaction data from API
 * @returns {object} Transformed transaction
 */
export const transformTransaction = (tx) => {
	if (!tx) return null

	// New Indexer API structure
	return {
		// Keep all original fields
		...tx,

		// Map new API fields to component-expected fields
		hash: tx.hash,
		blockNumber: parseNumericString(tx.block_number) || parseNumericString(tx.block) || 0,
		block_number: parseNumericString(tx.block_number) || parseNumericString(tx.block) || 0,
		timestamp: tx.timestamp,

		// - Original string format: "ok" or "error" (for list views)
		// - Numeric format: 1 or 0 (for detail views)
		status: tx.status, // Keep original "ok" or "error" string
		statusCode: tx.status === "ok" ? 1 : 0, // Numeric version for backwards compatibility

		// From/To addresses - Keep both object and string formats
		from: tx.from, // Keep original object { hash, is_contract, ... }
		to: tx.to, // Keep original object
		fromAddress: tx.from?.hash || tx.from, // String version for backwards compatibility
		toAddress: tx.to?.hash || tx.to || tx.created_contract?.hash, // String version

		// Contract creation
		isContractCreation: !!tx.created_contract,
		isContractInteraction: !!(tx.to && tx.to.is_contract),
		createdContract: tx.created_contract?.hash,

		// Gas and value (keep as strings for precision)
		value: tx.value || "0",
		gasUsed: tx.gas_used || "0",
		gas: tx.gas_limit || "0", // Map gas_limit to gas for component compatibility
		gas_used: tx.gas_used || "0",
		gas_limit: tx.gas_limit || "0",
		gasPrice: tx.gas_price || "0",
		gas_price: tx.gas_price || "0",
		effectiveGasPrice: tx.gas_price || "0", // Same as gas_price in most cases

		// Transaction fee (calculate or use from fee.value)
		transactionFee: tx.fee?.value || "0",
		fee: tx.fee?.value || "0",

		// Transaction index/position
		transactionIndex: parseNumericString(tx.position) || parseNumericString(tx.index) || 0,
		index: parseNumericString(tx.position) || parseNumericString(tx.index) || 0,
		position: parseNumericString(tx.position) || 0,
		nonce: parseNumericString(tx.nonce) || 0,

		// Method information
		method: tx.method,
		methodName: tx.method || "Unknown",
		methodID: tx.raw_input?.slice(0, 10) || null, // First 10 chars (0x + 8 hex)

		// Input data
		input: tx.raw_input || "0x",

		// Error handling
		error: tx.revert_reason || null,
		revertReason: tx.revert_reason || null,

		// Token transfers and logs (already in correct format)
		tokenTransfers: tx.token_transfers || [],
		token_transfers: tx.token_transfers || [],
		decodedLogs: tx.decoded_logs || [],
		decoded_logs: tx.decoded_logs || [],

		// Type information
		type: tx.type || 0,
		transaction_types: tx.transaction_types || [],
	}
}

/**
 * Transform address response from new API
 * @param {object} address - Address data from API
 * @returns {object} Transformed address
 */
export const transformAddress = (address) => {
	if (!address) return null

	return {
		...address,
		hash: address.hash?.toLowerCase(),
		coin_balance: address.coin_balance, // Keep as string
		transactions_count: parseNumericString(address.transactions_count) ||
			parseNumericString(address.tx_count),
		token_transfers_count: parseNumericString(address.token_transfers_count),
	}
}

/**
 * Transform log/event response from new API
 * @param {object} log - Log data from API
 * @returns {object} Transformed log
 */
export const transformLog = (log) => {
	if (!log) return null

	return {
		...log,
		// Map to component-expected fields
		logIndex: log.index,
		address: log.address?.hash || log.address,
		eventSignature: log.decoded?.method_call || null,
		eventName: log.decoded?.method_call?.split('(')[0] || null,
		topics: log.topics || [],
		data: log.data,
		// Keep original structure for full data access
		decoded: log.decoded,
	}
}

/**
 * Safely handle null/undefined values in API responses
 * @param {any} value - Value to check
 * @param {any} defaultValue - Default value if null/undefined
 * @returns {any} Value or default
 */
export const withDefault = (value, defaultValue = null) => {
	return value !== null && value !== undefined ? value : defaultValue
}
