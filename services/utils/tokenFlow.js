/**
 * Token Flow Utilities
 * Utilities for calculating Sankey diagram layouts and visual properties
 */

import { detectTransactionPattern, detectAddressRoles } from './tokenFlowDetector'
import { assignNodeType as assignNodeTypeEnhanced } from './tokenFlowEnhancer'

/**
 * Generate a unique color based on a hash string
 * @param {string} _hash - Address or token hash (unused, kept for API compatibility)
 * @param {string} tokenType - Token type (ERC-20, ERC-721, ERC-1155)
 * @returns {object} - Color object with base, light, and gradient
 */
export function getColorFromHash(_hash, tokenType = 'ERC-20') {
	// Always use the default color for each token type to match legend
	// This ensures visual consistency
	return getDefaultColorForTokenType(tokenType)
}

/**
 * Get default color palette for token type
 */
function getDefaultColorForTokenType(tokenType) {
	const palettes = {
		'ERC-20': {
			base: '#18d2a5',
			light: '#4de0b8',
			gradient: 'linear-gradient(135deg, #18d2a5, #4de0b8)',
			hue: 167,
			saturation: 79,
			lightness: 46
		},
		'ERC-721': {
			base: '#8b5cf6',
			light: '#a78bfa',
			gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
			hue: 258,
			saturation: 90,
			lightness: 66
		},
		'ERC-1155': {
			base: '#f59e0b',
			light: '#fbbf24',
			gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
			hue: 38,
			saturation: 92,
			lightness: 50
		},
	}
	return palettes[tokenType] || palettes['ERC-20']
}

/**
 * Get burn color palette
 */
function getBurnColor() {
	return {
		base: '#ef4444',
		light: '#f87171',
		gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
		hue: 0,
		saturation: 84,
		lightness: 60
	}
}

/**
 * Get mint color palette
 */
function getMintColor() {
	return {
		base: '#10b981',
		light: '#34d399',
		gradient: 'linear-gradient(135deg, #10b981, #34d399)',
		hue: 142,
		saturation: 76,
		lightness: 39
	}
}

/**
 * Calculate Sankey layout for token transfers
 * @param {Array} transfers - Array of token transfers
 * @param {Array} decodedLogs - Decoded event logs (optional, for event enrichment)
 * @param {Object} tx - Transaction metadata (required for graph analysis)
 * @returns {object} - Layout data with nodes and links
 */
