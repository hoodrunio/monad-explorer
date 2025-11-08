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
	if (!hash) {
		return getDefaultColorForTokenType(tokenType)
	}

	// Use hash to generate a consistent color
	let hashNum = 0
	for (let i = 0; i < Math.min(hash.length, 10); i++) {
		hashNum += hash.charCodeAt(i)
	}

	// Base hue on token type for consistency
	const typeHueOffset = {
		'ERC-20': 0,
		'ERC-721': 120,
		'ERC-1155': 240,
	}

	const baseHue = (hashNum % 360 + (typeHueOffset[tokenType] || 0)) % 360
	const saturation = 65 + (hashNum % 20)
	const lightness = 55 + (hashNum % 15)

	return {
		base: `hsl(${baseHue}, ${saturation}%, ${lightness}%)`,
		light: `hsl(${baseHue}, ${saturation}%, ${lightness + 15}%)`,
		gradient: `linear-gradient(135deg, hsl(${baseHue}, ${saturation}%, ${lightness}%), hsl(${(baseHue + 30) % 360}, ${saturation}%, ${lightness + 10}%))`,
		hue: baseHue,
		saturation,
		lightness,
	}
}

/**
 * Get default color palette for token type
 */
function getDefaultColorForTokenType(tokenType) {
	const palettes = {
		'ERC-20': { base: '#18d2a5', light: '#4de0b8', gradient: 'linear-gradient(135deg, #18d2a5, #4de0b8)' },
		'ERC-721': { base: '#8b5cf6', light: '#a78bfa', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
		'ERC-1155': { base: '#f59e0b', light: '#fbbf24', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
	}
	return palettes[tokenType] || palettes['ERC-20']
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
		const tokenAddr = transfer.token?.address_hash
		const tokenSymbol = transfer.token?.symbol || 'Token'
		const tokenType = transfer.token?.type || 'ERC-20'
		const value = transfer.total?.value || transfer.value || '0'

		// Add from address
		if (!addressMap.has(fromAddr)) {
			addressMap.set(fromAddr, {
				id: fromAddr,
				address: fromAddr,
				type: 'address',
				transfers: [],
			})
		}
		addressMap.get(fromAddr).transfers.push({ direction: 'out', transfer })

		// Add to address
		if (!addressMap.has(toAddr)) {
			addressMap.set(toAddr, {
				id: toAddr,
				address: toAddr,
				type: 'address',
				transfers: [],
			})
		}
		addressMap.get(toAddr).transfers.push({ direction: 'in', transfer })

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
			color: getColorFromHash(tokenAddr, tokenType),
		})
	})

	// Convert map to array and calculate positions
	const nodes = Array.from(addressMap.values())

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
 * @param {string|number} value - Token value
 * @param {number} decimals - Token decimals
 * @param {number} displayDecimals - Number of decimals to display
 * @returns {string} - Formatted value
 */
export function formatTokenAmount(value, decimals = 18, displayDecimals = 4) {
	if (!value || value === '0') return '0'

	try {
		const numValue = typeof value === 'string' ? parseFloat(value) : value
		if (isNaN(numValue)) return '0'

		// If value is already in token units (not wei)
		if (numValue < 1000000) {
			return numValue.toFixed(displayDecimals)
		}

		// Convert from wei to token units
		const tokenValue = numValue / Math.pow(10, decimals)
		return tokenValue.toFixed(displayDecimals)
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
	return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}
