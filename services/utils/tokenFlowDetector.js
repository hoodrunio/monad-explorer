/**
 * Token Flow Pattern Detector (Dynamic Version)
 *
 * Uses decoded event parameters directly from indexer instead of hardcoded protocol detection.
 * Works with ANY DEX protocol that emits standard Swap/Mint/Burn events.
 */

// Common WMONAD address on Monad testnet
const WMONAD_ADDRESS = '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/**
 * Generic event type detection based on method name (not signature)
 */

function getEventType(log) {
	if (!log?.decoded?.method_call) return null
	const method = log.decoded.method_call

	// Extract method name (before first parenthesis)
	const methodName = method.split('(')[0]

	return methodName // "Swap", "Mint", "Burn", "Deposit", "Withdrawal", "Trade", etc.
}

export function isSwapEvent(log) {
	const eventType = getEventType(log)
	return eventType === 'Swap' || eventType === 'CrocSwap' || eventType === 'Trade'
}

export function isMintEvent(log) {
	return getEventType(log) === 'Mint'
}

export function isBurnEvent(log) {
	return getEventType(log) === 'Burn'
}

export function isDepositEvent(log) {
	return getEventType(log) === 'Deposit'
}

export function isWithdrawalEvent(log) {
	return getEventType(log) === 'Withdrawal'
}

/**
 * Extract parameter value by name (case-insensitive)
 */
function getParam(log, paramName) {
	if (!log?.decoded?.parameters) return null

	const param = log.decoded.parameters.find(
		(p) => p.name.toLowerCase() === paramName.toLowerCase()
	)

	return param?.value || null
}

/**
 * Extract multiple possible parameter names (fallback chain)
 */
function getParamVariants(log, ...paramNames) {
	for (const name of paramNames) {
		const value = getParam(log, name)
		if (value) return value
	}
	return null
}

/**
 * Check if parameter exists
 */
function hasParam(log, paramName) {
	if (!log?.decoded?.parameters) return false
	return log.decoded.parameters.some(
		(p) => p.name.toLowerCase() === paramName.toLowerCase()
	)
}

/**
 * Dynamically extract swap addresses from ANY swap event
 * Works with Uniswap V2/V3, iZiSwap, CrocSwap, TipTag, etc.
 */
function extractSwapAddresses(log) {
	const eventType = getEventType(log)
	// Handle both raw API format (log.address.hash) and transformed format (log.address string)
	const pool = (typeof log.address === 'string' ? log.address : log.address?.hash) || null
	// Special handling for Trade events (TipTag, etc.)
	// In Trade events, "buyer" is often a meta-transaction initiator not visible in transfers
	// The actual user is "sellsman" who appears in token transfers
	if (eventType === 'Trade') {
		const sellsman = getParam(log, 'sellsman')
		const buyer = getParam(log, 'buyer')

		return {
			pool, // Platform contract
			router: null, // No router - buyer doesn't appear in transfers
			sender: sellsman, // Actual user in transfers
			recipient: sellsman, // Same user (selling tokens)
			buyer, // Store for reference but not used in role detection
		}
	}

	// Standard swap logic for normal DEXs
	// Try common parameter names for sender
	const sender = getParamVariants(log, 'sender', 'from')

	// Try common parameter names for recipient
	const recipient = getParamVariants(log, 'recipient', 'to', 'dst')

	// If sender and recipient are different, sender is likely the router
	const router = sender && recipient && sender !== recipient ? sender : null

	return {
		pool,
		router,
		sender,
		recipient,
	}
}

/**
 * Get contract name from log (provided by indexer)
 */
function getContractName(log) {
	// Handle both raw API format (log.address.name) and transformed format (no name)
	return typeof log.address === 'object' ? log.address?.name : null
}

/**
 * Detect protocol metadata from event
 * Returns contract name and event type instead of hardcoded protocol
 */
