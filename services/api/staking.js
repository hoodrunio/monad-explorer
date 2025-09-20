/** Staking API Services */
import { createPublicClient, http, parseEther, formatEther } from 'viem'
import { monadTestnet, STAKING_CONFIG } from '~/config/chains'

// Create public client for read operations
const publicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(),
})

// Staking Contract ABI (minimal required functions)
const STAKING_ABI = [
	// View functions
	{
		name: 'getEpoch',
		type: 'function',
		stateMutability: 'view',
		inputs: [],
		outputs: [
			{ name: 'epoch', type: 'uint64' },
			{ name: 'inBoundary', type: 'bool' }
		]
	},
	{
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
	},
	{
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
	},
	{
		name: 'getWithdrawalRequest',
		type: 'function',
		stateMutability: 'view',
		inputs: [
			{ name: 'valId', type: 'uint64' },
			{ name: 'delegator', type: 'address' },
			{ name: 'withdrawId', type: 'uint8' }
		],
		outputs: [
			{ name: 'amount', type: 'uint256' },
			{ name: 'acc', type: 'uint256' },
			{ name: 'epoch', type: 'uint64' }
		]
	},
	{
		name: 'getExecutionValidatorSet',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'startIndex', type: 'uint32' }],
		outputs: [
			{ name: 'done', type: 'bool' },
			{ name: 'nextIndex', type: 'uint32' },
			{ name: 'valIds', type: 'uint64[]' }
		]
	},
	{
		name: 'getConsensusValidatorSet',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'startIndex', type: 'uint32' }],
		outputs: [
			{ name: 'done', type: 'bool' },
			{ name: 'nextIndex', type: 'uint32' },
			{ name: 'valIds', type: 'uint64[]' }
		]
	},
	{
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
	},
	{
		name: 'getDelegators',
		type: 'function',
		stateMutability: 'view',
		inputs: [
			{ name: 'valId', type: 'uint64' },
			{ name: 'startDelegator', type: 'address' }
		],
		outputs: [
			{ name: 'done', type: 'bool' },
			{ name: 'nextDelAddr', type: 'address' },
			{ name: 'delAddrs', type: 'address[]' }
		]
	},
	// State-changing functions
	{
		name: 'delegate',
		type: 'function',
		stateMutability: 'payable',
		inputs: [{ name: 'valId', type: 'uint64' }],
		outputs: [{ name: 'success', type: 'bool' }]
	},
	{
		name: 'undelegate',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'valId', type: 'uint64' },
			{ name: 'amount', type: 'uint256' },
			{ name: 'withdrawId', type: 'uint8' }
		],
		outputs: [{ name: 'success', type: 'bool' }]
	},
	{
		name: 'compound',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [{ name: 'valId', type: 'uint64' }],
		outputs: [{ name: 'success', type: 'bool' }]
	},
	{
		name: 'claimRewards',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [{ name: 'valId', type: 'uint64' }],
		outputs: [{ name: 'success', type: 'bool' }]
	},
	{
		name: 'withdraw',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'valId', type: 'uint64' },
			{ name: 'withdrawId', type: 'uint8' }
		],
		outputs: [{ name: 'success', type: 'bool' }]
	}
]

/**
 * Get current epoch information using API instead of RPC
 */
export async function getCurrentEpoch() {
	try {
		const { fetchEpochInfo } = await import('@/services/api/epoch')
		const { data } = await fetchEpochInfo()
		
		const epochData = data.value?.data || data.value
		
		if (epochData) {
			return {
				epoch: epochData.currentEpoch,
				inBoundary: epochData.inBoundary || false,
				// Calculate estimated time until next epoch
				estimatedNextEpoch: new Date(Date.now() + (5.5 * 60 * 60 * 1000))
			}
		}
		
		// Fallback to RPC if API fails
		const result = await publicClient.readContract({
			address: STAKING_CONFIG.CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: 'getEpoch',
		})
		
		return {
			epoch: Number(result[0]),
			inBoundary: result[1],
			estimatedNextEpoch: new Date(Date.now() + (5.5 * 60 * 60 * 1000))
		}
	} catch (error) {
		console.error('Failed to get current epoch:', error)
		throw error
	}
}

/**
 * Get validator information by ID
 */
