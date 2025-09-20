<script setup>
import { useStakingStore } from '~/store/staking.store'
import { getStakingStats } from '~/services/api/staking'
import { abbreviate } from '~/services/utils/amounts'

// UI Components
import Button from '@/components/ui/Button.vue'

const stakingStore = useStakingStore()

// State
const stats = ref(null)
const loading = ref(true)
const error = ref('')

// Computed values
const isConnected = computed(() => stakingStore.isConnected)
const totalStaked = computed(() => stakingStore.abbreviatedTotalStaked)
const totalRewards = computed(() => stakingStore.abbreviatedRewards)
const userDelegations = computed(() => stakingStore.userDelegations)
const availableBalance = computed(() => stakingStore.abbreviatedAvailableBalance)
const hasPendingWithdrawals = computed(() => stakingStore.hasPendingWithdrawals)
const withdrawableAmount = computed(() => stakingStore.abbreviatedWithdrawableAmount)

// Total delegations count
const totalDelegations = computed(() => userDelegations.value.length)

// Network stats formatting
const networkTotalStaked = computed(() => {
	if (!stats.value?.formattedTotalStaked) return '...'
	const amount = parseFloat(stats.value.formattedTotalStaked)
	return abbreviate(amount, 2) || '0'
})

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
	// If user is already connected, fetch their staking data
	if (stakingStore.isConnected && stakingStore.address) {
		stakingStore.fetchUserStakingData()
	}
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
		<!-- Header Section -->
		<div :class="$style.page_header">
			<div :class="$style.header_main">
				<div :class="$style.title_section">
					<Icon name="validator" size="32" color="primary" />
					<div>
						<h1 :class="$style.page_title">Staking Overview</h1>
						<p :class="$style.page_description">
							Stake your MON tokens to earn rewards and help secure the Monad network
						</p>
					</div>
				</div>
				<div :class="$style.header_actions">
					<Button
						size="medium"
						type="secondary"
						@click="refresh"
						:loading="loading"
					>
						<Icon name="refresh" size="16" />
						Refresh Data
					</Button>
				</div>
			</div>

			<!-- Network Stats Bar -->
			<div :class="$style.network_stats">
				<div :class="$style.stat_item">
					<span :class="$style.stat_label">Current Epoch</span>
					<span :class="$style.stat_value">{{ stats?.currentEpoch || '...' }}</span>
				</div>
				<div :class="$style.stat_divider"></div>
				<div :class="$style.stat_item">
					<span :class="$style.stat_label">Total Validators</span>
					<span :class="$style.stat_value">{{ stats?.activeValidators || '...' }}</span>
				</div>
				<div :class="$style.stat_divider"></div>
				<div :class="$style.stat_item">
					<span :class="$style.stat_label">Total Staked</span>
					<span :class="$style.stat_value">{{ networkTotalStaked }}</span>
				</div>
				<div :class="$style.stat_divider"></div>
				<div :class="$style.stat_item">
					<span :class="$style.stat_label">Est. APY</span>
					<span :class="$style.stat_value">{{ stats?.estimatedAPY || '...' }}%</span>
				</div>
			</div>
		</div>

		<!-- User Portfolio Section -->
		<div v-if="isConnected" :class="$style.portfolio_section">
			<div :class="$style.section_header">
				<Icon name="wallet" size="24" color="primary" />
				<h2 :class="$style.section_title">Your Portfolio</h2>
				<Button size="small" type="secondary" @click="refresh">
					<Icon name="refresh" size="14" />
					Refresh
				</Button>
			</div>

			<div :class="$style.portfolio_content">
				<!-- Portfolio Table -->
				<div :class="$style.portfolio_table">
					<div :class="$style.table_header">
						<div :class="$style.table_cell">Asset</div>
						<div :class="$style.table_cell">Amount</div>
						<div :class="$style.table_cell">Details</div>
						<div :class="$style.table_cell">Actions</div>
					</div>

					<div :class="$style.table_row" data-label="Available Balance">
						<div :class="$style.table_cell">
							<div :class="$style.asset_info">
								<Icon name="wallet" size="18" color="blue" />
								<span>Available Balance</span>
							</div>
						</div>
						<div :class="$style.table_cell">
							<span :class="$style.amount">{{ availableBalance }}</span>
							<span :class="$style.unit">MON</span>
						</div>
						<div :class="$style.table_cell">
							<span :class="$style.detail">Ready to stake</span>
						</div>
						<div :class="$style.table_cell">
							<NuxtLink to="/staking/validators">
								<Button size="small" type="primary">
									<Icon name="plus" size="14" />
									Stake
								</Button>
							</NuxtLink>
						</div>
					</div>

					<div :class="$style.table_row" data-label="Total Staked">
						<div :class="$style.table_cell">
							<div :class="$style.asset_info">
								<Icon name="lock" size="18" color="green" />
								<span>Total Staked</span>
							</div>
						</div>
						<div :class="$style.table_cell">
							<span :class="$style.amount">{{ totalStaked }}</span>
							<span :class="$style.unit">MON</span>
						</div>
						<div :class="$style.table_cell">
							<span :class="$style.detail">{{ totalDelegations }} delegation{{ totalDelegations !== 1 ? 's' : '' }}</span>
						</div>
						<div :class="$style.table_cell">
							<NuxtLink to="/staking/dashboard">
								<Button size="small" type="secondary">
									<Icon name="eye" size="14" />
									View
								</Button>
							</NuxtLink>
						</div>
					</div>

					<div :class="$style.table_row" data-label="Pending Rewards">
						<div :class="$style.table_cell">
							<div :class="$style.asset_info">
								<Icon name="gift" size="18" color="yellow" />
								<span>Pending Rewards</span>
							</div>
						</div>
						<div :class="$style.table_cell">
							<span :class="$style.amount">{{ totalRewards }}</span>
							<span :class="$style.unit">MON</span>
						</div>
						<div :class="$style.table_cell">
							<span :class="$style.detail">Ready to claim</span>
						</div>
						<div :class="$style.table_cell">
							<NuxtLink to="/staking/dashboard">
								<Button size="small" type="primary">
									<Icon name="arrow-up" size="14" />
									Claim
								</Button>
							</NuxtLink>
						</div>
					</div>

					<div v-if="hasPendingWithdrawals" :class="$style.table_row" data-label="Withdrawable">
						<div :class="$style.table_cell">
							<div :class="$style.asset_info">
								<Icon name="clock" size="18" color="orange" />
								<span>Withdrawable</span>
							</div>
						</div>
						<div :class="$style.table_cell">
							<span :class="$style.amount">{{ withdrawableAmount }}</span>
							<span :class="$style.unit">MON</span>
						</div>
						<div :class="$style.table_cell">
							<span :class="$style.detail">Available for withdrawal</span>
						</div>
						<div :class="$style.table_cell">
							<Button size="small" type="secondary">
								<Icon name="arrow-down" size="14" />
								Withdraw
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Quick Actions Section -->
		<div :class="$style.actions_section">
			<div :class="$style.section_header">
				<Icon name="zap" size="24" color="primary" />
				<h2 :class="$style.section_title">Quick Actions</h2>
			</div>

			<div :class="$style.actions_grid">
				<NuxtLink to="/staking/validators" :class="$style.action_button">
					<div :class="$style.button_content">
						<Icon name="search" size="20" color="blue" />
						<div>
							<h3>Browse Validators</h3>
							<p>Explore and compare validators to find the best staking opportunities</p>
						</div>
					</div>
					<Icon name="arrow-right" size="16" color="tertiary" />
				</NuxtLink>

				<NuxtLink v-if="isConnected" to="/staking/dashboard" :class="$style.action_button">
					<div :class="$style.button_content">
						<Icon name="bar-chart" size="20" color="green" />
						<div>
							<h3>My Dashboard</h3>
							<p>Manage your delegations, view rewards, and track your staking performance</p>
						</div>
					</div>
					<Icon name="arrow-right" size="16" color="tertiary" />
				</NuxtLink>

				<div :class="$style.action_button">
					<div :class="$style.button_content">
						<Icon name="info" size="20" color="yellow" />
						<div>
							<h3>How Staking Works</h3>
							<p>Learn about epochs, rewards, commissions, and withdrawal periods</p>
							<div :class="$style.info_items">
								<span>• Epochs last ~5.5 hours (50,000 blocks)</span>
								<span>• 1 epoch withdrawal delay</span>
								<span>• Rewards distributed pro-rata</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Error Display -->
		<div v-if="error" :class="$style.error_banner">
			<Icon name="alert-triangle" size="18" color="red" />
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
	padding: 32px;

	@media (max-width: 768px) {
		padding: 20px;
	}
}

