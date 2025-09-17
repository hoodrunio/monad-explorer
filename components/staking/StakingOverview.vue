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
	<div class="staking-overview">
		<!-- Header -->
		<div class="overview-header">
			<div class="header-content">
				<h1 class="page-title">Staking Overview</h1>
				<p class="page-description">
					Stake your MON tokens to earn rewards and help secure the Monad network
				</p>
			</div>
			<div class="header-actions">
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
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-icon">🌐</span>
					<span class="stat-title">Network Status</span>
				</div>
				<div class="stat-content">
					<div class="stat-main">
						<span class="stat-value">{{ stats?.currentEpoch || '...' }}</span>
						<span class="stat-label">Current Epoch</span>
					</div>
					<div class="stat-detail">
						<span class="boundary-status" :class="{ active: stats?.inBoundary }">
							{{ stats?.inBoundary ? 'In Boundary Period' : 'Normal Period' }}
						</span>
					</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-icon">👥</span>
					<span class="stat-title">Validators</span>
				</div>
				<div class="stat-content">
					<div class="stat-main">
						<span class="stat-value">{{ stats?.activeValidators || '...' }}</span>
						<span class="stat-label">Active</span>
					</div>
					<div class="stat-detail">
						{{ stats?.totalValidators || '...' }} Total Validators
					</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-icon">💰</span>
					<span class="stat-title">Total Staked</span>
				</div>
				<div class="stat-content">
					<div class="stat-main">
						<span class="stat-value">{{ stats?.formattedTotalStaked || '...' }}</span>
						<span class="stat-label">MON</span>
					</div>
					<div class="stat-detail">
						Network Security
					</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-icon">📈</span>
					<span class="stat-title">Est. APY</span>
				</div>
				<div class="stat-content">
					<div class="stat-main">
						<span class="stat-value">{{ stats?.estimatedAPY || '...' }}%</span>
						<span class="stat-label">Annual</span>
					</div>
					<div class="stat-detail">
						Avg Commission: {{ stats?.averageCommission || '...' }}%
					</div>
				</div>
			</div>
		</div>

		<!-- User Portfolio (only show if connected) -->
		<div v-if="isConnected" class="user-portfolio">
			<div class="portfolio-header">
				<h2>Your Portfolio</h2>
			</div>

			<div class="portfolio-grid">
				<!-- Balance Card -->
				<div class="portfolio-card">
					<div class="card-header">
						<span class="card-icon">💳</span>
						<span class="card-title">Available Balance</span>
					</div>
					<div class="card-content">
						<div class="card-main">
							<span class="card-value">{{ availableBalance }}</span>
							<span class="card-label">MON</span>
						</div>
						<div class="card-action">
							<NuxtLink to="/staking/validators">
								<Button size="small" type="primary">
									Stake Now
								</Button>
							</NuxtLink>
						</div>
					</div>
				</div>

				<!-- Staked Amount Card -->
				<div class="portfolio-card">
					<div class="card-header">
						<span class="card-icon">🔒</span>
						<span class="card-title">Total Staked</span>
					</div>
					<div class="card-content">
						<div class="card-main">
							<span class="card-value">{{ totalStaked }}</span>
							<span class="card-label">MON</span>
						</div>
						<div class="card-detail">
							{{ totalDelegations }} Delegation{{ totalDelegations !== 1 ? 's' : '' }}
						</div>
					</div>
				</div>

				<!-- Rewards Card -->
				<div class="portfolio-card">
					<div class="card-header">
						<span class="card-icon">🎁</span>
						<span class="card-title">Pending Rewards</span>
					</div>
					<div class="card-content">
						<div class="card-main">
							<span class="card-value rewards">{{ totalRewards }}</span>
							<span class="card-label">MON</span>
						</div>
						<div class="card-detail">
							Ready to claim or compound
						</div>
					</div>
				</div>

				<!-- Withdrawable Card -->
				<div v-if="hasPendingWithdrawals" class="portfolio-card">
					<div class="card-header">
						<span class="card-icon">⏰</span>
						<span class="card-title">Withdrawable</span>
					</div>
					<div class="card-content">
						<div class="card-main">
							<span class="card-value">{{ withdrawableAmount }}</span>
							<span class="card-label">MON</span>
						</div>
						<div class="card-action">
							<Button size="small" type="secondary">
								Withdraw
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="quick-actions">
			<div class="actions-header">
				<h2>Quick Actions</h2>
			</div>

			<div class="actions-grid">
				<NuxtLink to="/staking/validators" class="action-card">
					<div class="action-icon">🔍</div>
					<div class="action-content">
						<h3>Browse Validators</h3>
						<p>Explore and compare validators to find the best staking opportunities</p>
					</div>
				</NuxtLink>

				<NuxtLink v-if="isConnected" to="/staking/dashboard" class="action-card">
					<div class="action-icon">📊</div>
					<div class="action-content">
						<h3>My Dashboard</h3>
						<p>Manage your delegations, view rewards, and track your staking performance</p>
					</div>
				</NuxtLink>

				<div class="action-card info">
					<div class="action-icon">ℹ️</div>
					<div class="action-content">
						<h3>How Staking Works</h3>
						<p>Learn about epochs, rewards, commissions, and withdrawal periods</p>
						<div class="info-list">
							<div class="info-item">• Epochs last ~5.5 hours (50,000 blocks)</div>
							<div class="info-item">• 1 epoch withdrawal delay</div>
							<div class="info-item">• Rewards distributed pro-rata</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Error Display -->
		<div v-if="error" class="error-banner">
			<span class="error-icon">⚠️</span>
			<span class="error-text">{{ error }}</span>
			<Button size="small" type="secondary" @click="refresh">
				Retry
			</Button>
		</div>
	</div>
