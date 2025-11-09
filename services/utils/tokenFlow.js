/**
 * Token Flow Utilities
 * Utilities for calculating Sankey diagram layouts and visual properties
 */

/**
 * Generate a unique color based on a hash string
 * @param {string} hash - Address or token hash
 * @param {string} tokenType - Token type (ERC-20, ERC-721, ERC-1155)
 * @returns {object} - Color object with base, light, and gradient
 */
export function getColorFromHash(hash, tokenType = 'ERC-20') {
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
 * Calculate Sankey layout for token transfers
 * @param {Array} transfers - Array of token transfers
 * @returns {object} - Layout data with nodes and links
 */
export function calculateSankeyLayout(transfers) {
	if (!transfers || transfers.length === 0) {
		return { nodes: [], links: [] }
	}

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

		// Check if this is a burn transfer
		const isBurnTransfer = isBurnAddress(toAddr)

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
			color: isBurnTransfer ? getBurnColor() : getColorFromHash(tokenAddr, tokenType),
			isBurn: isBurnTransfer,
		})
	})

	// Convert map to array and calculate node types
	const nodes = Array.from(addressMap.values())

	// Calculate node types
	nodes.forEach(node => {
		node.nodeType = getNodeType(node.address, node.transfers)
	})

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

	// Calculate vertical positions
	const nodeHeight = 60
	const nodeSpacing = 20
	const columnWidth = 250

	let yOffset = 0

	// Position left column (senders)
	onlySenders.forEach((node, idx) => {
		node.x = 0
		node.y = yOffset
		node.height = nodeHeight
		node.column = 0
		yOffset += nodeHeight + nodeSpacing
	})

	// Position middle column (intermediaries)
	yOffset = 0
	both.forEach((node, idx) => {
		node.x = columnWidth
		node.y = yOffset
		node.height = nodeHeight
		node.column = 1
		yOffset += nodeHeight + nodeSpacing
	})

	// Position right column (receivers)
	yOffset = 0
	onlyReceivers.forEach((node, idx) => {
		node.x = both.length > 0 ? columnWidth * 2 : columnWidth
		node.y = yOffset
		node.height = nodeHeight
		node.column = both.length > 0 ? 2 : 1
		yOffset += nodeHeight + nodeSpacing
	})

	// Calculate total dimensions
	const totalWidth = (both.length > 0 ? 3 : 2) * columnWidth
	const totalHeight = Math.max(
		onlySenders.length * (nodeHeight + nodeSpacing),
		both.length * (nodeHeight + nodeSpacing),
		onlyReceivers.length * (nodeHeight + nodeSpacing)
	)

	return {
		nodes,
		links,
		width: totalWidth,
		height: Math.max(totalHeight, 200),
	}
}

/**
 * Calculate SVG path for a link between nodes
 * @param {object} link - Link object with source and target
 * @param {Map} nodeMap - Map of node IDs to node objects
 * @returns {string} - SVG path string
 */
export function calculateLinkPath(link, nodeMap) {
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

	// Create cubic bezier curve
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

		// Always divide by 10^decimals to convert from raw value to token units
		// Example: 574748 / 10^6 = 0.574748 USDC
		const tokenValue = numValue / Math.pow(10, decimals)

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
 * Get node type based on address and transfers
 * @param {string} address - Address
 * @param {Array} transfers - Transfer array
 * @returns {string} - Node type
 */
export function getNodeType(address, transfers) {
	if (isBurnAddress(address)) return 'burn'

	const hasIn = transfers.some(t => t.direction === 'in')
	const hasOut = transfers.some(t => t.direction === 'out')

	if (hasIn && hasOut) return 'intermediary'
	if (hasOut) return 'sender'
	return 'receiver'
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
