/** Contract Verification API Services */
import { useBlockscoutURL } from "@/services/config"

/**
 * Validate that Blockscout API URL is configured
 * @throws {Error} If Blockscout URL is not configured
 */
const validateBlockscoutURL = () => {
	const url = useBlockscoutURL()
	if (!url) {
		throw new Error('Contract verification is not available at the moment.')
	}
	return url
}

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
 * Get verification configuration (compiler versions, EVM versions, etc.)
 * @returns {Promise} - API response with all verification config
 */
export const fetchVerificationConfig = () => {
	try {
		const url = `${useBlockscoutURL()}/api/v2/smart-contracts/verification/config`

		return useFetch(url, {
			key: 'verification-config',
			// Cache for 1 hour since config doesn't change frequently
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
		console.error('Failed to fetch verification config:', error)
		throw error
	}
}

/**
 * Verify contract using Solidity Flattened (Single flattened source file)
 * @param {string} contractAddress - Contract address
 * @param {Object} data - Verification data
 * @param {string} data.compilerVersion - Full compiler version string
 * @param {string} data.licenseType - License type identifier
 * @param {string} data.sourceCode - Flattened source code
 * @param {string} data.contractName - Contract name
 * @param {string} [data.evmVersion] - EVM version (optional)
 * @param {number} [data.optimizationRuns] - Optimization runs (number or null)
 * @param {Object} [data.libraries] - Map of library name to address (optional)
 * @param {string} [data.constructorArgs] - Constructor arguments hex (optional)
 * @param {boolean} [data.autodetectConstructorArgs] - Auto-detect constructor args (optional)
 * @returns {Promise} - Verification result
 */
export const verifySolidityFlattened = async (contractAddress, data) => {
	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.licenseType) {
		throw new Error('License type is required')
	}

	if (!data.sourceCode || !data.sourceCode.trim()) {
		throw new Error('Source code is required')
	}

	if (!data.contractName || !data.contractName.trim()) {
		throw new Error('Contract name is required')
	}

	try {
		const baseUrl = validateBlockscoutURL()
		const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}/verification/via/flattened-code`

		const requestBody = {
			compiler_version: data.compilerVersion,
			license_type: data.licenseType,
			source_code: data.sourceCode,
			contract_name: data.contractName,
			is_optimization_enabled: data.optimizationRuns !== null && data.optimizationRuns !== undefined,
			optimization_runs: data.optimizationRuns || undefined,
			evm_version: data.evmVersion || undefined,
			autodetect_constructor_args: data.autodetectConstructorArgs !== undefined ? data.autodetectConstructorArgs : true,
			constructor_args: data.constructorArgs || undefined,
			libraries: data.libraries || undefined
		}

		console.log('Verification Request (Flattened):', requestBody)

		const response = await $fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		})

		console.log('Verification Response (Flattened):', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Solidity Flattened):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Verify contract using Solidity Multi-Part (Multiple source files)
 * @param {string} contractAddress - Contract address
 * @param {Object} data - Verification data
 * @param {string} data.compilerVersion - Full compiler version string
 * @param {string} data.licenseType - License type identifier
 * @param {Object} data.sourceFiles - Map of filename to source code
 * @param {string} [data.evmVersion] - EVM version (optional)
 * @param {number} [data.optimizationRuns] - Optimization runs (number or null)
 * @param {Object} [data.libraries] - Map of library name to address (optional)
 * @param {string} [data.constructorArgs] - Constructor arguments hex (optional)
 * @param {boolean} [data.autodetectConstructorArgs] - Auto-detect constructor args (optional)
 * @returns {Promise} - Verification result
 */
export const verifySolidityMultiPart = async (contractAddress, data) => {
	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.licenseType) {
		throw new Error('License type is required')
	}

	if (!data.sourceFiles || Object.keys(data.sourceFiles).length === 0) {
		throw new Error('At least one source file is required')
	}

	try {
		const baseUrl = validateBlockscoutURL()
		const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}/verification/via/multi-part`

		const formData = new FormData()

		formData.append('compiler_version', data.compilerVersion)
		formData.append('license_type', data.licenseType)

		if (data.evmVersion) {
			formData.append('evm_version', data.evmVersion)
		}

		formData.append('is_optimization_enabled', data.optimizationRuns !== null && data.optimizationRuns !== undefined ? 'true' : 'false')

		if (data.optimizationRuns !== null && data.optimizationRuns !== undefined) {
			formData.append('optimization_runs', data.optimizationRuns.toString())
		}

		if (data.libraries && Object.keys(data.libraries).length > 0) {
			formData.append('libraries', JSON.stringify(data.libraries))
		}

		if (data.autodetectConstructorArgs !== undefined) {
			formData.append('autodetect_constructor_args', data.autodetectConstructorArgs ? 'true' : 'false')
		}

		if (data.constructorArgs) {
			formData.append('constructor_args', data.constructorArgs)
		}

		// Add source files with indexed keys (files[0], files[1], etc.)
		Object.entries(data.sourceFiles).forEach(([filename, content], index) => {
			const blob = new Blob([content], { type: 'text/plain' })
			formData.append(`files[${index}]`, blob, filename)
		})

		console.log('Verification Request (Multi-Part):', {
			compiler_version: data.compilerVersion,
			license_type: data.licenseType,
			files: Object.keys(data.sourceFiles)
		})

		const response = await $fetch(url, {
			method: 'POST',
			body: formData
		})

		console.log('Verification Response (Multi-Part):', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Solidity Multi-Part):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Verify contract using Solidity Standard JSON
 * @param {string} contractAddress - Contract address
 * @param {Object} data - Verification data
 * @param {string} data.compilerVersion - Compiler version
 * @param {string} data.licenseType - License type identifier
 * @param {string} data.contractName - Contract name
 * @param {string} data.input - Standard JSON input (stringified)
 * @param {string} [data.constructorArgs] - Constructor arguments hex (optional)
 * @param {boolean} [data.autodetectConstructorArgs] - Auto-detect constructor args (optional)
 * @returns {Promise} - Verification result
 */
export const verifySolidityStandardJson = async (contractAddress, data) => {
	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.licenseType) {
		throw new Error('License type is required')
	}

	if (!data.contractName) {
		throw new Error('Contract name is required')
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
		const baseUrl = validateBlockscoutURL()
		const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}/verification/via/standard-input`

		const formData = new FormData()

		formData.append('compiler_version', data.compilerVersion)
		formData.append('license_type', data.licenseType)
		formData.append('contract_name', data.contractName)

		// Add standard JSON input as a file
		const jsonBlob = new Blob([data.input], { type: 'application/json' })
		formData.append('files[0]', jsonBlob, 'standard-input.json')

		if (data.autodetectConstructorArgs !== undefined) {
			formData.append('autodetect_constructor_args', data.autodetectConstructorArgs ? 'true' : 'false')
		}

		if (data.constructorArgs) {
			formData.append('constructor_args', data.constructorArgs)
		}

		console.log('Verification Request (Standard JSON):', {
			compiler_version: data.compilerVersion,
			license_type: data.licenseType,
			contract_name: data.contractName
		})

		const response = await $fetch(url, {
			method: 'POST',
			body: formData
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
 * Verify contract using Vyper Flattened (Single flattened source file)
 * @param {string} contractAddress - Contract address
 * @param {Object} data - Verification data
 * @param {string} data.compilerVersion - Vyper compiler version
 * @param {string} data.licenseType - License type identifier
 * @param {string} data.sourceCode - Flattened source code
 * @param {string} data.contractName - Contract name
 * @param {string} [data.evmVersion] - EVM version (optional)
 * @param {Object} [data.interfaces] - Map of interface name to interface code (optional)
 * @param {string} [data.constructorArgs] - Constructor arguments hex (optional)
 * @param {boolean} [data.autodetectConstructorArgs] - Auto-detect constructor args (optional)
 * @returns {Promise} - Verification result
 */
export const verifyVyperFlattened = async (contractAddress, data) => {
	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.licenseType) {
		throw new Error('License type is required')
	}

	if (!data.sourceCode || !data.sourceCode.trim()) {
		throw new Error('Source code is required')
	}

	if (!data.contractName || !data.contractName.trim()) {
		throw new Error('Contract name is required')
	}

	try {
		const baseUrl = validateBlockscoutURL()
		const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}/verification/via/vyper-code`

		const requestBody = {
			compiler_version: data.compilerVersion,
			license_type: data.licenseType,
			source_code: data.sourceCode,
			contract_name: data.contractName,
			evm_version: data.evmVersion || undefined,
			autodetect_constructor_args: data.autodetectConstructorArgs !== undefined ? data.autodetectConstructorArgs : true,
			constructor_args: data.constructorArgs || undefined
		}

		console.log('Verification Request (Vyper Flattened):', requestBody)

		const response = await $fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		})

		console.log('Verification Response (Vyper Flattened):', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Vyper Flattened):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Verify contract using Vyper Multi-Part (Multiple source files)
 * @param {string} contractAddress - Contract address
 * @param {Object} data - Verification data
 * @param {string} data.compilerVersion - Vyper compiler version
 * @param {string} data.licenseType - License type identifier
 * @param {Object} data.sourceFiles - Map of filename to source code
 * @param {string} [data.evmVersion] - EVM version (optional)
 * @param {Object} [data.interfaces] - Map of interface name to interface code (optional)
 * @param {string} [data.constructorArgs] - Constructor arguments hex (optional)
 * @param {boolean} [data.autodetectConstructorArgs] - Auto-detect constructor args (optional)
 * @returns {Promise} - Verification result
 */
