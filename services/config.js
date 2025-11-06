export const Server = {
	API: {
		mainnet: "https://monad-indexer.hoodscan.io",
		testnet: "https://monad-indexer.hoodscan.io",
		dev: "https://monad-indexer.hoodscan.io",
	},
	// New Indexer API (Blockscout-compatible)
	Indexer: {
		mainnet: "https://monad-tn1-indexer.hoodscan.io/api/v2",
		testnet: "https://monad-tn1-indexer.hoodscan.io/api/v2",
		dev: "https://monad-tn1-indexer.hoodscan.io/api/v2",
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
		case "explorer.monad.io":
		case "localhost:9090":
			return Server.API.mainnet

		case "testnet.monad.io":
			return Server.API.testnet

		case "dev.monad.io":
			return Server.API.dev

		default:
			return Server.API.dev
	}
}

// New Indexer API URL (primary API for all new implementations)
export const useIndexerUrl = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "explorer.monad.io":
		case "localhost:9090":
			return Server.Indexer.mainnet

		case "testnet.monad.io":
			return Server.Indexer.testnet

		case "dev.monad.io":
			return Server.Indexer.dev

		default:
			return Server.Indexer.testnet
	}
}

// Old Explorer API URL (DEPRECATED - Only for account balance compatibility)
// TODO: Remove after account balance migration
export const useExplorerURL = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "explorer.monad.io":
		case "localhost:9090":
			return Server.Explorer.mainnet

		case "testnet.monad.io":
			return Server.Explorer.testnet

		case "dev.monad.io":
			return Server.Explorer.dev

		default:
			return Server.Explorer.testnet
	}
}

export const getStartChainDate = () => {
	const requestURL = useRequestURL()

	switch (requestURL.hostname) {
		case "explorer.monad.io":
			return "2024-01-01T00:00:00Z"

		case "testnet.monad.io":
			return "2024-01-01T00:00:00Z"

		case "dev.monad.io":
			return "2024-01-01T00:00:00Z"

		default:
			return "2024-01-01T00:00:00Z"
	}
}

export const nodeStatsURL = "https://node-stats.monad.io/v1"
export const validatorAnalyticsURL = "https://analytics.monad.io/v1"
export const quoteServiceURL = "https://quote.monad.io/v1"

export const useBlockscoutURL = () => {
	// Blockscout API base URL
	const config = useRuntimeConfig()
	return config.public.blockscoutApiUrl || ''
}
