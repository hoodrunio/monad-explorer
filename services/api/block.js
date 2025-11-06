/**
 * Block API Service - New Indexer API (Blockscout-compatible)
 * All endpoints use cursor-based pagination
 */

import { useIndexerUrl } from "@/services/config"
import { transformBlock } from "@/services/utils/transforms"

/**
 * Get latest blocks with cursor-based pagination
 * @param {object} params - Query parameters
 * @param {number} params.items_count - Number of items per page (default: 20)
 * @param {number} params.block_number - Block number cursor for pagination
 * @param {string} params.type - Block type filter (block, uncle, reorg)
 * @returns {Promise} Fetch promise with blocks data
 */
export const fetchBlocks = (params = {}) => {
	try {
		const { items_count = 20, block_number, type } = params
		const url = new URL(`${useIndexerUrl()}/blocks`)

		url.searchParams.append("items_count", items_count)
		if (block_number) url.searchParams.append("block_number", block_number)
		if (type) url.searchParams.append("type", type)

		return useFetch(url.href, {
			key: `blocks-${items_count}-${block_number || 'initial'}`,
			transform: (response) => {
				if (response?.items) {
					return {
						items: response.items.map(transformBlock),
						next_page_params: response.next_page_params,
					}
				}
				return response
			},
		})
	} catch (error) {
		console.error("Failed to fetch blocks:", error)
		throw error
	}
}

/**
 * Get specific block details by height or hash - SSR version
 * @param {string|number} blockNumberOrHash - Block number or hash
 * @returns {Promise} Fetch promise with block data
 */
export const fetchBlockByHeight = (blockNumberOrHash) => {
	try {
		const url = new URL(`${useIndexerUrl()}/blocks/${blockNumberOrHash}`)

		return useFetch(url.href, {
			key: `block-${blockNumberOrHash}`,
			transform: (response) => transformBlock(response),
		})
	} catch (error) {
		console.error("Failed to fetch block by height:", error)
		throw error
	}
}

/**
 * Get specific block details by height or hash - Client-side version
 * @param {string|number} blockNumberOrHash - Block number or hash
 * @returns {Promise} Block data wrapped in standard format
 */
export const fetchBlockByHeightClient = async (blockNumberOrHash) => {
	try {
		const url = new URL(`${useIndexerUrl()}/blocks/${blockNumberOrHash}`)
		const data = await $fetch(url.href)

		return {
			data: {
				value: transformBlock(data)
			}
		}
	} catch (error) {
		console.error("Failed to fetch block by height (client):", error)
		throw error
	}
}

/**
 * Get all transactions in a block with cursor-based pagination
 * @param {object} params - Query parameters
 * @param {string|number} params.blockNumberOrHash - Block number or hash
 * @param {number} params.items_count - Number of items per page
 * @param {number} params.index - Transaction index cursor for pagination
 * @returns {Promise} Fetch promise with transactions data
 */
export const fetchBlockTransactions = (params = {}) => {
	try {
		const { blockNumberOrHash, items_count = 20, index } = params

		if (!blockNumberOrHash) {
			throw new Error("blockNumberOrHash is required")
		}

		const url = new URL(`${useIndexerUrl()}/blocks/${blockNumberOrHash}/transactions`)

		url.searchParams.append("items_count", items_count)
		if (index !== undefined) url.searchParams.append("index", index)

		return useFetch(url.href, {
			key: `block-txs-${blockNumberOrHash}-${items_count}-${index || 'initial'}`,
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
		console.error("Failed to fetch block transactions:", error)
		throw error
	}
}

/**
 * Get block withdrawals (FUTURE - Ethereum PoS withdrawals)
 * @param {object} params - Query parameters
 * @param {string|number} params.blockNumberOrHash - Block number or hash
 * @param {number} params.items_count - Number of items per page
 * @returns {Promise} Fetch promise with withdrawals data
 */
export const fetchBlockWithdrawals = (params = {}) => {
	try {
		const { blockNumberOrHash, items_count = 20 } = params

		if (!blockNumberOrHash) {
			throw new Error("blockNumberOrHash is required")
		}

		const url = new URL(`${useIndexerUrl()}/blocks/${blockNumberOrHash}/withdrawals`)

		url.searchParams.append("items_count", items_count)

		return useFetch(url.href, {
			key: `block-withdrawals-${blockNumberOrHash}`,
		})
	} catch (error) {
		console.error("Failed to fetch block withdrawals:", error)
		throw error
	}
}

/**
 * Get average block time from stats endpoint
 * This is now part of the stats API
 * @returns {Promise} Average block time data
 */
export const fetchAvgBlockTime = async () => {
	try {
		const url = new URL(`${useIndexerUrl()}/stats`)
		const data = await $fetch(url.href)

		return {
			data: {
				value: {
					average_block_time: data.average_block_time,
				}
			}
		}
	} catch (error) {
		console.error("Failed to fetch average block time:", error)
		throw error
	}
}