export const verifyVyperMultiPart = async (contractAddress, data) => {
	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.licenseType) {
		throw new Error('License type is required')
	}

	if (!data.sourceFiles || Object.keys(data.sourceFiles).length === 0) {
		throw new Error('At least one source file is required')
	}

	try {
		const baseUrl = validateBlockscoutURL()
		const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}/verification/via/vyper-multi-part`

		const formData = new FormData()

		formData.append('compiler_version', data.compilerVersion)
		formData.append('license_type', data.licenseType)

		if (data.evmVersion) {
			formData.append('evm_version', data.evmVersion)
		}

		if (data.autodetectConstructorArgs !== undefined) {
			formData.append('autodetect_constructor_args', data.autodetectConstructorArgs ? 'true' : 'false')
		}

		if (data.constructorArgs) {
			formData.append('constructor_args', data.constructorArgs)
		}

		// Add source files with indexed keys (files[0], files[1], etc.)
		Object.entries(data.sourceFiles).forEach(([filename, content], index) => {
			const blob = new Blob([content], { type: 'text/plain' })
			formData.append(`files[${index}]`, blob, filename)
		})

		// Add interface files if provided with indexed keys (interfaces[0], interfaces[1], etc.)
		if (data.interfaces && Object.keys(data.interfaces).length > 0) {
			Object.entries(data.interfaces).forEach(([filename, content], index) => {
				const blob = new Blob([content], { type: 'text/plain' })
				formData.append(`interfaces[${index}]`, blob, filename)
			})
		}

		console.log('Verification Request (Vyper Multi-Part):', {
			compiler_version: data.compilerVersion,
			license_type: data.licenseType,
			files: Object.keys(data.sourceFiles),
			interfaces: data.interfaces ? Object.keys(data.interfaces) : []
		})

		const response = await $fetch(url, {
			method: 'POST',
			body: formData
		})

		console.log('Verification Response (Vyper Multi-Part):', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Vyper Multi-Part):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Verify contract using Vyper Standard JSON
 * @param {string} contractAddress - Contract address
 * @param {Object} data - Verification data
 * @param {string} data.compilerVersion - Vyper compiler version
 * @param {string} data.licenseType - License type identifier
 * @param {string} data.input - Standard JSON input (stringified)
 * @param {string} [data.evmVersion] - EVM version (optional)
 * @param {string} [data.constructorArgs] - Constructor arguments hex (optional)
 * @param {boolean} [data.autodetectConstructorArgs] - Auto-detect constructor args (optional)
 * @returns {Promise} - Verification result
 */
export const verifyVyperStandardJson = async (contractAddress, data) => {
	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	if (!data.compilerVersion) {
		throw new Error('Compiler version is required')
	}

	if (!data.licenseType) {
		throw new Error('License type is required')
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
		const baseUrl = validateBlockscoutURL()
		const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}/verification/via/vyper-standard-input`

		const formData = new FormData()

		formData.append('compiler_version', data.compilerVersion)
		formData.append('license_type', data.licenseType)

		if (data.evmVersion) {
			formData.append('evm_version', data.evmVersion)
		}

		// Add standard JSON input as a file
		const jsonBlob = new Blob([data.input], { type: 'application/json' })
		formData.append('files[0]', jsonBlob, 'standard-input.json')

		if (data.autodetectConstructorArgs !== undefined) {
			formData.append('autodetect_constructor_args', data.autodetectConstructorArgs ? 'true' : 'false')
		}

		if (data.constructorArgs) {
			formData.append('constructor_args', data.constructorArgs)
		}

		console.log('Verification Request (Vyper Standard JSON):', {
			compiler_version: data.compilerVersion,
			license_type: data.licenseType
		})

		const response = await $fetch(url, {
			method: 'POST',
			body: formData
		})

		console.log('Verification Response (Vyper Standard JSON):', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Vyper Standard JSON):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Verify contract via Sourcify
 * @param {string} contractAddress - Contract address
 * @param {Object} data - Verification data
 * @param {Object} data.files - Map of filename to file content
 * @param {number} [data.chosenContractIndex] - Index of chosen contract if multiple (optional)
 * @returns {Promise} - Verification result
 */