export function calculateSankeyLayout(transfers, decodedLogs = [], tx = null) {
	if (!transfers || transfers.length === 0) {
		return { nodes: [], links: [] }
	}

	// Graph-based pattern detection (platform-agnostic)
	const pattern = detectTransactionPattern(decodedLogs, transfers, tx)
	const addressRoles = detectAddressRoles(pattern, decodedLogs, transfers, tx)

	// No longer skip NFT or unknown transactions - visualize everything

	// Extract unique addresses (nodes)
	const addressMap = new Map()
	const links = []

	transfers.forEach((transfer, idx) => {
		const fromAddr = transfer.from?.hash || transfer.from
		const toAddr = transfer.to?.hash || transfer.to
		const fromName = transfer.from?.name || null
		const toName = transfer.to?.name || null
		const tokenAddr = transfer.token?.address_hash
		const tokenSymbol = transfer.token?.symbol || 'Token'
		const tokenType = transfer.token?.type || 'ERC-20'
		const value = transfer.total?.value || transfer.value || '0'

		// Add from address
		if (!addressMap.has(fromAddr)) {
			addressMap.set(fromAddr, {
				id: fromAddr,
				address: fromAddr,
				name: fromName,
				type: 'address',
				nodeType: null, // Will be calculated later
				transfers: [],
				isBurn: isBurnAddress(fromAddr),
			})
		} else if (fromName && !addressMap.get(fromAddr).name) {
			// Update name if we didn't have it before
			addressMap.get(fromAddr).name = fromName
		}
		addressMap.get(fromAddr).transfers.push({ direction: 'out', transfer })

		// Add to address
		if (!addressMap.has(toAddr)) {
			addressMap.set(toAddr, {
				id: toAddr,
				address: toAddr,
				name: toName,
				type: 'address',
				nodeType: null, // Will be calculated later
				transfers: [],
				isBurn: isBurnAddress(toAddr),
			})
		} else if (toName && !addressMap.get(toAddr).name) {
			// Update name if we didn't have it before
			addressMap.get(toAddr).name = toName
		}
		addressMap.get(toAddr).transfers.push({ direction: 'in', transfer })

		// Determine link color based on transfer type
		let linkColor
		let transferType = transfer.type

		if (transferType === 'token_burning') {
			linkColor = getBurnColor()
		} else if (transferType === 'token_minting') {
			linkColor = getMintColor()
		} else {
			linkColor = getColorFromHash(tokenAddr, tokenType)
		}

		// Create link
		links.push({
			id: `link-${idx}`,
			source: fromAddr,
			target: toAddr,
			value: parseFloat(value) || 1,
			transfer,
			token: {
				address: tokenAddr,
				symbol: tokenSymbol,
				type: tokenType,
			},
			color: linkColor,
			transferType: transferType, // 'token_transfer', 'token_burning', 'token_minting'
			isBurn: transferType === 'token_burning',
			isMint: transferType === 'token_minting',
		})
	})

	// Convert map to array
	const nodes = Array.from(addressMap.values())

	// Detect swap pattern: 2 nodes, each has exactly 1 in and 1 out, to/from each other
	const isSwapPattern = nodes.length === 2 &&
		nodes.every(n => {
			const hasIn = n.transfers.some(t => t.direction === 'in')
			const hasOut = n.transfers.some(t => t.direction === 'out')
			return hasIn && hasOut
		})

	// Calculate node types with event-based detection (Priority 1) or heuristic fallback (Priority 2)
	nodes.forEach((node) => {
		node.nodeType = assignNodeTypeEnhanced(
			node.address,
			node.transfers,
			isSwapPattern,
			pattern, // Event-based pattern (Priority 1)
			addressRoles, // Event-based roles (Priority 1)
			(addr, xfers, isSwap) => getNodeType(addr, xfers, isSwap) // Heuristic fallback (Priority 2)
		)
		node.pattern = pattern // Store pattern for visualization
	})

	// Calculate vertical positions
	const nodeHeight = 60
	const nodeSpacing = 20
	const columnWidth = 250

	let totalWidth, totalHeight

	// Special layout for swap pattern (2 nodes exchanging tokens)
	if (isSwapPattern) {
		// Position nodes horizontally side by side
		nodes[0].x = 0
		nodes[0].y = 100
		nodes[0].height = nodeHeight
		nodes[0].column = 0

		nodes[1].x = columnWidth
		nodes[1].y = 100
		nodes[1].height = nodeHeight
		nodes[1].column = 1

		totalWidth = columnWidth * 2
		totalHeight = nodeHeight + nodeSpacing * 2
	} else {
		// Separate nodes into columns (layers)
		// Column 0: Only senders, Column 1: Only receivers, Column 2: Both
		const onlySenders = nodes.filter(
			(n) => n.transfers.every((t) => t.direction === 'out') && n.transfers.some((t) => t.direction === 'out')
		)
		const onlyReceivers = nodes.filter(
			(n) => n.transfers.every((t) => t.direction === 'in') && n.transfers.some((t) => t.direction === 'in')
		)
		const both = nodes.filter(
			(n) => n.transfers.some((t) => t.direction === 'in') && n.transfers.some((t) => t.direction === 'out')
		)

		let yOffset = 0

		// Position left column (senders)
		onlySenders.forEach((node) => {
			node.x = 0
			node.y = yOffset
			node.height = nodeHeight
			node.column = 0
			yOffset += nodeHeight + nodeSpacing
		})

		// Position middle column (intermediaries)
		yOffset = 0
		both.forEach((node) => {
			node.x = columnWidth
			node.y = yOffset
			node.height = nodeHeight
			node.column = 1
			yOffset += nodeHeight + nodeSpacing
		})

		// Position right column (receivers)
		yOffset = 0
		onlyReceivers.forEach((node) => {
			node.x = both.length > 0 ? columnWidth * 2 : columnWidth
			node.y = yOffset
			node.height = nodeHeight
			node.column = both.length > 0 ? 2 : 1
			yOffset += nodeHeight + nodeSpacing
		})

		// Calculate total dimensions
		totalWidth = (both.length > 0 ? 3 : 2) * columnWidth
		totalHeight = Math.max(
			onlySenders.length * (nodeHeight + nodeSpacing),
			both.length * (nodeHeight + nodeSpacing),
			onlyReceivers.length * (nodeHeight + nodeSpacing)
		)
	}

	return {
		nodes,
		links,
		width: totalWidth,
		height: Math.max(totalHeight, 200),
		isSwapPattern, // Include swap pattern flag for rendering
		pattern, // Include detected pattern
	}
}

