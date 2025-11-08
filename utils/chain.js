/**
 * Chain utility functions for working with chain IDs and network validation
 * Eliminates code duplication for chain ID conversions
 */

/**
 * Normalizes a chain ID to a number
 * Handles both hex string and numeric chain IDs
 * @param {string|number} chainId - Chain ID in hex string or number format
 * @returns {number} Normalized chain ID as a number
 */
export function normalizeChainId(chainId) {
	if (typeof chainId === 'string') {
		// Remove '0x' prefix if present and parse as hex
		return parseInt(chainId.replace('0x', ''), 16)
	}
	return chainId
}

/**
 * Converts a chain ID to hexadecimal format
 * @param {number} chainId - Chain ID as a number
 * @returns {string} Chain ID in hex format with '0x' prefix
 */
export function toHexChainId(chainId) {
	return `0x${chainId.toString(16)}`
}

/**
 * Checks if the current chain ID matches the target chain ID
 * Handles both hex string and numeric chain IDs
 * @param {string|number} currentChainId - Current chain ID
 * @param {number} targetChainId - Target chain ID to compare against
 * @returns {boolean} True if chain IDs match
 */
export function isCorrectNetwork(currentChainId, targetChainId) {
	if (!currentChainId) return false
	return normalizeChainId(currentChainId) === targetChainId
}

/**
 * Formats chain parameters for wallet_addEthereumChain RPC call
 * @param {Object} chain - Chain configuration object
 * @param {number} chain.id - Chain ID
 * @param {string} chain.name - Chain name
 * @param {Object} chain.nativeCurrency - Native currency config
 * @param {Object} chain.rpcUrls - RPC URLs config
 * @param {Object} chain.blockExplorers - Block explorer config
 * @returns {Object} Formatted chain parameters for RPC call
 */
export function formatChainParams(chain) {
	return {
		chainId: toHexChainId(chain.id),
		chainName: chain.name,
		nativeCurrency: chain.nativeCurrency,
		rpcUrls: [chain.rpcUrls.default.http[0]],
		blockExplorerUrls: [chain.blockExplorers?.default?.url].filter(Boolean),
	}
}

/**
 * Gets a human-readable chain name by ID
 * @param {number} chainId - Chain ID
 * @returns {string} Chain name or 'Unknown Network'
 */
export function getChainName(chainId) {
	const chains = {
		10143: 'Monad Testnet',
		// Add more as needed
	}
	return chains[chainId] || 'Unknown Network'
}