</template>

<style module lang="scss">
.staking-overview {
	max-width: 1200px;
	margin: 0 auto;
	padding: 24px;
	
	@media (max-width: 768px) {
		padding: 16px;
	}
}

.overview-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 32px;
	
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 16px;
	}
	
	.header-content {
		.page-title {
			font-size: 32px;
			font-weight: 700;
			color: var(--text-primary, #000);
			margin: 0 0 8px 0;
		}
		
		.page-description {
			font-size: 16px;
			color: var(--text-secondary, #666);
			margin: 0;
			max-width: 600px;
		}
	}
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 20px;
	margin-bottom: 40px;
}

.stat-card {
	background: var(--card-background, #ffffff);
	border: 1px solid var(--border-color, #e1e5e9);
	border-radius: 16px;
	padding: 24px;
	transition: all 0.2s ease;
	
	&:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.stat-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
		
		.stat-icon {
			font-size: 20px;
		}
		
		.stat-title {
			font-size: 14px;
			font-weight: 600;
			color: var(--text-secondary, #666);
		}
	}
	
	.stat-content {
		.stat-main {
			display: flex;
			align-items: baseline;
			gap: 8px;
			margin-bottom: 8px;
			
			.stat-value {
				font-size: 28px;
				font-weight: 700;
				color: var(--text-primary, #000);
			}
			
			.stat-label {
				font-size: 14px;
				color: var(--text-secondary, #666);
			}
		}
		
		.stat-detail {
			font-size: 13px;
			color: var(--text-secondary, #666);
			
			.boundary-status {
				padding: 2px 8px;
				border-radius: 12px;
				font-weight: 500;
				background: var(--info-background, #e3f2fd);
				color: var(--info-color, #1976d2);
				
				&.active {
					background: var(--warning-background, #fff3cd);
					color: var(--warning-color, #856404);
				}
			}
		}
	}
}

.user-portfolio {
	margin-bottom: 40px;
	
	.portfolio-header {
		margin-bottom: 20px;
		
		h2 {
			font-size: 24px;
			font-weight: 600;
			color: var(--text-primary, #000);
			margin: 0;
		}
	}
}

.portfolio-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 20px;
}

.portfolio-card {
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
	
	.card-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
		
		.card-icon {
			font-size: 18px;
		}
		
		.card-title {
			font-size: 14px;
			font-weight: 600;
			opacity: 0.9;
		}
	}
	
	.card-content {
		.card-main {
			display: flex;
			align-items: baseline;
			gap: 8px;
			margin-bottom: 8px;
			
			.card-value {
				font-size: 24px;
				font-weight: 700;
				
				&.rewards {
					color: #4ade80;
				}
			}
			
			.card-label {
				font-size: 12px;
				opacity: 0.8;
			}
		}
		
		.card-detail {
			font-size: 12px;
			opacity: 0.8;
			margin-bottom: 12px;
		}
		
		.card-action {
			margin-top: 12px;
		}
	}
}

.quick-actions {
	margin-bottom: 40px;
	
	.actions-header {
		margin-bottom: 20px;
		
		h2 {
			font-size: 24px;
			font-weight: 600;
			color: var(--text-primary, #000);
			margin: 0;
		}
	}
}

.actions-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	gap: 20px;
}

.action-card {
	display: flex;
	align-items: flex-start;
	gap: 16px;
	background: var(--card-background, #ffffff);
	border: 1px solid var(--border-color, #e1e5e9);
	border-radius: 16px;
	padding: 24px;
	text-decoration: none;
	color: inherit;
	transition: all 0.2s ease;
	
	&:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}
	
	&.info {
		background: var(--info-background, #e3f2fd);
		border-color: var(--info-color, #1976d2);
		
		&:hover {
			background: var(--info-background-hover, #d1ecf1);
		}
	}
	
	.action-icon {
		font-size: 32px;
		flex-shrink: 0;
	}
	
	.action-content {
		flex: 1;
		
		h3 {
			font-size: 18px;
			font-weight: 600;
			color: var(--text-primary, #000);
			margin: 0 0 8px 0;
		}
		
		p {
			font-size: 14px;
			color: var(--text-secondary, #666);
			margin: 0 0 12px 0;
			line-height: 1.5;
		}
		
		.info-list {
			.info-item {
				font-size: 12px;
				color: var(--text-secondary, #666);
				margin-bottom: 4px;
				
				&:last-child {
					margin-bottom: 0;
				}
			}
		}
	}
}

.error-banner {
	display: flex;
	align-items: center;
	gap: 12px;
	background: var(--error-background, #fee);
	color: var(--error-color, #dc3545);
	padding: 16px;
	border-radius: 12px;
	margin-top: 20px;
	
	.error-icon {
		font-size: 16px;
	}
	
	.error-text {
		flex: 1;
		font-weight: 500;
	}
}
</style>