export async function getValidatorById(valId) {
	try {
		const result = await publicClient.readContract({
			address: STAKING_CONFIG.CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: 'getValidator',
			args: [BigInt(valId)],
		})
		
		const commissionRate = Number(result[4]) / 1e18 * 100 // Convert to percentage
		
		return {
			valId: Number(valId),
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
			// Formatted values
			formattedStake: formatEther(result[2]),
			formattedConsensusStake: formatEther(result[6]),
			formattedUnclaimedReward: formatEther(result[5]),
			commissionRate: commissionRate,
			formattedCommissionRate: `${commissionRate.toFixed(2)}%`,
			isActive: Number(result[6]) > 0, // Has consensus stake
		}
	} catch (error) {
		console.error(`Failed to get validator ${valId}:`, error)
		throw error
	}
}

/**
 * Get all validators in execution set
 */
export async function getExecutionValidators() {
	try {
		const validators = []
		let startIndex = 0
		let done = false
		
		while (!done) {
			const result = await publicClient.readContract({
				address: STAKING_CONFIG.CONTRACT_ADDRESS,
				abi: STAKING_ABI,
				functionName: 'getExecutionValidatorSet',
				args: [startIndex],
			})
			
			done = result[0]
			startIndex = Number(result[1])
			const valIds = result[2]
			
			// Fetch detailed info for each validator
			for (const valId of valIds) {
				try {
					const validatorInfo = await getValidatorById(Number(valId))
					validators.push(validatorInfo)
				} catch (error) {
					console.error(`Failed to fetch validator ${valId}:`, error)
				}
			}
		}
		
		// Sort by stake (descending)
		return validators.sort((a, b) => {
			const stakeA = BigInt(a.consensusStake || a.stake)
			const stakeB = BigInt(b.consensusStake || b.stake)
			return stakeA > stakeB ? -1 : stakeA < stakeB ? 1 : 0
		})
	} catch (error) {
		console.error('Failed to get execution validators:', error)
		throw error
	}
}

/**
 * Get consensus validators (active set)
 */
export async function getConsensusValidators() {
	try {
		const validators = []
		let startIndex = 0
		let done = false
		
		while (!done) {
			const result = await publicClient.readContract({
				address: STAKING_CONFIG.CONTRACT_ADDRESS,
				abi: STAKING_ABI,
				functionName: 'getConsensusValidatorSet',
				args: [startIndex],
			})
			
			done = result[0]
			startIndex = Number(result[1])
			const valIds = result[2]
			
			// Fetch detailed info for each validator
			for (const valId of valIds) {
				try {
					const validatorInfo = await getValidatorById(Number(valId))
					validators.push(validatorInfo)
				} catch (error) {
					console.error(`Failed to fetch validator ${valId}:`, error)
				}
			}
		}
		
		// Sort by consensus stake (descending)
		return validators.sort((a, b) => {
			const stakeA = BigInt(a.consensusStake)
			const stakeB = BigInt(b.consensusStake)
			return stakeA > stakeB ? -1 : stakeA < stakeB ? 1 : 0
		})
	} catch (error) {
		console.error('Failed to get consensus validators:', error)
		throw error
	}
}

/**
 * Get delegator information for a specific validator
 */
export async function getDelegatorInfo(valId, delegatorAddress) {
	try {
		const result = await publicClient.readContract({
			address: STAKING_CONFIG.CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: 'getDelegator',
			args: [BigInt(valId), delegatorAddress],
		})
		
		return {
			valId: Number(valId),
			delegatorAddress,
			stake: result[0].toString(),
			acc: result[1].toString(),
			rewards: result[2].toString(),
			deltaStake: result[3].toString(),
			nextDeltaStake: result[4].toString(),
			deltaEpoch: Number(result[5]),
			nextDeltaEpoch: Number(result[6]),
			// Formatted values
			formattedStake: formatEther(result[0]),
			formattedRewards: formatEther(result[2]),
			formattedDeltaStake: formatEther(result[3]),
			formattedNextDeltaStake: formatEther(result[4]),
			hasStake: result[0] > 0,
			hasRewards: result[2] > 0,
			hasPendingStake: result[3] > 0 || result[4] > 0,
		}
	} catch (error) {
		console.error(`Failed to get delegator info for validator ${valId}:`, error)
		throw error
	}
}

/**
 * Get all delegations for a delegator
 */
