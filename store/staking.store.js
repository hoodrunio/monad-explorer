import { defineStore } from 'pinia'
import { 
	getAccount, 
	getBalance, 
	watchAccount, 
	watchChainId,
	readContract,
	writeContract,
	waitForTransactionReceipt,
} from '@wagmi/core'
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem'
import { abbreviate } from '~/services/utils/amounts'
import { STAKING_CONFIG, STAKING_SELECTORS, monadTestnet } from '~/config/chains'

export const useStakingStore = defineStore('staking', {
	state: () => ({
		// Wallet State
		isConnected: false,
		address: null,
		balance: '0',
		chainId: null,
		isCorrectNetwork: false,

		// Staking State
		currentEpoch: 0,
		inBoundary: false,
		userDelegations: [],
		userWithdrawals: [],
		userRewards: '0',
		
		// Validators
		validators: [],
		validatorsLoading: false,
		consensusValidators: [],
		executionValidators: [],
		
		// UI State
		loading: {
			delegate: false,
			undelegate: false,
			compound: false,
			claimRewards: false,
			withdraw: false,
		},
		
		// Transaction State
		pendingTransactions: [],
	}),

	getters: {
		// Formatted balances
		formattedBalance: (state) => formatEther(BigInt(state.balance || '0')),
		formattedRewards: (state) => formatEther(BigInt(state.userRewards || '0')),
		abbreviatedRewards: (state) => {
			const amount = parseFloat(formatEther(BigInt(state.userRewards || '0')))
			return abbreviate(amount, 2) || '0'
		},
		
		// Total staked amount
		totalStaked: (state) => {
			return state.userDelegations.reduce((total, delegation) => {
				return total + BigInt(delegation.stake || '0')
			}, BigInt('0'))
		},
		
		formattedTotalStaked() {
			return formatEther(this.totalStaked)
		},
		
		// Abbreviated formatting for large amounts
		abbreviatedTotalStaked() {
			const amount = parseFloat(formatEther(this.totalStaked))
			return abbreviate(amount, 2) || '0'
		},
		
		// Available balance for staking (excluding gas reserve)
		availableBalance: (state) => {
			const balance = BigInt(state.balance || '0')
			const gasReserve = parseEther('0.01') // Reserve for gas
			return balance > gasReserve ? balance - gasReserve : BigInt('0')
		},
		
		formattedAvailableBalance() {
			return formatEther(this.availableBalance)
		},
		
		abbreviatedAvailableBalance() {
			const amount = parseFloat(formatEther(this.availableBalance))
			return abbreviate(amount, 2) || '0'
		},
		
		// Check if user has pending withdrawals
		hasPendingWithdrawals: (state) => {
			return state.userWithdrawals.some(withdrawal => withdrawal.epoch > state.currentEpoch)
		},
		
		// Get withdrawable amounts
		withdrawableAmount: (state) => {
			return state.userWithdrawals
				.filter(withdrawal => withdrawal.epoch <= state.currentEpoch)
				.reduce((total, withdrawal) => total + BigInt(withdrawal.amount || '0'), BigInt('0'))
		},
		
		formattedWithdrawableAmount() {
			return formatEther(this.withdrawableAmount)
		},
		
		abbreviatedWithdrawableAmount() {
			const amount = parseFloat(formatEther(this.withdrawableAmount))
			return abbreviate(amount, 2) || '0'
		},
	},

	actions: {
		// Initialize wallet watchers (now handled by RainbowConnectButton)
		async initializeWallet() {
			// This is now handled by the RainbowConnectButton component
			// State updates are managed directly by that component
		},

		// Fetch user balance
		async fetchBalance() {
			if (!this.address) return
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				const balance = await getBalance($wagmiConfig, {
					address: this.address,
					chainId: monadTestnet.id,
				})
				this.balance = balance.value.toString()
			} catch (error) {
				console.error('Failed to fetch balance:', error)
			}
		},

		// Fetch current epoch info
		async fetchEpochInfo() {
			try {
				const { $wagmiConfig } = useNuxtApp()
				const result = await readContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [{
						name: 'getEpoch',
						type: 'function',
						stateMutability: 'view',
						inputs: [],
						outputs: [
							{ name: 'epoch', type: 'uint64' },
							{ name: 'inBoundary', type: 'bool' }
						]
					}],
					functionName: 'getEpoch',
				})
				
				this.currentEpoch = Number(result[0])
				this.inBoundary = result[1]
			} catch (error) {
				console.error('Failed to fetch epoch info:', error)
			}
		},

		// Fetch user's delegations
		async fetchUserDelegations() {
			if (!this.address) return []
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				const delegations = []
				let startValId = 0
				let done = false
				
				while (!done) {
					const result = await readContract($wagmiConfig, {
						address: STAKING_CONFIG.CONTRACT_ADDRESS,
						abi: [{
							name: 'getDelegations',
							type: 'function',
							stateMutability: 'view',
							inputs: [
								{ name: 'delegator', type: 'address' },
								{ name: 'startValId', type: 'uint64' }
							],
							outputs: [
								{ name: 'done', type: 'bool' },
								{ name: 'nextValId', type: 'uint64' },
								{ name: 'valIds', type: 'uint64[]' }
							]
						}],
						functionName: 'getDelegations',
						args: [this.address, startValId],
					})
					
					done = result[0]
					startValId = Number(result[1])
					
					// Fetch detailed info for each validator
					for (const valId of result[2]) {
						try {
							const delegatorInfo = await this.fetchDelegatorInfo(Number(valId))
							if (delegatorInfo) {
								delegations.push({
									valId: Number(valId),
									...delegatorInfo
								})
							}
						} catch (error) {
							console.error(`Failed to fetch delegation info for validator ${valId}:`, error)
						}
					}
				}
				
				this.userDelegations = delegations
				return delegations
			} catch (error) {
				console.error('Failed to fetch user delegations:', error)
				return []
			}
		},

		// Fetch delegator info for specific validator
		async fetchDelegatorInfo(valId) {
			if (!this.address) return null
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				const result = await readContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [{
						name: 'getDelegator',
						type: 'function',
						stateMutability: 'view',
						inputs: [
							{ name: 'valId', type: 'uint64' },
							{ name: 'delegator', type: 'address' }
						],
						outputs: [
							{ name: 'stake', type: 'uint256' },
							{ name: 'acc', type: 'uint256' },
							{ name: 'rewards', type: 'uint256' },
							{ name: 'deltaStake', type: 'uint256' },
							{ name: 'nextDeltaStake', type: 'uint256' },
							{ name: 'deltaEpoch', type: 'uint64' },
							{ name: 'nextDeltaEpoch', type: 'uint64' }
						]
					}],
					functionName: 'getDelegator',
					args: [valId, this.address],
				})
				
				return {
					stake: result[0].toString(),
					acc: result[1].toString(),
					rewards: result[2].toString(),
					deltaStake: result[3].toString(),
					nextDeltaStake: result[4].toString(),
					deltaEpoch: Number(result[5]),
					nextDeltaEpoch: Number(result[6]),
				}
			} catch (error) {
				console.error(`Failed to fetch delegator info for validator ${valId}:`, error)
				return null
			}
		},

		// Fetch user's withdrawal requests
		async fetchUserWithdrawals() {
			// Implementation would iterate through withdrawal IDs
			// For now, return empty array as withdrawal enumeration isn't straightforward
			this.userWithdrawals = []
			return []
		},

		// Fetch all user staking data
		async fetchUserStakingData() {
			if (!this.address) return
			
			await Promise.all([
				this.fetchEpochInfo(),
				this.fetchUserDelegations(),
				this.fetchUserWithdrawals(),
			])
			
			// Calculate total rewards
			this.userRewards = this.userDelegations
				.reduce((total, delegation) => total + BigInt(delegation.rewards || '0'), BigInt('0'))
				.toString()
		},

		// Delegate to a validator
		async delegate(valId, amount) {
			if (!this.address || !this.isConnected) {
				throw new Error('Wallet not connected')
			}
			
			if (!this.isCorrectNetwork) {
				throw new Error('Please switch to Monad Testnet')
			}
			
			this.loading.delegate = true
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				const amountWei = parseEther(amount.toString())
				
				const hash = await writeContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [{
						name: 'delegate',
						type: 'function',
						stateMutability: 'payable',
						inputs: [{ name: 'valId', type: 'uint64' }],
						outputs: [{ name: 'success', type: 'bool' }]
					}],
					functionName: 'delegate',
					args: [valId],
					value: amountWei,
				})
				
				this.pendingTransactions.push({
					hash,
					type: 'delegate',
					valId,
					amount: amount.toString(),
					timestamp: Date.now(),
				})
				
				// Wait for confirmation
				await waitForTransactionReceipt($wagmiConfig, { hash })
				
				// Refresh data
				await this.fetchBalance()
				await this.fetchUserStakingData()
				
				// Remove from pending
				this.pendingTransactions = this.pendingTransactions.filter(tx => tx.hash !== hash)
				
				return hash
			} catch (error) {
				console.error('Delegation failed:', error)
				throw error
			} finally {
				this.loading.delegate = false
			}
		},

		// Undelegate from a validator
		async undelegate(valId, amount, withdrawId = 0) {
			if (!this.address || !this.isConnected) {
				throw new Error('Wallet not connected')
			}
			
			if (!this.isCorrectNetwork) {
				throw new Error('Please switch to Monad Testnet')
			}
			
			this.loading.undelegate = true
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				const amountWei = parseEther(amount.toString())
				
				const hash = await writeContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [{
						name: 'undelegate',
						type: 'function',
						stateMutability: 'nonpayable',
						inputs: [
							{ name: 'valId', type: 'uint64' },
							{ name: 'amount', type: 'uint256' },
							{ name: 'withdrawId', type: 'uint8' }
						],
						outputs: [{ name: 'success', type: 'bool' }]
					}],
					functionName: 'undelegate',
					args: [valId, amountWei, withdrawId],
				})
				
				this.pendingTransactions.push({
					hash,
					type: 'undelegate',
					valId,
					amount: amount.toString(),
					withdrawId,
					timestamp: Date.now(),
				})
				
				// Wait for confirmation
				await waitForTransactionReceipt($wagmiConfig, { hash })
				
				// Refresh data
				await this.fetchUserStakingData()
				
				// Remove from pending
				this.pendingTransactions = this.pendingTransactions.filter(tx => tx.hash !== hash)
				
				return hash
			} catch (error) {
				console.error('Undelegation failed:', error)
				throw error
			} finally {
				this.loading.undelegate = false
			}
		},

		// Compound rewards
		async compound(valId) {
			if (!this.address || !this.isConnected) {
				throw new Error('Wallet not connected')
			}
			
			if (!this.isCorrectNetwork) {
				throw new Error('Please switch to Monad Testnet')
			}
			
			this.loading.compound = true
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				
				const hash = await writeContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [{
						name: 'compound',
						type: 'function',
						stateMutability: 'nonpayable',
						inputs: [{ name: 'valId', type: 'uint64' }],
						outputs: [{ name: 'success', type: 'bool' }]
					}],
					functionName: 'compound',
					args: [valId],
				})
				
				this.pendingTransactions.push({
					hash,
					type: 'compound',
					valId,
					timestamp: Date.now(),
				})
				
				// Wait for confirmation
				await waitForTransactionReceipt($wagmiConfig, { hash })
				
				// Refresh data
				await this.fetchUserStakingData()
				
				// Remove from pending
				this.pendingTransactions = this.pendingTransactions.filter(tx => tx.hash !== hash)
				
				return hash
			} catch (error) {
				console.error('Compound failed:', error)
				throw error
			} finally {
				this.loading.compound = false
			}
		},

		// Claim rewards
		async claimRewards(valId) {
			if (!this.address || !this.isConnected) {
				throw new Error('Wallet not connected')
			}
			
			if (!this.isCorrectNetwork) {
				throw new Error('Please switch to Monad Testnet')
			}
			
			this.loading.claimRewards = true
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				
				const hash = await writeContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [{
						name: 'claimRewards',
						type: 'function',
						stateMutability: 'nonpayable',
						inputs: [{ name: 'valId', type: 'uint64' }],
						outputs: [{ name: 'success', type: 'bool' }]
					}],
					functionName: 'claimRewards',
					args: [valId],
				})
				
				this.pendingTransactions.push({
					hash,
					type: 'claimRewards',
					valId,
					timestamp: Date.now(),
				})
				
				// Wait for confirmation
				await waitForTransactionReceipt($wagmiConfig, { hash })
				
				// Refresh data
				await this.fetchBalance()
				await this.fetchUserStakingData()
				
				// Remove from pending
				this.pendingTransactions = this.pendingTransactions.filter(tx => tx.hash !== hash)
				
				return hash
			} catch (error) {
				console.error('Claim rewards failed:', error)
				throw error
			} finally {
				this.loading.claimRewards = false
			}
		},

		// Withdraw undelegated tokens
		async withdraw(valId, withdrawId) {
			if (!this.address || !this.isConnected) {
				throw new Error('Wallet not connected')
			}
			
			if (!this.isCorrectNetwork) {
				throw new Error('Please switch to Monad Testnet')
			}
			
			this.loading.withdraw = true
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				
				const hash = await writeContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [{
						name: 'withdraw',
						type: 'function',
						stateMutability: 'nonpayable',
						inputs: [
							{ name: 'valId', type: 'uint64' },
							{ name: 'withdrawId', type: 'uint8' }
						],
						outputs: [{ name: 'success', type: 'bool' }]
					}],
					functionName: 'withdraw',
					args: [valId, withdrawId],
				})
				
				this.pendingTransactions.push({
					hash,
					type: 'withdraw',
					valId,
					withdrawId,
					timestamp: Date.now(),
				})
				
				// Wait for confirmation
				await waitForTransactionReceipt($wagmiConfig, { hash })
				
				// Refresh data
				await this.fetchBalance()
				await this.fetchUserStakingData()
				
				// Remove from pending
				this.pendingTransactions = this.pendingTransactions.filter(tx => tx.hash !== hash)
				
				return hash
			} catch (error) {
				console.error('Withdraw failed:', error)
				throw error
			} finally {
				this.loading.withdraw = false
			}
		},

		// Reset user data
		resetUserData() {
			this.address = null
			this.balance = '0'
			this.isConnected = false
			this.userDelegations = []
			this.userWithdrawals = []
			this.userRewards = '0'
			this.pendingTransactions = []
		},

		// Fetch validators list
		async fetchValidators() {
			this.validatorsLoading = true
			
			try {
				const { $wagmiConfig } = useNuxtApp()
				const validators = []
				let startIndex = 0
				let done = false
				
				// Fetch execution validator set
				while (!done) {
					const result = await readContract($wagmiConfig, {
						address: STAKING_CONFIG.CONTRACT_ADDRESS,
						abi: [{
							name: 'getExecutionValidatorSet',
							type: 'function',
							stateMutability: 'view',
							inputs: [{ name: 'startIndex', type: 'uint32' }],
							outputs: [
								{ name: 'done', type: 'bool' },
								{ name: 'nextIndex', type: 'uint32' },
								{ name: 'valIds', type: 'uint64[]' }
							]
						}],
						functionName: 'getExecutionValidatorSet',
						args: [startIndex],
					})
					
					done = result[0]
					startIndex = Number(result[1])
					
					// Fetch detailed info for each validator
					for (const valId of result[2]) {
						try {
							const validatorInfo = await this.fetchValidatorInfo(Number(valId))
							if (validatorInfo) {
								validators.push({
									valId: Number(valId),
									...validatorInfo
								})
							}
						} catch (error) {
							console.error(`Failed to fetch validator info for ${valId}:`, error)
						}
					}
				}
				
				this.validators = validators
			} catch (error) {
				console.error('Failed to fetch validators:', error)
			} finally {
				this.validatorsLoading = false
			}
		},

		// Fetch validator info
		async fetchValidatorInfo(valId) {
			try {
				const { $wagmiConfig } = useNuxtApp()
				const result = await readContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [{
						name: 'getValidator',
						type: 'function',
						stateMutability: 'view',
						inputs: [{ name: 'valId', type: 'uint64' }],
						outputs: [
							{ name: 'authAddress', type: 'address' },
							{ name: 'flags', type: 'uint256' },
							{ name: 'stake', type: 'uint256' },
							{ name: 'accRewardPerToken', type: 'uint256' },
							{ name: 'commission', type: 'uint256' },
							{ name: 'unclaimedReward', type: 'uint256' },
							{ name: 'consensusStake', type: 'uint256' },
							{ name: 'consensusCommission', type: 'uint256' },
							{ name: 'snapshotStake', type: 'uint256' },
							{ name: 'snapshotCommission', type: 'uint256' },
							{ name: 'secpPubkey', type: 'bytes' },
							{ name: 'blsPubkey', type: 'bytes' }
						]
					}],
					functionName: 'getValidator',
					args: [valId],
				})
				
				return {
					authAddress: result[0],
					flags: Number(result[1]),
					stake: result[2].toString(),
					accRewardPerToken: result[3].toString(),
					commission: result[4].toString(),
					unclaimedReward: result[5].toString(),
					consensusStake: result[6].toString(),
					consensusCommission: result[7].toString(),
					snapshotStake: result[8].toString(),
					snapshotCommission: result[9].toString(),
					secpPubkey: result[10],
					blsPubkey: result[11],
					// Calculated fields
					commissionRate: Number(result[4]) / 1e18, // Convert to percentage
					formattedStake: formatEther(result[2]),
					formattedConsensusStake: formatEther(result[6]),
				}
			} catch (error) {
				console.error(`Failed to fetch validator info for ${valId}:`, error)
				return null
			}
		},
	},
})
