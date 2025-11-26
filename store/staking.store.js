import { defineStore } from 'pinia'
import { getBalance } from '@wagmi/core'
import { formatEther, parseEther } from 'viem'
import { abbreviate } from '~/services/utils/amounts'
import { monadTestnet, monadMainnet } from '~/config/chains'
import { createStakingService } from '~/services/StakingService'
import { createNetworkService } from '~/services/NetworkService'
import { isCorrectNetwork as checkNetwork } from '~/utils/chain'
import { isMainnet } from '~/services/utils/general'

export const useStakingStore = defineStore('staking', {
	state: () => ({
		// Wallet State
		isConnected: false,
		address: null,
		balance: '0',
		chainId: null,

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
		// Get target chain based on current network (mainnet/testnet)
		targetChain: () => {
			return isMainnet() ? monadMainnet : monadTestnet
		},

		// Network validation - checks if wallet is on correct network
		isCorrectNetwork: (state) => {
			if (!state.chainId) return false
			const targetChainId = isMainnet() ? monadMainnet.id : monadTestnet.id
			return checkNetwork(state.chainId, targetChainId)
		},

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
		// Initialize wallet watchers (now handled by WalletConnectButton)
		async initializeWallet() {
			// This is now handled by the WalletConnectButton component
			// State updates are managed directly by that component
		},

		// Fetch user balance
		async fetchBalance() {
			if (!this.address) return

			try {
				const { $wagmiConfig } = useNuxtApp()
				const targetChainId = isMainnet() ? monadMainnet.id : monadTestnet.id
				const balance = await getBalance($wagmiConfig, {
					address: this.address,
					chainId: targetChainId,
				})
				this.balance = balance.value.toString()
			} catch (error) {
				// Failed to fetch balance
			}
		},

		// Fetch current epoch info
		async fetchEpochInfo() {
			const { fetchEpochInfo } = useStakingData()
			const epochInfo = await fetchEpochInfo()
			this.currentEpoch = epochInfo.currentEpoch
			this.inBoundary = epochInfo.inBoundary
		},

		// Fetch user's delegations
		async fetchUserDelegations() {
			if (!this.address) return []

			const { fetchUserDelegations } = useStakingData()
			const delegations = await fetchUserDelegations(this.address)
			this.userDelegations = delegations
			return delegations
		},

		// Fetch delegator info for specific validator
		async fetchDelegatorInfo(valId) {
			if (!this.address) return null

			const { fetchDelegatorInfo } = useStakingData()
			return await fetchDelegatorInfo(valId, this.address)
		},

		// Fetch user's withdrawal requests
		async fetchUserWithdrawals() {
			if (!this.address) return []

			// Only fetch withdrawals if user has delegations
			if (this.userDelegations.length === 0) {
				this.userWithdrawals = []
				return []
			}

			const { fetchUserWithdrawals } = useStakingData()
			const withdrawals = await fetchUserWithdrawals(this.address)
			this.userWithdrawals = withdrawals
			return withdrawals
		},

		// Fetch all user staking data
		async fetchUserStakingData() {
			if (!this.address) return

			const { fetchAllStakingData } = useStakingData()
			const data = await fetchAllStakingData(this.address)

			this.currentEpoch = data.currentEpoch
			this.inBoundary = data.inBoundary
			this.userDelegations = data.userDelegations
			this.userWithdrawals = data.userWithdrawals
			this.userRewards = data.userRewards
		},

		// Delegate to a validator
		async delegate(valId, amount) {
			if (!this.address || !this.isConnected) {
				throw new Error('Wallet not connected')
			}

			if (!this.isCorrectNetwork) {
				throw new Error(`Please switch to ${isMainnet() ? 'Monad Mainnet' : 'Monad Testnet'}`)
			}

			this.loading.delegate = true

			try {
				const { $wagmiConfig } = useNuxtApp()
				const stakingService = createStakingService($wagmiConfig)

				// Execute transaction (network validation happens inside service)
				const transaction = await stakingService.delegate(valId, amount)

				// Track transaction
				this.pendingTransactions.push(transaction)

				// Refresh data
				await this.fetchBalance()
				await this.fetchUserStakingData()

				// Remove from pending after delay
				setTimeout(() => {
					this.pendingTransactions = this.pendingTransactions.filter(
						(tx) => tx.hash !== transaction.hash
					)
				}, 3000)

				return transaction
			} catch (error) {
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
				throw new Error(`Please switch to ${isMainnet() ? 'Monad Mainnet' : 'Monad Testnet'}`)
			}

			this.loading.undelegate = true

			try {
				const { $wagmiConfig } = useNuxtApp()
				const stakingService = createStakingService($wagmiConfig)

				// Execute transaction
				const transaction = await stakingService.undelegate(valId, amount, withdrawId)

				// Track transaction
				this.pendingTransactions.push(transaction)

				// Refresh data
				await this.fetchUserStakingData()

				// Remove from pending after delay
				setTimeout(() => {
					this.pendingTransactions = this.pendingTransactions.filter(
						(tx) => tx.hash !== transaction.hash
					)
				}, 3000)

				return transaction
			} catch (error) {
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
				throw new Error(`Please switch to ${isMainnet() ? 'Monad Mainnet' : 'Monad Testnet'}`)
			}

			this.loading.compound = true

			try {
				const { $wagmiConfig } = useNuxtApp()
				const stakingService = createStakingService($wagmiConfig)

				// Execute transaction
				const transaction = await stakingService.compound(valId)

				// Track transaction
				this.pendingTransactions.push(transaction)

				// Refresh data
				await this.fetchUserStakingData()

				// Remove from pending after delay
				setTimeout(() => {
					this.pendingTransactions = this.pendingTransactions.filter(
						(tx) => tx.hash !== transaction.hash
					)
				}, 3000)

				return transaction
			} catch (error) {
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
				throw new Error(`Please switch to ${isMainnet() ? 'Monad Mainnet' : 'Monad Testnet'}`)
			}

			this.loading.claimRewards = true

			try {
				const { $wagmiConfig } = useNuxtApp()
				const stakingService = createStakingService($wagmiConfig)

				// Execute transaction
				const transaction = await stakingService.claimRewards(valId)

				// Track transaction
				this.pendingTransactions.push(transaction)

				// Refresh data
				await this.fetchBalance()
				await this.fetchUserStakingData()

				// Remove from pending after delay
				setTimeout(() => {
					this.pendingTransactions = this.pendingTransactions.filter(
						(tx) => tx.hash !== transaction.hash
					)
				}, 3000)

				return transaction
			} catch (error) {
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
				throw new Error(`Please switch to ${isMainnet() ? 'Monad Mainnet' : 'Monad Testnet'}`)
			}

			this.loading.withdraw = true

			try {
				const { $wagmiConfig } = useNuxtApp()
				const stakingService = createStakingService($wagmiConfig)

				// Execute transaction
				const transaction = await stakingService.withdraw(valId, withdrawId)

				// Track transaction
				this.pendingTransactions.push(transaction)

				// Refresh data
				await this.fetchBalance()
				await this.fetchUserStakingData()

				// Remove from pending after delay
				setTimeout(() => {
					this.pendingTransactions = this.pendingTransactions.filter(
						(tx) => tx.hash !== transaction.hash
					)
				}, 3000)

				return transaction
			} catch (error) {
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

		// Switch to Monad network
		async switchToMonadNetwork() {
			const { $wagmiConfig } = useNuxtApp()

			if (!$wagmiConfig) {
				return false
			}

			const networkService = createNetworkService($wagmiConfig)
			return await networkService.switchToMonadNetwork()
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
							// Failed to fetch validator info
						}
					}
				}
				
				this.validators = validators
			} catch (error) {
				// Failed to fetch validators
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
				return null
			}
		},
	},
})
