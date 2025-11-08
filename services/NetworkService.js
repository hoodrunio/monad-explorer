/**
 * NetworkService - Handles network switching and validation
 * Eliminates duplicated network switching logic across components
 */

import { switchChain, getChainId } from '@wagmi/core'
import { monadTestnet } from '~/config/chains'
import { formatChainParams } from '~/utils/chain'
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
	 * Switches to Monad Testnet network
	 * Handles chain switching and automatically adds the network if not recognized
	 * @returns {Promise<boolean>} True if switch was successful
	 */
	async switchToMonadNetwork() {
		try {
			// Attempt to switch to Monad Testnet
			await switchChain(this.wagmiConfig, {
				chainId: monadTestnet.id,
			})

			showNetworkSwitchedNotification(monadTestnet.name)
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
				switchError.message || 'Failed to switch to Monad Testnet'
			)
			return false
		}
	}

	/**
	 * Adds Monad Testnet to the wallet
	 * @private
	 * @returns {Promise<boolean>} True if network was added successfully
	 */
	async addMonadNetwork() {
		try {
			const chainParams = formatChainParams(monadTestnet)

			// Request to add the network
			await window.ethereum.request({
				method: 'wallet_addEthereumChain',
				params: [chainParams],
			})

			showNetworkAddedNotification(monadTestnet.name)

			// Small delay to allow wallet to update
			await new Promise((resolve) => setTimeout(resolve, 500))

			// Try switching again after adding
			try {
				await switchChain(this.wagmiConfig, {
					chainId: monadTestnet.id,
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
				addError.message || 'Could not add Monad Testnet to your wallet'
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
	 * Validates and ensures the user is on Monad Testnet
	 * If not, prompts the user to switch
	 * @returns {Promise<boolean>} True if user is on Monad Testnet
	 */
	async ensureMonadNetwork() {
		const currentChainId = this.getCurrentChainId()

		if (currentChainId === monadTestnet.id) {
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
