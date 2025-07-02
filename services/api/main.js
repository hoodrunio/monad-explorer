/** Services */
import { useServerURL } from "@/services/config"

// Network Health & Summary APIs
export const fetchNetworkSummary = () => {
	try {
		const url = new URL(`${useServerURL()}/api/network/summary`)

		return useFetch(url.href, {
			key: "network_summary",
		})
	} catch (error) {
		console.error(error)
	}
}

export const fetchNetworkMetrics = ({ timeWindow = '1h', granularity = '1m' } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/network/metrics`)

		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)
		if (granularity) url.searchParams.append("granularity", granularity)

		return useFetch(url.href, {
			key: "network_metrics",
		})
	} catch (error) {
		console.error(error)
	}
}

export const fetchConsensusEfficiency = ({ timeWindow = '1h' } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/network/consensus-efficiency`)

		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)

		return useFetch(url.href, {
			key: "consensus_efficiency",
		})
	} catch (error) {
		console.error(error)
	}
}

// DNS & Geographic APIs
export const fetchGeographicDistribution = () => {
	try {
		const url = new URL(`${useServerURL()}/api/dns/geographic-distribution`)

		return useFetch(url.href, {
			key: "geographic_distribution",
			server: false,
		})
	} catch (error) {
		console.error(error)
	}
}

export const fetchNetworkTopology = () => {
	try {
		const url = new URL(`${useServerURL()}/api/dns/network-topology`)

		return useFetch(url.href, {
			key: "network_topology",
			server: false,
		})
	} catch (error) {
		console.error(error)
	}
}

export const fetchCentralizationRisks = () => {
	try {
		const url = new URL(`${useServerURL()}/api/dns/centralization-risks`)

		return useFetch(url.href, {
			key: "centralization_risks",
			server: false,
		})
	} catch (error) {
		console.error(error)
	}
}

// Events APIs
export const fetchRecentEvents = ({ type, limit, offset } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/events/recent`)

		if (type) url.searchParams.append("type", type)
		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)

		return useFetch(url.href, {
			key: "recent_events",
		})
	} catch (error) {
		console.error(error)
	}
}

export const fetchEventTypes = () => {
	try {
		const url = new URL(`${useServerURL()}/api/events/types`)

		return useFetch(url.href, {
			key: "event_types",
		})
	} catch (error) {
		console.error(error)
	}
}

export const fetchEventStatistics = () => {
	try {
		const url = new URL(`${useServerURL()}/api/events/statistics`)

		return useFetch(url.href, {
			key: "event_statistics",
		})
	} catch (error) {
		console.error(error)
	}
}

export const fetchEventSearch = ({ eventType, validatorId, startTime, endTime, limit, offset }) => {
	try {
		const url = new URL(`${useServerURL()}/api/events/search`)

		if (eventType) url.searchParams.append("eventType", eventType)
		if (validatorId) url.searchParams.append("validatorId", validatorId)
		if (startTime) url.searchParams.append("startTime", startTime)
		if (endTime) url.searchParams.append("endTime", endTime)
		if (limit) url.searchParams.append("limit", limit)
		if (offset) url.searchParams.append("offset", offset)

		return useFetch(url.href, {
			key: "event_search",
		})
	} catch (error) {
		console.error(error)
	}
}

// Geographic Distribution with detailed metrics
export const fetchGeographicDistributionDetailed = ({ timeWindow = '24h' } = {}) => {
	try {
		const url = new URL(`${useServerURL()}/api/geographic/distribution`)

		if (timeWindow) url.searchParams.append("timeWindow", timeWindow)

		return useFetch(url.href, {
			key: "geographic_distribution_detailed",
		})
	} catch (error) {
		console.error(error)
	}
}
