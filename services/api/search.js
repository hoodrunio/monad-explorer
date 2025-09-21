/** Services */
import { fetchTxByHash } from "@/services/api/tx"
import { fetchValidatorByID } from "@/services/api/validator"
import { fetchBlockByHeight } from "@/services/api/block"
import { fetchAddressStats, hasAddressActivity } from "@/services/api/address"
import { fetchContract, isContract } from "@/services/api/contract"

export const search = async (query) => {
	const promises = []
	const results = []

	const trimmedQuery = query.trim()

	// Check if the query is a number (block height)
	if (!isNaN(trimmedQuery) && !trimmedQuery.includes(".")) {
		promises.push(
			fetchBlockByHeight(trimmedQuery).then(({ data }) => {
				// Handle the actual API response structure: { data: { block: {...} } }
				if (data.value?.data?.block) {
					results.push({
						type: "block",
						result: data.value.data.block,
					})
				}
			}),
		)
	}

	// Check for EVM transaction hash (0x + 64 hex characters = 66 total)
	if (typeof trimmedQuery === "string" && 
		trimmedQuery.length === 66 && 
		trimmedQuery.startsWith("0x") && 
		/^0x[0-9a-fA-F]{64}$/.test(trimmedQuery)) {
		promises.push(
			fetchTxByHash(trimmedQuery).then(({ data }) => {
				// Handle the actual API response structure: { data: {...} }
				if (data.value?.data) {
					results.push({
						type: "tx",
						result: data.value.data,
					})
				}
			}),
		)
	}

	// Check for Ethereum address (0x + 40 hex characters = 42 total)
	if (typeof trimmedQuery === "string" && 
		trimmedQuery.length === 42 && 
		trimmedQuery.startsWith("0x") && 
		/^0x[0-9a-fA-F]{40}$/.test(trimmedQuery)) {
		
		// Check if it's a contract
		promises.push(
			isContract(trimmedQuery).then(async (contractExists) => {
				if (contractExists) {
					try {
						const { data } = await fetchContract(trimmedQuery, { includeMetadata: true })
						if (data.value?.data) {
							results.push({
								type: "contract",
								result: data.value.data,
							})
						}
					} catch (error) {
						// Contract exists but failed to fetch details, add basic info
						results.push({
							type: "contract",
							result: { address: trimmedQuery },
						})
					}
				} else {
					// Check if it's an address with activity
					try {
						const hasActivity = await hasAddressActivity(trimmedQuery)
						if (hasActivity) {
							const { data } = await fetchAddressStats(trimmedQuery)
							results.push({
								type: "address",
								result: { 
									hash: trimmedQuery,
									stats: data.value?.data?.stats || null
								},
							})
						}
					} catch (error) {
						// Address might exist but no activity or stats available
						results.push({
							type: "address",
							result: { hash: trimmedQuery },
						})
					}
				}
			}).catch(() => {
				// If all checks fail, still add as potential address
				results.push({
					type: "address",
					result: { hash: trimmedQuery },
				})
			})
		)
	}

	// Legacy: Check for validator by secp key (64 hex characters without 0x)
	if (typeof trimmedQuery === "string" && trimmedQuery.length === 64 && /^[0-9a-fA-F]+$/.test(trimmedQuery)) {
		promises.push(
			fetchValidatorByID(trimmedQuery).then(({ data }) => {
				if (data.value) {
					results.push({
						type: "validator",
						result: data.value,
					})
				}
			}).catch(() => {
				// Ignore validator lookup failures
			}),
		)
	}

	// Legacy: Check for old-style transaction hash (64 hex characters without 0x)
	if (typeof trimmedQuery === "string" && 
		trimmedQuery.length === 64 && 
		!trimmedQuery.startsWith("0x") && 
		/^[0-9a-fA-F]+$/.test(trimmedQuery)) {
		promises.push(
			fetchTxByHash(`0x${trimmedQuery}`).then(({ data }) => {
				// Handle the actual API response structure: { data: {...} }
				if (data.value?.data) {
					results.push({
						type: "tx",
						result: data.value.data,
					})
				}
			}),
		)
	}

	if (typeof trimmedQuery === "string" && 
		trimmedQuery.length === 66 && 
		!trimmedQuery.startsWith("0x") && 
		/^[0-9a-fA-F]+$/.test(trimmedQuery)) {
		promises.push(
			fetchValidatorByID(trimmedQuery).then(({ data }) => {
				if (data.value) {
					results.push({
						type: "validator",
						result: data.value,
					})
				}
			}),
		)
	}

	await Promise.all(promises)

	return { data: ref(results) }
} 