/**
 * useWalletConnection - Composable for wallet connection management
 * Centralizes wallet connection logic and eliminates duplication
 */

import {
	connect,
	disconnect,
	getAccount,
	getBalance,
	watchAccount,
	watchChainId,
} from '@wagmi/core'
import { formatEther } from 'viem'
import { monadTestnet } from '~/config/chains'
import { normalizeChainId, isCorrectNetwork as checkNetwork } from '~/utils/chain'
import {
	showWalletConnectedNotification,
	showWalletDisconnectedNotification,
	showErrorNotification,
	showUserRejectedNotification,
} from '~/utils/notifications'

export function useWalletConnection() {
	const { $wagmiConfig } = useNuxtApp()

	// Reactive state
	const account = ref(null)
	const balance = ref('0')
	const chainId = ref(null)
	const isConnecting = ref(false)
	const connectingWallet = ref(null)

	// Computed properties
	const isConnected = computed(() => account.value?.isConnected || false)
	const address = computed(() => account.value?.address || null)
	const isCorrectNetwork = computed(() => checkNetwork(chainId.value, monadTestnet.id))

	const formattedAddress = computed(() => {
		if (!address.value) return ''
		return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
	})

	const formattedBalance = computed(() => {
		try {
			const value = parseFloat(formatEther(BigInt(balance.value || '0')))
			return new Intl.NumberFormat('en-US', {
				minimumFractionDigits: 4,
				maximumFractionDigits: 4,
			}).format(value)
		} catch {
			return '0.0000'
		}
	})

	/**
	 * Fetches the current account balance
	 */
	async function fetchBalance() {
		if (!address.value || !$wagmiConfig) return

		try {
			const balanceData = await getBalance($wagmiConfig, {
				address: address.value,
				chainId: monadTestnet.id,
			})
			balance.value = balanceData.value.toString()
		} catch (error) {
			console.error('Failed to fetch balance:', error)
		}
	}

	/**
	 * Connects to a wallet using the specified connector
	 * @param {Object} connector - Wagmi connector instance
	 * @param {string} connectorName - Human-readable connector name
	 * @returns {Promise<boolean>} True if connection successful
	 */
	async function connectWallet(connector, connectorName) {
		if (!$wagmiConfig) {
			showErrorNotification('Configuration Error', 'Wallet configuration not found')
			return false
		}

		try {
			isConnecting.value = true
			connectingWallet.value = connectorName

			await connect($wagmiConfig, { connector })

			showWalletConnectedNotification(connectorName)
			return true
		} catch (error) {
			console.error('Connection error:', error)

			// User rejected the request
			if (error.code === 4001 || error.message?.includes('User rejected')) {
				showUserRejectedNotification()
			} else if (error.message?.includes('Connector already connected')) {
				// Already connected, not really an error
				return true
			} else {
				showErrorNotification('Connection Failed', error)
			}

			return false
		} finally {
			isConnecting.value = false
			connectingWallet.value = null
		}
	}

	/**
	 * Disconnects the current wallet
	 */
	async function disconnectWallet() {
		if (!$wagmiConfig) return

		try {
			await disconnect($wagmiConfig)
			balance.value = '0'
			showWalletDisconnectedNotification()
		} catch (error) {
			console.error('Disconnect error:', error)
			showErrorNotification('Disconnect Failed', error)
		}
	}

	/**
	 * Copies the wallet address to clipboard
	 * @returns {Promise<boolean>} True if copy successful
	 */
	async function copyAddress() {
		if (!address.value) return false

		try {
			await navigator.clipboard.writeText(address.value)
			return true
		} catch (error) {
			console.error('Failed to copy address:', error)
			return false
		}
	}

	/**
	 * Initializes wallet watchers for account and chain changes
	 * @param {Object} callbacks - Optional callbacks for state changes
	 * @param {Function} callbacks.onAccountChange - Called when account changes
	 * @param {Function} callbacks.onChainChange - Called when chain changes
	 */
	function initializeWatchers(callbacks = {}) {
		if (!$wagmiConfig) return

		// Watch account changes
		watchAccount($wagmiConfig, {
			onChange: (accountData) => {
				account.value = accountData

				if (accountData.isConnected && accountData.address) {
					fetchBalance()
				} else {
					balance.value = '0'
				}

				// Call custom callback if provided
				if (callbacks.onAccountChange) {
					callbacks.onAccountChange(accountData)
				}
			},
		})

		// Watch chain changes
		watchChainId($wagmiConfig, {
			onChange: (newChainId) => {
				chainId.value = newChainId

				// Refresh balance when chain changes
				if (account.value?.isConnected) {
					fetchBalance()
				}

				// Call custom callback if provided
				if (callbacks.onChainChange) {
					callbacks.onChainChange(newChainId)
				}
			},
		})

		// Get initial state
		const initialAccount = getAccount($wagmiConfig)
		account.value = initialAccount

		// Get initial chain ID
		const currentChainId = $wagmiConfig.state.chainId
		chainId.value = currentChainId

		// Fetch initial balance if connected
		if (initialAccount.isConnected) {
			fetchBalance()
		}
	}

	return {
		// State
		account,
		balance,
		chainId,
		isConnecting,
		connectingWallet,

		// Computed
		isConnected,
		address,
		isCorrectNetwork,
		formattedAddress,
		formattedBalance,

		// Methods
		connectWallet,
		disconnectWallet,
		fetchBalance,
		copyAddress,
		initializeWatchers,
	}
}
