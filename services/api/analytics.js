/** Services */
import { useIndexerUrl } from "@/services/config"

/**
 * Analytics - Transaction Trends
 * Fetches daily transaction count chart data
 *
 * @param {Object} options - Query options
 * @param {string} options.period - Period type ('daily' or 'weekly') - Note: API returns daily, weekly aggregation done client-side
 * @param {number} options.limit - Number of data points (not supported by new API, returns ~30 days)
 * @returns {Object} Chart data with transactions_count per day
 */
export const fetchTransactionAnalytics = async ({ period = 'daily', limit = 30 } = {}) => {
	try {
		const url = new URL(`${useIndexerUrl()}/stats/charts/transactions`)

		const response = await $fetch(url.href)

		// Transform response to match component expectations
		// New API returns: { chart_data: [{ date, transactions_count }] }
		// Old API returned: { success: true, data: { data: [{ date, transactionCount, ... }] } }

		if (!response?.chart_data) {
			return null
		}

		// If period is 'weekly', we need to aggregate data client-side
		let chartData = response.chart_data

		if (period === 'weekly') {
			// Group by week and sum transactions
			chartData = aggregateByWeek(chartData)
		}

		return {
			success: true,
			data: {
				data: chartData.map(item => ({
					date: item.date,
					transactionCount: item.transactions_count || 0,
					// Note: New API doesn't provide blockCount, totalGasUsed, averageGasPrice per day
					// If components need these, they'll need to be updated
				})),
			},
		}
	} catch (error) {
		console.error('Failed to fetch transaction analytics:', error)
		return null
	}
}

/**
 * Analytics - Current Gas Prices
 * Fetches current gas price recommendations (slow/average/fast)
 *
 * @returns {Object} Current gas prices and recommendations
 */
export const fetchCurrentGasAnalytics = async () => {
	try {
		const url = new URL(`${useIndexerUrl()}/stats`)

		const response = await $fetch(url.href)

		// Transform response to match component expectations
		// New API returns: { gas_prices: { slow, average, fast }, gas_price_updated_at, ... }
		// Old API returned: { success: true, data: { current: { gasPrice, timestamp }, recommendations: { slow, standard, fast } } }

		if (!response?.gas_prices) {
			return null
		}

		return {
			success: true,
			data: {
				current: {
					gasPrice: String(response.gas_prices.average), // Convert to string for consistency
					timestamp: response.gas_price_updated_at || new Date().toISOString(),
				},
				recommendations: {
					slow: String(response.gas_prices.slow),
					standard: String(response.gas_prices.average),
					fast: String(response.gas_prices.fast),
				},
			},
		}
	} catch (error) {
		console.error('Failed to fetch current gas analytics:', error)
		return null
	}
}

/**
 * Analytics - Gas Price History
 * Fetches historical gas price data for charts
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of data points (not supported by new API, returns ~30 days)
 * @returns {Object} Historical gas price data
 */
export const fetchGasHistoryAnalytics = async ({ limit = 30 } = {}) => {
	try {
		const url = new URL(`${useIndexerUrl()}/stats/charts/market`)

		const response = await $fetch(url.href)

		// Transform response to match component expectations
		// New API returns: { chart_data: [{ date, closing_price, market_cap, tvl }], available_supply }
		// Old API returned: { success: true, data: { data: [{ date, averageGasPrice, totalGasUsed, transactionCount }] } }

		if (!response?.chart_data) {
			return null
		}

		// Note: New API doesn't provide gas-specific history (averageGasPrice, totalGasUsed, transactionCount)
		// It only provides market data (closing_price, market_cap, tvl)
		// Components expecting gas history will need to be updated OR we need a different endpoint

		// For now, return empty gas data structure to prevent breaking
		// TODO: Investigate if there's a dedicated gas history endpoint or if components should use market data
		return {
			success: true,
			data: {
				data: response.chart_data.map(item => ({
					date: item.date,
					// Fallback values since gas history not available in market endpoint
					averageGasPrice: "0",
					totalGasUsed: "0",
					transactionCount: 0,
					// Include market data if components can use it
					closingPrice: item.closing_price,
					marketCap: item.market_cap,
					tvl: item.tvl,
				})),
			},
		}
	} catch (error) {
		console.error('Failed to fetch gas history analytics:', error)
		return null
	}
}

/**
 * Helper function to aggregate daily data into weekly data
 * @param {Array} dailyData - Array of daily data points
 * @returns {Array} Weekly aggregated data
 */
function aggregateByWeek(dailyData) {
	const weeks = {}

	dailyData.forEach(item => {
		const date = new Date(item.date)
		const weekStart = new Date(date)
		weekStart.setDate(date.getDate() - date.getDay()) // Get Sunday of the week
		const weekKey = weekStart.toISOString().split('T')[0]

		if (!weeks[weekKey]) {
			weeks[weekKey] = {
				date: weekKey,
				transactions_count: 0,
			}
		}

		weeks[weekKey].transactions_count += (item.transactions_count || 0)
	})

	return Object.values(weeks).sort((a, b) => new Date(a.date) - new Date(b.date))
}
