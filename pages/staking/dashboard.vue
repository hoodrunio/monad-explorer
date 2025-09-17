<script setup>
import { useStakingStore } from '~/store/staking.store'
import { getValidatorById, getStakingStats, getDelegatorWithdrawals } from '~/services/api/staking'
import { formatEther } from 'viem'

// Components
import WalletConnect from '@/components/WalletConnect.vue'
import StakingCard from '@/components/staking/StakingCard.vue'
import Button from '@/components/ui/Button.vue'

const route = useRoute()
const router = useRouter()
const stakingStore = useStakingStore()

// SEO
useHead({
	title: "My Dashboard - Monad Staking",
	link: [
		{
			rel: "canonical",
			href: "/staking/dashboard",
		},
	],
	meta: [
		{
			name: "description",
			content: "Manage your MON token delegations, view rewards, and track your staking performance on the Monad network.",
		},
		{
			name: "robots",
			content: "noindex", // Dashboard is user-specific
		},
	],
})

// State
const withdrawals = ref([])
const loadingWithdrawals = ref(false)
const refreshing = ref(false)
const selectedValidator = ref(route.query.validator || null)

// Computed values
const isConnected = computed(() => stakingStore.isConnected)
const address = computed(() => stakingStore.address)
const balance = computed(() => stakingStore.formattedBalance)
const userDelegations = computed(() => stakingStore.userDelegations)
const totalStaked = computed(() => stakingStore.formattedTotalStaked)
const totalRewards = computed(() => stakingStore.formattedRewards)
const hasPendingWithdrawals = computed(() => stakingStore.hasPendingWithdrawals)

// Portfolio summary
const portfolioSummary = computed(() => {
	const totalStakedBigInt = stakingStore.totalStaked
	const totalRewardsBigInt = BigInt(stakingStore.userRewards || '0')
	const totalValue = totalStakedBigInt + totalRewardsBigInt
	
	return {
		totalValue: formatEther(totalValue),
		totalStaked: formatEther(totalStakedBigInt),
		totalRewards: formatEther(totalRewardsBigInt),
		delegationCount: userDelegations.value.length,
	}
})

// Validator details
const validators = ref(new Map())

// Get validator info for delegations
const enrichedDelegations = computed(() => {
	return userDelegations.value.map(delegation => {
		const validatorDetails = validators.value.get(delegation.valId)
		return {
			...delegation,
			validator: validatorDetails || {
				valId: delegation.valId,
				authAddress: `0x${delegation.valId.toString().padStart(40, '0')}`,
				formattedCommissionRate: 'Loading...',
				formattedConsensusStake: 'Loading...',
				isActive: true, // Default to true instead of false
			}
		}
	})
})

// Load validator details for delegations
async function loadValidatorDetails() {
	if (userDelegations.value.length === 0) return
	
	try {
		// Get validator details for each delegation individually
		const validatorMap = new Map()
		
		for (const delegation of userDelegations.value) {
			try {
				const validatorInfo = await getValidatorById(delegation.valId)
				validatorMap.set(delegation.valId, validatorInfo)
			} catch (error) {
				console.error(`Failed to load validator ${delegation.valId}:`, error)
				// Add fallback data for failed requests
				validatorMap.set(delegation.valId, {
					valId: delegation.valId,
					authAddress: `0x${delegation.valId.toString().padStart(40, '0')}`,
					formattedCommissionRate: 'Error loading',
					formattedConsensusStake: 'Error loading',
					isActive: false,
				})
			}
		}
		
		validators.value = validatorMap
	} catch (error) {
		console.error('Failed to load validator details:', error)
	}
}

// Withdrawable amounts
const withdrawableTotal = computed(() => {
	return withdrawals.value
		.filter(w => w.isWithdrawable)
		.reduce((total, w) => total + BigInt(w.amount), BigInt('0'))
})

// Load withdrawal requests
async function loadWithdrawals() {
	if (!isConnected.value || !address.value) return
	
	try {
		loadingWithdrawals.value = true
		withdrawals.value = await getDelegatorWithdrawals(address.value)
	} catch (error) {
		console.error('Failed to load withdrawals:', error)
	} finally {
		loadingWithdrawals.value = false
	}
}

// Refresh all data
async function refreshData() {
	try {
		refreshing.value = true
		await Promise.all([
			stakingStore.fetchUserStakingData(),
			loadWithdrawals(),
		])
		// Load validator details after refreshing user data
		await loadValidatorDetails()
	} catch (error) {
		console.error('Failed to refresh data:', error)
	} finally {
		refreshing.value = false
	}
}