export async function getDelegatorDelegations(delegatorAddress) {
	try {
		const delegations = []
		let startValId = 0
		let done = false
		
		while (!done) {
			const result = await publicClient.readContract({
				address: STAKING_CONFIG.CONTRACT_ADDRESS,
				abi: STAKING_ABI,
				functionName: 'getDelegations',
				args: [delegatorAddress, BigInt(startValId)],
			})
			
			done = result[0]
			startValId = Number(result[1])
			const valIds = result[2]
			
			// Fetch detailed info for each delegation
			for (const valId of valIds) {
				try {
					const delegationInfo = await getDelegatorInfo(Number(valId), delegatorAddress)
					if (delegationInfo.hasStake || delegationInfo.hasRewards || delegationInfo.hasPendingStake) {
						// Also get validator info
						const validatorInfo = await getValidatorById(Number(valId))
						delegations.push({
							...delegationInfo,
							validator: validatorInfo,
						})
					}
				} catch (error) {
					console.error(`Failed to fetch delegation info for validator ${valId}:`, error)
				}
			}
		}
		
		return delegations
	} catch (error) {
		console.error('Failed to get delegator delegations:', error)
		throw error
	}
}

/**
 * Get withdrawal request information
 */
export async function getWithdrawalRequest(valId, delegatorAddress, withdrawId) {
	try {
		const result = await publicClient.readContract({
			address: STAKING_CONFIG.CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: 'getWithdrawalRequest',
			args: [BigInt(valId), delegatorAddress, withdrawId],
		})
		
		if (result[0] === 0n) {
			return null // No withdrawal request
		}
		
		return {
			valId: Number(valId),
			delegatorAddress,
			withdrawId,
			amount: result[0].toString(),
			acc: result[1].toString(),
			epoch: Number(result[2]),
			formattedAmount: formatEther(result[0]),
			isWithdrawable: false, // Will be set based on current epoch
		}
	} catch (error) {
		console.error(`Failed to get withdrawal request for validator ${valId}, withdraw ID ${withdrawId}:`, error)
		return null
	}
}

/**
 * Get all withdrawal requests for a delegator
 * Note: This requires checking all possible withdrawal IDs (0-255) for each validator
 */
export async function getDelegatorWithdrawals(delegatorAddress) {
	try {
		const withdrawals = []
		const delegations = await getDelegatorDelegations(delegatorAddress)
		const currentEpoch = await getCurrentEpoch()
		
		// Check withdrawal requests for each validator the user has delegated to
		for (const delegation of delegations) {
			const valId = delegation.valId
			
			// Check first few withdrawal IDs (0-9) to avoid too many calls
			for (let withdrawId = 0; withdrawId < 10; withdrawId++) {
				try {
					const withdrawal = await getWithdrawalRequest(valId, delegatorAddress, withdrawId)
					if (withdrawal) {
						// Check if withdrawal is ready
						const withdrawableEpoch = withdrawal.epoch + STAKING_CONFIG.WITHDRAWAL_DELAY
						withdrawal.isWithdrawable = currentEpoch.epoch >= withdrawableEpoch
						withdrawal.withdrawableEpoch = withdrawableEpoch
						withdrawal.validator = delegation.validator
						withdrawals.push(withdrawal)
					}
				} catch (error) {
					// Skip errors for non-existent withdrawal requests
				}
			}
		}
		
		return withdrawals
	} catch (error) {
		console.error('Failed to get delegator withdrawals:', error)
		throw error
	}
}

/**
 * Get delegators for a specific validator
 */
export async function getValidatorDelegators(valId, limit = 100) {
	try {
		const delegators = []
		let startDelegator = '0x0000000000000000000000000000000000000000'
		let done = false
		let count = 0
		
		while (!done && count < limit) {
			const result = await publicClient.readContract({
				address: STAKING_CONFIG.CONTRACT_ADDRESS,
				abi: STAKING_ABI,
				functionName: 'getDelegators',
				args: [BigInt(valId), startDelegator],
			})
			
			done = result[0]
			startDelegator = result[1]
			const delegatorAddresses = result[2]
			
			// Fetch detailed info for each delegator
			for (const delegatorAddr of delegatorAddresses) {
				if (count >= limit) break
				
				try {
					const delegatorInfo = await getDelegatorInfo(valId, delegatorAddr)
					if (delegatorInfo.hasStake || delegatorInfo.hasRewards) {
						delegators.push(delegatorInfo)
						count++
					}
				} catch (error) {
					console.error(`Failed to fetch delegator info for ${delegatorAddr}:`, error)
				}
			}
		}
		
		// Sort by stake (descending)
		return delegators.sort((a, b) => {
			const stakeA = BigInt(a.stake)
			const stakeB = BigInt(b.stake)
			return stakeA > stakeB ? -1 : stakeA < stakeB ? 1 : 0
		})
	} catch (error) {
		console.error(`Failed to get delegators for validator ${valId}:`, error)
		throw error
	}
}

