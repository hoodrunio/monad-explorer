<script setup>
import { useStakingStore } from '~/store/staking.store'
import { getValidatorById, getDelegatorWithdrawals } from '~/services/api/staking'
import { formatEther } from 'viem'
import { abbreviate } from '~/services/utils/amounts'

// Components
import WalletConnect from '@/components/WalletConnect.vue'
import ValidatorList from '@/components/staking/ValidatorList.vue'
import StakeModal from '@/components/staking/StakeModal.vue'
import ManageModal from '@/components/staking/ManageModal.vue'
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

// Reactive data
const refreshing = ref(false)
const loadingWithdrawals = ref(false)
const withdrawals = ref([])
const userDelegations = computed(() => stakingStore.userDelegations)
const isConnected = computed(() => stakingStore.isConnected)
const address = computed(() => stakingStore.address)

// Modal states
const showStakeModal = ref(false)
const showManageModal = ref(false)
const selectedValidator = ref(null)
const selectedDelegation = ref(null)

// Portfolio summary
const portfolioSummary = computed(() => {
	const totalStakedBigInt = stakingStore.totalStaked
	const totalRewardsBigInt = BigInt(stakingStore.userRewards || '0')
	const totalValue = totalStakedBigInt + totalRewardsBigInt
	
	return {
		totalValue: abbreviate(parseFloat(formatEther(totalValue)), 2) || '0',
		totalStaked: abbreviate(parseFloat(formatEther(totalStakedBigInt)), 2) || '0',
		totalRewards: abbreviate(parseFloat(formatEther(totalRewardsBigInt)), 2) || '0',
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
				secpPubkey: delegation.valId.toString().padStart(64, '0'),
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
				// Add fallback data for failed requests
				validatorMap.set(delegation.valId, {
					valId: delegation.valId,
					authAddress: `0x${delegation.valId.toString().padStart(40, '0')}`,
					secpPubkey: delegation.valId.toString().padStart(64, '0'),
					formattedCommissionRate: 'Error loading',
					formattedConsensusStake: 'Error loading',
					isActive: false,
				})
			}
		}
		
		validators.value = validatorMap
	} catch (error) {
		// Failed to load validator details
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
	
	// Skip if no delegations (no point checking withdrawals)
	if (userDelegations.value.length === 0) {
		withdrawals.value = []
		return
	}
	
	try {
		loadingWithdrawals.value = true
		withdrawals.value = await getDelegatorWithdrawals(address.value)
	} catch (error) {
		// Don't fail silently, but don't break the app
		withdrawals.value = []
	} finally {
		loadingWithdrawals.value = false
	}
}

// Refresh all data
async function refreshData() {
	try {
		refreshing.value = true
		
		// Load balance and staking data first
		await Promise.all([
			stakingStore.fetchBalance(),
			stakingStore.fetchUserStakingData(),
		])
		
		// Load validator details
		await loadValidatorDetails()
		
		// Load withdrawals last (most expensive operation)
		await loadWithdrawals()
		
	} catch (error) {
		// Failed to refresh data
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
		// Withdrawal failed
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
			// Failed to claim rewards
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
			// Failed to compound rewards
		}
	}
	
	await refreshData()
}

// Handle stake action from table
function handleStake(validator) {
	selectedValidator.value = validator
	showStakeModal.value = true
}

// Handle manage action from table  
function handleManage(validator) {
	selectedValidator.value = validator
	// Find the delegation for this validator
	selectedDelegation.value = enrichedDelegations.value.find(d => d.valId === validator.valId)
	showManageModal.value = true
}

// Modal handlers
function handleModalSuccess() {
	// Refresh data after successful action
	refreshData()
}

function handleStakeModalClose() {
	showStakeModal.value = false
	selectedValidator.value = null
}

function handleManageModalClose() {
	showManageModal.value = false
	selectedValidator.value = null
	selectedDelegation.value = null
}

