/** Contract Verification API Services */
import { useVerifierURL, useBlockscoutURL } from "@/services/config"

/**
 * Fetch contract bytecode from Blockscout API
 * @param {string} address - Contract address
 * @returns {Promise} - Contract data with bytecode
 */
export const fetchContractBytecode = async (address) => {
	if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
		throw new Error('Invalid contract address format')
	}

	try {
		const url = `${useBlockscoutURL()}/api/v2/smart-contracts/${address.toLowerCase()}`

		const response = await $fetch(url, {
			method: 'GET'
		})

		return {
			creationBytecode: response.creation_bytecode,
			deployedBytecode: response.deployed_bytecode,
			creationStatus: response.creation_status,
			proxyType: response.proxy_type,
			implementations: response.implementations || []
		}
	} catch (error) {
		console.error('Failed to fetch contract bytecode:', error)
		throw error
	}
}

/**
 * Validate bytecode format
 * @param {string} bytecode - Bytecode to validate
 * @returns {boolean} - True if valid bytecode format
 */
const isValidBytecode = (bytecode) => {
	if (!bytecode || typeof bytecode !== 'string') return false
	return /^0x[a-fA-F0-9]+$/.test(bytecode)
}

/**
 * Get available Solidity compiler versions
 * @returns {Promise} - API response with compiler versions
 */
export const fetchSolidityVersions = () => {
	try {
		const url = `${useVerifierURL()}/api/v2/verifier/solidity/versions`

		return useFetch(url, {
			key: 'solidity-compiler-versions',
			// Cache for 1 hour since versions don't change frequently
			getCachedData: (key) => {
				const data = useNuxtData(key)
				if (!data.data.value) return null

				const expirationDate = new Date(data.data.value.timestamp)
				expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000) // 1 hour

				const isExpired = expirationDate.getTime() < Date.now()
				if (isExpired) return null

				return data.data.value
			}
		})
	} catch (error) {
		console.error('Failed to fetch Solidity versions:', error)
		throw error
	}
}

/**
 * Get available Vyper compiler versions
 * @returns {Promise} - API response with compiler versions
 */
export const fetchVyperVersions = () => {
	try {
		const url = `${useVerifierURL()}/api/v2/verifier/vyper/versions`

		return useFetch(url, {
			key: 'vyper-compiler-versions',
			getCachedData: (key) => {
				const data = useNuxtData(key)
				if (!data.data.value) return null

				const expirationDate = new Date(data.data.value.timestamp)
				expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000) // 1 hour

				const isExpired = expirationDate.getTime() < Date.now()
				if (isExpired) return null

				return data.data.value
			}
		})
	} catch (error) {
		console.error('Failed to fetch Vyper versions:', error)
		throw error
	}
}

/**
 * Verify contract using Solidity Multi-Part (Flattened source code)
 * @param {Object} data - Verification data
 * @param {string} data.bytecode - Contract bytecode (with 0x prefix)
 * @param {string} data.bytecodeType - "CREATION_INPUT" or "DEPLOYED_BYTECODE"
 * @param {string} data.compilerVersion - Full compiler version string
 * @param {string} [data.evmVersion] - EVM version (optional)
 * @param {number|null} [data.optimizationRuns] - Optimization runs (null = disabled, 200 = default)
 * @param {Object} data.sourceFiles - Map of filename to source code
 * @param {Object} [data.libraries] - Map of library name to address (optional)
 * @param {Object} [data.metadata] - Chain ID and contract address (optional)
 * @returns {Promise} - Verification result
 */
