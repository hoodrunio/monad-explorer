/** NFT API Services */
import { useIndexerUrl } from "@/services/config"

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
 * Get NFTs owned by an address - SSR version
 * @param {string} address - Owner address
 * @param {Object} params - Query parameters
 * @param {string} params.type - Token types: "ERC-721", "ERC-404", "ERC-1155" or comma-separated
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchAddressNFTs = (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const { type, ...paginationParams } = params
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/nft`)

		if (type) url.searchParams.append("type", type)

		// Add pagination params if provided (from next_page_params)
		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined && paginationParams[key] !== null) {
				url.searchParams.append(key, paginationParams[key])
			}
		})

		return useFetch(url.href, {
			key: `address-nfts-${address}-${type || 'all'}-${JSON.stringify(paginationParams)}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items,
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get NFTs owned by an address - Client-side version
 * @param {string} address - Owner address
 * @param {Object} params - Query parameters
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchAddressNFTsClient = async (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const { type, ...paginationParams } = params
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/nft`)

		if (type) url.searchParams.append("type", type)

		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined && paginationParams[key] !== null) {
				url.searchParams.append(key, paginationParams[key])
			}
		})

		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					items: data.items || [],
					next_page_params: data.next_page_params || null,
				}
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get NFT collections owned by an address - SSR version
 * @param {string} address - Owner address
 * @param {Object} params - Query parameters
 * @param {string} params.type - Token types: "ERC-721", "ERC-404", "ERC-1155" or comma-separated
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchAddressNFTCollections = (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const { type, ...paginationParams } = params
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/nft_collections`)

		if (type) url.searchParams.append("type", type)

		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined && paginationParams[key] !== null) {
				url.searchParams.append(key, paginationParams[key])
			}
		})

		return useFetch(url.href, {
			key: `address-nft-collections-${address}-${type || 'all'}-${JSON.stringify(paginationParams)}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items,
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get NFT collections owned by an address - Client-side version
 * @param {string} address - Owner address
 * @param {Object} params - Query parameters
 * @returns {Promise} - API response with cursor pagination
 */
export const fetchAddressNFTCollectionsClient = async (address, params = {}) => {
	const normalizedAddress = address?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid address format')
	}

	try {
		const { type, ...paginationParams } = params
		const url = new URL(`${useIndexerUrl()}/addresses/${normalizedAddress}/nft_collections`)

		if (type) url.searchParams.append("type", type)

		Object.keys(paginationParams).forEach(key => {
			if (paginationParams[key] !== undefined && paginationParams[key] !== null) {
				url.searchParams.append(key, paginationParams[key])
			}
		})

		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					items: data.items || [],
					next_page_params: data.next_page_params || null,
				}
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get specific NFT instance details - SSR version
 * @param {string} tokenAddress - NFT collection/token contract address
 * @param {string} tokenId - NFT token ID
 * @returns {Promise} - API response with NFT instance details
 */
export const fetchNFTInstance = (tokenAddress, tokenId) => {
	const normalizedAddress = tokenAddress?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	if (!tokenId && tokenId !== 0) {
		throw new Error('Token ID is required')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances/${tokenId}`)

		return useFetch(url.href, {
			key: `nft-instance-${tokenAddress}-${tokenId}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get specific NFT instance details - Client-side version
 * @param {string} tokenAddress - NFT collection/token contract address
 * @param {string} tokenId - NFT token ID
 * @returns {Promise} - API response with NFT instance details
 */
export const fetchNFTInstanceClient = async (tokenAddress, tokenId) => {
	const normalizedAddress = tokenAddress?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	if (!tokenId && tokenId !== 0) {
		throw new Error('Token ID is required')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances/${tokenId}`)
		const data = await $fetch(url.href)

		return { data: { value: data } }
	} catch (error) {
		throw error
	}
}

/**
 * Get holders of a specific NFT instance - SSR version
 * @param {string} tokenAddress - NFT collection/token contract address
 * @param {string} tokenId - NFT token ID
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with holders list
 */