// Handle withdrawal
async function handleWithdraw(withdrawal) {
	try {
		await stakingStore.withdraw(withdrawal.valId, withdrawal.withdrawId)
		await refreshData()
	} catch (error) {
		console.error('Withdrawal failed:', error)
	}
}

// Handle claim all rewards
async function claimAllRewards() {
	const delegationsWithRewards = userDelegations.value.filter(d => 
		BigInt(d.rewards || '0') > 0
	)
	
	for (const delegation of delegationsWithRewards) {
		try {
			await stakingStore.claimRewards(delegation.valId)
		} catch (error) {
			console.error(`Failed to claim rewards for validator ${delegation.valId}:`, error)
		}
	}
	
	await refreshData()
}

// Handle compound all rewards
async function compoundAllRewards() {
	const delegationsWithRewards = userDelegations.value.filter(d => 
		BigInt(d.rewards || '0') > 0
	)
	
	for (const delegation of delegationsWithRewards) {
		try {
			await stakingStore.compound(delegation.valId)
		} catch (error) {
			console.error(`Failed to compound rewards for validator ${delegation.valId}:`, error)
		}
	}
	
	await refreshData()
}

// Initialize
onMounted(async () => {
	if (isConnected.value) {
		await Promise.all([
			stakingStore.fetchUserStakingData(),
			loadWithdrawals(),
		])
		// Load validator details after user delegations are loaded
		await loadValidatorDetails()
	}
})

// Watch connection status
watch(() => stakingStore.isConnected, async (connected) => {
	if (connected) {
		await Promise.all([
			stakingStore.fetchUserStakingData(),
			loadWithdrawals(),
		])
		// Load validator details after user delegations are loaded
		await loadValidatorDetails()
	} else {
		// Clear data when disconnected
		withdrawals.value = []
		validators.value.clear()
	}
})

// Watch user delegations and load validator details when they change
watch(userDelegations, async (newDelegations) => {
	if (newDelegations && newDelegations.length > 0) {
		await loadValidatorDetails()
	}
}, { deep: true })

// Redirect if not connected - but allow user to see the connect wallet UI
// Remove the automatic redirect to let users connect their wallet on dashboard page
</script>