// Initialize
onMounted(async () => {
	if (isConnected.value) {
		await Promise.all([
			stakingStore.fetchBalance(),
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
			stakingStore.fetchBalance(),
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
		<Flex direction="column" gap="16" wide :class="$style.content_container">
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
					<Flex direction="column" gap="12">
						<div :class="$style.section_header">
							<Icon name="chart" size="20" color="primary" />
							<Text size="14" weight="600" color="primary">Portfolio Overview</Text>
							<Button
								size="small"
								type="secondary"
								:loading="refreshing"
								@click="refreshData"
							>
								<Icon name="refresh" size="14" />
								Refresh
							</Button>
						</div>

						<div :class="$style.portfolio_table">
							<div :class="$style.table_header">
								<div :class="$style.table_cell">Metric</div>
								<div :class="$style.table_cell">Value</div>
								<div :class="$style.table_cell">Actions</div>
							</div>

							<div :class="$style.table_row">
								<div :class="$style.table_cell">
									<div :class="$style.metric_info">
										<Icon name="chart" size="16" color="blue" />
										<span>Total Portfolio Value</span>
									</div>
								</div>
								<div :class="$style.table_cell">
									<div :class="$style.value_info">
										<span :class="$style.amount">{{ portfolioSummary.totalValue }}</span>
										<span :class="$style.unit">MON</span>
										<div :class="$style.detail">{{ portfolioSummary.totalStaked }} staked + {{ portfolioSummary.totalRewards }} rewards</div>
									</div>
								</div>
								<div :class="$style.table_cell">
									<NuxtLink to="/staking/dashboard">
										<Button size="small" type="secondary">
											<Icon name="eye" size="14" />
											View Details
										</Button>
									</NuxtLink>
								</div>
							</div>

							<div :class="$style.table_row">
								<div :class="$style.table_cell">
									<div :class="$style.metric_info">
										<Icon name="coin" size="16" color="green" />
										<span>Available Balance</span>
									</div>
								</div>
								<div :class="$style.table_cell">
									<div :class="$style.value_info">
										<span :class="$style.amount">{{ stakingStore.abbreviatedAvailableBalance }}</span>
										<span :class="$style.unit">MON</span>
										<div :class="$style.detail">Ready to delegate</div>
									</div>
								</div>
								<div :class="$style.table_cell">
									<NuxtLink to="/staking/validators">
										<Button size="small" type="primary">
											<Icon name="plus-circle" size="14" />
											Stake
										</Button>
									</NuxtLink>
								</div>
							</div>

							<div :class="$style.table_row">
								<div :class="$style.table_cell">
									<div :class="$style.metric_info">
										<Icon name="coins" size="16" color="yellow" />
										<span>Pending Rewards</span>
									</div>
								</div>
								<div :class="$style.table_cell">
									<div :class="$style.value_info">
										<span :class="$style.amount">{{ portfolioSummary.totalRewards }}</span>
										<span :class="$style.unit">MON</span>
										<div :class="$style.detail">Available to claim</div>
									</div>
								</div>
								<div :class="$style.table_cell">
									<div v-if="BigInt(stakingStore.userRewards || '0') > 0" :class="$style.action_buttons">
										<Button
											size="small"
											type="secondary"
											:loading="stakingStore.loading.compound"
											@click="compoundAllRewards"
										>
											<Icon name="refresh" size="14" />
											Compound
										</Button>
										<Button
											size="small"
											type="primary"
											:loading="stakingStore.loading.claimRewards"
											@click="claimAllRewards"
										>
											<Icon name="arrow-narrow-up" size="14" />
											Claim
										</Button>
									</div>
									<span v-else :class="$style.no_rewards">No rewards available</span>
								</div>
							</div>

							<div :class="$style.table_row">
								<div :class="$style.table_cell">
									<div :class="$style.metric_info">
										<Icon name="validator" size="16" color="purple" />
										<span>Active Delegations</span>
									</div>
								</div>
								<div :class="$style.table_cell">
									<div :class="$style.value_info">
										<span :class="$style.amount">{{ portfolioSummary.delegationCount }}</span>
										<span :class="$style.unit">Validator{{ portfolioSummary.delegationCount !== 1 ? 's' : '' }}</span>
										<div :class="$style.detail">Currently earning rewards</div>
									</div>
								</div>
								<div :class="$style.table_cell">
									<NuxtLink to="/staking/dashboard">
										<Button size="small" type="secondary">
											<Icon name="settings" size="14" />
											Manage
										</Button>
									</NuxtLink>
								</div>
							</div>
						</div>
					</Flex>

					<!-- Pending Withdrawals -->
					<Flex v-if="withdrawals.length > 0" direction="column" gap="16">
						<div :class="$style.section_header">
							<Icon name="clock" size="20" color="primary" />
							<Text size="14" weight="600" color="primary">Pending Withdrawals</Text>
							<Flex align="center" gap="8" :class="$style.withdrawable_total">
								<Text size="12" color="success">Total Withdrawable:</Text>
								<Text size="12" weight="600" color="success">{{ abbreviate(parseFloat(formatEther(withdrawableTotal)), 2) || '0' }} MON</Text>
							</Flex>
						</div>

						<div :class="$style.withdrawals_table">
							<div :class="$style.table_header">
								<div :class="$style.table_cell">Validator</div>
								<div :class="$style.table_cell">Amount</div>
								<div :class="$style.table_cell">Status</div>
								<div :class="$style.table_cell">Action</div>
							</div>

							<div
								v-for="withdrawal in withdrawals"
								:key="`${withdrawal.valId}-${withdrawal.withdrawId}`"
								:class="$style.table_row"
							>
								<div :class="$style.table_cell">
									<div :class="$style.validator_info">
										<Icon name="check-circle" size="16" color="blue" />
										<span>Validator #{{ withdrawal.valId }}</span>
									</div>
								</div>
								<div :class="$style.table_cell">
									<span :class="$style.amount">{{ abbreviate(parseFloat(withdrawal.formattedAmount), 2) || '0' }}</span>
									<span :class="$style.unit">MON</span>
								</div>
								<div :class="$style.table_cell">
									<span :class="[$style.status, { [$style.ready]: withdrawal.isWithdrawable }]">
										{{ withdrawal.isWithdrawable ? 'Ready to withdraw' : `Available in epoch ${withdrawal.withdrawableEpoch}` }}
									</span>
								</div>
								<div :class="$style.table_cell">
									<Button
										v-if="withdrawal.isWithdrawable"
										size="small"
										type="primary"
										:loading="stakingStore.loading.withdraw"
										@click="handleWithdraw(withdrawal)"
									>
										<Icon name="arrow-down" size="14" />
										Withdraw
									</Button>
									<Flex v-else align="center" gap="4" :class="$style.waiting_status">
										<Icon name="clock" size="14" color="secondary" />
										<span>Waiting</span>
									</Flex>
								</div>
							</div>
						</div>
					</Flex>

					<!-- My Delegations -->
					<Flex direction="column" gap="16">
						<Flex direction="column" align="center" gap="8">
							<Flex align="center" gap="8">
								<Icon name="validator" size="20" color="primary" />
								<Text size="14" weight="600" color="primary">My Delegations</Text>
							</Flex>
							<Text size="12" color="tertiary">Manage your active delegations and rewards</Text>
						</Flex>

						<!-- No Delegations -->
						<div v-if="enrichedDelegations.length === 0" :class="$style.no_delegations">
							<div :class="$style.no_delegations_content">
								<Icon name="chart" size="48" color="tertiary" />
								<h3>No Active Delegations</h3>
								<p>You haven't staked any MON tokens yet. Start earning rewards by delegating to validators.</p>
								<NuxtLink to="/staking/validators">
									<Button size="medium" type="primary">
										<Icon name="search" size="16" />
										Browse Validators
									</Button>
								</NuxtLink>
							</div>
						</div>

						<!-- Delegations Table -->
						<ValidatorList
							v-else
							:validators="enrichedDelegations.map(d => d.validator)"
							:user-delegations="enrichedDelegations.map(d => ({ validatorId: d.valId, ...d }))"
							:total-network-stake="'0'"
							:loading="false"
							@stake="handleStake"
							@manage="handleManage"
						/>
					</Flex>
				</template>
		</Flex>

		<!-- Modals -->
		<StakeModal
			:show="showStakeModal"
			:validator="selectedValidator"
			@close="handleStakeModalClose"
			@success="handleModalSuccess"
		/>

		<ManageModal
			:show="showManageModal"
			:validator="selectedValidator"
			:delegation="selectedDelegation"
			:withdrawals="withdrawals"
			@close="handleManageModalClose"
			@success="handleModalSuccess"
		/>
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

.section_header {
	display: flex;
	align-items: center;
	gap: 8px;
	justify-content: space-between;
	margin-bottom: 12px;

	@media (max-width: 768px) {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		margin-bottom: 10px;
	}
}

.portfolio_table {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	overflow: hidden;

	.table_header {
		display: grid;
		grid-template-columns: 1.5fr 2fr 1fr;
		gap: 12px;
		padding: 12px 20px;
		background: var(--op-5);
		border-bottom: 1px solid var(--op-8);

		@media (max-width: 768px) {
			display: none;
		}

		.table_cell {
			font-size: 11px;
			font-weight: 600;
			color: var(--txt-secondary);
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
	}

	.table_row {
		display: grid;
		grid-template-columns: 1.2fr 1.8fr 0.8fr;
		gap: 8px;
		padding: 12px 16px;
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
			gap: 6px;
			padding: 10px;

			&::before {
				content: attr(data-label);
				font-size: 10px;
				font-weight: 600;
				color: var(--txt-secondary);
				text-transform: uppercase;
				letter-spacing: 0.5px;
				margin-bottom: 4px;
				display: block;
			}
		}

		.table_cell {
			display: flex;
			align-items: center;
			gap: 4px;

			@media (max-width: 768px) {
				justify-content: space-between;
			}

			.metric_info {
				display: flex;
				align-items: center;
				gap: 8px;
				font-weight: 500;
				color: var(--txt-primary);
				min-width: 0;

				span {
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
			}

			.value_info {
				display: flex;
				flex-direction: column;
				gap: 1px;
				min-width: 0;

				.amount {
					font-size: 15px;
					font-weight: 700;
					color: var(--txt-primary);
				}

				.unit {
					font-size: 10px;
					color: var(--txt-secondary);
					font-weight: 500;
				}

				.detail {
					font-size: 10px;
					color: var(--txt-secondary);
					line-height: 1.2;
				}
			}

			.action_buttons {
				display: flex;
				gap: 4px;

				@media (max-width: 768px) {
					flex-direction: column;
					align-items: flex-end;
					gap: 4px;
				}
			}

			.no_rewards {
				font-size: 10px;
				color: var(--txt-tertiary);
				font-style: italic;
			}
		}
	}
}

.withdrawals_table {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	overflow: hidden;

	.table_header {
		display: grid;
		grid-template-columns: 2fr 1fr 1.5fr 1fr;
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
		grid-template-columns: 2fr 1fr 1.5fr 1fr;
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

			.validator_info {
				display: flex;
				align-items: center;
				gap: 8px;
				font-weight: 500;
				color: var(--txt-primary);
			}

			.amount {
				font-size: 16px;
				font-weight: 700;
				color: var(--txt-primary);
			}

			.unit {
				font-size: 12px;
				color: var(--txt-secondary);
			}

			.status {
				font-size: 13px;
				color: var(--txt-secondary);
				padding: 4px 8px;
				border-radius: 8px;
				background: var(--op-5);
				align-self: flex-start;

				&.ready {
					background: var(--op-5);
					color: var(--green);
				}

				@media (max-width: 768px) {
					align-self: auto;
				}
			}

			.waiting_status {
				font-size: 13px;
				color: var(--txt-secondary);
			}
		}
	}
}

.withdrawable_total {
	background: var(--op-5);
	padding: 6px 12px;
	border-radius: 8px;
	border: 1px solid var(--op-10);
}

.no_delegations {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	padding: 60px 24px;
	text-align: center;

	.no_delegations_content {
		max-width: 400px;
		margin: 0 auto;

		h3 {
			font-size: 20px;
			font-weight: 600;
			color: var(--txt-primary);
			margin: 0 0 12px 0;
		}

		p {
			color: var(--txt-secondary);
			margin: 0 0 24px 0;
			line-height: 1.5;
			font-size: 14px;
		}
	}
}
</style>
