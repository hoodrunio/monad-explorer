/** Services */
import { useServerURL } from "@/services/config"
import { getValidatorInfoBySecp, mergeValidatorData } from "@/services/api/github"

// New Monad-specific endpoints
export const fetchValidatorRankings = async ({ limit, sortBy, window, page, active_only = true } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/validators/rankings`)

		if (limit) url.searchParams.append("limit", limit)
		if (sortBy) url.searchParams.append("sortBy", sortBy)
		if (window) url.searchParams.append("window", window)
		if (page) url.searchParams.append("page", page)
		if (active_only !== undefined) url.searchParams.append("active_only", active_only)

		const result = await useFetch(url.href, {
			key: "validator_rankings",
		})

		// Enhance with GitHub data (now served from optimized server API)
		if (result.data.value?.data) {
			const enhancedValidators = await Promise.all(
				result.data.value.data.map(async (validator) => {
					const githubData = await getValidatorInfoBySecp(validator.validator_id)
					return mergeValidatorData(validator, githubData)
				})
			)
			
			result.data.value = {
				...result.data.value,
				data: enhancedValidators
			}
		}

		return result
	} catch (error) {
		throw error
	}
}

export const fetchValidatorByID = async (id) => {
	try {
		const url = new URL(`${useServerURL()}/api/validators/${id}`)

		const result = await useFetch(encodeURI(url.href), {
			key: "validator_by_id",
		})

		// Enhance with GitHub data (now served from optimized server API)
		if (result.data.value) {
			const githubData = await getValidatorInfoBySecp(id)
			result.data.value = mergeValidatorData(result.data.value, githubData)
		}

		return result
	} catch (error) {
		throw error
	}
}

export const fetchValidatorHistory = ({ id, hours = 24 }) => {
	try {
		const url = new URL(`${useServerURL()}/api/validators/${id}/history`)

		if (hours) url.searchParams.append("hours", hours)

		return useFetch(encodeURI(url.href), {
			key: "validator_history",
		})
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchValidatorInfrastructure = (id) => {
	try {
		const url = new URL(`${useServerURL()}/api/dns/validator-infrastructure/${id}`)

		return useFetch(encodeURI(url.href), {
			key: "validator_infrastructure",
		})
	} catch (error) {
		// Error handling can be added here
	}
}

// Legacy endpoints (keeping for compatibility but may not be needed)
export const fetchValidators = ({ jailed = false, limit, offset, sort }) => {
	try {
		const url = new URL(`${useServerURL()}/validators`)

		url.searchParams.append("jailed", jailed)
		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)
		if (sort) url.searchParams.append("sort", sort)

		return useFetch(url.href, {
			key: "validators",
		})
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchValidatorsCount = () => {
	try {
		const url = new URL(`${useServerURL()}/validators/count`)

		return useFetch(url.href, {
			key: "validators_count",
		})
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchValidatorBlocks = ({ id, limit, offset }) => {
	try {
		const url = new URL(`${useServerURL()}/validators/${id}/blocks`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)

		return useFetch(encodeURI(url.href), {
			key: "validator_blocks",
		})
	} catch (error) {
		// Error handling can be added here
	}
}

// New Monad-specific delegators endpoint
export const fetchValidatorDelegators = async (precompileId, { startDelegator, maxPages = 1, fetchAll = false } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/validators/${precompileId}/delegators`)

		if (startDelegator) url.searchParams.append("startDelegator", startDelegator)
		if (maxPages) url.searchParams.append("maxPages", maxPages)
		if (fetchAll !== undefined) url.searchParams.append("fetchAll", fetchAll)

		return useFetch(encodeURI(url.href), {
			key: `validator_delegators_${precompileId}`,
		})
	} catch (error) {
		throw error
	}
}

// Legacy delegators endpoint (keeping for compatibility)
export const fetchValidatorDelegatorsLegacy = ({ id, limit, offset }) => {
	try {
		const url = new URL(`${useServerURL()}/validators/${id}/delegators`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)

		return useFetch(encodeURI(url.href), {
			key: "validator_delegators_legacy",
		})
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchValidatorJails = ({ id, limit, offset }) => {
	try {
		const url = new URL(`${useServerURL()}/validators/${id}/jails`)

		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)

		return useFetch(encodeURI(url.href), {
			key: "validator_jails",
		})
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchValidatorUptime = ({ id, limit }) => {
	try {
		const url = new URL(`${useServerURL()}/validators/${id}/uptime`)

		if (limit) url.searchParams.append("limit", limit)

		return useFetch(encodeURI(url.href), {
			key: "validator_uptime",
		})
	} catch (error) {
		// Error handling can be added here
	}
}
