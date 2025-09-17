import { createConfig, http } from '@wagmi/core'
import { injected, metaMask, walletConnect } from '@wagmi/core/connectors'
import { monadTestnet } from '~/config/chains'

// Web3 Configuration
export default defineNuxtPlugin(async () => {
	// Create Wagmi config
	const config = createConfig({
		chains: [monadTestnet],
		connectors: [
			injected(),
			metaMask(),
			walletConnect({
				projectId: process.env.WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
			}),
		],
		transports: {
			[monadTestnet.id]: http(),
		},
	})

	// Make config globally available
	return {
		provide: {
			web3Config: config,
		},
	}
})
