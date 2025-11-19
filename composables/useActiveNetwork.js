/**
 * Composable for getting active network configuration
 * Determines which network (mainnet/testnet) is active based on hostname
 */
import { monadMainnet, monadTestnet } from '@/config/chains'
import { isMainnet, getNetworkName } from '@/services/utils/general'

export const useActiveNetwork = () => {
	const config = useRuntimeConfig()

	/**
	 * Get the currently active network name
	 * @returns {'mainnet' | 'testnet'}
	 */
	const getActiveNetworkType = () => {
		return isMainnet() ? 'mainnet' : 'testnet'
	}

	/**
	 * Get the active chain configuration
	 * @returns {Object} Chain configuration object
	 */
	const getActiveChain = () => {
		return isMainnet() ? monadMainnet : monadTestnet
	}

	/**
	 * Get the active RPC endpoint
	 * @returns {string} RPC URL
	 */
	const getActiveRpc = () => {
		return isMainnet()
			? config.public.mainnetRpc
			: config.public.testnetRpc
	}

	/**
	 * Get the active chain ID
	 * @returns {number} Chain ID
	 */
	const getActiveChainId = () => {
		return isMainnet()
			? config.public.mainnetChainId
			: config.public.testnetChainId
	}

	/**
	 * Get the display name for the active network
	 * @returns {string} e.g., "Monad Mainnet" or "Monad Testnet-1"
	 */
	const getActiveNetworkDisplayName = () => {
		const chain = getActiveChain()
		return chain.name
	}

	/**
	 * Check if a given chain ID matches the active network
	 * @param {number} chainId - Chain ID to check
	 * @returns {boolean}
	 */
	const isActiveNetwork = (chainId) => {
		return chainId === getActiveChainId()
	}

	/**
	 * Get the target network info for switching
	 * @returns {Object} Target network info
	 */
	const getTargetNetwork = () => {
		const chain = getActiveChain()
		return {
			chainId: `0x${chain.id.toString(16)}`, // Convert to hex string for wallet
			chainName: chain.name,
			nativeCurrency: chain.nativeCurrency,
			rpcUrls: chain.rpcUrls.default.http,
			blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : [],
		}
	}

	// Reactive computed values
	const activeNetworkType = computed(() => getActiveNetworkType())
	const activeChain = computed(() => getActiveChain())
	const activeRpc = computed(() => getActiveRpc())
	const activeChainId = computed(() => getActiveChainId())
	const activeNetworkName = computed(() => getActiveNetworkDisplayName())

	return {
		// Getters
		getActiveNetworkType,
		getActiveChain,
		getActiveRpc,
		getActiveChainId,
		getActiveNetworkDisplayName,
		isActiveNetwork,
		getTargetNetwork,

		// Reactive computed
		activeNetworkType,
		activeChain,
		activeRpc,
		activeChainId,
		activeNetworkName,
	}
}
