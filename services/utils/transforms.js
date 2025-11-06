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
 * Transform transaction response from new API
 * @param {object} tx - Transaction data from API
 * @returns {object} Transformed transaction
 */
export const transformTransaction = (tx) => {
	if (!tx) return null

	return {
		...tx,
		block_number: parseNumericString(tx.block_number) ||
			parseNumericString(tx.block),
		timestamp: tx.timestamp,
		value: tx.value, // Keep as string for precision
		gas_used: tx.gas_used, // Keep as string
		gas_price: tx.gas_price, // Keep as string
		gas_limit: tx.gas_limit, // Keep as string
		nonce: parseNumericString(tx.nonce),
		position: parseNumericString(tx.position),
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
 * Safely handle null/undefined values in API responses
 * @param {any} value - Value to check
 * @param {any} defaultValue - Default value if null/undefined
 * @returns {any} Value or default
 */
export const withDefault = (value, defaultValue = null) => {
	return value !== null && value !== undefined ? value : defaultValue
}
