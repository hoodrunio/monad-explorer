import { createConfig, http } from '@wagmi/core'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
import { monadTestnet } from '~/config/chains'

// RainbowKit-style configuration for Vue/Nuxt
export default defineNuxtPlugin(async () => {
	const runtimeConfig = useRuntimeConfig()
	
	// Create Wagmi config following RainbowKit patterns
	const config = createConfig({
		chains: [monadTestnet],
		connectors: [
			injected({ target: 'metaMask' }),
			metaMask(),
			walletConnect({
				projectId: runtimeConfig.public.WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
				metadata: {
					name: 'Monad Explorer',
					description: 'Monad blockchain explorer with staking',
					url: 'https://monad.hoodscan.io',
					icons: ['https://monad.hoodscan.io/favicon.ico'],
				},
			}),
		],
		transports: {
			[monadTestnet.id]: http(),
		},
		ssr: true,
	})

	// Make config globally available
	return {
		provide: {
			wagmiConfig: config,
		},
	}
})
