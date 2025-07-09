/** Services */
import { useExplorerURL } from "@/services/config"

// Analytics - Transactions
export const fetchTransactionAnalytics = async ({ period = 'daily', limit = 30 } = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/analytics/transactions/${period}`)
		
		if (limit) url.searchParams.append("limit", limit)

		const data = await $fetch(url.href)
		return data
	} catch (error) {
		console.error("Error fetching transaction analytics:", error)
		return null
	}
}

// Analytics - Gas Current
export const fetchCurrentGasAnalytics = async () => {
	try {
		const url = new URL(`${useExplorerURL()}/api/analytics/gas/current`)

		const data = await $fetch(url.href)
		return data
	} catch (error) {
		console.error("Error fetching current gas analytics:", error)
		return null
	}
}

// Analytics - Gas History
export const fetchGasHistoryAnalytics = async ({ limit = 30 } = {}) => {
	try {
		const url = new URL(`${useExplorerURL()}/api/analytics/gas/history`)
		
		if (limit) url.searchParams.append("limit", limit)

		const data = await $fetch(url.href)
		return data
	} catch (error) {
		console.error("Error fetching gas history analytics:", error)
		return null
	}
} 