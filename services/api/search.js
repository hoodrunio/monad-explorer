/** Services */
import { fetchValidatorByID } from "@/services/api/validator"
import { useIndexerUrl } from "@/services/config"

/**
 * Detects if a query matches validator ID format
 * Validators: 64 hex chars (secp key) or 66 hex chars (prefixed), no 0x
 */
const isValidatorQuery = (query) => {
	if (typeof query !== "string") return false

	// 64 hex characters without 0x (secp256k1 key)
	if (query.length === 64 && /^[0-9a-fA-F]{64}$/.test(query)) {
		return true
	}

	// 66 hex characters without 0x (prefixed validator ID)
	if (query.length === 66 && !query.startsWith("0x") && /^[0-9a-fA-F]{66}$/.test(query)) {
		return true
	}

	return false
}

/**
 * Maps Blockscout search result types to app entity types
 */
const mapBlockscoutType = (blockscoutType, item) => {
	switch (blockscoutType) {
		case "address":
			// Determine if it's a contract or regular address
			return item.is_smart_contract_verified || item.is_contract ? "contract" : "address"
		case "contract":
			return "contract"
		case "token":
			return "token"
		case "transaction":
			return "tx"
		case "block":
			return "block"
		default:
			return blockscoutType
	}
}

/**
 * Transforms Blockscout search result to app format
 */
const transformBlockscoutResult = (item) => {
	const type = mapBlockscoutType(item.type, item)

	switch (type) {
		case "block":
			return {
				type: "block",
				result: {
					height: item.block_number,
					number: item.block_number,
					hash: item.block_hash,
					timestamp: item.timestamp,
				},
			}

		case "tx":
			return {
				type: "tx",
				result: {
					hash: item.transaction_hash,
					timestamp: item.timestamp,
				},
			}

		case "address":
			return {
				type: "address",
				result: {
					hash: item.address_hash,
					name: item.name,
					is_contract: item.is_smart_contract_verified || false,
				},
			}

		case "contract":
			return {
				type: "contract",
				result: {
					address: item.address_hash,
					name: item.name,
					is_verified: item.is_smart_contract_verified || false,
				},
			}

		case "token":
			return {
				type: "token",
				result: {
					address: item.address_hash,
					name: item.name,
					symbol: item.symbol,
					type: item.token_type,
				},
			}

		default:
			return {
				type,
				result: item,
			}
	}
}

/**
 * Main search function
 * Routes validator queries to Server API, all others to Blockscout Indexer API
 */
export const search = async (query) => {
	if (!query || typeof query !== "string") {
		return { data: ref([]) }
	}

	const trimmedQuery = query.trim().toLowerCase()

	if (!trimmedQuery) {
		return { data: ref([]) }
	}

	const results = []

	// Check if this is a validator query
	if (isValidatorQuery(trimmedQuery)) {
		try {
			const { data } = await fetchValidatorByID(trimmedQuery)
			if (data.value) {
				results.push({
					type: "validator",
					result: data.value,
				})
			}
		} catch (error) {
			// Ignore validator lookup failures
		}

		return { data: ref(results) }
	}

	// All other queries: use Blockscout search API
	try {
		const indexerUrl = useIndexerUrl()
		const searchUrl = `${indexerUrl}/search?q=${encodeURIComponent(trimmedQuery)}`

		const response = await $fetch(searchUrl)

		if (response?.items && Array.isArray(response.items)) {
			// Transform all Blockscout results to app format
			const transformedResults = response.items
				.map(item => transformBlockscoutResult(item))
				.filter(item => item !== null)

			results.push(...transformedResults)
		}
	} catch (error) {
		console.error("Blockscout search failed:", error)
		// Return empty results on failure
	}

	return { data: ref(results) }
} 