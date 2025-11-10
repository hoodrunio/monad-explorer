/**
 * Token Flow Pattern Detector (Graph-Based Version)
 *
 * Platform-agnostic detection using transfer graph topology as primary method.
 * Events are used for enrichment only
 */

import { buildTransferGraph, getMostLikelyRole } from './transferGraph.js'
import { detectPattern, enrichPatternWithEvents } from './graphPatterns.js'

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
 * Main pattern detection function (GRAPH-BASED - platform agnostic!)
 *
 * @param {Array} decodedLogs - Decoded event logs from transaction
 * @param {Array} transfers - Token transfer data
 * @param {Object} tx - Transaction metadata
 * @returns {Object} Pattern result with type, metadata, pool, router, etc.
 */
export function detectTransactionPattern(decodedLogs = [], transfers = [], tx = null) {
	// Step 1: Build transfer graph (platform-agnostic)
	const graph = buildTransferGraph(transfers, tx)

	// Step 2: Detect pattern from graph topology (no platform dependencies)
	let pattern = detectPattern(graph, decodedLogs)

	// Step 3: Enrich with event data if available (optional enhancement)
	if (decodedLogs.length > 0) {
		pattern = enrichPatternWithEvents(pattern, decodedLogs)

		// Add legacy contract name from events for UI compatibility
		const firstSwapEvent = decodedLogs.find(isSwapEvent)
		if (firstSwapEvent && pattern.type === 'SWAP') {
			const metadata = detectEventMetadata(firstSwapEvent)
			pattern.contractName = metadata.contractName
			pattern.eventType = metadata.eventType
		}

		const mintEvent = decodedLogs.find(isMintEvent)
		const burnEvent = decodedLogs.find(isBurnEvent)
		if (mintEvent && pattern.type === 'LP_ADD') {
			const metadata = detectEventMetadata(mintEvent)
			pattern.contractName = metadata.contractName
			pattern.eventType = metadata.eventType
		}
		if (burnEvent && pattern.type === 'LP_REMOVE') {
			const metadata = detectEventMetadata(burnEvent)
			pattern.contractName = metadata.contractName
			pattern.eventType = metadata.eventType
		}
	}

	// Step 4: Convert confidence to legacy format
	pattern.confidence = mapConfidenceToLegacy(pattern.confidence)
	pattern.detectionMethod = pattern.type === 'TRANSFER' ? 'heuristic' : 'graph'

	// Step 5: Handle NFT transactions (visualize instead of skipping)
	if (pattern.type === 'NFT_TRANSFER') {
		pattern.skip = false // Enable NFT visualization
		pattern.showAsTransfer = true
	}

	// Step 6: Handle generic transfers (fallback visualization)
	if (pattern.type === 'TRANSFER') {
		pattern.showAsTransfer = true
	}

	return pattern
}

/**
 * Map numeric confidence to legacy string format
 */
function mapConfidenceToLegacy(confidence) {
	if (typeof confidence === 'string') return confidence
	if (confidence >= 0.8) return 'high'
	if (confidence >= 0.5) return 'medium'
	if (confidence >= 0.3) return 'low'
	return 'none'
}

/**
 * Detect address roles based on pattern and graph (PLATFORM-AGNOSTIC)
 *
 * @param {Object} pattern - Pattern result from detectTransactionPattern()
 * @param {Array} decodedLogs - Decoded event logs
 * @param {Array} transfers - Token transfers
 * @param {Object} tx - Transaction metadata
 * @returns {Map} Map of address to role (pool, router, user, intermediary)
 */
export function detectAddressRoles(pattern, decodedLogs = [], transfers = [], tx = null) {
	const roles = new Map()

	if (!pattern || pattern.skip) {
		return roles
	}

	// Build graph for role detection
	const graph = buildTransferGraph(transfers, tx)

	// Use graph-based role detection
	graph.nodes.forEach((node) => {
		const role = getMostLikelyRole(node)

		if (role && role.confidence > 0.3) {
			roles.set(node.address, role.role)
		}
	})

	// Enrich with pattern-specific roles
	if (pattern.pool) {
		roles.set(pattern.pool.toLowerCase(), 'pool')
	}

	if (pattern.router) {
		roles.set(pattern.router.toLowerCase(), 'router')
	}

	if (pattern.user) {
		roles.set(pattern.user.toLowerCase(), 'user')
	}

	// Fallback: If no user role assigned, use tx initiator
	const hasUserRole = Array.from(roles.values()).includes('user')
	if (!hasUserRole && tx?.from?.hash) {
		roles.set(tx.from.hash.toLowerCase(), 'user')
	}

	return roles
}

/**
 * Utility: Get readable pattern description
 */
export function getPatternDescription(pattern) {
	if (!pattern) return null

	const contractName = pattern.contractName || 'Contract'
	const eventType = pattern.eventType || 'Event'

	switch (pattern.type) {
		case 'SWAP':
			if (pattern.router) {
				return `Router-mediated swap via ${contractName}`
			}
			return `Direct swap on ${contractName}`

		case 'MULTIHOP_SWAP':
			return `Multi-hop swap through ${pattern.pools?.length || 2} pools`

		case 'LP_ADD':
			return `Add liquidity to ${contractName}`

		case 'LP_REMOVE':
			return `Remove liquidity from ${contractName}`

		case 'WRAP':
			return 'Wrap/Unwrap tokens'

		case 'NFT_TRANSFER':
			return 'NFT transfer'

		case 'TRANSFER':
			return 'Token transfer'

		default:
			return pattern.contractName ? `${eventType} on ${contractName}` : 'Transaction'
	}
}