export const verifySolidityMultiPart = async (data) => {
	if (!data.bytecode) {
		throw new Error('Bytecode is required')
	}

	if (!isValidBytecode(data.bytecode)) {
		throw new Error('Invalid bytecode format. Must start with 0x and contain only hex characters.')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.sourceFiles || Object.keys(data.sourceFiles).length === 0) {
		throw new Error('At least one source file is required')
	}

	const validBytecodeTypes = ['CREATION_INPUT', 'DEPLOYED_BYTECODE']
	if (!validBytecodeTypes.includes(data.bytecodeType)) {
		throw new Error(`Bytecode type must be one of: ${validBytecodeTypes.join(', ')}`)
	}

	try {
		const url = `${useVerifierURL()}/api/v2/verifier/solidity/sources:verify-multi-part`

		const requestBody = {
			bytecode: data.bytecode,
			bytecodeType: data.bytecodeType,
			compilerVersion: data.compilerVersion,
			evmVersion: data.evmVersion || undefined,
			optimizationRuns: data.optimizationRuns === null ? null : (data.optimizationRuns || 200),
			sourceFiles: data.sourceFiles,
			libraries: data.libraries || {},
			metadata: data.metadata || {}
		}

		console.log('Verification Request:', requestBody)

		const response = await $fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		})

		console.log('Verification Response:', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Solidity Multi-Part):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Verify contract using Solidity Standard JSON
 * @param {Object} data - Verification data
 * @param {string} data.bytecode - Contract bytecode
 * @param {string} data.bytecodeType - "CREATION_INPUT" or "DEPLOYED_BYTECODE"
 * @param {string} data.compilerVersion - Compiler version
 * @param {string} data.input - Standard JSON input (stringified)
 * @returns {Promise} - Verification result
 */
export const verifySolidityStandardJson = async (data) => {
	if (!data.bytecode) {
		throw new Error('Bytecode is required')
	}

	if (!isValidBytecode(data.bytecode)) {
		throw new Error('Invalid bytecode format')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.input) {
		throw new Error('Standard JSON input is required')
	}

	// Validate JSON input
	try {
		JSON.parse(data.input)
	} catch (e) {
		throw new Error('Invalid JSON input format')
	}

	try {
		const url = `${useVerifierURL()}/api/v2/verifier/solidity/sources:verify-standard-json`

		const requestBody = {
			bytecode: data.bytecode,
			bytecodeType: data.bytecodeType,
			compilerVersion: data.compilerVersion,
			input: data.input,
			metadata: data.metadata || {}
		}

		console.log('Verification Request (Standard JSON):', requestBody)

		const response = await $fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		})

		console.log('Verification Response (Standard JSON):', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Solidity Standard JSON):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Verify contract using Vyper Multi-Part
 * @param {Object} data - Verification data
 * @param {string} data.bytecode - Contract bytecode
 * @param {string} data.bytecodeType - "CREATION_INPUT" or "DEPLOYED_BYTECODE"
 * @param {string} data.compilerVersion - Vyper compiler version
 * @param {string} [data.evmVersion] - EVM version (optional)
 * @param {Object} data.sourceFiles - Map of filename to source code
 * @param {Object} [data.interfaces] - Map of interface name to interface code (optional)
 * @returns {Promise} - Verification result
 */
export const verifyVyperMultiPart = async (data) => {
	if (!data.bytecode) {
		throw new Error('Bytecode is required')
	}

	if (!isValidBytecode(data.bytecode)) {
		throw new Error('Invalid bytecode format')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.sourceFiles || Object.keys(data.sourceFiles).length === 0) {
		throw new Error('At least one source file is required')
	}

	try {
		const url = `${useVerifierURL()}/api/v2/verifier/vyper/sources:verify-multi-part`

		const requestBody = {
			bytecode: data.bytecode,
			bytecodeType: data.bytecodeType,
			compilerVersion: data.compilerVersion,
			evmVersion: data.evmVersion || undefined,
			sourceFiles: data.sourceFiles,
			interfaces: data.interfaces || {},
			metadata: data.metadata || {}
		}

		console.log('Verification Request (Vyper):', requestBody)

		const response = await $fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		})

		console.log('Verification Response (Vyper):', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Vyper Multi-Part):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Verify contract using Vyper Standard JSON
 * @param {Object} data - Verification data
 * @param {string} data.bytecode - Contract bytecode
 * @param {string} data.bytecodeType - "CREATION_INPUT" or "DEPLOYED_BYTECODE"
 * @param {string} data.compilerVersion - Vyper compiler version
 * @param {string} data.input - Standard JSON input (stringified)
 * @returns {Promise} - Verification result
 */
export const verifyVyperStandardJson = async (data) => {
	if (!isValidBytecode(data.bytecode)) {
		throw new Error('Invalid bytecode format')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.input) {
		throw new Error('Standard JSON input is required')
	}

	try {
		JSON.parse(data.input)
	} catch (e) {
		throw new Error('Invalid JSON input format')
	}

	try {
		const url = `${useVerifierURL()}/api/v2/verifier/vyper/sources:verify-standard-json`

		const response = await $fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				bytecode: data.bytecode,
				bytecodeType: data.bytecodeType,
				compilerVersion: data.compilerVersion,
				input: data.input
			})
		})

		return response
	} catch (error) {
		console.error('Failed to verify contract (Vyper Standard JSON):', error)
		throw error
	}
}

