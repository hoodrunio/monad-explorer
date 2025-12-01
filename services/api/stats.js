/** Services */
import { quoteServiceURL, tvlServiceURL, useServerURL, useIndexerUrl, useStatsApiUrl } from "@/services/config"

export const fetchGeneralStats = async ({ name }) => {
	try {
		const data = await $fetch(`${useServerURL()}/stats/${name}`)
		return data
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchSeries = async ({ table, period, column, from, to }) => {
	try {
		const url = new URL(`${useServerURL()}/stats/series/${table}/${period}`)

		if (column) url.searchParams.append("column", column)
		if (from) url.searchParams.append("from", from)
		if (to) url.searchParams.append("to", to)
		
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchSeriesCumulative = async ({ name, period, from, to }) => {
	try {
		const url = new URL(`${useServerURL()}/stats/series/${name}/${period}/cumulative`)

		if (from) url.searchParams.append("from", from)
		if (to) url.searchParams.append("to", to)
		
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchSummary = async ({ table, func, column, from, to }) => {
	try {
		const url = new URL(`${useServerURL()}/stats/summary/${table}/${func}`)

		if (column) url.searchParams.append("column", column)
		if (from) url.searchParams.append("from", from)
		if (to) url.searchParams.append("to", to)
		
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchTPS = async () => {
	try {
		const url = new URL(`${useServerURL()}/stats/tps`)

		const data = await $fetch(url.href)
		return data
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchTVS = async ({ period, from, to }) => {
	try {
		let url = ""

		if (period) {
			url = new URL(`${tvlServiceURL}/tvs/${period}`)

			if (from) url.searchParams.append("from", from)
			if (to) url.searchParams.append("to", to)
		} else {
			url = new URL(`${tvlServiceURL}/tvs`)
		}

		const data = await $fetch(url.href)
		return data
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchPrice = async () => {
	try {
		const url = new URL(`${quoteServiceURL}/price/current`)

		const data = await $fetch(url.href)
		return data
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchPriceSeries = async ({ from }) => {
	try {
		const url = new URL(`${quoteServiceURL}/price/series/1d`)

		if (from) url.searchParams.append("from", from)

		const data = await $fetch(url.href)
		return data
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchAddressCoinBalanceHistory = async ({ hash }) => {
	try {
		const url = new URL(`${useIndexerUrl()}/addresses/${hash}/coin-balance-history`)
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		return { items: [] }
	}
}

export const fetchAddressCoinBalanceHistoryByDay = async ({ hash }) => {
	try {
		const url = new URL(`${useIndexerUrl()}/addresses/${hash}/coin-balance-history-by-day`)
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		return { items: [], days: 0 }
	}
}

export const fetchMarketStats = async () => {
	try {
		const url = new URL(`${useIndexerUrl()}/stats/charts/market`)
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		return null
	}
}

export const fetchIndexerStats = async () => {
	try {
		const url = new URL(`${useIndexerUrl()}/stats`)
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		return null
	}
}

// Stats API - Counters (NetworkStats widget için)
export const fetchStatsCounters = async () => {
	try {
		const url = new URL(`${useStatsApiUrl()}/counters`)
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		return null
	}
}

// Stats API - newTxns (TransactionsWidget için)
export const fetchNewTxnsChart = async ({ from, to, resolution = 'DAY' }) => {
	try {
		const url = new URL(`${useStatsApiUrl()}/lines/newTxns`)
		url.searchParams.append('from', from)
		url.searchParams.append('to', to)
		url.searchParams.append('resolution', resolution)
		const data = await $fetch(url.href)
		return data
	} catch (error) {
		return null
	}
}