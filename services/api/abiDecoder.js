/**
 * ABI-based transaction decoder service
 * Uses local ABI files to decode function calls when method signatures match
 */

import { Interface } from 'ethers'

/**
 * Cache for loaded ABI interfaces to avoid repeated parsing
 */
const abiInterfaceCache = new Map()

/**
 * Load and cache ABI interface from JSON file
 * @param {string} abiPath - Path to ABI JSON file (relative to public directory)
 * @returns {Promise<Interface|null>} Ethers Interface object or null if failed
 */
export const loadAbiInterface = async (abiPath) => {
	if (abiInterfaceCache.has(abiPath)) {
		return abiInterfaceCache.get(abiPath)
	}

	try {
		const response = await fetch(abiPath)
		if (!response.ok) {
			return null
		}

		const abiJson = await response.json()
		const contractInterface = new Interface(abiJson)
		
		// Cache the interface
		abiInterfaceCache.set(abiPath, contractInterface)
		
		return contractInterface
	} catch (error) {
		return null
	}
}

/**
 * Get function signature from method ID using ABI
 * @param {string} methodId - The method ID (first 4 bytes, e.g., "0x395ea61b")
 * @param {string} abiPath - Path to ABI JSON file
 * @returns {Promise<{signature: string, fragment: object}|null>} Function signature and fragment or null
 */
export const getAbiSignature = async (methodId, abiPath) => {
	const contractInterface = await loadAbiInterface(abiPath)
	if (!contractInterface) {
		return null
	}

	try {
		// Find function fragment by selector (method ID)
		const fragment = contractInterface.getFunction(methodId)
		if (!fragment) {
			return null
		}

		// Generate signature from fragment
		const signature = contractInterface.getFunction(fragment.name).format('sighash')
		
		return {
			signature,
			fragment
		}
	} catch (error) {
		// Method ID not found in ABI
		return null
	}
}

/**
 * Decode function call data using ABI
 * @param {string} inputData - Complete transaction input data (0x + method ID + parameters)
 * @param {string} abiPath - Path to ABI JSON file
 * @returns {Promise<{methodName: string, signature: string, decodedParams: Array, fragment: object}|null>}
 */
export const decodeWithAbi = async (inputData, abiPath) => {
	if (!inputData || inputData === '0x' || inputData.length < 10) {
		return null
	}

	const contractInterface = await loadAbiInterface(abiPath)
	if (!contractInterface) {
		return null
	}

	try {
		// Parse the transaction data
		const parsedTransaction = contractInterface.parseTransaction({ data: inputData })
		
		if (!parsedTransaction) {
			return null
		}

		// Extract decoded parameters with their names and types
		const decodedParams = parsedTransaction.fragment.inputs.map((input, index) => ({
			name: input.name,
			type: input.type,
			value: parsedTransaction.args[index],
			formattedValue: formatParameterValue(parsedTransaction.args[index], input.type)
		}))

		return {
			methodName: parsedTransaction.name,
			signature: parsedTransaction.signature,
			decodedParams,
			fragment: parsedTransaction.fragment
		}
	} catch (error) {
		return null
	}
}

/**
 * Format parameter value for display based on its type
 * @param {any} value - The parameter value
 * @param {string} type - The parameter type
 * @returns {string} Formatted value
 */
const formatParameterValue = (value, type) => {
	try {
		if (type.startsWith('uint') || type.startsWith('int')) {
			// For integers, show both decimal and hex
			return {
				decimal: value.toString(),
				hex: `0x${value.toString(16)}`
			}
		} else if (type === 'address') {
			// Addresses are already formatted
			return value.toString()
		} else if (type === 'bool') {
			return value.toString()
		} else if (type === 'bytes' || type.startsWith('bytes')) {
			// For bytes, show hex representation
			return value.toString()
		} else if (type === 'string') {
			return value.toString()
		} else if (type.endsWith('[]')) {
			// For arrays, format each element
			return value.map((item, index) => `[${index}]: ${item.toString()}`).join(', ')
		} else {
			// Default fallback
			return value.toString()
		}
	} catch (error) {
		return value.toString()
	}
}

/**
 * Check if a method ID exists in the given ABI
 * @param {string} methodId - The method ID to check
 * @param {string} abiPath - Path to ABI JSON file
 * @returns {Promise<boolean>} True if method exists in ABI
 */
export const hasAbiMethod = async (methodId, abiPath) => {
	const result = await getAbiSignature(methodId, abiPath)
	return result !== null
}

/**
 * Get all available function signatures from an ABI
 * @param {string} abiPath - Path to ABI JSON file
 * @returns {Promise<Array>} Array of function information
 */
export const getAbiFunctions = async (abiPath) => {
	const contractInterface = await loadAbiInterface(abiPath)
	if (!contractInterface) {
		return []
	}

	return contractInterface.fragments
		.filter(fragment => fragment.type === 'function')
		.map(fragment => ({
			name: fragment.name,
			signature: contractInterface.getFunction(fragment.name).format('sighash'),
			selector: contractInterface.getFunction(fragment.name).selector,
			inputs: fragment.inputs.map(input => ({
				name: input.name,
				type: input.type
			}))
		}))
}

/**
 * Enhanced decoder that tries ABI first, then falls back to 4bytes.directory
 * @param {string} methodId - The method ID
 * @param {string} inputData - Complete transaction input data
 * @param {string} abiPath - Path to ABI JSON file
 * @returns {Promise<{source: string, signature: string, methodName: string, decodedParams?: Array}>}
 */
export const enhancedDecode = async (methodId, inputData, abiPath = '/abi/staking_abi.json') => {
	// First try ABI decoding
	const abiResult = await decodeWithAbi(inputData, abiPath)
	if (abiResult) {
		return {
			source: 'abi',
			signature: abiResult.signature,
			methodName: abiResult.methodName,
			decodedParams: abiResult.decodedParams,
			fragment: abiResult.fragment
		}
	}

	// Fallback to 4bytes.directory
	try {
		const { getFunctionSignature, extractMethodName } = await import('./fourBytes.js')
		const signature = await getFunctionSignature(methodId)
		if (signature) {
			return {
				source: '4bytes',
				signature,
				methodName: extractMethodName(signature)
			}
		}
	} catch (error) {
		// Failed to fetch from 4bytes.directory
	}

	return null
}

/**
 * Clear the ABI interface cache
 */
export const clearAbiCache = () => {
	abiInterfaceCache.clear()
}