export const verifySourcify = async (contractAddress, data) => {
	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	if (!data.files || Object.keys(data.files).length === 0) {
		throw new Error('At least one file is required')
	}

	try {
		const baseUrl = validateBlockscoutURL()
		const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}/verification/via/sourcify`

		const formData = new FormData()

		// Add source files with indexed keys (files[0], files[1], etc.)
		Object.entries(data.files).forEach(([filename, content], index) => {
			// Use application/json for JSON files (metadata), text/plain for source files
			const contentType = filename.endsWith('.json') ? 'application/json' : 'text/plain'
			const blob = new Blob([content], { type: contentType })
			formData.append(`files[${index}]`, blob, filename)
		})

		if (data.chosenContractIndex !== undefined) {
			formData.append('chosen_contract_index', data.chosenContractIndex.toString())
		}

		console.log('Verification Request (Sourcify):', {
			files: Object.keys(data.files),
			chosen_contract_index: data.chosenContractIndex
		})

		const response = await $fetch(url, {
			method: 'POST',
			body: formData
		})

		console.log('Verification Response (Sourcify):', response)

		return response
	} catch (error) {
		console.error('Failed to verify contract (Sourcify):', error)
		console.error('Error details:', error.data || error.message)
		throw error
	}
}

/**
 * Poll contract verification status by checking if contract is verified
 * @param {string} contractAddress - Contract address
 * @param {Object} options - Polling options
 * @param {number} [options.maxAttempts=30] - Maximum polling attempts
 * @param {number} [options.intervalMs=2000] - Initial interval between attempts in milliseconds
 * @param {boolean} [options.useExponentialBackoff=true] - Use exponential backoff for retries
 * @param {number} [options.maxIntervalMs=10000] - Maximum interval for exponential backoff
 * @param {Function} [options.onAttempt] - Callback for each polling attempt
 * @returns {Promise} - Contract verification result
 */
export const pollVerificationStatus = async (contractAddress, options = {}) => {
	const {
		maxAttempts = 30,
		intervalMs = 2000,
		useExponentialBackoff = true,
		maxIntervalMs = 10000,
		onAttempt
	} = options

	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	let attempts = 0
	let currentInterval = intervalMs

	const calculateBackoff = (attempt) => {
		if (!useExponentialBackoff) {
			return intervalMs
		}
		// Exponential backoff: 2s, 4s, 6s, 8s, 10s (max)
		const backoff = Math.min(intervalMs * (1 + attempt * 0.5), maxIntervalMs)
		return backoff
	}

	const checkStatus = async () => {
		try {
			const baseUrl = validateBlockscoutURL()
			const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}`

			const response = await $fetch(url, {
				method: 'GET'
			})

			// Check if contract is verified
			if (response.is_verified) {
				console.log('Contract verified successfully:', response)
				return {
					status: 'SUCCESS',
					source: {
						contractName: response.name,
						fileName: response.file_path,
						compilerVersion: response.compiler_version,
						matchType: response.is_fully_verified ? 'FULL' : (response.is_partially_verified ? 'PARTIAL' : 'FULL'),
						verifiedAt: response.verified_at,
						language: response.language,
						licenseType: response.license_type
					},
					data: response
				}
			}

			// Check for verification errors in response
			// Some APIs return verification_status or similar field
			if (response.verification_status === 'FAILED' || response.verification_status === 'ERROR') {
				throw new Error(response.verification_error || 'Verification failed on the server')
			}

			// Not verified yet
			attempts++

			// Call onAttempt callback if provided
			if (onAttempt) {
				onAttempt(attempts, maxAttempts)
			}

			if (attempts >= maxAttempts) {
				throw new Error(`Verification timeout after ${attempts} attempts. The contract may still be processing.`)
			}

			// Calculate next interval with backoff
			currentInterval = calculateBackoff(attempts)

			console.log(`Verification in progress... (attempt ${attempts}/${maxAttempts}, next check in ${currentInterval}ms)`)

			// Wait before next attempt with backoff
			await new Promise(resolve => setTimeout(resolve, currentInterval))

			// Recursive call
			return await checkStatus()
		} catch (error) {
			// If it's our timeout error or verification failed error, rethrow it
			if (error.message && (
				error.message.includes('Verification timeout') ||
				error.message.includes('Verification failed on the server')
			)) {
				throw error
			}

			// For other errors, check if we should retry
			attempts++

			if (attempts >= maxAttempts) {
				throw new Error('Failed to check verification status: ' + (error.message || 'Unknown error'))
			}

			console.log(`Error checking status, retrying... (attempt ${attempts}/${maxAttempts})`)

			// Calculate backoff for error retry
			currentInterval = calculateBackoff(attempts)

			// Wait before retry with backoff
			await new Promise(resolve => setTimeout(resolve, currentInterval))

			return await checkStatus()
		}
	}

	return await checkStatus()
}

