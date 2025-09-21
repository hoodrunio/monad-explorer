/** Contract API Services */
import { useExplorerURL } from "@/services/config"

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
 * Get contract information
 * @param {string} address - Contract address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchContract = (address, {
	includeMetadata = true,
	includeBytecode = false,
	blockNumber = null
} = {}) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid contract address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/contracts/${address}`)

		if (includeMetadata !== undefined) url.searchParams.append("includeMetadata", includeMetadata.toString())
		if (includeBytecode !== undefined) url.searchParams.append("includeBytecode", includeBytecode.toString())
		if (blockNumber) url.searchParams.append("blockNumber", blockNumber.toString())

		return useFetch(url.href, {
			key: `contract-${address}-${includeMetadata}-${includeBytecode}-${blockNumber || 'latest'}`,
		})
	} catch (error) {
		console.error('Failed to fetch contract:', error)
		throw error
	}
}

/**
 * Get contract metadata only
 * @param {string} address - Contract address
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchContractMetadata = (address, {
	blockNumber = null,
	includeAnalysis = true
} = {}) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid contract address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/contracts/${address}/metadata`)

		if (blockNumber) url.searchParams.append("blockNumber", blockNumber.toString())
		if (includeAnalysis !== undefined) url.searchParams.append("includeAnalysis", includeAnalysis.toString())

		return useFetch(url.href, {
			key: `contract-metadata-${address}-${blockNumber || 'latest'}-${includeAnalysis}`,
		})
	} catch (error) {
		console.error('Failed to fetch contract metadata:', error)
		throw error
	}
}

/**
 * List contracts with filters
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchContracts = ({
	isVerified = null,
	hasSourceCode = null,
	createdAfter = null,
	createdBefore = null,
	creator = null,
	orderBy = 'createdAt',
	orderDirection = 'desc'
} = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/contracts`)

		if (isVerified !== null) url.searchParams.append("isVerified", isVerified.toString())
		if (hasSourceCode !== null) url.searchParams.append("hasSourceCode", hasSourceCode.toString())
		if (createdAfter) url.searchParams.append("createdAfter", createdAfter)
		if (createdBefore) url.searchParams.append("createdBefore", createdBefore)
		if (creator && isValidAddress(creator)) url.searchParams.append("creator", creator)
		if (orderBy) url.searchParams.append("orderBy", orderBy)
		if (orderDirection) url.searchParams.append("orderDirection", orderDirection)

		return useFetch(url.href, {
			key: `contracts-list-${isVerified}-${hasSourceCode}-${orderBy}-${orderDirection}`,
		})
	} catch (error) {
		console.error('Failed to fetch contracts list:', error)
		throw error
	}
}

/**
 * Queue manual metadata enrichment for a contract
 * @param {string} address - Contract address
 * @param {Object} options - Enrichment options
 * @returns {Promise} - API response
 */
