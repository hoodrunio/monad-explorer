/**
 * Token Flow Transfer Enhancer (Dynamic Version)
 *
 * Uses contract names and event metadata from indexer instead of hardcoded protocol labels.
 * Works with ANY protocol that provides contract metadata.
 */

import { analyzeAddressTransfers } from './tokenFlow'

/**
 * Generate label from contract name and role
 */
function generateLabel(role, pattern) {
	const contractName = pattern.contractName

	switch (role) {
		case 'pool':
			// Use contract name if available, otherwise generic "Pool"
			return contractName || 'Pool'

		case 'router':
			// Router is usually not the event emitter, so generic label
			return 'Router'

		case 'wmonad':
			// WMONAD is always the same contract
			return 'WMONAD'

		case 'user':
			return 'User'

		case 'intermediary':
			return 'Intermediary'

		default:
			return 'Address'
	}
}

/**
 * Map address role to node type configuration (DYNAMIC)
 *
 * @param {string} role - Address role (pool, router, user, wmonad, intermediary)
 * @param {Object} pattern - Transaction pattern (includes contractName from indexer)
 * @param {Array} transfers - Transfers for this address
 * @returns {Object} Node type configuration
 */
export function mapRoleToNodeType(role, pattern, transfers) {
	const analysis = analyzeAddressTransfers(transfers)

	// Icon mapping
	const iconMap = {
		pool: 'droplet',
		router: 'route',
		wmonad: 'package',
		user: 'user',
		intermediary: 'hash',
	}

	// Generate dynamic label
	const label = generateLabel(role, pattern)
	return {
		type: role,
		role: role,
		icon: iconMap[role] || 'zap',
		label: label, // Dynamic label from indexer!
		operations: analysis.operations || [],
		stats: analysis.stats || { in: 0, out: 0, net: 0 },
		confidence: 'high',
		detectionMethod: 'event',
		pattern: pattern.type,
		contractName: pattern.contractName, // Store for reference
		eventType: pattern.eventType, // Store for reference
	}
}

/**
 * Classify a single transfer based on pattern and roles
 *
 * @param {Object} transfer - Transfer data
 * @param {Object} pattern - Transaction pattern
 * @param {Map} addressRoles - Map of address to role
 * @returns {Object} Classification result
 */
export function classifyTransfer(transfer, pattern, addressRoles) {
	const fromAddr = transfer.from?.hash?.toLowerCase()
	const toAddr = transfer.to?.hash?.toLowerCase()

	const fromRole = addressRoles.get(fromAddr)
	const toRole = addressRoles.get(toAddr)

	return {
		fromRole,
		toRole,
		isPool: fromRole === 'pool' || toRole === 'pool',
		isRouter: fromRole === 'router' || toRole === 'router',
		isWrap: fromRole === 'wmonad' || toRole === 'wmonad',
		isUser: fromRole === 'user' || toRole === 'user',
		patternType: pattern.type,
	}
}

/**
 * Enhance transfers with pattern context
 *
 * @param {Array} transfers - Original transfers
 * @param {Object} pattern - Transaction pattern
 * @param {Map} addressRoles - Map of address to role
 * @returns {Array} Enhanced transfers
 */
export function enhanceTransfers(transfers, pattern, addressRoles) {
	return transfers.map((transfer) => {
		const classification = classifyTransfer(transfer, pattern, addressRoles)

		return {
			...transfer,
			classification,
			pattern: pattern.type,
			contractName: pattern.contractName,
			eventType: pattern.eventType,
		}
	})
}

/**
 * Assign node type with event-based detection (Priority 1) or heuristic fallback (Priority 2)
 *
 * @param {string} address - Address to classify
 * @param {Array} transfers - Transfers for this address
 * @param {boolean} isSwapParticipant - Whether address participates in swap pattern
 * @param {Object} pattern - Transaction pattern (from event detection)
 * @param {Map} addressRoles - Map of address to role (from event detection)
 * @param {Function} heuristicFallback - Fallback function for heuristic detection
 * @returns {Object} Node type configuration
 */
export function assignNodeType(
	address,
	transfers,
	isSwapParticipant,
	pattern = null,
	addressRoles = null,
	heuristicFallback = null
) {
	// Priority 1: Event-based detection (DYNAMIC)
	if (pattern && addressRoles?.has(address.toLowerCase())) {
		const role = addressRoles.get(address.toLowerCase())
		return mapRoleToNodeType(role, pattern, transfers)
	}

	// Priority 2: Heuristic fallback
	if (heuristicFallback && typeof heuristicFallback === 'function') {
		const heuristicResult = heuristicFallback(address, transfers, isSwapParticipant)
		return {
			...heuristicResult,
			confidence: 'low',
			detectionMethod: 'heuristic',
		}
	}

	// Default fallback
	const analysis = analyzeAddressTransfers(transfers)
	return {
		type: 'user',
		role: 'user',
		icon: 'user',
		label: 'User',
		operations: analysis.operations || [],
		stats: analysis.stats || { in: 0, out: 0, net: 0 },
		confidence: 'none',
		detectionMethod: 'default',
	}
}