/**
 * Calculate APY for a validator (estimated)
 * This is a simplified calculation based on block rewards
 */
export function calculateValidatorAPY(validator, totalNetworkStake, blockReward = 1) {
	try {
		// Handle scientific notation and string conversion safely
		let stakeValue = validator.consensusStake || validator.stake
		if (!stakeValue || stakeValue === '0') return 0
		
		// Convert to string first
		let stakeStr = String(stakeValue)
		
		// Handle scientific notation by converting to fixed notation first
		if (stakeStr.includes('e') || stakeStr.includes('E')) {
			const num = Number(stakeStr)
			if (isNaN(num) || !isFinite(num)) return 0
			// Use toLocaleString to avoid scientific notation for very large numbers
			stakeStr = num.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 0 })
		}
		
		// Ensure it's a valid integer string for BigInt
		if (!/^\d+$/.test(stakeStr)) {
			console.warn('Invalid stake value for BigInt conversion:', stakeValue)
			return 0
		}
		
		const validatorStake = BigInt(stakeStr)
		if (validatorStake === 0n) return 0
		
		// Simplified APY calculation
		// Assumes validator produces blocks proportional to their stake
		const validatorShare = Number(validatorStake) / Number(totalNetworkStake)
		const blocksPerYear = (365 * 24 * 60 * 60) / 2 // Assuming 2 second block time
		const annualRewards = blocksPerYear * blockReward * validatorShare * (1 - validator.commissionRate / 100)
		const apy = (annualRewards / Number(formatEther(validatorStake))) * 100
		
		return Math.max(0, Math.min(100, apy)) // Cap between 0-100%
	} catch (error) {
		console.error('Failed to calculate APY:', error)
		return 0
	}
}

/**
 * Get staking statistics using fetchValidatorRankings instead of RPC
 */
export async function getStakingStats() {
	try {
		const { fetchValidatorRankings } = await import('@/services/api/validator')
		
		const [activeValidators, allValidators, epochInfo] = await Promise.all([
			fetchValidatorRankings({
				limit: 1000,
				active_only: true,
				sortBy: 'stake',
				window: '7d'
			}),
			fetchValidatorRankings({
				limit: 1000,
				active_only: false,
				sortBy: 'stake',
				window: '7d'
			}),
			getCurrentEpoch(),
		])
		
		const activeValidatorsData = activeValidators.data.value?.data || []
		const allValidatorsData = allValidators.data.value?.data || []
		
		const totalStaked = activeValidatorsData.reduce((sum, validator) => {
			const stake = validator.staking?.real_time_stake_mon ? 
				parseEther(validator.staking.real_time_stake_mon.toString()) : BigInt('0')
			return sum + stake
		}, BigInt('0'))
		
		const totalExecutionStake = allValidatorsData.reduce((sum, validator) => {
			const stake = validator.staking?.real_time_stake_mon ? 
				parseEther(validator.staking.real_time_stake_mon.toString()) : BigInt('0')
			return sum + stake
		}, BigInt('0'))
		
		const averageCommission = activeValidatorsData.reduce((sum, validator) => {
			return sum + (validator.staking?.commission_rate || 0)
		}, 0) / Math.max(activeValidatorsData.length, 1)
		
		return {
			currentEpoch: epochInfo.epoch,
			inBoundary: epochInfo.inBoundary,
			activeValidators: activeValidatorsData.length,
			totalValidators: allValidatorsData.length,
			totalStaked: totalStaked.toString(),
			formattedTotalStaked: formatEther(totalStaked),
			totalExecutionStake: totalExecutionStake.toString(),
			formattedTotalExecutionStake: formatEther(totalExecutionStake),
			averageCommission: averageCommission.toFixed(2),
			// Calculate estimated APY for the network
			estimatedAPY: activeValidatorsData.length > 0 
				? calculateValidatorAPY(
					{ consensusStake: (totalStaked / BigInt(activeValidatorsData.length)).toString(), commissionRate: averageCommission },
					totalStaked.toString()
				).toFixed(2)
				: '0.00'
		}
	} catch (error) {
		console.error('Failed to get staking stats:', error)
		throw error
	}
}

// Export the ABI for use in other modules
export { STAKING_ABI }
