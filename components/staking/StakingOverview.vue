<script setup>
import { useStakingStore } from '~/store/staking.store'
import { getStakingStats } from '~/services/api/staking'

// UI Components
import Button from '@/components/ui/Button.vue'

const stakingStore = useStakingStore()

// State
const stats = ref(null)
const loading = ref(true)
const error = ref('')

// Computed values
const isConnected = computed(() => stakingStore.isConnected)
const totalStaked = computed(() => stakingStore.formattedTotalStaked)
const totalRewards = computed(() => stakingStore.formattedRewards)
const userDelegations = computed(() => stakingStore.userDelegations)
const availableBalance = computed(() => stakingStore.formattedAvailableBalance)
const hasPendingWithdrawals = computed(() => stakingStore.hasPendingWithdrawals)
const withdrawableAmount = computed(() => stakingStore.formattedWithdrawableAmount)

// Total delegations count
const totalDelegations = computed(() => userDelegations.value.length)

// Fetch staking statistics
async function fetchStats() {
	try {
		loading.value = true
		error.value = ''
		stats.value = await getStakingStats()
	} catch (err) {
		error.value = 'Failed to fetch staking statistics'
		console.error('Stats fetch error:', err)
	} finally {
		loading.value = false
	}
}

// Initialize on mount
onMounted(() => {
	fetchStats()
})

// Refresh data
async function refresh() {
	await Promise.all([
		fetchStats(),
		stakingStore.fetchUserStakingData(),
	])
}
</script>

