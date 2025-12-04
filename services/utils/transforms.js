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
 * Handles two different API response formats:
 * 1. Regular /transactions endpoint (full transaction details)
 * 2. Advanced filters /advanced-filters endpoint (simplified transfer format)
 *
 * @param {object} tx - Transaction data from API
 * @returns {object} Transformed transaction
 */
export const transformTransaction = (tx) => {
	if (!tx) return null

	// Detect which API format we're dealing with
	const isAdvancedFilterFormat = !tx.hasOwnProperty('status') && typeof tx.type === 'string'

	// For advanced-filters format, infer status from the result field or default to "ok"
	// Advanced filters only return successful/completed transactions
	let normalizedStatus = tx.status || 'ok'

	// Handle fee field: could be object {type, value} or string
	const normalizedFee = typeof tx.fee === 'object' ? tx.fee?.value || "0" : tx.fee || "0"

	// Handle transaction_types: could be array or need to be inferred from type
	let normalizedTransactionTypes = tx.transaction_types || []
	if (isAdvancedFilterFormat && typeof tx.type === 'string') {
		// Convert advanced-filter type string to transaction_types array format
		normalizedTransactionTypes = [tx.type]
	}

	// New Indexer API structure
	return {
		// Keep all original fields
		...tx,

		// Map new API fields to component-expected fields
		hash: tx.hash,
		blockNumber: parseNumericString(tx.block_number) || parseNumericString(tx.block) || 0,
		block_number: parseNumericString(tx.block_number) || parseNumericString(tx.block) || 0,
		timestamp: tx.timestamp,

		// Status normalization
		// - Original string format: "ok" or "error" (for list views)
		// - Numeric format: 1 or 0 (for detail views)
		status: normalizedStatus, // Normalized "ok" or "error" string
		statusCode: normalizedStatus === "ok" ? 1 : 0, // Numeric version for backwards compatibility
		result: tx.result || (normalizedStatus === "ok" ? "success" : null), // Result field for detail views

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
		maxFeePerGas: tx.max_fee_per_gas || "0",
		max_fee_per_gas: tx.max_fee_per_gas || "0",

		// Transaction fee normalization
		transactionFee: normalizedFee,
		fee: normalizedFee,
		burntFee: tx.transaction_burnt_fee || "0",
		transaction_burnt_fee: tx.transaction_burnt_fee || "0",

		// Transaction index/position
		// Advanced filters uses transaction_index instead of position
		transactionIndex: parseNumericString(tx.transaction_index) || parseNumericString(tx.position) || parseNumericString(tx.index) || 0,
		index: parseNumericString(tx.transaction_index) || parseNumericString(tx.position) || parseNumericString(tx.index) || 0,
		position: parseNumericString(tx.transaction_index) || parseNumericString(tx.position) || 0,
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

		// Decoded input for method display
		decoded_input: tx.decoded_input || null,

		// Type information normalization
		type: typeof tx.type === 'number' ? tx.type : 0, // Transaction type (0=legacy, 2=EIP-1559)
		transaction_types: normalizedTransactionTypes, // Transaction categories array

		// Keep advanced-filter specific fields
		internal_transaction_index: tx.internal_transaction_index,
		token_transfer_index: tx.token_transfer_index,
		token_transfer_batch_index: tx.token_transfer_batch_index,
		total: tx.total,
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
 * Transform address counters/stats response from new Indexer API
 * @param {object} counters - Counters data from API
 * @returns {object} Transformed counters
 */
export const transformAddressCounters = (counters) => {
	if (!counters) return null

	return {
		...counters,
		// Parse numeric strings to numbers for easier use in components
		transactions_count: parseNumericString(counters.transactions_count) || 0,
		token_transfers_count: parseNumericString(counters.token_transfers_count) || 0,
		gas_usage_count: counters.gas_usage_count, // Keep as string for precision
		validations_count: parseNumericString(counters.validations_count) || 0,
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
 * Transform smart contract response from new API
 * @param {object} contract - Contract data from API
 * @returns {object} Transformed contract
 */
export const transformContract = (contract) => {
	if (!contract) return null

	return {
		// Keep all original fields
		...contract,

		// Map snake_case to camelCase for component compatibility
		address: contract.address_hash?.toLowerCase() || contract.address?.toLowerCase(),
		addressHash: contract.address_hash?.toLowerCase(),

		// Verification status
		isVerified: contract.is_verified || false,
		isFullyVerified: contract.is_fully_verified || false,
		isPartiallyVerified: contract.is_partially_verified || false,
		isChangedBytecode: contract.is_changed_bytecode || false,
		verifiedAt: contract.verified_at,

		// Verification sources
		isVerifiedViaSourceify: contract.is_verified_via_sourcify || false,
		isVerifiedViaEthBytecodeDb: contract.is_verified_via_eth_bytecode_db || false,
		sourcifyRepoUrl: contract.sourcify_repo_url,

		// Contract information
		name: contract.name,
		language: contract.language, // solidity | vyper | yul
		compilerVersion: contract.compiler_version,
		evmVersion: contract.evm_version,

		// Optimization
		optimizationEnabled: contract.optimization_enabled || false,
		optimizationsRuns: parseNumericString(contract.optimizations_runs),

		// Code
		abi: contract.abi,
		sourceCode: contract.source_code,
		filePath: contract.file_path,
		constructorArgs: contract.constructor_args,
		decodedConstructorArgs: contract.decoded_constructor_args || [],
		additionalSources: contract.additional_sources || [],

		// Bytecode
		deployedBytecode: contract.deployed_bytecode,
		creationBytecode: contract.creation_bytecode,

		// Compiler settings
		compilerSettings: contract.compiler_settings,
		externalLibraries: contract.external_libraries || [],

		// Proxy information
		minimalProxyAddress: contract.minimal_proxy_address_hash,
		verifiedTwinAddress: contract.verified_twin_address_hash,

		// Creation status
		creationStatus: contract.creation_status, // success | failed | selfdestructed

		// Additional features
		canBeVisualizedViaSol2uml: contract.can_be_visualized_via_sol2uml || false,

		// List-specific fields (for SmartContractForList schema)
		coinBalance: contract.coin_balance,
		hasConstructorArgs: contract.has_constructor_args,
		transactionsCount: parseNumericString(contract.transactions_count),
		marketCap: parseNumericString(contract.market_cap),
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
