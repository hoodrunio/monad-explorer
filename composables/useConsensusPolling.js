import { useServerURL } from "@/services/config"
import { fetchGithubValidatorInfo } from "@/services/api/github"

// Helper to setup auto-refresh
const setupAutoRefresh = (refreshFn, interval) => {
	onMounted(() => {
		const intervalId = setInterval(refreshFn, interval)

		onUnmounted(() => {
			clearInterval(intervalId)
		})
	})
}

/**
 * Composable for fetching consensus latest data with auto-refresh
 * Uses Nuxt's useFetch with polling
 */
export const useConsensusLatest = () => {
	const url = new URL(`${useServerURL()}/api/consensus/latest`)

	const { data, status, error, refresh } = useFetch(url.href, {
		key: "consensus_latest",
	})

	const isLoading = computed(() => status.value === 'pending')
	const isError = computed(() => !!error.value)

	setupAutoRefresh(refresh, 5000)

	return {
		data,
		isLoading,
		isError,
		error,
	}
}

/**
 * Composable for fetching consensus summary with auto-refresh
 */
export const useConsensusSummary = () => {
	const url = new URL(`${useServerURL()}/api/consensus/summary`)

	const { data, status, error, refresh } = useFetch(url.href, {
		key: "consensus_summary",
	})

	const isLoading = computed(() => status.value === 'pending')
	const isError = computed(() => !!error.value)

	setupAutoRefresh(refresh, 5000)

	return {
		data,
		isLoading,
		isError,
		error,
	}
}

/**
 * Composable for fetching consensus quorum with auto-refresh
 */
export const useConsensusQuorum = () => {
	const url = new URL(`${useServerURL()}/api/consensus/quorum`)

	const { data, status, error, refresh } = useFetch(url.href, {
		key: "consensus_quorum",
	})

	const isLoading = computed(() => status.value === 'pending')
	const isError = computed(() => !!error.value)

	setupAutoRefresh(refresh, 5000)

	return {
		data,
		isLoading,
		isError,
		error,
	}
}

/**
 * Composable for fetching consensus votes with auto-refresh
 * Enhances data with GitHub validator info (client-side only)
 */
export const useConsensusVotes = () => {
	const url = new URL(`${useServerURL()}/api/consensus/latest/votes`)

	const { data: rawData, status, error, refresh } = useFetch(url.href, {
		key: "consensus_votes",
	})

	// GitHub data cache
	const githubDataCache = ref(null)

	// Fetch GitHub data once on client-side
	onMounted(async () => {
		try {
			githubDataCache.value = await fetchGithubValidatorInfo()
		} catch (err) {
			console.warn('Failed to fetch GitHub validator data:', err)
		}
	})

	// Enhance data with GitHub info
	const data = computed(() => {
		if (!rawData.value?.votes || !Array.isArray(rawData.value.votes)) {
			return []
		}

		// If no GitHub data yet, return raw data
		if (!githubDataCache.value) {
			return rawData.value.votes
		}

		// Enhance with GitHub data
		return rawData.value.votes.map((vote) => {
			const githubData = githubDataCache.value.get(vote.validator_id || vote.author)
			return {
				...vote,
				validator_name: githubData?.name || vote.validator_name || "unknown",
				logoUrl: githubData?.logo || vote.logoUrl || null,
				github: githubData,
			}
		})
	})

	const isLoading = computed(() => status.value === 'pending')
	const isError = computed(() => !!error.value)

	setupAutoRefresh(refresh, 5000)

	return {
		data,
		isLoading,
		isError,
		error,
	}
}

/**
 * Composable for fetching missing validators with auto-refresh
 * Enhances data with GitHub validator info (client-side only)
 */
export const useConsensusMissing = () => {
	const url = new URL(`${useServerURL()}/api/consensus/latest/missing`)

	const { data: rawData, status, error, refresh } = useFetch(url.href, {
		key: "consensus_missing",
	})

	// GitHub data cache
	const githubDataCache = ref(null)

	// Fetch GitHub data once on client-side
	onMounted(async () => {
		try {
			githubDataCache.value = await fetchGithubValidatorInfo()
		} catch (err) {
			console.warn('Failed to fetch GitHub validator data:', err)
		}
	})

	// Enhance data with GitHub info
	const data = computed(() => {
		if (!rawData.value?.missing || !Array.isArray(rawData.value.missing)) {
			return []
		}

		// If no GitHub data yet, return raw data
		if (!githubDataCache.value) {
			return rawData.value.missing
		}

		// Enhance with GitHub data
		return rawData.value.missing.map((validator) => {
			const githubData = githubDataCache.value.get(validator.validator_id || validator.author)
			return {
				...validator,
				validator_name: githubData?.name || validator.validator_name || "unknown",
				logoUrl: githubData?.logo || validator.logoUrl || null,
				github: githubData,
			}
		})
	})

	const isLoading = computed(() => status.value === 'pending')
	const isError = computed(() => !!error.value)

	setupAutoRefresh(refresh, 5000)

	return {
		data,
		isLoading,
		isError,
		error,
	}
}

/**
 * Composable for fetching consensus history
 */
export const useConsensusHistory = (limit = 30) => {
	const url = new URL(`${useServerURL()}/api/consensus/history`)
	if (limit) url.searchParams.append("limit", limit)

	const { data: rawData, status, error, refresh } = useFetch(url.href, {
		key: `consensus_history_${limit}`,
	})

	const data = computed(() => {
		if (!rawData.value?.rounds || !Array.isArray(rawData.value.rounds)) {
			return []
		}
		return rawData.value.rounds
	})

	const isLoading = computed(() => status.value === 'pending')
	const isError = computed(() => !!error.value)

	setupAutoRefresh(refresh, 10000)

	return {
		data,
		isLoading,
		isError,
		error,
	}
}