<template>
	<Flex direction="column" gap="12" wide :class="$style.wrapper">
		<Breadcrumbs
			:items="[
				{ link: '/', name: 'Dashboard' },
				{ link: '/staking', name: 'Staking' },
				{ link: '/staking/dashboard', name: 'My Dashboard' },
			]"
			:class="$style.breadcrumbs"
		/>

		<Flex align="center" justify="between" wide :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="user" size="16" color="secondary" />
				<Text size="16" weight="600" color="primary">My Staking Dashboard</Text>
			</Flex>
			<Flex align="center" gap="12" :class="$style.header_actions">
				<WalletConnect />
			</Flex>
		</Flex>

		<!-- Content -->
		<Flex direction="column" gap="20" wide :class="$style.content_container">
				<!-- Not Connected State -->
				<div v-if="!isConnected" :class="$style.not_connected">
					<div :class="$style.not_connected_content">
						<div :class="$style.icon">🔒</div>
						<h2>Connect Your Wallet</h2>
						<p>Please connect your wallet to view your staking dashboard</p>
						<WalletConnect />
					</div>
				</div>

				<!-- Connected State -->
				<template v-else>
					<!-- User Info Section -->
					<Flex direction="column" gap="16">
						<Flex align="center" justify="between" wide :class="$style.user_section">
							<Flex direction="column" gap="4">
								<Text size="12" weight="600" color="tertiary">Connected Wallet</Text>
								<Text size="14" weight="600" color="primary" :class="$style.user_address">{{ address }}</Text>
							</Flex>
							<Flex align="center" gap="12">
								<Button 
									size="medium" 
									type="secondary"
									:loading="refreshing"
									@click="refreshData"
								>
									Refresh
								</Button>
								<NuxtLink to="/staking/validators">
									<Button size="medium" type="primary">
										Stake More
									</Button>
								</NuxtLink>
							</Flex>
						</Flex>
					</Flex>

					<!-- Portfolio Overview -->
					<Flex direction="column" gap="16">
						<Text size="14" weight="600" color="primary">Portfolio Overview</Text>
						<Flex gap="16" :class="$style.grid_2">
							<div :class="[$style.overview_card, $style.primary]">
								<div :class="$style.card_header">
									<span :class="$style.card_icon">💰</span>
									<span :class="$style.card_title">Total Portfolio Value</span>
								</div>
								<div :class="$style.card_content">
									<div :class="$style.card_value">{{ portfolioSummary.totalValue }} MON</div>
									<div :class="$style.card_breakdown">
										{{ portfolioSummary.totalStaked }} staked + {{ portfolioSummary.totalRewards }} rewards
									</div>
								</div>
							</div>

							<div :class="$style.overview_card">
								<div :class="$style.card_header">
									<span :class="$style.card_icon">💳</span>
									<span :class="$style.card_title">Available Balance</span>
								</div>
								<div :class="$style.card_content">
									<div :class="$style.card_value">{{ balance }} MON</div>
								</div>
							</div>

							<div :class="$style.overview_card">
								<div :class="$style.card_header">
									<span :class="$style.card_icon">🎁</span>
									<span :class="$style.card_title">Pending Rewards</span>
								</div>
								<div :class="$style.card_content">
									<div :class="[$style.card_value, $style.rewards]">{{ totalRewards }} MON</div>
									<div v-if="BigInt(stakingStore.userRewards || '0') > 0" :class="$style.card_actions">
										<Button 
											size="small" 
											type="secondary"
											:loading="stakingStore.loading.compound"
											@click="compoundAllRewards"
										>
											Compound All
										</Button>
										<Button 
											size="small" 
											type="primary"
											:loading="stakingStore.loading.claimRewards"
											@click="claimAllRewards"
										>
											Claim All
										</Button>
									</div>
								</div>
							</div>

							<div :class="$style.overview_card">
								<div :class="$style.card_header">
									<span :class="$style.card_icon">📊</span>
									<span :class="$style.card_title">Active Delegations</span>
								</div>
								<div :class="$style.card_content">
									<div :class="$style.card_value">{{ portfolioSummary.delegationCount }}</div>
									<div :class="$style.card_detail">Validator{{ portfolioSummary.delegationCount !== 1 ? 's' : '' }}</div>
								</div>
							</div>
						</Flex>
					</Flex>

					<!-- Pending Withdrawals -->
					<Flex v-if="withdrawals.length > 0" direction="column" gap="16">
						<Flex align="center" justify="between" wide>
							<Text size="14" weight="600" color="primary">Pending Withdrawals</Text>
							<Flex align="center" gap="8" :class="$style.withdrawable_total">
								<Text size="12" color="success">Withdrawable:</Text>
								<Text size="12" weight="600" color="success">{{ formatEther(withdrawableTotal) }} MON</Text>
							</Flex>
						</Flex>
						
						<div :class="$style.withdrawals_grid">
							<div 
								v-for="withdrawal in withdrawals" 
								:key="`${withdrawal.valId}-${withdrawal.withdrawId}`"
								:class="[$style.withdrawal_card, { [$style.withdrawable]: withdrawal.isWithdrawable }]"
							>
								<div :class="$style.withdrawal_info">
									<div :class="$style.withdrawal_validator">
										Validator #{{ withdrawal.valId }}
									</div>
									<div :class="$style.withdrawal_amount">
										{{ withdrawal.formattedAmount }} MON
									</div>
									<div :class="$style.withdrawal_status">
										{{ withdrawal.isWithdrawable ? 'Ready to withdraw' : `Available in epoch ${withdrawal.withdrawableEpoch}` }}
									</div>
								</div>
								<div :class="$style.withdrawal_action">
									<Button 
										v-if="withdrawal.isWithdrawable"
										size="small" 
										type="primary"
										:loading="stakingStore.loading.withdraw"
										@click="handleWithdraw(withdrawal)"
									>
										Withdraw
									</Button>
									<span v-else :class="$style.waiting_label">
										⏳ Waiting
									</span>
								</div>
							</div>
						</div>
					</Flex>

					<!-- My Delegations -->
					<Flex direction="column" gap="16">
						<Flex direction="column" gap="4">
							<Text size="14" weight="600" color="primary">My Delegations</Text>
							<Text size="12" color="tertiary">Manage your active delegations and rewards</Text>
						</Flex>

						<!-- No Delegations -->
						<div v-if="enrichedDelegations.length === 0" :class="$style.no_delegations">
							<div :class="$style.no_delegations_content">
								<div :class="$style.icon">🎯</div>
								<h3>No Active Delegations</h3>
								<p>You haven't staked any MON tokens yet. Start earning rewards by delegating to validators.</p>
								<NuxtLink to="/staking/validators">
									<Button size="medium" type="primary">
										Browse Validators
									</Button>
								</NuxtLink>
							</div>
						</div>

						<!-- Delegations Grid -->
						<div v-else :class="$style.delegations_grid">
							<StakingCard
								v-for="delegation in enrichedDelegations"
								:key="delegation.valId"
								:validator="delegation.validator"
								:delegation="delegation"
							/>
						</div>
					</Flex>
				</template>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	max-width: calc(var(--base-width) + 48px);
	padding: 20px 24px 60px 24px;
}