<template>
	<div :class="$style.staking_overview">
		<!-- Header -->
		<div :class="$style.overview_header">
			<div :class="$style.header_content">
				<h1 :class="$style.page_title">Staking Overview</h1>
				<p :class="$style.page_description">
					Stake your MON tokens to earn rewards and help secure the Monad network
				</p>
			</div>
			<div :class="$style.header_actions">
				<Button 
					size="medium" 
					type="secondary"
					@click="refresh"
					:loading="loading"
				>
					Refresh
				</Button>
			</div>
		</div>

		<!-- Network Statistics -->
		<div :class="$style.stats_grid">
			<div :class="$style.stat_card">
				<div :class="$style.stat_header">
					<span :class="$style.stat_icon">🌐</span>
					<span :class="$style.stat_title">Network Status</span>
				</div>
				<div :class="$style.stat_content">
					<div :class="$style.stat_main">
						<span :class="$style.stat_value">{{ stats?.currentEpoch || '...' }}</span>
						<span :class="$style.stat_label">Current Epoch</span>
					</div>
					<div :class="$style.stat_detail">
						<span :class="[$style.boundary_status, { [$style.active]: stats?.inBoundary }]">
							{{ stats?.inBoundary ? 'In Boundary Period' : 'Normal Period' }}
						</span>
					</div>
				</div>
			</div>

			<div :class="$style.stat_card">
				<div :class="$style.stat_header">
					<span :class="$style.stat_icon">👥</span>
					<span :class="$style.stat_title">Validators</span>
				</div>
				<div :class="$style.stat_content">
					<div :class="$style.stat_main">
						<span :class="$style.stat_value">{{ stats?.activeValidators || '...' }}</span>
						<span :class="$style.stat_label">Active</span>
					</div>
					<div :class="$style.stat_detail">
						{{ stats?.totalValidators || '...' }} Total Validators
					</div>
				</div>
			</div>

			<div :class="$style.stat_card">
				<div :class="$style.stat_header">
					<span :class="$style.stat_icon">💰</span>
					<span :class="$style.stat_title">Total Staked</span>
				</div>
				<div :class="$style.stat_content">
					<div :class="$style.stat_main">
						<span :class="$style.stat_value">{{ stats?.formattedTotalStaked || '...' }}</span>
						<span :class="$style.stat_label">MON</span>
					</div>
					<div :class="$style.stat_detail">
						Network Security
					</div>
				</div>
			</div>

			<div :class="$style.stat_card">
				<div :class="$style.stat_header">
					<span :class="$style.stat_icon">📈</span>
					<span :class="$style.stat_title">Est. APY</span>
				</div>
				<div :class="$style.stat_content">
					<div :class="$style.stat_main">
						<span :class="$style.stat_value">{{ stats?.estimatedAPY || '...' }}%</span>
						<span :class="$style.stat_label">Annual</span>
					</div>
					<div :class="$style.stat_detail">
						Avg Commission: {{ stats?.averageCommission || '...' }}%
					</div>
				</div>
			</div>
		</div>

		<!-- User Portfolio (only show if connected) -->
		<div v-if="isConnected" :class="$style.user_portfolio">
			<div :class="$style.portfolio_header">
				<h2>Your Portfolio</h2>
			</div>

			<div :class="$style.portfolio_grid">
				<!-- Balance Card -->
				<div :class="$style.portfolio_card">
					<div :class="$style.card_header">
						<span :class="$style.card_icon">💳</span>
						<span :class="$style.card_title">Available Balance</span>
					</div>
					<div :class="$style.card_content">
						<div :class="$style.card_main">
							<span :class="$style.card_value">{{ availableBalance }}</span>
							<span :class="$style.card_label">MON</span>
						</div>
						<div :class="$style.card_action">
							<NuxtLink to="/staking/validators">
								<Button size="small" type="primary">
									Stake Now
								</Button>
							</NuxtLink>
						</div>
					</div>
				</div>

				<!-- Staked Amount Card -->
				<div :class="$style.portfolio_card">
					<div :class="$style.card_header">
						<span :class="$style.card_icon">🔒</span>
						<span :class="$style.card_title">Total Staked</span>
					</div>
					<div :class="$style.card_content">
						<div :class="$style.card_main">
							<span :class="$style.card_value">{{ totalStaked }}</span>
							<span :class="$style.card_label">MON</span>
						</div>
						<div :class="$style.card_detail">
							{{ totalDelegations }} Delegation{{ totalDelegations !== 1 ? 's' : '' }}
						</div>
					</div>
				</div>

				<!-- Rewards Card -->
				<div :class="$style.portfolio_card">
					<div :class="$style.card_header">
						<span :class="$style.card_icon">🎁</span>
						<span :class="$style.card_title">Pending Rewards</span>
					</div>
					<div :class="$style.card_content">
						<div :class="$style.card_main">
							<span :class="[$style.card_value, $style.rewards]">{{ totalRewards }}</span>
							<span :class="$style.card_label">MON</span>
						</div>
						<div :class="$style.card_detail">
							Ready to claim or compound
						</div>
					</div>
				</div>

				<!-- Withdrawable Card -->
				<div v-if="hasPendingWithdrawals" :class="$style.portfolio_card">
					<div :class="$style.card_header">
						<span :class="$style.card_icon">⏰</span>
						<span :class="$style.card_title">Withdrawable</span>
					</div>
					<div :class="$style.card_content">
						<div :class="$style.card_main">
							<span :class="$style.card_value">{{ withdrawableAmount }}</span>
							<span :class="$style.card_label">MON</span>
						</div>
						<div :class="$style.card_action">
							<Button size="small" type="secondary">
								Withdraw
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div :class="$style.quick_actions">
			<div :class="$style.actions_header">
				<h2>Quick Actions</h2>
			</div>

			<div :class="$style.actions_grid">
				<NuxtLink to="/staking/validators" :class="$style.action_card">
					<div :class="$style.action_icon">🔍</div>
					<div :class="$style.action_content">
						<h3>Browse Validators</h3>
						<p>Explore and compare validators to find the best staking opportunities</p>
					</div>
				</NuxtLink>

				<NuxtLink v-if="isConnected" to="/staking/dashboard" :class="$style.action_card">
					<div :class="$style.action_icon">📊</div>
					<div :class="$style.action_content">
						<h3>My Dashboard</h3>
						<p>Manage your delegations, view rewards, and track your staking performance</p>
					</div>
				</NuxtLink>

				<div :class="[$style.action_card, $style.info]">
					<div :class="$style.action_icon">ℹ️</div>
					<div :class="$style.action_content">
						<h3>How Staking Works</h3>
						<p>Learn about epochs, rewards, commissions, and withdrawal periods</p>
						<div :class="$style.info_list">
							<div :class="$style.info_item">• Epochs last ~5.5 hours (50,000 blocks)</div>
							<div :class="$style.info_item">• 1 epoch withdrawal delay</div>
							<div :class="$style.info_item">• Rewards distributed pro-rata</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Error Display -->
		<div v-if="error" :class="$style.error_banner">
			<span :class="$style.error_icon">⚠️</span>
			<span :class="$style.error_text">{{ error }}</span>
			<Button size="small" type="secondary" @click="refresh">
				Retry
			</Button>
		</div>
	</div>
