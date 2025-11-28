/**
 * Token Flow Transfer Enhancer (Dynamic Version)
 *
 * Uses contract names and event metadata from indexer instead of hardcoded protocol labels.
 * Enhanced with protocol registry lookup for known protocols.
 * Works with ANY protocol that provides contract metadata.
 */

import { analyzeAddressTransfers } from './tokenFlow'
import { getProtocolInfoSync } from '@/services/api/protocolList'

/**
 * Generate label from protocol registry, contract name, or role
 * Priority: 1. Protocol registry  2. Contract name from indexer  3. Role-based default
 *
 * @param {string} role - Address role (pool, router, user, etc.)
 * @param {Object} pattern - Transaction pattern (includes contractName from indexer)
 * @param {string} address - Contract address for protocol lookup
 * @returns {string} Label for the node
 */
function generateLabel(role, pattern, address = null) {
	// Priority 1: Check protocol registry for known protocols
	if (address) {
		const protocol = getProtocolInfoSync(address)
		if (protocol) {
			// Return protocol name with optional subcategory for context
			return protocol.csubtype
				? `${protocol.name} (${protocol.csubtype})`
				: protocol.name
		}
	}

	// Priority 2: Use contract name from indexer
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
 * Enhanced with protocol registry lookup
 *
 * @param {string} role - Address role (pool, router, user, wmonad, intermediary)
 * @param {Object} pattern - Transaction pattern (includes contractName from indexer)
 * @param {Array} transfers - Transfers for this address
 * @param {string} address - Contract address for protocol lookup
 * @returns {Object} Node type configuration
 */
export function mapRoleToNodeType(role, pattern, transfers, address = null) {
	const analysis = analyzeAddressTransfers(transfers)

	// Icon mapping
	const iconMap = {
		pool: 'droplet',
		router: 'route',
		wmonad: 'package',
		user: 'user',
		intermediary: 'hash',
		recipient: 'user',
		'swap-participant': 'repeat',
	}

	// Get protocol info for this address
	const protocol = address ? getProtocolInfoSync(address) : null

	// Generate dynamic label (with protocol lookup)
	const label = generateLabel(role, pattern, address)

	return {
		type: role,
		role: role,
		icon: iconMap[role] || 'zap',
		label: label, // Dynamic label from protocol registry or indexer!
		operations: analysis.operations || [],
		stats: analysis.stats || { in: 0, out: 0, net: 0 },
		confidence: 'high',
		detectionMethod: protocol ? 'protocol-registry' : 'event',
		pattern: pattern.type,
		contractName: pattern.contractName, // Store for reference
		eventType: pattern.eventType, // Store for reference
		// Protocol metadata (if found in registry)
		protocol: protocol ? {
			name: protocol.name,
			ctype: protocol.ctype,
			csubtype: protocol.csubtype,
		} : null,
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
 * Enhanced with protocol registry lookup
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
	// Priority 1: Event-based detection (DYNAMIC) with protocol registry
	if (pattern && addressRoles?.has(address.toLowerCase())) {
		const role = addressRoles.get(address.toLowerCase())
		return mapRoleToNodeType(role, pattern, transfers, address) // Pass address for protocol lookup
	}

	// Priority 2: Check protocol registry even without event detection
	const protocol = getProtocolInfoSync(address)
	if (protocol) {
		const analysis = analyzeAddressTransfers(transfers)
		return {
			type: 'protocol',
			role: 'protocol',
			icon: 'layers',
			label: protocol.csubtype
				? `${protocol.name} (${protocol.csubtype})`
				: protocol.name,
			operations: analysis.operations || [],
			stats: analysis.stats || { in: 0, out: 0, net: 0 },
			confidence: 'high',
			detectionMethod: 'protocol-registry',
			protocol: {
				name: protocol.name,
				ctype: protocol.ctype,
				csubtype: protocol.csubtype,
			},
		}
	}

	// Priority 3: Heuristic fallback
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