export function detectEventMetadata(log) {
	const eventType = getEventType(log)
	const contractName = getContractName(log)
	const eventEmitter = typeof log.address === 'string' ? log.address : log.address?.hash

	return {
		eventType, // "Swap", "Mint", "Burn", etc.
		contractName, // "Bean V2", "Uniswap Pool", etc. (from indexer)
		eventEmitter,
	}
}

/**
 * Check if transfers include LP token mint/burn
 */
function hasLPTokenMint(transfers) {
	return transfers.some(
		(t) => t.type === 'token_minting' && t.from?.hash === ZERO_ADDRESS && t.total?.value
	)
}

function hasLPTokenBurn(transfers) {
	return transfers.some(
		(t) => t.type === 'token_burning' && t.to?.hash === ZERO_ADDRESS && t.total?.value
	)
}

/**
 * Check for WMONAD wrap/unwrap
 */
function detectWrapUnwrap(decodedLogs, transfers) {
	const depositEvent = decodedLogs.find(isDepositEvent)
	const withdrawalEvent = decodedLogs.find(isWithdrawalEvent)

	const wmonadMint = transfers.find(
		(t) =>
			t.type === 'token_minting' &&
			t.token?.address?.hash?.toLowerCase() === WMONAD_ADDRESS.toLowerCase()
	)

	const wmonadBurn = transfers.find(
		(t) =>
			t.type === 'token_burning' &&
			t.token?.address?.hash?.toLowerCase() === WMONAD_ADDRESS.toLowerCase()
	)

	return {
		hasWrap: !!(depositEvent && wmonadMint),
		hasUnwrap: !!(withdrawalEvent && wmonadBurn),
		wmonadAddress: WMONAD_ADDRESS,
	}
}

/**
 * Check if transaction is NFT-only
 */
function isNFTTransaction(transfers) {
	if (transfers.length === 0) return false

	const allNFTs = transfers.every(
		(t) => t.token?.type === 'ERC-721' || t.token?.type === 'ERC-1155'
	)

	if (allNFTs) {
		return { isNFT: true, skip: true, reason: 'No fungible token flow' }
	}

	return { isNFT: false, skip: false }
}

/**
 * Main pattern detection function (DYNAMIC - no hardcoding!)
 *
 * @param {Array} decodedLogs - Decoded event logs from transaction
 * @param {Array} transfers - Token transfer data
 * @returns {Object} Pattern result with type, metadata, pool, router, etc.
 */
export function detectTransactionPattern(decodedLogs = [], transfers = []) {
	// Check for NFT-only transaction
	const nftCheck = isNFTTransaction(transfers)
	if (nftCheck.skip) {
		return {
			type: 'NFT',
			skip: true,
			confidence: 'high',
			detectionMethod: 'event',
			reason: nftCheck.reason,
		}
	}

	// Check decoded log availability
	const decodedCount = decodedLogs.filter((l) => l.decoded).length
	const decodedRatio = decodedLogs.length > 0 ? decodedCount / decodedLogs.length : 0

	if (decodedRatio < 0.3 && decodedLogs.length > 0) {
		// Less than 30% decoded - use heuristic fallback
		return {
			type: 'UNKNOWN',
			confidence: 'low',
			detectionMethod: 'heuristic',
			reason: 'Insufficient decoded logs',
		}
	}

	// Detect wrap/unwrap
	const wrapInfo = detectWrapUnwrap(decodedLogs, transfers)

	// Check for LP operations (Mint/Burn events)
	const mintEvent = decodedLogs.find(isMintEvent)
	const burnEvent = decodedLogs.find(isBurnEvent)

	if (mintEvent && hasLPTokenMint(transfers)) {
		const metadata = detectEventMetadata(mintEvent)
		return {
			type: 'LP_ADD',
			pool: metadata.eventEmitter,
			contractName: metadata.contractName,
			eventType: metadata.eventType,
			confidence: 'high',
			detectionMethod: 'event',
			wrapped: wrapInfo.hasWrap,
		}
	}

	if (burnEvent && hasLPTokenBurn(transfers)) {
		const metadata = detectEventMetadata(burnEvent)
		return {
			type: 'LP_REMOVE',
			pool: metadata.eventEmitter,
			contractName: metadata.contractName,
			eventType: metadata.eventType,
			confidence: 'high',
			detectionMethod: 'event',
			wrapped: wrapInfo.hasUnwrap,
		}
	}

	// Check for swap events (DYNAMIC - works with any DEX!)
	const swapEvent = decodedLogs.find(isSwapEvent)
	if (swapEvent) {
		const addresses = extractSwapAddresses(swapEvent)
		const metadata = detectEventMetadata(swapEvent)

		return {
			type: 'SWAP',
			pool: addresses.pool,
			router: addresses.router,
			sender: addresses.sender,
			recipient: addresses.recipient,
			contractName: metadata.contractName, // From indexer!
			eventType: metadata.eventType, // "Swap", "Trade", "CrocSwap"
			confidence: 'high',
			detectionMethod: 'event',
			wrapped: wrapInfo.hasWrap || wrapInfo.hasUnwrap,
		}
	}

	// No clear pattern detected
	if (decodedLogs.length === 0) {
		return {
			type: 'UNKNOWN',
			confidence: 'none',
			detectionMethod: 'none',
			reason: 'No decoded logs available',
		}
	}

	return {
		type: 'UNKNOWN',
		confidence: 'medium',
		detectionMethod: 'heuristic',
		reason: 'No matching pattern found',
	}
}