</template>

<style module lang="scss">
.staking_overview {
	max-width: 1200px;
	margin: 0 auto;
	padding: 24px;
	
	@media (max-width: 768px) {
		padding: 16px;
	}
}

.overview_header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 32px;
	
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 16px;
	}
}

.header_content {
	.page_title {
		font-size: 32px;
		font-weight: 700;
		color: var(--txt-primary);
		margin: 0 0 8px 0;
	}
	
	.page_description {
		font-size: 16px;
		color: var(--txt-secondary);
		margin: 0;
		max-width: 600px;
	}
}

.stats_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 20px;
	margin-bottom: 40px;
}

.stat_card {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 16px;
	padding: 24px;
	transition: all 0.2s ease;
	
	&:hover {
		box-shadow: 0 2px 8px var(--op-10);
	}
}

.stat_header {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 16px;
}

.stat_icon {
	font-size: 20px;
}

.stat_title {
	font-size: 14px;
	font-weight: 600;
	color: var(--txt-secondary);
}

.stat_content {
	.stat_main {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 8px;
	}
	
	.stat_value {
		font-size: 28px;
		font-weight: 700;
		color: var(--txt-primary);
	}
	
	.stat_label {
		font-size: 14px;
		color: var(--txt-secondary);
	}
	
	.stat_detail {
		font-size: 13px;
		color: var(--txt-secondary);
	}
}

.boundary_status {
	padding: 2px 8px;
	border-radius: 12px;
	font-weight: 500;
	background: var(--op-5);
	color: var(--blue);
	
	&.active {
		background: var(--op-5);
		color: var(--orange);
	}
}

.user_portfolio {
	margin-bottom: 40px;
}

.portfolio_header {
	margin-bottom: 20px;
	
	h2 {
		font-size: 24px;
		font-weight: 600;
		color: var(--txt-primary);
		margin: 0;
	}
}

.portfolio_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 20px;
}

.portfolio_card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 16px;
	padding: 24px;
	color: white;
	position: relative;
	overflow: hidden;
	
	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		z-index: -1;
	}
}

.card_header {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 16px;
}

.card_icon {
	font-size: 18px;
}

.card_title {
	font-size: 14px;
	font-weight: 600;
	opacity: 0.9;
}

.card_content {
	.card_main {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 8px;
	}
	
	.card_value {
		font-size: 24px;
		font-weight: 700;
		
		&.rewards {
			color: #4ade80;
		}
	}
	
	.card_label {
		font-size: 12px;
		opacity: 0.8;
	}
	
	.card_detail {
		font-size: 12px;
		opacity: 0.8;
		margin-bottom: 12px;
	}
	
	.card_action {
		margin-top: 12px;
	}
}

.quick_actions {
	margin-bottom: 40px;
}

.actions_header {
	margin-bottom: 20px;
	
	h2 {
		font-size: 24px;
		font-weight: 600;
		color: var(--txt-primary);
		margin: 0;
	}
}

.actions_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	gap: 20px;
}

.action_card {
	display: flex;
	align-items: flex-start;
	gap: 16px;
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 16px;
	padding: 24px;
	text-decoration: none;
	color: inherit;
	transition: all 0.2s ease;
	
	&:hover {
		box-shadow: 0 2px 8px var(--op-10);
		transform: translateY(-2px);
	}
	
	&.info {
		background: var(--op-5);
		border-color: var(--blue);
		
		&:hover {
			background: var(--op-8);
		}
	}
}

.action_icon {
	font-size: 32px;
	flex-shrink: 0;
}

.action_content {
	flex: 1;
	
	h3 {
		font-size: 18px;
		font-weight: 600;
		color: var(--txt-primary);
		margin: 0 0 8px 0;
	}
	
	p {
		font-size: 14px;
		color: var(--txt-secondary);
		margin: 0 0 12px 0;
		line-height: 1.5;
	}
}

.info_list {
	.info_item {
		font-size: 12px;
		color: var(--txt-secondary);
		margin-bottom: 4px;
		
		&:last-child {
			margin-bottom: 0;
		}
	}
}

.error_banner {
	display: flex;
	align-items: center;
	gap: 12px;
	background: var(--op-5);
	color: var(--red);
	padding: 16px;
	border-radius: 12px;
	margin-top: 20px;
}

.error_icon {
	font-size: 16px;
}

.error_text {
	flex: 1;
	font-weight: 500;
}
</style>
