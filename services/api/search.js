/** Services */
import { useServerURL } from "@/services/config"
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
				if (data.value) {
					results.push({
						type: "block",
						result: data.value,
					})
				}
			}),
		)
	}

	// Check for transaction hash (64 hex characters)
	if (typeof trimmedQuery === "string" && trimmedQuery.length === 64 && /^[0-9a-fA-F]+$/.test(trimmedQuery)) {
		promises.push(
			fetchTxByHash(trimmedQuery).then(({ data }) => {
				if (data.value) {
					results.push({
						type: "tx",
						result: data.value,
					})
				}
			}),
		)
	}

	// Check for validator address (66 hex characters)
	if (typeof trimmedQuery === "string" && trimmedQuery.length === 66 && /^[0-9a-fA-F]+$/.test(trimmedQuery)) {
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