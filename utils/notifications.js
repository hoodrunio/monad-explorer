/**
 * Notification utility functions for consistent notification creation
 * Eliminates code duplication across components
 */

import { useNotificationsStore } from '~/store/notifications.store'

/**
 * Creates a notification with common defaults
 * @private
 */
function createNotification(config) {
	const notificationsStore = useNotificationsStore()
	notificationsStore.create({ notification: config })
}

/**
 * Shows a success notification
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {number} delay - Auto-destroy delay in milliseconds (default: 3000)
 */
export function showSuccessNotification(title, description, delay = 3000) {
	createNotification({
		type: 'success',
		icon: 'check',
		title,
		description,
		autoDestroy: true,
		delay,
	})
}

/**
 * Shows an error notification
 * @param {string} title - Notification title
 * @param {string|Error} error - Error message or Error object
 * @param {number} delay - Auto-destroy delay in milliseconds (default: 5000)
 */
export function showErrorNotification(title, error, delay = 5000) {
	const description = error?.message || error || 'An error occurred'
	createNotification({
		type: 'error',
		icon: 'warning',
		title,
		description,
		autoDestroy: true,
		delay,
	})
}

/**
 * Shows a warning notification
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {boolean} autoDestroy - Whether to auto-destroy (default: false)
 */
export function showWarningNotification(title, description, autoDestroy = false) {
	createNotification({
		type: 'warning',
		icon: 'warning',
		title,
		description,
		autoDestroy,
		delay: autoDestroy ? 5000 : undefined,
	})
}

/**
 * Shows a notification when wallet is connected
 * @param {string} connectorName - Name of the wallet connector (e.g., 'MetaMask', 'WalletConnect')
 */
export function showWalletConnectedNotification(connectorName) {
	showSuccessNotification(
		'Wallet Connected',
		`Successfully connected with ${connectorName}`,
		3000
	)
}

/**
 * Shows a notification when wallet is disconnected
 */
export function showWalletDisconnectedNotification() {
	showSuccessNotification(
		'Wallet Disconnected',
		'Your wallet has been disconnected',
		3000
	)
}

/**
 * Shows a notification when network is switched successfully
 * @param {string} networkName - Name of the network (default: 'Monad Testnet')
 */
export function showNetworkSwitchedNotification(networkName = 'Monad Testnet') {
	showSuccessNotification(
		'Network Switched',
		`Successfully switched to ${networkName}`,
		3000
	)
}

/**
 * Shows a notification when network is added
 * @param {string} networkName - Name of the network (default: 'Monad Testnet')
 */
export function showNetworkAddedNotification(networkName = 'Monad Testnet') {
	showSuccessNotification(
		'Network Added',
		`${networkName} has been added to your wallet`,
		3000
	)
}

/**
 * Shows a warning when user needs to switch networks
 * @param {string} requiredNetwork - Name of the required network
 */
export function showNetworkSwitchRequiredNotification(requiredNetwork = 'Monad Testnet') {
	showWarningNotification(
		'Wrong Network',
		`Please switch to ${requiredNetwork} to continue`,
		false
	)
}

/**
 * Shows a notification when user rejects a request
 */
export function showUserRejectedNotification() {
	showWarningNotification(
		'Request Rejected',
		'You rejected the request',
		true
	)
}

/**
 * Shows a transaction pending notification
 * @param {string} type - Transaction type (e.g., 'Delegation', 'Withdrawal')
 */
export function showTransactionPendingNotification(type) {
	createNotification({
		type: 'info',
		icon: 'clock',
		title: `${type} Pending`,
		description: 'Transaction has been submitted. Please wait for confirmation.',
		autoDestroy: true,
		delay: 5000,
	})
}

/**
 * Shows a transaction success notification
 * @param {string} type - Transaction type (e.g., 'Delegation', 'Withdrawal')
 */
export function showTransactionSuccessNotification(type) {
	showSuccessNotification(
		`${type} Successful`,
		'Your transaction has been confirmed',
		5000
	)
}

/**
 * Shows a transaction failed notification
 * @param {string} type - Transaction type (e.g., 'Delegation', 'Withdrawal')
 * @param {string|Error} error - Error message or Error object
 */
export function showTransactionFailedNotification(type, error) {
	showErrorNotification(
		`${type} Failed`,
		error,
		7000
	)
}
