/**
 * NetworkService - Handles network switching and validation
 * Eliminates duplicated network switching logic across components
 */

import { switchChain, getChainId } from '@wagmi/core'
import { monadTestnet, monadMainnet } from '~/config/chains'
import { formatChainParams } from '~/utils/chain'
import { isMainnet } from '~/services/utils/general'
import {
	showNetworkSwitchedNotification,
	showNetworkAddedNotification,
	showErrorNotification,
	showUserRejectedNotification,
} from '~/utils/notifications'

export class NetworkService {
	constructor(wagmiConfig) {
		this.wagmiConfig = wagmiConfig
	}

	/**
	 * Gets the current chain ID
	 * @returns {number} Current chain ID
	 */
	getCurrentChainId() {
		return getChainId(this.wagmiConfig)
	}

	/**
	 * Get the target Monad network based on environment
	 * @private
	 * @returns {Object} Target chain configuration
	 */
	getTargetChain() {
		return isMainnet() ? monadMainnet : monadTestnet
	}

	/**
	 * Switches to the appropriate Monad network (mainnet or testnet)
	 * Handles chain switching and automatically adds the network if not recognized
	 * @returns {Promise<boolean>} True if switch was successful
	 */
	async switchToMonadNetwork() {
		const targetChain = this.getTargetChain()

		try {
			// Attempt to switch to target Monad network
			await switchChain(this.wagmiConfig, {
				chainId: targetChain.id,
			})

			showNetworkSwitchedNotification(targetChain.name)
			return true
		} catch (switchError) {
			// Chain not added to wallet - code 4902 or unrecognized chain message
			if (
				switchError.code === 4902 ||
				switchError.message?.includes('Unrecognized chain ID') ||
				switchError.message?.includes('Unrecognized chain')
			) {
				return await this.addMonadNetwork()
			}

			// User rejected the request
			if (switchError.code === 4001 || switchError.message?.includes('User rejected')) {
				showUserRejectedNotification()
				return false
			}

			// Other errors
			console.error('Failed to switch network:', switchError)
			showErrorNotification(
				'Network Switch Failed',
				switchError.message || `Failed to switch to ${targetChain.name}`
			)
			return false
		}
	}

	/**
	 * Adds the appropriate Monad network to the wallet
	 * @private
	 * @returns {Promise<boolean>} True if network was added successfully
	 */
	async addMonadNetwork() {
		const targetChain = this.getTargetChain()

		try {
			const chainParams = formatChainParams(targetChain)

			// Request to add the network
			await window.ethereum.request({
				method: 'wallet_addEthereumChain',
				params: [chainParams],
			})

			showNetworkAddedNotification(targetChain.name)

			// Small delay to allow wallet to update
			await new Promise((resolve) => setTimeout(resolve, 500))

			// Try switching again after adding
			try {
				await switchChain(this.wagmiConfig, {
					chainId: targetChain.id,
				})
				return true
			} catch (finalSwitchError) {
				console.error('Failed to switch after adding network:', finalSwitchError)
				return false
			}
		} catch (addError) {
			// User rejected adding the network
			if (addError.code === 4001 || addError.message?.includes('User rejected')) {
				showUserRejectedNotification()
				return false
			}

			console.error('Failed to add network:', addError)
			showErrorNotification(
				'Failed to Add Network',
				addError.message || `Could not add ${targetChain.name} to your wallet`
			)
			return false
		}
	}

	/**
	 * Switches to a specific network by chain ID
	 * @param {number} chainId - Target chain ID
	 * @param {string} chainName - Chain name for notifications
	 * @returns {Promise<boolean>} True if switch was successful
	 */
	async switchToNetwork(chainId, chainName) {
		try {
			await switchChain(this.wagmiConfig, { chainId })
			showNetworkSwitchedNotification(chainName)
			return true
		} catch (error) {
			if (error.code === 4001 || error.message?.includes('User rejected')) {
				showUserRejectedNotification()
				return false
			}

			console.error(`Failed to switch to ${chainName}:`, error)
			showErrorNotification(
				'Network Switch Failed',
				error.message || `Failed to switch to ${chainName}`
			)
			return false
		}
	}

	/**
	 * Validates and ensures the user is on the correct Monad network
	 * If not, prompts the user to switch
	 * @returns {Promise<boolean>} True if user is on correct Monad network
	 */
	async ensureMonadNetwork() {
		const targetChain = this.getTargetChain()
		const currentChainId = this.getCurrentChainId()

		if (currentChainId === targetChain.id) {
			return true
		}

		const switched = await this.switchToMonadNetwork()

		if (switched) {
			// Small delay to allow wallet state to update
			await new Promise((resolve) => setTimeout(resolve, 500))
		}

		return switched
	}
}

/**
 * Factory function to create a NetworkService instance
 * @param {Object} wagmiConfig - Wagmi configuration object
 * @returns {NetworkService} NetworkService instance
 */
export function createNetworkService(wagmiConfig) {
	return new NetworkService(wagmiConfig)
}
