/** Services */
import { fetchTxByHash } from "@/services/api/tx"
import { fetchValidatorByID } from "@/services/api/validator"
import { fetchBlockByHeight } from "@/services/api/block"

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

	if (typeof trimmedQuery === "string" && trimmedQuery.length === 64 && /^[0-9a-fA-F]+$/.test(trimmedQuery)) {
		// For addresses, we could search for transactions involving this address
		// This would require additional API endpoints that aren't defined yet
		// For now, we'll just check if it's a validator address
		promises.push(
			fetchValidatorByID(trimmedQuery).then(({ data }) => {
				if (data.value) {
					results.push({
						type: "validator",
						result: data.value,
					})
				}
			}).catch(() => {
				// If validator lookup fails, we could add address search here
				// For now, we'll just ignore the error
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