.breadcrumbs {
	margin-bottom: 16px;
}

.header {
	margin-bottom: 24px;
}

.header_actions {
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 8px;
	}
}

.content_container {
	width: 100%;
}

.not_connected {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
	
	.not_connected_content {
		text-align: center;
		max-width: 400px;
		
		.icon {
			font-size: 64px;
			margin-bottom: 24px;
		}
		
		h2 {
			font-size: 24px;
			font-weight: 600;
			color: var(--txt-primary);
			margin: 0 0 12px 0;
		}
		
		p {
			color: var(--txt-secondary);
			margin: 0 0 24px 0;
			line-height: 1.5;
		}
	}
}

.user_section {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	padding: 20px;
	
	.user_address {
		font-family: 'Source Code Pro', monospace;
	}
	
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 16px;
		align-items: flex-start !important;
	}
}

.grid_2 {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;

	@media (max-width: 768px) {
		grid-template-columns: 1fr;
	}
}

/* Card styles are now handled by individual components */

.overview_card {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 16px;
	padding: 24px;
	transition: all 0.2s ease;
	
	&:hover {
		box-shadow: 0 2px 8px var(--op-10);
	}
	
	&.primary {
		background: var(--brand);
		color: var(--txt-white);
		border: none;
		
		.card_title,
		.card_breakdown {
			opacity: 0.9;
		}
	}
	
	.card_header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
		
		.card_icon {
			font-size: 20px;
		}
		
		.card_title {
			font-size: 14px;
			font-weight: 600;
			color: var(--txt-secondary);
		}
	}
	
	.card_content {
		.card_value {
			font-size: 24px;
			font-weight: 700;
			color: var(--txt-primary);
			margin-bottom: 8px;
			
			&.rewards {
				color: var(--green);
			}
		}
		
		.card_breakdown,
		.card_detail {
			font-size: 12px;
			color: var(--txt-secondary);
		}
		
		.card_actions {
			display: flex;
			gap: 8px;
			margin-top: 12px;
		}
	}
}

.withdrawals_section,
.delegations_section {
	margin-bottom: 40px;
	
	.section_header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24px;
		
		@media (max-width: 768px) {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}
		
		h2 {
			font-size: 24px;
			font-weight: 600;
			color: var(--text-primary, #000);
			margin: 0;
		}
		
		.section_description {
			color: var(--text-secondary, #666);
			margin: 4px 0 0 0;
		}
		
		.withdrawable_total {
			display: flex;
			align-items: center;
			gap: 8px;
			background: var(--op-5);
			padding: 8px 16px;
			border-radius: 8px;
			
			.total_label {
				font-size: 14px;
				color: var(--green);
			}
			
			.total_value {
				font-size: 14px;
				font-weight: 600;
				color: var(--green);
			}
		}
	}
}

.withdrawals_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 20px;
	margin-bottom: 32px;
}

.withdrawal_card {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	padding: 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	
	&.withdrawable {
		border-color: var(--green);
		background: var(--op-5);
	}
	
	.withdrawal_info {
		flex: 1;
		
		.withdrawal_validator {
			font-weight: 600;
			color: var(--txt-primary);
			margin-bottom: 4px;
		}
		
		.withdrawal_amount {
			font-size: 18px;
			font-weight: 700;
			color: var(--txt-primary);
			margin-bottom: 4px;
		}
		
		.withdrawal_status {
			font-size: 12px;
			color: var(--txt-secondary);
		}
	}
	
	.withdrawal_action {
		.waiting_label {
			font-size: 12px;
			color: var(--txt-secondary);
			display: flex;
			align-items: center;
			gap: 4px;
		}
	}
}

.delegations_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	gap: 24px;
	
	@media (max-width: 480px) {
		grid-template-columns: 1fr;
	}
}

.no_delegations {
	text-align: center;
	padding: 80px 20px;
	
	.no_delegations_content {
		max-width: 400px;
		margin: 0 auto;
		
		.icon {
			font-size: 48px;
			margin-bottom: 20px;
		}
		
		h3 {
			font-size: 24px;
			font-weight: 600;
			color: var(--txt-primary);
			margin: 0 0 12px 0;
		}
		
		p {
			color: var(--txt-secondary);
			margin: 0 0 24px 0;
			line-height: 1.5;
		}
	}
}
</style>
