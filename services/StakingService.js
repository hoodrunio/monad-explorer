/**
 * StakingService - Handles all staking transaction logic
 * Eliminates duplicated transaction patterns across the staking store
 */

import { writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { parseEther } from 'viem'
import { STAKING_CONFIG } from '~/config/chains'
import { createNetworkService } from './NetworkService'

/**
 * Transaction configuration for different staking operations
 */
const TRANSACTION_CONFIGS = {
	delegate: {
		functionName: 'delegate',
		abi: [{
			name: 'delegate',
			type: 'function',
			stateMutability: 'payable',
			inputs: [{ name: 'valId', type: 'uint64' }],
			outputs: [{ name: 'success', type: 'bool' }]
		}],
		usesValue: true,
	},
	undelegate: {
		functionName: 'undelegate',
		abi: [{
			name: 'undelegate',
			type: 'function',
			stateMutability: 'nonpayable',
			inputs: [
				{ name: 'valId', type: 'uint64' },
				{ name: 'amount', type: 'uint256' },
				{ name: 'withdrawId', type: 'uint256' }
			],
			outputs: [{ name: 'success', type: 'bool' }]
		}],
		usesValue: false,
	},
	compound: {
		functionName: 'compound',
		abi: [{
			name: 'compound',
			type: 'function',
			stateMutability: 'nonpayable',
			inputs: [{ name: 'valId', type: 'uint64' }],
			outputs: [{ name: 'success', type: 'bool' }]
		}],
		usesValue: false,
	},
	claimRewards: {
		functionName: 'claimRewards',
		abi: [{
			name: 'claimRewards',
			type: 'function',
			stateMutability: 'nonpayable',
			inputs: [{ name: 'valId', type: 'uint64' }],
			outputs: [{ name: 'success', type: 'bool' }]
		}],
		usesValue: false,
	},
	withdraw: {
		functionName: 'withdraw',
		abi: [{
			name: 'withdraw',
			type: 'function',
			stateMutability: 'nonpayable',
			inputs: [
				{ name: 'valId', type: 'uint64' },
				{ name: 'withdrawId', type: 'uint256' }
			],
			outputs: [{ name: 'success', type: 'bool' }]
		}],
		usesValue: false,
	},
}

export class StakingService {
	constructor(wagmiConfig) {
		this.wagmiConfig = wagmiConfig
		this.networkService = createNetworkService(wagmiConfig)
	}

	/**
	 * Validates network and ensures user is on Monad Testnet
	 * @private
	 * @throws {Error} If network switch fails
	 */
	async validateNetwork() {
		const isCorrect = await this.networkService.ensureMonadNetwork()
		if (!isCorrect) {
			throw new Error('Please switch to Monad Testnet to continue')
		}
	}

	/**
	 * Executes a staking transaction with common error handling and receipt tracking
	 * @private
	 * @param {Object} params - Transaction parameters
	 * @param {string} params.type - Transaction type (delegate, undelegate, etc.)
	 * @param {Array} params.args - Contract function arguments
	 * @param {string} [params.value] - Transaction value (for payable functions)
	 * @param {Object} [params.metadata] - Additional transaction metadata
	 * @returns {Promise<Object>} Transaction object with hash and status
	 */
	async executeTransaction({ type, args, value, metadata = {} }) {
		// Validate network first
		await this.validateNetwork()

		const config = TRANSACTION_CONFIGS[type]
		if (!config) {
			throw new Error(`Unknown transaction type: ${type}`)
		}

		// Prepare contract write parameters
		const writeParams = {
			address: STAKING_CONFIG.CONTRACT_ADDRESS,
			abi: config.abi,
			functionName: config.functionName,
			args,
		}

		// Add value for payable functions
		if (config.usesValue && value) {
			writeParams.value = value
		}

		// Execute transaction - let composable handle all error types
		const hash = await writeContract(this.wagmiConfig, writeParams)

		// Create transaction object
		const transaction = {
			hash,
			type,
			timestamp: Date.now(),
			status: 'pending',
			...metadata,
		}

		// Wait for transaction receipt with timeout
		try {
			const receipt = await waitForTransactionReceipt(this.wagmiConfig, {
				hash,
				timeout: 60000, // 60 seconds
			})

			// Update transaction with receipt data
			transaction.status = receipt.status === 'success' ? 'success' : 'failed'
			transaction.blockNumber = receipt.blockNumber
			transaction.gasUsed = receipt.gasUsed
		} catch (receiptError) {
			// Transaction confirmation timeout
			transaction.status = 'failed'
			transaction.error = 'Transaction confirmation timeout'
			console.error('Receipt error:', receiptError)
		}

		return transaction
	}

	/**
	 * Delegates tokens to a validator
	 * @param {number} valId - Validator ID
	 * @param {string|number} amount - Amount to delegate (in ETH)
	 * @returns {Promise<Object>} Transaction object
	 */
	async delegate(valId, amount) {
		const amountWei = parseEther(amount.toString())

		return await this.executeTransaction({
			type: 'delegate',
			args: [Number(valId)],
			value: amountWei,
			metadata: {
				valId: Number(valId),
				amount: amount.toString(),
			},
		})
	}

	/**
	 * Undelegates tokens from a validator
	 * @param {number} valId - Validator ID
	 * @param {string|number} amount - Amount to undelegate (in ETH)
	 * @param {number} withdrawId - Withdrawal ID (default: 0)
	 * @returns {Promise<Object>} Transaction object
	 */
	async undelegate(valId, amount, withdrawId = 0) {
		const amountWei = parseEther(amount.toString())

		return await this.executeTransaction({
			type: 'undelegate',
			args: [Number(valId), amountWei, withdrawId],
			metadata: {
				valId: Number(valId),
				amount: amount.toString(),
				withdrawId,
			},
		})
	}

	/**
	 * Compounds rewards for a validator
	 * @param {number} valId - Validator ID
	 * @returns {Promise<Object>} Transaction object
	 */
	async compound(valId) {
		return await this.executeTransaction({
			type: 'compound',
			args: [Number(valId)],
			metadata: { valId: Number(valId) },
		})
	}

	/**
	 * Claims rewards from a validator
	 * @param {number} valId - Validator ID
	 * @returns {Promise<Object>} Transaction object
	 */
	async claimRewards(valId) {
		return await this.executeTransaction({
			type: 'claimRewards',
			args: [Number(valId)],
			metadata: { valId: Number(valId) },
		})
	}

	/**
	 * Withdraws undelegated tokens
	 * @param {number} valId - Validator ID
	 * @param {number} withdrawId - Withdrawal ID
	 * @returns {Promise<Object>} Transaction object
	 */
	async withdraw(valId, withdrawId) {
		return await this.executeTransaction({
			type: 'withdraw',
			args: [Number(valId), withdrawId],
			metadata: {
				valId: Number(valId),
				withdrawId,
			},
		})
	}

	/**
	 * Creates an error transaction object for failed transactions
	 * @param {string} type - Transaction type
	 * @param {Error} error - Error object
	 * @param {Object} metadata - Transaction metadata
	 * @returns {Object} Error transaction object
	 */
	createErrorTransaction(type, error, metadata = {}) {
		return {
			hash: null,
			type,
			timestamp: Date.now(),
			status: 'failed',
			error: error.message || 'Transaction failed',
			...metadata,
		}
	}
}

/**
 * Factory function to create a StakingService instance
 * @param {Object} wagmiConfig - Wagmi configuration object
 * @returns {StakingService} StakingService instance
 */
export function createStakingService(wagmiConfig) {
	return new StakingService(wagmiConfig)
}