.page_header {
	margin-bottom: 40px;
}

.header_main {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 24px;

	@media (max-width: 768px) {
		flex-direction: column;
		gap: 20px;
	}
}

.title_section {
	display: flex;
	align-items: center;
	gap: 16px;

	.page_title {
		font-size: 36px;
		font-weight: 700;
		color: var(--txt-primary);
		margin: 0 0 8px 0;
	}

	.page_description {
		font-size: 16px;
		color: var(--txt-secondary);
		margin: 0;
		max-width: 600px;
		line-height: 1.5;
	}
}

.header_actions {
	display: flex;
	gap: 12px;
}

.network_stats {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	padding: 20px;

	@media (max-width: 768px) {
		flex-direction: column;
		gap: 16px;
		align-items: stretch;
	}
}

.stat_item {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 4px;
	min-width: 0;

	.stat_label {
		font-size: 12px;
		color: var(--txt-secondary);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat_value {
		font-size: 20px;
		font-weight: 700;
		color: var(--txt-primary);
	}
}

.stat_divider {
	width: 1px;
	background: var(--op-5);
	height: 32px;

	@media (max-width: 768px) {
		width: 100%;
		height: 1px;
	}
}

.portfolio_section {
	margin-bottom: 40px;
}

.section_header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 24px;

	@media (max-width: 768px) {
		flex-direction: column;
		align-items: flex-start;
		gap: 16px;
	}

	.section_title {
		font-size: 24px;
		font-weight: 600;
		color: var(--txt-primary);
		margin: 0;
	}
}