/**
 * Verify contract via Sourcify
 * @param {Object} data - Verification data
 * @param {string} data.address - Contract address
 * @param {string} data.chain - Chain ID as string
 * @param {Object} data.files - Map of filename to file content
 * @param {number} [data.chosenContract] - Index of chosen contract if multiple (optional)
 * @returns {Promise} - Verification result
 */
export const verifySourcify = async (data) => {
	if (!data.address || !/^0x[a-fA-F0-9]{40}$/.test(data.address)) {
		throw new Error('Invalid contract address format')
	}

	if (!data.chain) {
		throw new Error('Chain ID is required')
	}

	if (!data.files || Object.keys(data.files).length === 0) {
		throw new Error('At least one file is required')
	}

	try {
		const url = `${useVerifierURL()}/api/v2/verifier/sourcify/sources:verify`

		const response = await $fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				address: data.address,
				chain: data.chain,
				files: data.files,
				chosenContract: data.chosenContract !== undefined ? data.chosenContract : undefined
			})
		})

		return response
	} catch (error) {
		console.error('Failed to verify contract (Sourcify):', error)
		throw error
	}
}

/**
 * Check verifier service health
 * @returns {Promise} - Health check response
 */
export const checkVerifierHealth = async () => {
	try {
		const url = `${useVerifierURL()}/health`

		const response = await $fetch(url, {
			method: 'GET'
		})

		return response
	} catch (error) {
		console.error('Failed to check verifier health:', error)
		throw error
	}
}

/**
 * Get EVM version options
 * @returns {Array} - List of EVM versions
 */
export const getEvmVersions = () => {
	return [
		{ value: 'homestead', label: 'Homestead' },
		{ value: 'tangerineWhistle', label: 'Tangerine Whistle' },
		{ value: 'spuriousDragon', label: 'Spurious Dragon' },
		{ value: 'byzantium', label: 'Byzantium' },
		{ value: 'constantinople', label: 'Constantinople' },
		{ value: 'petersburg', label: 'Petersburg' },
		{ value: 'istanbul', label: 'Istanbul' },
		{ value: 'berlin', label: 'Berlin' },
		{ value: 'london', label: 'London' },
		{ value: 'paris', label: 'Paris' },
		{ value: 'shanghai', label: 'Shanghai' },
		{ value: 'prague', label: 'Prague' },
		{ value: 'cancun', label: 'Cancun' }
	]
}

/**
 * Get bytecode type options
 * @returns {Array} - List of bytecode types
 */
export const getBytecodeTypes = () => {
	return [
		{
			value: 'CREATION_INPUT',
			label: 'Creation Bytecode',
			description: 'The bytecode used in contract creation transaction (includes constructor)'
		},
		{
			value: 'DEPLOYED_BYTECODE',
			label: 'Deployed Bytecode',
			description: 'The bytecode stored on-chain after deployment'
		}
	]
}

/**
 * Parse verification error message
 * @param {Error} error - Error object
 * @returns {string} - User-friendly error message
 */
export const parseVerificationError = (error) => {
	if (error.data?.message) {
		return error.data.message
	}

	if (error.message) {
		// Clean up common error patterns
		if (error.message.includes('fetch failed')) {
			return 'Failed to connect to verification service. Please check if the service is running.'
		}
		if (error.message.includes('Compilation error')) {
			return error.message
		}
		if (error.message.includes('Bytecode does not match')) {
			return 'Verification failed: Bytecode does not match. Please check your source code and compiler settings.'
		}
		return error.message
	}

	return 'An unknown error occurred during verification'
}

/**
 * Format verification match type
 * @param {string} matchType - Match type from API
 * @returns {Object} - Formatted match type with display properties
 */
export const formatMatchType = (matchType) => {
	switch (matchType) {
		case 'FULL':
			return {
				type: 'success',
				label: 'Full Match',
				description: 'Bytecode matches exactly including metadata hash'
			}
		case 'PARTIAL':
			return {
				type: 'warning',
				label: 'Partial Match',
				description: 'Bytecode matches functionally but metadata differs'
			}
		default:
			return {
				type: 'info',
				label: 'Unspecified',
				description: 'Match type could not be determined'
			}
	}
}