/**
 * Calculate SVG path for a link between nodes
 * @param {object} link - Link object with source and target
 * @param {Map} nodeMap - Map of node IDs to node objects
 * @param {boolean} isSwapPattern - Whether this is a swap pattern (for bidirectional offset)
 * @param {number} linkIndex - Index of this link (for determining which direction to curve)
 * @returns {string} - SVG path string
 */
export function calculateLinkPath(link, nodeMap, isSwapPattern = false, linkIndex = 0) {
	const sourceNode = nodeMap.get(link.source)
	const targetNode = nodeMap.get(link.target)

	if (!sourceNode || !targetNode) {
		return ''
	}

	// Calculate connection points
	const x1 = sourceNode.x + 200 // Right edge of source node
	const y1 = sourceNode.y + sourceNode.height / 2
	const x2 = targetNode.x // Left edge of target node
	const y2 = targetNode.y + targetNode.height / 2

	// Calculate control points for smooth curve
	const controlPointOffset = Math.abs(x2 - x1) / 2

	// For swap patterns, offset paths vertically to show both directions
	if (isSwapPattern) {
		// Alternate between top and bottom curves
		// First link curves above, second link curves below
		const curveOffset = linkIndex === 0 ? -20 : 20

		// Create cubic bezier curve with vertical offset
		const midY1 = y1 + curveOffset
		const midY2 = y2 + curveOffset

		return `M ${x1} ${y1} C ${x1 + controlPointOffset} ${midY1}, ${x2 - controlPointOffset} ${midY2}, ${x2} ${y2}`
	}

	// Create cubic bezier curve (standard)
	return `M ${x1} ${y1} C ${x1 + controlPointOffset} ${y1}, ${x2 - controlPointOffset} ${y2}, ${x2} ${y2}`
}

/**
 * Format token amount with proper decimals
 * @param {string|number} value - Token value (raw, needs to be divided by 10^decimals)
 * @param {number} decimals - Token decimals (e.g., 6 for USDC, 18 for most tokens)
 * @param {number} displayDecimals - Number of decimals to display
 * @returns {string} - Formatted value
 */
export function formatTokenAmount(value, decimals = 18, displayDecimals = 4) {
	if (!value || value === '0') return '0'

	try {
		const numValue = typeof value === 'string' ? parseFloat(value) : value
		if (isNaN(numValue)) return '0'

		// Handle null/undefined decimals (common for ERC-721/1155)
		// If decimals is null, 0, or NaN, treat as NFT/Game Item (no division needed)
		const actualDecimals = decimals == null || isNaN(decimals) || decimals === 0 ? 0 : parseInt(decimals)

		// If no decimals (NFT/ERC-721/1155), return raw value
		if (actualDecimals === 0) {
			return numValue.toLocaleString('en-US', {
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			})
		}

		// Always divide by 10^decimals to convert from raw value to token units
		// Example: 574748 / 10^6 = 0.574748 USDC
		const tokenValue = numValue / Math.pow(10, actualDecimals)

		// Format with appropriate decimals
		// Use more decimals for very small values
		if (tokenValue < 0.0001 && tokenValue > 0) {
			return tokenValue.toExponential(2) // Scientific notation for very small values
		}

		return tokenValue.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: displayDecimals,
		})
	} catch (e) {
		return '0'
	}
}

/**
 * Get token icon URL or fallback
 * @param {object} token - Token object
 * @returns {string|null} - Icon URL or null
 */
export function getTokenIcon(token) {
	if (!token) return null
	return token.icon_url || token.iconUrl || null
}

/**
 * Check if address is a burn address
 * @param {string} address - Address to check
 * @returns {boolean} - True if burn address
 */
export function isBurnAddress(address) {
	if (!address) return false
	const cleanAddr = address.toLowerCase()
	// Check for zero address or common burn addresses
	return cleanAddr === '0x0000000000000000000000000000000000000000' ||
		cleanAddr === '0x000000000000000000000000000000000000dead'
}

