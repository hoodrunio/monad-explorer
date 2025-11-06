/** Contract API Services - Migrated to Indexer API */
import { useIndexerUrl } from "@/services/config"
import { transformContract } from "@/services/utils/transforms"

/**
 * Validate Ethereum address format
 * @param {string} address - Address to validate
 * @returns {boolean} - True if valid address format
 */
const isValidAddress = (address) => {
	if (!address || typeof address !== 'string') return false
	return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Get smart contract information
 * @param {string} address - Contract address
 * @returns {Promise} - API response
 */
export const fetchContract = (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid contract address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/smart-contracts/${normalizedAddress}`)

		return useFetch(url.href, {
			key: `contract-${normalizedAddress}`,
			transform: (response) => {
				if (response) {
					return transformContract(response)
				}
				return response
			}
		})
	} catch (error) {
		console.error('Failed to fetch contract:', error)
		throw error
	}
}

/**
 * Get smart contract information (client-side version)
 * @param {string} address - Contract address
 * @returns {Promise} - API response
 */
export const fetchContractClient = async (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid contract address format')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/smart-contracts/${normalizedAddress}`)

		const response = await $fetch(url.href)
		return transformContract(response)
	} catch (error) {
		console.error('Failed to fetch contract:', error)
		throw error
	}
}

/**
 * List smart contracts with filters
 * @param {Object} params - Query params
 * @param {string} params.q - Search query
 * @param {string} params.filter - Filter by language: vyper | solidity | yul
 * @param {number} params.items_count - Number of items per page (default: 50)
 * @param {number} params.smart_contract_id - Cursor for pagination
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchSmartContracts = (params = {}) => {
	try {
		const { q, filter, items_count = 50, smart_contract_id } = params
		const url = new URL(`${useIndexerUrl()}/smart-contracts`)

		url.searchParams.append("items_count", items_count)
		if (q) url.searchParams.append("q", q)
		if (filter) url.searchParams.append("filter", filter)
		if (smart_contract_id) url.searchParams.append("smart_contract_id", smart_contract_id)

		return useFetch(url.href, {
			key: `contracts-${q || 'all'}-${filter || 'all'}-${items_count}-${smart_contract_id || 'initial'}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items.map(transformContract),
						next_page_params: response.next_page_params,
					}
				}
				return response
			}
		})
	} catch (error) {
		console.error('Failed to fetch smart contracts:', error)
		throw error
	}
}

/**
 * Get global smart contracts counters/statistics
 * @returns {Promise} - API response with counters
 */
export const fetchSmartContractCounters = () => {
	try {
		const url = new URL(`${useIndexerUrl()}/smart-contracts/counters`)

		return useFetch(url.href, {
			key: 'smart-contracts-counters',
		})
	} catch (error) {
		console.error('Failed to fetch smart contract counters:', error)
		throw error
	}
}

/**
 * Get verified contracts only
 * @param {Object} params - Query params
 * @returns {Promise} - API response with verified contracts
 */
export const fetchVerifiedContracts = (params = {}) => {
	// Note: New API returns only verified contracts by default
	return fetchSmartContracts(params)
}

/**
 * Check if address is a contract
 * @param {string} address - Address to check
 * @returns {Promise<boolean>} - True if address is a contract
 */
export const isContract = async (address) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		return false
	}

	try {
		const contract = await fetchContractClient(normalizedAddress)
		// If we get a valid response, it's a contract
		// creation_status: "success" | "failed" | "selfdestructed"
		return contract && contract.creationStatus !== undefined
	} catch (error) {
		// If 404 or error, it's not a contract
		return false
	}
}

/**
 * Get contract language/type
 * @param {string} address - Contract address
 * @returns {Promise<string|null>} - Contract language (solidity | vyper | yul) or null
 */
export const getContractType = async (address) => {
	if (!isValidAddress(address)) {
		return null
	}

	try {
		const contract = await fetchContractClient(address)
		return contract?.language || null
	} catch (error) {
		console.error('Failed to get contract type:', error)
		return null
	}
}

/**
 * Check if contract is a token
 * Note: Token detection requires analyzing the ABI or using the tokens endpoint
 * This is a simplified version that checks for common token methods
 * @param {string} address - Contract address
 * @returns {Promise<boolean>} - True if contract appears to be a token
 */
