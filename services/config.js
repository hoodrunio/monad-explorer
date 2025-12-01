export const Server = {
	API: {
		mainnet: "https://monad-indexer.mainnet.hoodscan.io",
		testnet: "https://monad-indexer.hoodscan.io",
		dev: "https://monad-indexer.mainnet.hoodscan.io",
	},
	// New Indexer API (Blockscout-compatible)
	Indexer: {
		mainnet: "https://monad-mainnet-indexer.hoodscan.io/api/v2",
		testnet: "https://monad-tn1-indexer.hoodscan.io/api/v2",
		dev: "https://monad-mainnet-indexer.hoodscan.io/api/v2",
	},
	// Stats API (counters, chart lines)
	Stats: {
		mainnet: "https://monad-mainnet-indexer.hoodscan.io/stats/api/v1",
		testnet: "https://monad-tn1-indexer.hoodscan.io/stats/api/v1",
		dev: "https://monad-mainnet-indexer.hoodscan.io/stats/api/v1",
	},
	// Old Explorer API (ONLY for account balance compatibility)
	Explorer: {
		mainnet: "https://monad-testnet-api.hoodscan.io",
		testnet: "https://monad-testnet-api.hoodscan.io",
		dev: "https://monad-testnet-api.hoodscan.io",
	},
}

export const useServerURL = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "monad.hoodscan.io":
		case "localhost":
			return Server.API.mainnet

		case "testnet.monad.hoodscan.io":
			return Server.API.testnet

		case "dev.monad.hoodscan.io":
			return Server.API.dev

		default:
			return Server.API.mainnet
	}
}

// New Indexer API URL (primary API for all new implementations)
export const useIndexerUrl = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "monad.hoodscan.io":
		case "localhost":
			return Server.Indexer.mainnet

		case "testnet.monad.hoodscan.io":
			return Server.Indexer.testnet

		case "dev.monad.hoodscan.io":
			return Server.Indexer.dev

		default:
			return Server.Indexer.mainnet
	}
}

// Old Explorer API URL (DEPRECATED - Only for account balance compatibility)
// TODO: Remove after account balance migration
export const useExplorerURL = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "monad.hoodscan.io":
		case "localhost":
			return Server.Explorer.mainnet

		case "testnet.monad.hoodscan.io":
			return Server.Explorer.testnet

		case "dev.monad.hoodscan.io":
			return Server.Explorer.dev

		default:
			return Server.Explorer.mainnet
	}
}

export const getStartChainDate = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "monad.hoodscan.io":
			return "2024-01-01T00:00:00Z"

		case "testnet.monad.hoodscan.io":
			return "2024-01-01T00:00:00Z"

		case "dev.monad.hoodscan.io":
			return "2024-01-01T00:00:00Z"

		default:
			return "2024-01-01T00:00:00Z"
	}
}

// Stats API URL (counters, chart lines)
export const useStatsApiUrl = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "monad.hoodscan.io":
		case "localhost":
			return Server.Stats.mainnet

		case "testnet.monad.hoodscan.io":
			return Server.Stats.testnet

		case "dev.monad.hoodscan.io":
			return Server.Stats.dev

		default:
			return Server.Stats.mainnet
	}
}

export const nodeStatsURL = "https://node-stats.monad.io/v1"
export const validatorAnalyticsURL = "https://analytics.monad.io/v1"
export const quoteServiceURL = "https://quote.monad.io/v1"
export const tvlServiceURL = "https://tvl.monad.io/v1"

// Blockscout-compatible Indexer API URL (uses Server.Indexer configuration)
export const useBlockscoutURL = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "monad.hoodscan.io":
		case "localhost":
			return Server.Indexer.mainnet

		case "testnet.monad.hoodscan.io":
			return Server.Indexer.testnet

		case "dev.monad.hoodscan.io":
			return Server.Indexer.dev

		default:
			return Server.Indexer.mainnet
	}
}