export const fetchNFTInstanceHolders = (tokenAddress, tokenId, params = {}) => {
	const normalizedAddress = tokenAddress?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	if (!tokenId && tokenId !== 0) {
		throw new Error('Token ID is required')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances/${tokenId}/holders`)

		Object.keys(params).forEach(key => {
			if (params[key] !== undefined && params[key] !== null) {
				url.searchParams.append(key, params[key])
			}
		})

		return useFetch(url.href, {
			key: `nft-instance-holders-${tokenAddress}-${tokenId}-${JSON.stringify(params)}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items,
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get holders of a specific NFT instance - Client-side version
 * @param {string} tokenAddress - NFT collection/token contract address
 * @param {string} tokenId - NFT token ID
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with holders list
 */
export const fetchNFTInstanceHoldersClient = async (tokenAddress, tokenId, params = {}) => {
	const normalizedAddress = tokenAddress?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	if (!tokenId && tokenId !== 0) {
		throw new Error('Token ID is required')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances/${tokenId}/holders`)

		Object.keys(params).forEach(key => {
			if (params[key] !== undefined && params[key] !== null) {
				url.searchParams.append(key, params[key])
			}
		})

		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					items: data.items || [],
					next_page_params: data.next_page_params || null,
				}
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get transfers of a specific NFT instance - SSR version
 * @param {string} tokenAddress - NFT collection/token contract address
 * @param {string} tokenId - NFT token ID
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with transfers list
 */
export const fetchNFTInstanceTransfers = (tokenAddress, tokenId, params = {}) => {
	const normalizedAddress = tokenAddress?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	if (!tokenId && tokenId !== 0) {
		throw new Error('Token ID is required')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances/${tokenId}/transfers`)

		Object.keys(params || {}).forEach(key => {
			if (params[key] !== undefined && params[key] !== null) {
				url.searchParams.append(key, params[key])
			}
		})

		return useFetch(url.href, {
			key: `nft-instance-transfers-${tokenAddress}-${tokenId}-${JSON.stringify(params || {})}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items,
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		throw error
	}
}

/**
 * Get transfers of a specific NFT instance - Client-side version
 * @param {string} tokenAddress - NFT collection/token contract address
 * @param {string} tokenId - NFT token ID
 * @param {Object} params - Query parameters for pagination
 * @returns {Promise} - API response with transfers list
 */
export const fetchNFTInstanceTransfersClient = async (tokenAddress, tokenId, params = {}) => {
	const normalizedAddress = tokenAddress?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	if (!tokenId && tokenId !== 0) {
		throw new Error('Token ID is required')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances/${tokenId}/transfers`)

		Object.keys(params || {}).forEach(key => {
			if (params[key] !== undefined && params[key] !== null) {
				url.searchParams.append(key, params[key])
			}
		})

		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					items: data.items || [],
					next_page_params: data.next_page_params || null,
				}
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Get transfer count for a specific NFT instance - SSR version
 * @param {string} tokenAddress - NFT collection/token contract address
 * @param {string} tokenId - NFT token ID
 * @returns {Promise} - API response with transfer count
 */
export const fetchNFTInstanceTransfersCount = (tokenAddress, tokenId) => {
	const normalizedAddress = tokenAddress?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	if (!tokenId && tokenId !== 0) {
		throw new Error('Token ID is required')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances/${tokenId}/transfers-count`)

		return useFetch(url.href, {
			key: `nft-instance-transfers-count-${tokenAddress}-${tokenId}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Refresh NFT metadata - Client-side only (POST request)
 * @param {string} tokenAddress - NFT collection/token contract address
 * @param {string} tokenId - NFT token ID
 * @returns {Promise} - API response
 */
export const refetchNFTMetadata = async (tokenAddress, tokenId) => {
	const normalizedAddress = tokenAddress?.toLowerCase()
	if (!isValidAddress(normalizedAddress)) {
		throw new Error('Invalid token address format')
	}

	if (!tokenId && tokenId !== 0) {
		throw new Error('Token ID is required')
	}

	try {
		const url = new URL(`${useIndexerUrl()}/tokens/${normalizedAddress}/instances/${tokenId}/refetch-metadata`)
		const data = await $fetch(url.href, { method: 'POST' })

		return { data: { value: data } }
	} catch (error) {
		throw error
	}
}

/**
 * Helper function to resolve IPFS URLs to HTTP gateway URLs
 * @param {string} url - IPFS URL or regular URL
 * @returns {string} - HTTP URL
 */
export const resolveIPFSUrl = (url) => {
	if (!url) return null

	// Handle ipfs:// protocol
	if (url.startsWith('ipfs://')) {
		const hash = url.replace('ipfs://', '')
		return `https://ipfs.io/ipfs/${hash}`
	}

	// Handle ipfs/ path
	if (url.startsWith('ipfs/')) {
		const hash = url.replace('ipfs/', '')
		return `https://ipfs.io/ipfs/${hash}`
	}

	// Return as-is if already HTTP(S)
	return url
}