export const enrichContract = async (address, {
	priority = 1,
	forceRefresh = false
} = {}) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid contract address format')
	}

	if (priority < 1 || priority > 10) {
		throw new Error('Priority must be between 1 and 10')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/contracts/${address}/enrich`)

		const response = await $fetch(url.href, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				priority,
				forceRefresh
			})
		})

		return response
	} catch (error) {
		console.error('Failed to enrich contract:', error)
		throw error
	}
}

/**
 * Get contract discovery information
 * @param {string} address - Contract address
 * @returns {Promise} - API response
 */
export const fetchContractDiscoveryInfo = (address) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid contract address format')
	}

	try {
		const url = new URL(`${useExplorerURL()}/api/contracts/${address}/discovery-info`)

		return useFetch(url.href, {
			key: `contract-discovery-${address}`,
		})
	} catch (error) {
		console.error('Failed to fetch contract discovery info:', error)
		throw error
	}
}

/**
 * Check if address is a contract
 * @param {string} address - Address to check
 * @returns {Promise<boolean>} - True if address is a contract
 */
export const isContract = async (address) => {
	if (!isValidAddress(address)) {
		return false
	}

	try {
		const discoveryInfo = await fetchContractDiscoveryInfo(address)
		return discoveryInfo.data?.value?.data?.existsOnChain === true
	} catch (error) {
		// If discovery endpoint fails, try to fetch contract metadata
		try {
			const metadata = await fetchContractMetadata(address)
			return metadata.data?.value?.data?.metadata?.contractExists === true
		} catch (metadataError) {
			console.error('Failed to check if address is contract:', error, metadataError)
			return false
		}
	}
}

/**
 * Get contract type (Token, Proxy, etc.)
 * @param {string} address - Contract address
 * @returns {Promise<string|null>} - Contract type or null
 */
export const getContractType = async (address) => {
	if (!isValidAddress(address)) {
		return null
	}

	try {
		const metadata = await fetchContractMetadata(address)
		return metadata.data?.value?.data?.metadata?.contractType || null
	} catch (error) {
		console.error('Failed to get contract type:', error)
		return null
	}
}

/**
 * Check if contract is a token
 * @param {string} address - Contract address
 * @returns {Promise<boolean>} - True if contract is a token
 */
export const isTokenContract = async (address) => {
	if (!isValidAddress(address)) {
		return false
	}

	try {
		const metadata = await fetchContractMetadata(address)
		return metadata.data?.value?.data?.metadata?.isToken === true
	} catch (error) {
		console.error('Failed to check if contract is token:', error)
		return false
	}
}

/**
 * Check if contract is proxied
 * @param {string} address - Contract address
 * @returns {Promise<boolean>} - True if contract is proxied
 */
export const isProxiedContract = async (address) => {
	if (!isValidAddress(address)) {
		return false
	}

	try {
		const metadata = await fetchContractMetadata(address)
		return metadata.data?.value?.data?.metadata?.isProxied === true
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
		const metadata = await fetchContractMetadata(address)
		const data = metadata.data?.value?.data?.metadata
		
		if (data?.isProxied) {
			return data.implementationAddress || null
		}
		
		return null
	} catch (error) {
		console.error('Failed to get proxy implementation:', error)
		return null
	}
}

/**
 * Get contract overview (combines multiple endpoints)
 * @param {string} address - Contract address
 * @returns {Promise} - Combined contract data
 */
export const fetchContractOverview = async (address) => {
	if (!isValidAddress(address)) {
		throw new Error('Invalid contract address format')
	}

	try {
		// Fetch multiple endpoints in parallel
		const [contractInfo, discoveryInfo] = await Promise.allSettled([
			fetchContract(address, { includeMetadata: true, includeBytecode: false }),
			fetchContractDiscoveryInfo(address)
		])

		return {
			address,
			contract: contractInfo.status === 'fulfilled' ? contractInfo.value : null,
			discovery: discoveryInfo.status === 'fulfilled' ? discoveryInfo.value : null,
			success: true
		}
	} catch (error) {
		console.error('Failed to fetch contract overview:', error)
		throw error
	}
}

/**
 * Get verified contracts only
 * @param {Object} options - Query options
 * @returns {Promise} - API response
 */
export const fetchVerifiedContracts = (options = {}) => {
	return fetchContracts({
		...options,
		isVerified: true
	})
}

/**
 * Get token contracts only
 * @param {Object} options - Query options
 * @returns {Promise} - API response with token contracts
 */
export const fetchTokenContracts = async (options = {}) => {
	try {
		// Get all contracts and filter for tokens on client side
		// This is a workaround since the API doesn't have a direct token filter
		const contracts = await fetchContracts(options)
		
		if (contracts.data?.value?.data?.contracts) {
			// Filter contracts that are tokens by checking metadata
			const tokenContracts = []
			
			for (const contract of contracts.data.value.data.contracts) {
				try {
					const isToken = await isTokenContract(contract.address)
					if (isToken) {
						tokenContracts.push(contract)
					}
				} catch (error) {
					// Continue with next contract if metadata fetch fails
					continue
				}
			}
			
			return {
				...contracts,
				data: {
					...contracts.data,
					value: {
						...contracts.data.value,
						data: {
							...contracts.data.value.data,
							contracts: tokenContracts,
							returned: tokenContracts.length
						}
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