/**
 * Analyze address transfers to get detailed statistics
 * Exported for use in tokenFlowEnhancer
 * @param {Array} transfers - Transfer array with direction and transfer object
 * @returns {object} - Analysis with stats and flags
 */
export function analyzeAddressTransfers(transfers) {
	return analyzeTransfers(transfers)
}

/**
 * Analyze transfers to get detailed statistics (internal)
 * @param {Array} transfers - Transfer array with direction and transfer object
 * @returns {object} - Analysis with stats and flags
 */
function analyzeTransfers(transfers) {
	const stats = {
		in: { mint: 0, burn: 0, normal: 0 },
		out: { mint: 0, burn: 0, normal: 0 }
	}

	transfers.forEach(t => {
		const type = t.transfer.type
		const direction = t.direction

		if (type === 'token_minting') {
			stats[direction].mint++
		} else if (type === 'token_burning') {
			stats[direction].burn++
		} else {
			stats[direction].normal++
		}
	})

	return {
		hasIncoming: transfers.some(t => t.direction === 'in'),
		hasOutgoing: transfers.some(t => t.direction === 'out'),
		hasMintTransfers: stats.in.mint > 0 || stats.out.mint > 0,
		hasBurnTransfers: stats.in.burn > 0 || stats.out.burn > 0,
		hasNormalTransfers: stats.in.normal > 0 || stats.out.normal > 0,
		stats: stats
	}
}

/**
 * Get node type based on address and transfers
 * @param {string} address - Address
 * @param {Array} transfers - Transfer array
 * @param {boolean} isSwapParticipant - Whether this node is part of a swap pattern
 * @returns {object} - Node type object with type, role, operations, and stats
 */
export function getNodeType(address, transfers, isSwapParticipant = false) {
	// Analyze transfer patterns
	const analysis = analyzeTransfers(transfers)

	// PRIORITY 1: Zero address detection (burn/mint infrastructure)
	if (isBurnAddress(address)) {
		return {
			type: 'burn',
			role: 'burn-destination',
			operations: [],
			stats: analysis.stats
		}
	}

	// PRIORITY 2: Determine operations participated in
	const operations = []
	if (analysis.hasMintTransfers) operations.push('mint')
	if (analysis.hasBurnTransfers) operations.push('burn')
	if (analysis.hasNormalTransfers) operations.push('transfer')

	// PRIORITY 3: Determine role based on flow pattern
	const hasIn = analysis.hasIncoming
	const hasOut = analysis.hasOutgoing

	let role, type

	if (hasIn && hasOut) {
		// If part of swap pattern, use special role
		if (isSwapParticipant) {
			role = 'swap-participant'
			type = 'swap'
		} else {
			// Intermediary - both incoming and outgoing
			role = 'intermediary'
			type = 'intermediary'
		}
	} else if (hasOut) {
		// Only outgoing
		// Check if ONLY burning transfers (no normal transfers)
		if (analysis.hasBurnTransfers && !analysis.hasNormalTransfers) {
			role = 'burn-initiator'
			type = 'sender'
		} else {
			role = 'sender'
			type = 'sender'
		}
	} else {
		// Only incoming
		// Check if ONLY minting transfers (no normal transfers)
		if (analysis.hasMintTransfers && !analysis.hasNormalTransfers) {
			role = 'mint-recipient'
			type = 'receiver'
		} else {
			role = 'receiver'
			type = 'receiver'
		}
	}

	return {
		type: type,           // Base flow pattern: 'sender', 'receiver', 'intermediary', 'swap'
		role: role,           // Specific role: 'burn-initiator', 'mint-recipient', 'swap-participant', etc.
		operations: operations, // Operations participated: ['mint', 'burn', 'transfer']
		stats: analysis.stats   // Detailed statistics
	}
}

/**
 * Truncate address for display
 * @param {string} address - Full address
 * @param {number} startChars - Characters to show at start
 * @param {number} endChars - Characters to show at end
 * @returns {string} - Truncated address
 */
export function truncateAddress(address, startChars = 6, endChars = 4) {
	if (!address || address.length <= startChars + endChars) {
		return address
	}

	// Special handling for burn address
	if (isBurnAddress(address)) {
		return 'Burn Address'
	}

	return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}
