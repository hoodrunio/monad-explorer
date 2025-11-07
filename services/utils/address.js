/**
 * Address utilities for Ethereum addresses
 */

/**
 * Normalize address to lowercase (required by new Indexer API)
 * @param {string} address - Ethereum address
 * @returns {string} Normalized lowercase address
 */
export const normalizeAddress = (address) => {
	if (!address) return address
	return address.toLowerCase()
}

/**
 * Validate Ethereum address format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid format
 */
export const isValidAddress = (address) => {
	if (!address) return false
	return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Validate and normalize address
 * @param {string} address - Address to process
 * @returns {string|null} Normalized address or null if invalid
 */
export const validateAndNormalizeAddress = (address) => {
	if (!isValidAddress(address)) return null
	return normalizeAddress(address)
}

/**
 * Check if address is zero address
 * @param {string} address - Address to check
 * @returns {boolean}
 */
export const isZeroAddress = (address) => {
	if (!address) return false
	const normalized = normalizeAddress(address)
	return normalized === '0x0000000000000000000000000000000000000000'
}

/**
 * Compare two addresses (case-insensitive)
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @returns {boolean} True if addresses are equal
 */
export const addressesEqual = (address1, address2) => {
	if (!address1 || !address2) return false
	return normalizeAddress(address1) === normalizeAddress(address2)
}
