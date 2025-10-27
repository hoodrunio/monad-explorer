export const Server = {
	API: {
		mainnet: "https://monad-indexer.hoodscan.io",
		testnet: "https://monad-indexer.hoodscan.io",
		dev: "https://monad-indexer.hoodscan.io",
	},
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
			return Server.Explorer.dev
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

export const useVerifierURL = () => {
	const config = useRuntimeConfig()
	return config.public.verifierApiUrl || ''
}

export const useBlockscoutURL = () => {
	// Blockscout API base URL
	const config = useRuntimeConfig()
	return config.public.blockscoutApiUrl || ''
}
