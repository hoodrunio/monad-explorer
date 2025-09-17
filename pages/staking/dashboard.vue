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
	<div class="dashboard-page">
		<!-- Header -->
		<div class="page-header">
			<div class="header-content">
				<div class="header-nav">
					<NuxtLink to="/staking" class="back-link">
						← Staking
					</NuxtLink>
					<div class="nav-divider">/</div>
					<span class="current-page">Dashboard</span>
				</div>
				<div class="header-actions">
					<WalletConnect />
				</div>
			</div>
		</div>

		<!-- Content -->
		<div class="page-content">
			<div class="content-container">
				<!-- Not Connected State -->
				<div v-if="!isConnected" class="not-connected">
					<div class="not-connected-content">
						<div class="icon">🔒</div>
						<h2>Connect Your Wallet</h2>
						<p>Please connect your wallet to view your staking dashboard</p>
						<WalletConnect />
					</div>
				</div>

				<!-- Connected State -->
				<template v-else>
					<!-- Dashboard Header -->
					<div class="dashboard-header">
						<div class="user-info">
							<h1>My Staking Dashboard</h1>
							<p class="user-address">{{ address }}</p>
						</div>
						<div class="header-actions">
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
					<div class="portfolio-overview">
						<div class="overview-cards">
							<div class="overview-card primary">
								<div class="card-header">
									<span class="card-icon">💰</span>
									<span class="card-title">Total Portfolio Value</span>
								</div>
								<div class="card-content">
									<div class="card-value">{{ portfolioSummary.totalValue }} MON</div>
									<div class="card-breakdown">
										{{ portfolioSummary.totalStaked }} staked + {{ portfolioSummary.totalRewards }} rewards
									</div>
								</div>
							</div>

							<div class="overview-card">
								<div class="card-header">
									<span class="card-icon">💳</span>
									<span class="card-title">Available Balance</span>
								</div>
								<div class="card-content">
									<div class="card-value">{{ balance }} MON</div>
								</div>
							</div>

							<div class="overview-card">
								<div class="card-header">
									<span class="card-icon">🎁</span>
									<span class="card-title">Pending Rewards</span>
								</div>
								<div class="card-content">
									<div class="card-value rewards">{{ totalRewards }} MON</div>
									<div class="card-actions" v-if="BigInt(stakingStore.userRewards || '0') > 0">
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

							<div class="overview-card">
								<div class="card-header">
									<span class="card-icon">📊</span>
									<span class="card-title">Active Delegations</span>
								</div>
								<div class="card-content">
									<div class="card-value">{{ portfolioSummary.delegationCount }}</div>
									<div class="card-detail">Validator{{ portfolioSummary.delegationCount !== 1 ? 's' : '' }}</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Pending Withdrawals -->
					<div v-if="withdrawals.length > 0" class="withdrawals-section">
						<div class="section-header">
							<h2>Pending Withdrawals</h2>
							<div class="withdrawable-total">
								<span class="total-label">Withdrawable:</span>
								<span class="total-value">{{ formatEther(withdrawableTotal) }} MON</span>
							</div>
						</div>
						
						<div class="withdrawals-grid">
							<div 
								v-for="withdrawal in withdrawals" 
								:key="`${withdrawal.valId}-${withdrawal.withdrawId}`"
								class="withdrawal-card"
								:class="{ 'withdrawable': withdrawal.isWithdrawable }"
							>
								<div class="withdrawal-info">
									<div class="withdrawal-validator">
										Validator #{{ withdrawal.valId }}
									</div>
									<div class="withdrawal-amount">
										{{ withdrawal.formattedAmount }} MON
									</div>
									<div class="withdrawal-status">
										{{ withdrawal.isWithdrawable ? 'Ready to withdraw' : `Available in epoch ${withdrawal.withdrawableEpoch}` }}
									</div>
								</div>
								<div class="withdrawal-action">
									<Button 
										v-if="withdrawal.isWithdrawable"
										size="small" 
										type="primary"
										:loading="stakingStore.loading.withdraw"
										@click="handleWithdraw(withdrawal)"
									>
										Withdraw
									</Button>
									<span v-else class="waiting-label">
										⏳ Waiting
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- My Delegations -->
					<div class="delegations-section">
						<div class="section-header">
							<h2>My Delegations</h2>
							<p class="section-description">
								Manage your active delegations and rewards
							</p>
						</div>

						<!-- No Delegations -->
						<div v-if="enrichedDelegations.length === 0" class="no-delegations">
							<div class="no-delegations-content">
								<div class="icon">🎯</div>
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
						<div v-else class="delegations-grid">
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
.dashboard-page {
	min-height: 100vh;
	background: var(--page-background, #f8f9fa);
}

.page-header {
	background: var(--card-background, #ffffff);
	border-bottom: 1px solid var(--border-color, #e1e5e9);
	padding: 16px 0;
	position: sticky;
	top: 0;
	z-index: 100;
	
	.header-content {
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
	
	.header-nav {
		display: flex;
		align-items: center;
		gap: 8px;
		
		.back-link {
			color: var(--primary-color, #007bff);
			text-decoration: none;
			font-weight: 500;
			transition: opacity 0.2s ease;
			
			&:hover {
				opacity: 0.8;
			}
		}
		
		.nav-divider {
			color: var(--text-tertiary, #d1d5db);
		}
		
		.current-page {
			color: var(--text-primary, #000);
			font-weight: 600;
		}
	}
}

.page-content {
	padding: 32px 0;
	
	@media (max-width: 768px) {
		padding: 24px 0;
	}
}

.content-container {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 24px;
	
	@media (max-width: 768px) {
		padding: 0 16px;
	}
}

.not-connected {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
	
	.not-connected-content {
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

.dashboard-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 32px;
	
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 20px;
	}
	
	.user-info {
		h1 {
			font-size: 32px;
			font-weight: 700;
			color: var(--text-primary, #000);
			margin: 0 0 8px 0;
		}
		
		.user-address {
			font-family: 'Source Code Pro', monospace;
			font-size: 14px;
			color: var(--text-secondary, #666);
			margin: 0;
		}
	}
	
	.header-actions {
		display: flex;
		gap: 12px;
		
		@media (max-width: 640px) {
			flex-direction: column;
		}
	}
}

.portfolio-overview {
	margin-bottom: 40px;
}

.overview-cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 24px;
}

.overview-card {
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
		
		.card-title,
		.card-breakdown {
			opacity: 0.9;
		}
	}
	
	.card-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
		
		.card-icon {
			font-size: 20px;
		}
		
		.card-title {
			font-size: 14px;
			font-weight: 600;
			color: var(--text-secondary, #666);
		}
	}
	
	.card-content {
		.card-value {
			font-size: 24px;
			font-weight: 700;
			color: var(--text-primary, #000);
			margin-bottom: 8px;
			
			&.rewards {
				color: var(--success-color, #10b981);
			}
		}
		
		.card-breakdown,
		.card-detail {
			font-size: 12px;
			color: var(--text-secondary, #666);
		}
		
		.card-actions {
			display: flex;
			gap: 8px;
			margin-top: 12px;
		}
	}
}

.withdrawals-section,
.delegations-section {
	margin-bottom: 40px;
	
	.section-header {
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
		
		.section-description {
			color: var(--text-secondary, #666);
			margin: 4px 0 0 0;
		}
		
		.withdrawable-total {
			display: flex;
			align-items: center;
			gap: 8px;
			background: var(--success-background, #d4edda);
			padding: 8px 16px;
			border-radius: 8px;
			
			.total-label {
				font-size: 14px;
				color: var(--success-color, #155724);
			}
			
			.total-value {
				font-size: 14px;
				font-weight: 600;
				color: var(--success-color, #155724);
			}
		}
	}
}

.withdrawals-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 20px;
	margin-bottom: 32px;
}

.withdrawal-card {
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
	
	.withdrawal-info {
		flex: 1;
		
		.withdrawal-validator {
			font-weight: 600;
			color: var(--text-primary, #000);
			margin-bottom: 4px;
		}
		
		.withdrawal-amount {
			font-size: 18px;
			font-weight: 700;
			color: var(--text-primary, #000);
			margin-bottom: 4px;
		}
		
		.withdrawal-status {
			font-size: 12px;
			color: var(--text-secondary, #666);
		}
	}
	
	.withdrawal-action {
		.waiting-label {
			font-size: 12px;
			color: var(--text-secondary, #666);
			display: flex;
			align-items: center;
			gap: 4px;
		}
	}
}

.delegations-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	gap: 24px;
	
	@media (max-width: 480px) {
		grid-template-columns: 1fr;
	}
}

.no-delegations {
	text-align: center;
	padding: 80px 20px;
	
	.no-delegations-content {
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
