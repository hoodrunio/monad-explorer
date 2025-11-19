/**
 * useNetworkValidation - Composable for network validation and management
 * Provides reactive network state and validation utilities
 */

import { createNetworkService } from '~/services/NetworkService'
import { monadTestnet, monadMainnet } from '~/config/chains'
import { isCorrectNetwork as checkNetwork } from '~/utils/chain'
import { showNetworkSwitchRequiredNotification } from '~/utils/notifications'
import { getChainId, watchChainId } from '@wagmi/core'
import { isMainnet } from '~/services/utils/general'

export function useNetworkValidation() {
	const { $wagmiConfig } = useNuxtApp()

	// Create network service instance ONCE
	const networkService = $wagmiConfig ? createNetworkService($wagmiConfig) : null

	// Reactive state - initialize with current chain
	const chainId = ref($wagmiConfig ? getChainId($wagmiConfig) : null)

	// Watch for chain changes
	if ($wagmiConfig) {
		watchChainId($wagmiConfig, {
			onChange: (newChainId) => {
				chainId.value = newChainId
			},
		})
	}

	// Get target chain based on current environment (mainnet/testnet)
	const targetChain = computed(() => isMainnet() ? monadMainnet : monadTestnet)

	// Computed properties
	const isCorrectNetwork = computed(() => checkNetwork(chainId.value, targetChain.value.id))
	const currentChainId = computed(() => networkService?.getCurrentChainId() || chainId.value)

	/**
	 * Switches to the appropriate Monad network (mainnet or testnet)
	 * @returns {Promise<boolean>} True if switch successful
	 */
	async function switchToMonadNetwork() {
		if (!networkService) {
			console.error('Network service not available')
			return false
		}

		return await networkService.switchToMonadNetwork()
	}

	/**
	 * Ensures the user is on the correct Monad network, switches if necessary
	 * @returns {Promise<boolean>} True if user is on correct network
	 */
	async function ensureCorrectNetwork() {
		if (!networkService) {
			console.error('Network service not available')
			return false
		}

		return await networkService.ensureMonadNetwork()
	}

	/**
	 * Validates network and shows notification if incorrect
	 * @param {boolean} showNotification - Whether to show notification (default: true)
	 * @returns {boolean} True if on correct network
	 */
	function validateNetwork(showNotification = true) {
		if (isCorrectNetwork.value) {
			return true
		}

		if (showNotification) {
			showNetworkSwitchRequiredNotification(targetChain.value.name)
		}

		return false
	}

	/**
	 * Switches to a specific network by chain ID
	 * @param {number} targetChainId - Target chain ID
	 * @param {string} chainName - Chain name for notifications
	 * @returns {Promise<boolean>} True if switch successful
	 */
	async function switchToNetwork(targetChainId, chainName) {
		if (!networkService) {
			console.error('Network service not available')
			return false
		}

		return await networkService.switchToNetwork(targetChainId, chainName)
	}

	/**
	 * Updates the chain ID state
	 * @param {string|number} newChainId - New chain ID
	 */
	function updateChainId(newChainId) {
		chainId.value = newChainId
	}

	return {
		// State
		chainId,

		// Computed
		isCorrectNetwork,
		currentChainId,

		// Methods
		switchToMonadNetwork,
		ensureCorrectNetwork,
		validateNetwork,
		switchToNetwork,
		updateChainId,
	}
}
