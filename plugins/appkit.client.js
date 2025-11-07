import { createAppKit } from '@reown/appkit/vue'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { monadTestnet } from '~/config/chains'

export default defineNuxtPlugin(() => {
	const runtimeConfig = useRuntimeConfig()

	// Disable analytics for development to avoid fetch errors
	// Can be enabled in production if needed

	// Monad Testnet is already properly configured in chains.js
	// Just use it directly as Wagmi chain format is compatible with AppKit
	const monadNetwork = monadTestnet

	// Create Wagmi Adapter with proper configuration
	const wagmiAdapter = new WagmiAdapter({
		networks: [monadNetwork],
		projectId: runtimeConfig.public.WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
	})

	// Create AppKit modal instance
	const modal = createAppKit({
		adapters: [wagmiAdapter],
		networks: [monadNetwork],
		defaultNetwork: monadNetwork,
		projectId: runtimeConfig.public.WALLET_CONNECT_PROJECT_ID || 'demo-project-id',

		// Metadata
		metadata: {
			name: 'Monad Explorer',
			description: 'Monad blockchain explorer with staking functionality',
			url: 'https://monad.hoodscan.io',
			icons: ['https://monad.hoodscan.io/favicon.ico'],
		},

		// Featured wallets (custom list as requested)
		featuredWalletIds: [
			'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
			'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
			'1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
			'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom
		],

		// Features
		features: {
			// Analytics disabled to prevent fetch errors in development
			// Enable in production: analytics: true
			analytics: false,
		},

		// Enable all wallets
		allWallets: 'SHOW',

		// Theme configuration (matches app's dark theme)
		themeMode: 'dark', // Match app's default dark theme

		// Theme variables to match application design system
		themeVariables: {
			// Typography - match app font stack
			'--apkt-font-family': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
			'--apkt-font-size-master': '8px',

			// Brand color - match app's brand color (#18d2a5) for buttons, icons, labels
			'--apkt-accent': '#18d2a5',

			// Border radius - match app's card border radius
			'--apkt-border-radius-master': '12px',

			// Z-index - ensure modal appears above other elements
			'--apkt-z-index': 9999,
		},

		// Enable network switching
		enableNetworkSwitch: true,

		// Enable auto-reconnect
		enableReconnect: true,
	})

	// Make wagmi config globally available (for backward compatibility)
	return {
		provide: {
			wagmiConfig: wagmiAdapter.wagmiConfig,
			appKitModal: modal,
		},
	}
})
