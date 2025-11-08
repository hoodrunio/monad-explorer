/**
 * useStakingData - Composable for fetching staking data from the contract
 * Centralizes all contract read operations
 */

import { readContract } from '@wagmi/core'
import { STAKING_CONFIG } from '~/config/chains'
import { getDelegatorWithdrawals } from '~/services/api/staking'

export function useStakingData() {
	const { $wagmiConfig } = useNuxtApp()

	/**
	 * Fetches current epoch information
	 * @returns {Promise<Object>} Epoch info with epoch number and inBoundary flag
	 */
	async function fetchEpochInfo() {
		try {
			const result = await readContract($wagmiConfig, {
				address: STAKING_CONFIG.CONTRACT_ADDRESS,
				abi: [
					{
						name: 'getEpoch',
						type: 'function',
						stateMutability: 'view',
						inputs: [],
						outputs: [
							{ name: 'epoch', type: 'uint64' },
							{ name: 'inBoundary', type: 'bool' },
						],
					},
				],
				functionName: 'getEpoch',
			})

			return {
				currentEpoch: Number(result[0]),
				inBoundary: result[1],
			}
		} catch (error) {
			console.error('Failed to fetch epoch info:', error)
			return {
				currentEpoch: 0,
				inBoundary: false,
			}
		}
	}

	/**
	 * Fetches delegator information for a specific validator
	 * @param {number} valId - Validator ID
	 * @param {string} address - Delegator address
	 * @returns {Promise<Object|null>} Delegator info or null if not found
	 */
	async function fetchDelegatorInfo(valId, address) {
		if (!address) return null

		try {
			const result = await readContract($wagmiConfig, {
				address: STAKING_CONFIG.CONTRACT_ADDRESS,
				abi: [
					{
						name: 'getDelegator',
						type: 'function',
						stateMutability: 'view',
						inputs: [
							{ name: 'valId', type: 'uint64' },
							{ name: 'delegator', type: 'address' },
						],
						outputs: [
							{ name: 'stake', type: 'uint256' },
							{ name: 'acc', type: 'uint256' },
							{ name: 'rewards', type: 'uint256' },
							{ name: 'deltaStake', type: 'uint256' },
							{ name: 'nextDeltaStake', type: 'uint256' },
							{ name: 'deltaEpoch', type: 'uint64' },
							{ name: 'nextDeltaEpoch', type: 'uint64' },
						],
					},
				],
				functionName: 'getDelegator',
				args: [valId, address],
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
	}

	/**
	 * Fetches all delegations for a user
	 * @param {string} address - User address
	 * @returns {Promise<Array>} Array of delegations
	 */
	async function fetchUserDelegations(address) {
		if (!address) return []

		try {
			const delegations = []
			let startValId = 0
			let done = false

			while (!done) {
				const result = await readContract($wagmiConfig, {
					address: STAKING_CONFIG.CONTRACT_ADDRESS,
					abi: [
						{
							name: 'getDelegations',
							type: 'function',
							stateMutability: 'view',
							inputs: [
								{ name: 'delegator', type: 'address' },
								{ name: 'startValId', type: 'uint64' },
							],
							outputs: [
								{ name: 'done', type: 'bool' },
								{ name: 'nextValId', type: 'uint64' },
								{ name: 'valIds', type: 'uint64[]' },
							],
						},
					],
					functionName: 'getDelegations',
					args: [address, startValId],
				})

				done = result[0]
				startValId = Number(result[1])

				// Fetch detailed info for each validator
				for (const valId of result[2]) {
					try {
						const delegatorInfo = await fetchDelegatorInfo(Number(valId), address)
						if (delegatorInfo) {
							delegations.push({
								valId: Number(valId),
								...delegatorInfo,
							})
						}
					} catch (error) {
						console.error(`Failed to fetch delegation for validator ${valId}:`, error)
					}
				}
			}

			return delegations
		} catch (error) {
			console.error('Failed to fetch user delegations:', error)
			return []
		}
	}

	/**
	 * Fetches user's withdrawal requests
	 * @param {string} address - User address
	 * @returns {Promise<Array>} Array of withdrawals
	 */
	async function fetchUserWithdrawals(address) {
		if (!address) return []

		try {
			const withdrawals = await getDelegatorWithdrawals(address)
			return withdrawals
		} catch (error) {
			console.error('Failed to fetch user withdrawals:', error)
			return []
		}
	}

	/**
	 * Calculates total rewards from delegations
	 * @param {Array} delegations - Array of delegation objects
	 * @returns {string} Total rewards as string
	 */
	function calculateTotalRewards(delegations) {
		if (!delegations || delegations.length === 0) return '0'

		try {
			const total = delegations.reduce((sum, delegation) => {
				return sum + BigInt(delegation.rewards || '0')
			}, BigInt('0'))

			return total.toString()
		} catch (error) {
			console.error('Failed to calculate total rewards:', error)
			return '0'
		}
	}

	/**
	 * Fetches all user staking data in parallel
	 * @param {string} address - User address
	 * @returns {Promise<Object>} Complete staking data
	 */
	async function fetchAllStakingData(address) {
		if (!address) {
			return {
				currentEpoch: 0,
				inBoundary: false,
				userDelegations: [],
				userWithdrawals: [],
				userRewards: '0',
			}
		}

		try {
			// Fetch epoch info and delegations in parallel
			const [epochInfo, delegations] = await Promise.all([
				fetchEpochInfo(),
				fetchUserDelegations(address),
			])

			// Fetch withdrawals (only if user has delegations)
			const withdrawals =
				delegations.length > 0 ? await fetchUserWithdrawals(address) : []

			// Calculate total rewards
			const totalRewards = calculateTotalRewards(delegations)

			return {
				...epochInfo,
				userDelegations: delegations,
				userWithdrawals: withdrawals,
				userRewards: totalRewards,
			}
		} catch (error) {
			console.error('Failed to fetch staking data:', error)
			return {
				currentEpoch: 0,
				inBoundary: false,
				userDelegations: [],
				userWithdrawals: [],
				userRewards: '0',
			}
		}
	}

	return {
		fetchEpochInfo,
		fetchDelegatorInfo,
		fetchUserDelegations,
		fetchUserWithdrawals,
		calculateTotalRewards,
		fetchAllStakingData,
	}
}
