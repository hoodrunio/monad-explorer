/** Services */
import { useServerURL } from "@/services/config"

// Health Status API
export const fetchHealthStatus = () => {
	try {
		const url = new URL(`${useServerURL()}/health`)

		return useFetch(url.href, {
			key: "health_status",
			server: false, // Client-side only to avoid SSR issues
		})
	} catch (error) {
		// Error handling can be added here
	}
}

// Network Health & Summary APIs
export const fetchNetworkSummary = () => {
	try {
		const url = new URL(`${useServerURL()}/api/network/summary`)

		return useFetch(url.href, {
			key: "network_summary",
		})
	} catch (error) {
		// Error handling can be added here
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
		// Error handling can be added here
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
		// Error handling can be added here
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
		// Error handling can be added here
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
		// Error handling can be added here
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
		// Error handling can be added here
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
		// Error handling can be added here
	}
}

export const fetchEventTypes = () => {
	try {
		const url = new URL(`${useServerURL()}/api/events/types`)

		return useFetch(url.href, {
			key: "event_types",
		})
	} catch (error) {
		// Error handling can be added here
	}
}

export const fetchEventStatistics = () => {
	try {
		const url = new URL(`${useServerURL()}/api/events/statistics`)

		return useFetch(url.href, {
			key: "event_statistics",
		})
	} catch (error) {
		// Error handling can be added here
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
		// Error handling can be added here
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
		// Error handling can be added here
	}
}