.portfolio_content {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	overflow: hidden;
}

.portfolio_table {
	.table_header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr;
		gap: 16px;
		padding: 16px 24px;
		background: var(--op-5);
		border-bottom: 1px solid var(--op-8);

		@media (max-width: 768px) {
			display: none;
		}

		.table_cell {
			font-size: 12px;
			font-weight: 600;
			color: var(--txt-secondary);
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
	}

	.table_row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr;
		gap: 16px;
		padding: 20px 24px;
		border-bottom: 1px solid var(--op-5);
		transition: all 0.2s ease;

		&:hover {
			background: var(--op-5);
		}

		&:last-child {
			border-bottom: none;
		}

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
			gap: 12px;
			padding: 16px;

			&::before {
				content: attr(data-label);
				font-size: 12px;
				font-weight: 600;
				color: var(--txt-secondary);
				text-transform: uppercase;
				letter-spacing: 0.5px;
				margin-bottom: 8px;
				display: block;
			}
		}

		.table_cell {
			display: flex;
			flex-direction: column;
			gap: 4px;

			@media (max-width: 768px) {
				flex-direction: row;
				align-items: center;
				justify-content: space-between;
			}

			.asset_info {
				display: flex;
				align-items: center;
				gap: 8px;
				font-weight: 500;
				color: var(--txt-primary);
			}

			.amount {
				font-size: 18px;
				font-weight: 700;
				color: var(--txt-primary);
			}

			.unit {
				font-size: 12px;
				color: var(--txt-secondary);
			}

			.detail {
				font-size: 13px;
				color: var(--txt-secondary);
			}
		}
	}
}

.actions_section {
	margin-bottom: 40px;
}

.section_header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 24px;

	.section_title {
		font-size: 24px;
		font-weight: 600;
		color: var(--txt-primary);
		margin: 0;
	}
}

.actions_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 20px;
}

.action_button {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	padding: 24px;
	text-decoration: none;
	color: inherit;
	transition: all 0.2s ease;

	&:hover {
		box-shadow: 0 4px 16px var(--op-10);
		border-color: var(--op-10);
	}

	.button_content {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		flex: 1;

		h3 {
			font-size: 16px;
			font-weight: 600;
			color: var(--txt-primary);
			margin: 0 0 8px 0;
		}

		p {
			font-size: 14px;
			color: var(--txt-secondary);
			margin: 0;
			line-height: 1.4;
		}
	}
}

.info_items {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-top: 12px;

	span {
		font-size: 12px;
		color: var(--txt-secondary);
	}
}

.error_banner {
	display: flex;
	align-items: center;
	gap: 12px;
	background: var(--op-5);
	color: var(--red);
	padding: 16px 20px;
	border-radius: 12px;
	margin-top: 24px;
	border: 1px solid var(--op-10);

	.error_text {
		flex: 1;
		font-weight: 500;
		font-size: 14px;
	}
}
</style>

