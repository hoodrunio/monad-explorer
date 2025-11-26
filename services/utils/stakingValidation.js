/**
 * Staking Validation Utilities
 * Centralized validation functions for staking operations
 * Following DRY principles - used by both StakingService.js and staking.js API
 */

import { isAddress, getAddress, parseEther } from 'viem'

/**
 * Security constants for input validation
 */
export const VALIDATION_CONSTANTS = {
	UINT64_MAX: BigInt('18446744073709551615'),  // 2^64 - 1
	UINT8_MAX: 255,
	JS_SAFE_INTEGER_MAX: Number.MAX_SAFE_INTEGER,
}

/**
 * Validates and normalizes an Ethereum address
 * Uses viem for proper checksum validation
 * @param {string} address - Address to validate
 * @returns {string} - Checksummed address
 * @throws {Error} - If address is invalid
 */
export function validateAddress(address) {
	if (!address || typeof address !== 'string') {
		throw new Error('Address is required')
	}

	const trimmedAddress = address.trim()

	if (!isAddress(trimmedAddress)) {
		throw new Error('Invalid Ethereum address format')
	}

	// Return checksummed address
	return getAddress(trimmedAddress)
}

/**
 * Validates and converts valId to a safe BigInt for contract calls
 * Ensures valId is within uint64 bounds (0 to 2^64-1)
 * @param {number|string|BigInt} valId - Validator ID to validate
 * @returns {bigint} - Validated valId as BigInt
 * @throws {Error} - If valId is invalid or out of bounds
 */
export function validateValId(valId) {
	if (valId === null || valId === undefined) {
		throw new Error('Validator ID is required')
	}

	let valIdBigInt
	try {
		valIdBigInt = BigInt(valId)
	} catch {
		throw new Error('Invalid validator ID format')
	}

	if (valIdBigInt < 0n) {
		throw new Error('Validator ID cannot be negative')
	}

	if (valIdBigInt > VALIDATION_CONSTANTS.UINT64_MAX) {
		throw new Error('Validator ID exceeds maximum allowed value')
	}

	return valIdBigInt
}

/**
 * Validates withdrawId is within uint8 bounds (0-255)
 * @param {number|string} withdrawId - Withdrawal ID to validate
 * @returns {number} - Validated withdrawId
 * @throws {Error} - If withdrawId is invalid or out of bounds
 */
export function validateWithdrawId(withdrawId) {
	if (withdrawId === null || withdrawId === undefined) {
		throw new Error('Withdrawal ID is required')
	}

	const withdrawIdNum = Number(withdrawId)

	if (!Number.isInteger(withdrawIdNum)) {
		throw new Error('Withdrawal ID must be an integer')
	}

	if (withdrawIdNum < 0) {
		throw new Error('Withdrawal ID cannot be negative')
	}

	if (withdrawIdNum > VALIDATION_CONSTANTS.UINT8_MAX) {
		throw new Error(`Withdrawal ID exceeds maximum allowed value (${VALIDATION_CONSTANTS.UINT8_MAX}). Please contact support.`)
	}

	return withdrawIdNum
}

/**
 * Validates amount string for staking operations
 * @param {string|number} amount - Amount to validate
 * @returns {string} - Validated amount as string
 * @throws {Error} - If amount is invalid
 */
export function validateAmount(amount) {
	if (amount === null || amount === undefined || amount === '') {
		throw new Error('Amount is required')
	}

	const amountStr = amount.toString().trim()

	// Check for valid number format (allows decimals)
	if (!/^[0-9]*\.?[0-9]+$/.test(amountStr)) {
		throw new Error('Invalid amount format')
	}

	const numAmount = parseFloat(amountStr)
	if (isNaN(numAmount) || numAmount <= 0) {
		throw new Error('Amount must be greater than zero')
	}

	return amountStr
}

/**
 * Safely parses an amount string to wei (BigInt)
 * Returns null if parsing fails - useful for validation without throwing
 * @param {string} amount - Amount string (e.g., "1.5")
 * @returns {BigInt|null} - Amount in wei or null if invalid
 */
export function safeParseEther(amount) {
	try {
		if (!amount || typeof amount !== 'string') {
			return null
		}
		// Validate format first - only allow valid decimal numbers
		if (!/^[0-9]*\.?[0-9]+$/.test(amount.trim())) {
			return null
		}
		return parseEther(amount.trim())
	} catch {
		return null
	}
}

/**
 * Validates stake/unstake amount against balance using BigInt for precision
 * @param {string} amount - Amount to validate
 * @param {string} maxBalance - Maximum available balance
 * @param {string} minAmount - Minimum required amount (default: '0.001')
 * @returns {string[]} - Array of error messages (empty if valid)
 */
export function validateStakingAmount(amount, maxBalance, minAmount = '0.001') {
	const errors = []

	if (!amount || amount.toString().trim() === '') {
		errors.push('Amount is required')
		return errors
	}

	const amountStr = amount.toString().trim()

	// Parse amounts to wei (BigInt) for precise comparison
	const amountWei = safeParseEther(amountStr)
	const maxWei = safeParseEther(maxBalance?.toString() || '0')
	const minWei = safeParseEther(minAmount)

	if (amountWei === null || amountWei <= 0n) {
		errors.push('Invalid amount')
	} else if (minWei !== null && amountWei < minWei) {
		errors.push(`Minimum amount is ${minAmount} MON`)
	} else if (maxWei !== null && amountWei > maxWei) {
		errors.push('Insufficient balance')
	}

	return errors
}
