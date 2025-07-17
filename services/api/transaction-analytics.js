/** Services */
import { useServerURL } from "@/services/config"

/**
 * Fetch comprehensive transaction metrics for a specific validator
 */
export const fetchValidatorTransactionAnalytics = async (validatorId) => {
	try {
		const url = new URL(`${useServerURL()}/api/transaction-analytics/validator/${validatorId}`)

		return useFetch(url.href, {
			key: `validator_transaction_analytics_${validatorId}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch validator transaction trends over time
 */
export const fetchValidatorTransactionTrends = async (validatorId, { timeWindow = '24h', granularity = 'hour' } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/transaction-analytics/validator/${validatorId}/trends`)
		
		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)
		if (granularity) url.searchParams.append("granularity", granularity)

		return useFetch(url.href, {
			key: `validator_transaction_trends_${validatorId}_${timeWindow}_${granularity}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch network-wide transaction summary
 */
export const fetchNetworkTransactionSummary = async ({ timeWindow = '24h' } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/transaction-analytics/network/summary`)
		
		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)

		return useFetch(url.href, {
			key: `network_transaction_summary_${timeWindow}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch network transaction trends over time
 */
export const fetchNetworkTransactionTrends = async ({ timeWindow = '24h', granularity = 'hour' } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/transaction-analytics/network/trends`)
		
		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)
		if (granularity) url.searchParams.append("granularity", granularity)

		return useFetch(url.href, {
			key: `network_transaction_trends_${timeWindow}_${granularity}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch validator rankings by transaction processing performance
 */
export const fetchTransactionAnalyticsRankings = async ({ 
	limit = 50, 
	page = 1, 
	sortBy = 'total_transactions',
	timeWindow = '24h' 
} = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/transaction-analytics/rankings`)
		
		if (limit) url.searchParams.append("limit", limit)
		if (page) url.searchParams.append("page", page)
		if (sortBy) url.searchParams.append("sortBy", sortBy)
		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)

		return useFetch(url.href, {
			key: `transaction_analytics_rankings_${limit}_${page}_${sortBy}_${timeWindow}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch transaction processing analytics by geographic location
 */
export const fetchGeographicTransactionAnalytics = async ({ timeWindow = '24h' } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/transaction-analytics/geographic`)
		
		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)

		return useFetch(url.href, {
			key: `geographic_transaction_analytics_${timeWindow}`,
		})
	} catch (error) {
		throw error
	}
}

/**
 * Fetch transaction processing analytics by infrastructure provider
 */
export const fetchProviderTransactionAnalytics = async ({ timeWindow = '24h' } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/transaction-analytics/providers`)
		
		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)

		return useFetch(url.href, {
			key: `provider_transaction_analytics_${timeWindow}`,
		})
	} catch (error) {
		throw error
	}
} 