export const isTokenContract = async (address) => {
	if (!isValidAddress(address)) {
		return false
	}

	try {
		const contract = await fetchContractClient(address)

		if (!contract?.abi) {
			return false
		}

		// Check if ABI contains common token methods
		const abiString = typeof contract.abi === 'string' ? contract.abi : JSON.stringify(contract.abi)
		const hasTransfer = abiString.includes('transfer')
		const hasBalanceOf = abiString.includes('balanceOf')
		const hasTotalSupply = abiString.includes('totalSupply')

		// If has at least 2 of these common token methods, likely a token
		return [hasTransfer, hasBalanceOf, hasTotalSupply].filter(Boolean).length >= 2
	} catch (error) {
		console.error('Failed to check if contract is token:', error)
		return false
	}
}

/**
 * Check if contract is a proxy
 * @param {string} address - Contract address
 * @returns {Promise<boolean>} - True if contract is a proxy
 */
export const isProxiedContract = async (address) => {
	if (!isValidAddress(address)) {
		return false
	}

	try {
		const contract = await fetchContractClient(address)
		// Check if has minimal proxy address
		return !!(contract?.minimalProxyAddress)
	} catch (error) {
		console.error('Failed to check if contract is proxied:', error)
		return false
	}
}

/**
 * Get proxy implementation address
 * @param {string} address - Proxy contract address
 * @returns {Promise<string|null>} - Implementation address or null
 */
export const getProxyImplementation = async (address) => {
	if (!isValidAddress(address)) {
		return null
	}

	try {
		const contract = await fetchContractClient(address)
		return contract?.minimalProxyAddress || null
	} catch (error) {
		console.error('Failed to get proxy implementation:', error)
		return null
	}
}

/**
 * Get contract overview (for backward compatibility)
 * @param {string} address - Contract address
 * @returns {Promise} - Contract data
 */
export const fetchContractOverview = async (address) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid contract address format')
	}

	try {
		const contract = await fetchContractClient(address)

		return {
			address,
			contract,
			success: true
		}
	} catch (error) {
		console.error('Failed to fetch contract overview:', error)
		throw error
	}
}

// DEPRECATED FUNCTIONS - No longer supported in new API
// These are kept for backward compatibility but will return errors

/**
 * @deprecated - Metadata is now included in main contract response
 * Use fetchContract() instead
 */
export const fetchContractMetadata = (address) => {
	console.warn('fetchContractMetadata is deprecated. Use fetchContract() instead - metadata is included in main response.')
	return fetchContract(address)
}

/**
 * @deprecated - Contract enrichment is not supported in new API
 */
export const enrichContract = async (address) => {
	console.warn('enrichContract is no longer supported in the new API.')
	throw new Error('Contract enrichment is not supported in the new API')
}

/**
 * @deprecated - Discovery info is not available in new API
 */
export const fetchContractDiscoveryInfo = (address) => {
	console.warn('fetchContractDiscoveryInfo is no longer supported. Use fetchContract() instead.')
	throw new Error('Contract discovery info is not available in the new API')
}

/**
 * @deprecated - Token contracts should use the /tokens endpoint
 * This function is kept for backward compatibility but may be slow
 */
export const fetchTokenContracts = async (params = {}) => {
	console.warn('fetchTokenContracts is deprecated. Consider using the /tokens endpoint instead.')

	try {
		const contracts = await fetchSmartContracts(params)

		if (contracts.data?.value?.items) {
			// Filter for token contracts (this will be slow)
			const tokenContracts = []

			for (const contract of contracts.data.value.items) {
				try {
					const isToken = await isTokenContract(contract.address)
					if (isToken) {
						tokenContracts.push(contract)
					}
				} catch (error) {
					continue
				}
			}

			return {
				...contracts,
				data: {
					...contracts.data,
					value: {
						items: tokenContracts,
						next_page_params: null // Can't properly handle pagination with filtering
					}
				}
			}
		}

		return contracts
	} catch (error) {
		console.error('Failed to fetch token contracts:', error)
		throw error
	}
}
