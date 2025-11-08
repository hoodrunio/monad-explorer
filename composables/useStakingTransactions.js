/**
 * useStakingTransactions - Composable for handling staking transactions
 * Centralizes error handling, user rejection detection, and transaction execution
 * Eliminates code duplication across staking components
 */

import { computed } from 'vue'
import { useStakingStore } from '~/store/staking.store'
import { useModalsStore } from '~/store/modals.store'

/**
 * Error types for staking transactions
 */
const ERROR_TYPES = {
	USER_REJECTED: 'user_rejected',
	INSUFFICIENT_BALANCE: 'insufficient_balance',
	NETWORK_ERROR: 'network_error',
	GAS_ERROR: 'gas_error',
	NONCE_ERROR: 'nonce_error',
	CONTRACT_ERROR: 'contract_error',
	TRANSACTION_FAILED: 'transaction_failed',
}

export function useStakingTransactions() {
	const stakingStore = useStakingStore()
	const modalsStore = useModalsStore()

	/**
	 * Checks if error is a user rejection
	 * @param {Error} error - Error object
	 * @returns {boolean} True if user rejected
	 */
	function isUserRejection(error) {
		return !!(
			error?.userRejected ||
			error?.code === 4001 ||
			error?.message?.includes('User rejected') ||
			error?.message?.includes('User denied') ||
			error?.message?.includes('user rejected')
		)
	}

	/**
	 * Determines error type
	 * @param {Error} error - Error object
	 * @returns {string} Error type constant
	 */
	function getErrorType(error) {
		if (isUserRejection(error)) {
			return ERROR_TYPES.USER_REJECTED
		}

		const message = error?.message?.toLowerCase() || ''

		if (message.includes('insufficient')) {
			return ERROR_TYPES.INSUFFICIENT_BALANCE
		}

		if (message.includes('network') || message.includes('connection')) {
			return ERROR_TYPES.NETWORK_ERROR
		}

		if (message.includes('gas') || message.includes('execution reverted')) {
			return ERROR_TYPES.GAS_ERROR
		}

		if (message.includes('nonce')) {
			return ERROR_TYPES.NONCE_ERROR
		}

		if (message.includes('contract call')) {
			return ERROR_TYPES.CONTRACT_ERROR
		}

		return ERROR_TYPES.TRANSACTION_FAILED
	}

	/**
	 * Parses error to user-friendly message
	 * @param {Error} error - Error object
	 * @returns {string} User-friendly error message
	 */
	function parseTransactionError(error) {
		const errorType = getErrorType(error)

		// Map error types to user-friendly messages
		const errorMessages = {
			[ERROR_TYPES.USER_REJECTED]: 'Transaction was rejected by user',
			[ERROR_TYPES.INSUFFICIENT_BALANCE]: 'Insufficient balance for transaction',
			[ERROR_TYPES.NETWORK_ERROR]: 'Network connection error. Please try again',
			[ERROR_TYPES.GAS_ERROR]: 'Transaction would fail. Please check your input',
			[ERROR_TYPES.NONCE_ERROR]: 'Transaction nonce error. Please try again',
		}

		// Return predefined message if available
		if (errorMessages[errorType]) {
			return errorMessages[errorType]
		}

		// Special handling for contract errors - extract relevant part
		if (errorType === ERROR_TYPES.CONTRACT_ERROR) {
			const message = error?.message || ''
			const contractMatch = message.match(/Details: (.+?)(?:\n|Version:|$)/)
			if (contractMatch) {
				return contractMatch[1].trim()
			}
		}

		// Default: Return first sentence or first 100 chars
		const message = error?.message || 'Transaction failed'
		const firstSentence = message.split('\n')[0].split('.')[0]
		return firstSentence.length > 100
			? firstSentence.substring(0, 100) + '...'
			: firstSentence
	}

	/**
	 * Wraps a staking transaction with standardized error handling
	 * @param {Function} transactionFn - Async function that executes the transaction
	 * @param {Object} options - Options for error handling
	 * @param {Function} options.onSuccess - Callback on success
	 * @param {Function} options.onError - Callback on error (receives parsed error message)
	 * @param {Function} options.onUserRejection - Callback when user rejects (optional)
	 * @param {Function} options.onFinally - Callback that always runs (optional)
	 * @returns {Promise<boolean>} True if successful, false otherwise
	 */
	async function executeTransaction(transactionFn, options = {}) {
		const {
			onSuccess = () => {},
			onError = () => {},
			onUserRejection = () => {},
			onFinally = () => {},
		} = options

		try {
			// Execute the transaction - returns transaction object
			const transaction = await transactionFn()

			// Show success modal with transaction data
			modalsStore.showTransactionResult(transaction)

			// Call success callback
			onSuccess()

			return true
		} catch (error) {
			// Parse error message
			const errorMessage = parseTransactionError(error)

			// Show error modal for ALL errors (including user rejection)
			const errorTransaction = {
				hash: null,
				type: 'transaction',
				timestamp: Date.now(),
				status: 'failed',
				error: errorMessage,
			}
			modalsStore.showTransactionResult(errorTransaction)

			// Determine if user rejected
			const errorType = getErrorType(error)
			if (errorType === ERROR_TYPES.USER_REJECTED) {
				onUserRejection()
			} else {
				onError(errorMessage)
			}

			return false
		} finally {
			// Always call finally callback
			onFinally()
		}
	}

	/**
	 * Delegates tokens to a validator
	 * @param {number} valId - Validator ID
	 * @param {string|number} amount - Amount to delegate
	 * @param {Object} options - Error handling options
	 * @returns {Promise<boolean>} Success status
	 */
	async function delegate(valId, amount, options = {}) {
		return executeTransaction(
			() => stakingStore.delegate(valId, amount),
			options
		)
	}

	/**
	 * Undelegates tokens from a validator
	 * @param {number} valId - Validator ID
	 * @param {string|number} amount - Amount to undelegate
	 * @param {number} withdrawId - Withdrawal ID (default: 0)
	 * @param {Object} options - Error handling options
	 * @returns {Promise<boolean>} Success status
	 */
	async function undelegate(valId, amount, withdrawId = 0, options = {}) {
		return executeTransaction(
			() => stakingStore.undelegate(valId, amount, withdrawId),
			options
		)
	}

	/**
	 * Compounds rewards for a validator
	 * @param {number} valId - Validator ID
	 * @param {Object} options - Error handling options
	 * @returns {Promise<boolean>} Success status
	 */
	async function compound(valId, options = {}) {
		return executeTransaction(
			() => stakingStore.compound(valId),
			options
		)
	}

	/**
	 * Claims rewards from a validator
	 * @param {number} valId - Validator ID
	 * @param {Object} options - Error handling options
	 * @returns {Promise<boolean>} Success status
	 */
	async function claimRewards(valId, options = {}) {
		return executeTransaction(
			() => stakingStore.claimRewards(valId),
			options
		)
	}

	/**
	 * Withdraws undelegated tokens
	 * @param {number} valId - Validator ID
	 * @param {number} withdrawId - Withdrawal ID
	 * @param {Object} options - Error handling options
	 * @returns {Promise<boolean>} Success status
	 */
	async function withdraw(valId, withdrawId, options = {}) {
		return executeTransaction(
			() => stakingStore.withdraw(valId, withdrawId),
			options
		)
	}

	return {
		// Utilities
		isUserRejection,
		getErrorType,
		parseTransactionError,
		executeTransaction,

		// Transaction methods
		delegate,
		undelegate,
		compound,
		claimRewards,
		withdraw,

		// Constants
		ERROR_TYPES,

		// Store loading states
		loading: computed(() => stakingStore.loading),
	}
}
