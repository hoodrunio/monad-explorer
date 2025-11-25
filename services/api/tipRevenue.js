/** Tip Revenue API Services */
import { useServerURL } from "@/services/config"

/**
 * Fetch tip revenue rankings for all validators
 * @param {Object} options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 50)
 * @param {string} options.sortBy - Sort field: 'total_tip', 'avg_tip', 'blocks' (default: 'total_tip')
 * @param {string} options.window - Time window: '24h', '7d', '30d' (default: '24h')
 */
export const fetchTipRevenueRankings = async ({ page, limit, sortBy, window } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/tip-revenue/rankings`)

		if (page) url.searchParams.append("page", page)
		if (limit) url.searchParams.append("limit", limit)
		if (sortBy) url.searchParams.append("sortBy", sortBy)
		if (window) url.searchParams.append("window", window)

		return useFetch(url.href, {
			key: `tip_revenue_rankings_${page || 1}_${window || '24h'}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch network-wide tip revenue summary (24h)
 */
export const fetchNetworkTipSummary = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/tip-revenue/network/summary`)

		return useFetch(url.href, {
			key: "network_tip_summary",
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch tip revenue trends over time
 * @param {Object} options
 * @param {number} options.hours - Number of hours to fetch (default: 24)
 */
export const fetchTipRevenueTrends = async ({ hours } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/tip-revenue/trends`)

		if (hours) url.searchParams.append("hours", hours)

		return useFetch(url.href, {
			key: "tip_revenue_trends",
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch tip revenue details for a specific validator
 * @param {string} validatorId - The validator's ID (secp key)
 */
export const fetchValidatorTipRevenue = async (validatorId) => {
	try {
		const url = new URL(`${useServerURL()}/api/validators/${validatorId}/tip-revenue`)

		return useFetch(encodeURI(url.href), {
			key: `validator_tip_revenue_${validatorId}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch tip revenue history for a specific validator (for charts)
 * @param {string} validatorId - The validator's ID (secp key)
 * @param {Object} options
 * @param {number} options.hours - Number of hours to fetch (default: 24)
 */
export const fetchValidatorTipHistory = async (validatorId, { hours } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/validators/${validatorId}/tip-revenue/history`)

		if (hours) url.searchParams.append("hours", hours)

		return useFetch(encodeURI(url.href), {
			key: `validator_tip_history_${validatorId}`,
		})
	} catch (error) {
		throw error
	}
}