/**
 * Check if contract is already verified
 * @param {string} contractAddress - Contract address
 * @returns {Promise<Object>} - { isVerified: boolean, contractData?: Object }
 */
export const checkContractVerification = async (contractAddress) => {
	if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
		throw new Error('Valid contract address is required')
	}

	try {
		const baseUrl = validateBlockscoutURL()
		const url = `${baseUrl}/api/v2/smart-contracts/${contractAddress.toLowerCase()}`

		const response = await $fetch(url, {
			method: 'GET'
		})

		return {
			isVerified: response.is_verified || false,
			isFullyVerified: response.is_fully_verified || false,
			isPartiallyVerified: response.is_partially_verified || false,
			contractData: response.is_verified ? {
				name: response.name,
				compilerVersion: response.compiler_version,
				evmVersion: response.evm_version,
				optimization: response.optimization_enabled,
				optimizationRuns: response.optimization_runs,
				verifiedAt: response.verified_at,
				language: response.language,
				licenseType: response.license_type
			} : null
		}
	} catch (error) {
		// If contract not found or other error, assume not verified
		console.error('Failed to check contract verification status:', error)
		return {
			isVerified: false,
			contractData: null
		}
	}
}

/**
 * Check verifier service health
 * @returns {Promise} - Health check response
 */
export const checkVerifierHealth = async () => {
	try {
		const url = `${useBlockscoutURL()}/health`

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
