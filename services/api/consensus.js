/** Services */
import { useServerURL } from "@/services/config"

/**
 * Fetch latest consensus data (epoch, round, timestamp)
 * Used by: Header component for Epoch/Round display
 */
export const fetchConsensusLatest = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/consensus/latest`)

		return useFetch(url.href, {
			key: "consensus_latest",
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch consensus summary (signed count, participation, stake ratio)
 * Used by: Summary tiles component
 */
export const fetchConsensusSummary = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/consensus/summary`)

		return useFetch(url.href, {
			key: "consensus_summary",
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch quorum information (progress, threshold, peak info)
 * Used by: Quorum card component
 */
export const fetchConsensusQuorum = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/consensus/quorum`)

		return useFetch(url.href, {
			key: "consensus_quorum",
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch votes for latest round (who signed)
 * Used by: Votes table component
 * Note: GitHub data merging is done in the composable
 */
export const fetchConsensusVotes = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/consensus/latest/votes`)

		return useFetch(url.href, {
			key: "consensus_votes",
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch missing validators for latest round
 * Used by: Missing table component
 * Note: GitHub data merging is done in the composable
 */
export const fetchConsensusMissing = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/consensus/latest/missing`)

		return useFetch(url.href, {
			key: "consensus_missing",
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch consensus history for chart
 * Used by: History chart component
 * @param {number} limit - Number of rounds to fetch (default 30)
 */
export const fetchConsensusHistory = async ({ limit = 30 } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/consensus/history`)

		if (limit) url.searchParams.append("limit", limit)

		return useFetch(url.href, {
			key: "consensus_history",
		})
	} catch (error) {
		throw error
	}
}