/**
 * Detect address roles based on pattern and events (DYNAMIC)
 *
 * @param {Object} pattern - Pattern result from detectTransactionPattern()
 * @param {Array} decodedLogs - Decoded event logs
 * @param {Array} transfers - Token transfers
 * @returns {Map} Map of address to role (pool, router, user, wmonad, intermediary)
 */
export function detectAddressRoles(pattern, decodedLogs = [], transfers = []) {
	const roles = new Map()

	if (!pattern || pattern.type === 'UNKNOWN' || pattern.skip) {
		return roles
	}

	// Assign pool address (event emitter)
	if (pattern.pool) {
		roles.set(pattern.pool.toLowerCase(), 'pool')
	}

	// Assign router address (if sender !== recipient)
	if (pattern.router) {
		roles.set(pattern.router.toLowerCase(), 'router')
	}

	// Assign WMONAD address if wrapped
	if (pattern.wrapped) {
		roles.set(WMONAD_ADDRESS.toLowerCase(), 'wmonad')
	}

	// Find user addresses (participants not in pool/router roles)
	const systemAddrs = new Set(
		[pattern.pool, pattern.router, WMONAD_ADDRESS]
			.filter(Boolean)
			.map((a) => a.toLowerCase())
	)

	transfers.forEach((transfer) => {
		const from = transfer.from?.hash?.toLowerCase()
		const to = transfer.to?.hash?.toLowerCase()

		// Skip zero address
		if (from === ZERO_ADDRESS.toLowerCase() || to === ZERO_ADDRESS.toLowerCase()) {
			return
		}

		// Assign user role to non-system addresses
		if (from && !roles.has(from) && !systemAddrs.has(from)) {
			roles.set(from, 'user')
		}

		if (to && !roles.has(to) && !systemAddrs.has(to)) {
			roles.set(to, 'user')
		}
	})

	return roles
}

/**
 * Utility: Get readable pattern description
 */
export function getPatternDescription(pattern) {
	if (!pattern || pattern.type === 'UNKNOWN') return null

	const contractName = pattern.contractName || 'Contract'
	const eventType = pattern.eventType || 'Event'

	switch (pattern.type) {
		case 'SWAP':
			if (pattern.router) {
				return `Router-mediated swap via ${contractName}`
			}
			return `Direct swap on ${contractName}`

		case 'LP_ADD':
			return `Add liquidity to ${contractName}`

		case 'LP_REMOVE':
			return `Remove liquidity from ${contractName}`

		case 'NFT':
			return 'NFT transfer'

		default:
			return `${eventType} on ${contractName}`
	}
}
