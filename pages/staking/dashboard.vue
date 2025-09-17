<script setup>
import { useStakingStore } from '~/store/staking.store'
import { getDelegatorWithdrawals } from '~/services/api/staking'
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

// Get validator info for delegations
const enrichedDelegations = computed(() => {
	return userDelegations.value.map(delegation => ({
		...delegation,
		validator: delegation.validator || {
			valId: delegation.valId,
			authAddress: 'Unknown',
			formattedCommissionRate: 'Unknown',
			formattedConsensusStake: 'Unknown',
			isActive: false,
		}
	}))
})

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
	if (!isConnected.value) return
	
	try {
		refreshing.value = true
		await Promise.all([
			stakingStore.fetchUserStakingData(),
			loadWithdrawals(),
		])
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
	}
})

// Watch connection status
watch(() => stakingStore.isConnected, async (connected) => {
	if (connected) {
		await Promise.all([
			stakingStore.fetchUserStakingData(),
			loadWithdrawals(),
		])
	} else {
		// Clear data when disconnected
		withdrawals.value = []
	}
})

// Redirect if not connected
watchEffect(() => {
	if (!isConnected.value && process.client) {
		router.push('/staking')
	}
})
</script>

<template>
	<div :class="$style.dashboard_page">
		<!-- Header -->
		<div :class="$style.page_header">
			<div :class="$style.header_content">
				<div :class="$style.header_nav">
					<NuxtLink to="/staking" :class="$style.back_link">
						← Staking
					</NuxtLink>
					<div :class="$style.nav_divider">/</div>
					<span :class="$style.current_page">Dashboard</span>
				</div>
				<div :class="$style.header_actions">
					<WalletConnect />
				</div>
			</div>
		</div>

		<!-- Content -->
		<div :class="$style.page_content">
			<div :class="$style.content_container">
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
					<!-- Dashboard Header -->
					<div :class="$style.dashboard_header">
						<div :class="$style.user_info">
							<h1>My Staking Dashboard</h1>
							<p :class="$style.user_address">{{ address }}</p>
						</div>
						<div :class="$style.header_actions">
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
						</div>
					</div>

					<!-- Portfolio Overview -->
					<div :class="$style.portfolio_overview">
						<div :class="$style.overview_cards">
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
						</div>
					</div>

					<!-- Pending Withdrawals -->
					<div v-if="withdrawals.length > 0" :class="$style.withdrawals_section">
						<div :class="$style.section_header">
							<h2>Pending Withdrawals</h2>
							<div :class="$style.withdrawable_total">
								<span :class="$style.total_label">Withdrawable:</span>
								<span :class="$style.total_value">{{ formatEther(withdrawableTotal) }} MON</span>
							</div>
						</div>
						
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
					</div>

					<!-- My Delegations -->
					<div :class="$style.delegations_section">
						<div :class="$style.section_header">
							<h2>My Delegations</h2>
							<p :class="$style.section_description">
								Manage your active delegations and rewards
							</p>
						</div>

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
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.dashboard_page {
	min-height: 100vh;
	background: var(--page-background, #f8f9fa);
}

.page_header {
	background: var(--card-background, #ffffff);
	border-bottom: 1px solid var(--border-color, #e1e5e9);
	padding: 16px 0;
	position: sticky;
	top: 0;
	z-index: 100;
	
	.header_content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		
		@media (max-width: 768px) {
			padding: 0 16px;
		}
	}
	
	.header_nav {
		display: flex;
		align-items: center;
		gap: 8px;
		
		.back_link {
			color: var(--primary-color, #007bff);
			text-decoration: none;
			font-weight: 500;
			transition: opacity 0.2s ease;
			
			&:hover {
				opacity: 0.8;
			}
		}
		
		.nav_divider {
			color: var(--text-tertiary, #d1d5db);
		}
		
		.current_page {
			color: var(--text-primary, #000);
			font-weight: 600;
		}
	}
}

.page_content {
	padding: 32px 0;
	
	@media (max-width: 768px) {
		padding: 24px 0;
	}
}

.content_container {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 24px;
	
	@media (max-width: 768px) {
		padding: 0 16px;
	}
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
			color: var(--text-primary, #000);
			margin: 0 0 12px 0;
		}
		
		p {
			color: var(--text-secondary, #666);
			margin: 0 0 24px 0;
			line-height: 1.5;
		}
	}
}

.dashboard_header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 32px;
	
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 20px;
	}
	
	.user_info {
		h1 {
			font-size: 32px;
			font-weight: 700;
			color: var(--text-primary, #000);
			margin: 0 0 8px 0;
		}
		
		.user_address {
			font-family: 'Source Code Pro', monospace;
			font-size: 14px;
			color: var(--text-secondary, #666);
			margin: 0;
		}
	}
	
	.header_actions {
		display: flex;
		gap: 12px;
		
		@media (max-width: 640px) {
			flex-direction: column;
		}
	}
}

.portfolio_overview {
	margin-bottom: 40px;
}

.overview_cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 24px;
}

.overview_card {
	background: var(--card-background, #ffffff);
	border: 1px solid var(--border-color, #e1e5e9);
	border-radius: 16px;
	padding: 24px;
	transition: all 0.2s ease;
	
	&:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	&.primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
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
			color: var(--text-secondary, #666);
		}
	}
	
	.card_content {
		.card_value {
			font-size: 24px;
			font-weight: 700;
			color: var(--text-primary, #000);
			margin-bottom: 8px;
			
			&.rewards {
				color: var(--success-color, #10b981);
			}
		}
		
		.card_breakdown,
		.card_detail {
			font-size: 12px;
			color: var(--text-secondary, #666);
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
			background: var(--success-background, #d4edda);
			padding: 8px 16px;
			border-radius: 8px;
			
			.total_label {
				font-size: 14px;
				color: var(--success-color, #155724);
			}
			
			.total_value {
				font-size: 14px;
				font-weight: 600;
				color: var(--success-color, #155724);
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
	background: var(--card-background, #ffffff);
	border: 1px solid var(--border-color, #e1e5e9);
	border-radius: 12px;
	padding: 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	
	&.withdrawable {
		border-color: var(--success-color, #10b981);
		background: var(--success-background, #f0fdf4);
	}
	
	.withdrawal_info {
		flex: 1;
		
		.withdrawal_validator {
			font-weight: 600;
			color: var(--text-primary, #000);
			margin-bottom: 4px;
		}
		
		.withdrawal_amount {
			font-size: 18px;
			font-weight: 700;
			color: var(--text-primary, #000);
			margin-bottom: 4px;
		}
		
		.withdrawal_status {
			font-size: 12px;
			color: var(--text-secondary, #666);
		}
	}
	
	.withdrawal_action {
		.waiting_label {
			font-size: 12px;
			color: var(--text-secondary, #666);
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
			color: var(--text-primary, #000);
			margin: 0 0 12px 0;
		}
		
		p {
			color: var(--text-secondary, #666);
			margin: 0 0 24px 0;
			line-height: 1.5;
		}
	}
}
</style>
