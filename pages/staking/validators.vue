<script setup>
import { useStakingStore } from '~/store/staking.store'
import { getStakingStats } from '~/services/api/staking'
import { fetchValidatorRankings } from '@/services/api/validator'
import { isMainnet } from '~/services/utils/general'

// Components
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Icon from "@/components/Icon.vue"
import NetworkGuard from '@/components/staking/NetworkGuard.vue'
import ValidatorList from '@/components/staking/ValidatorList.vue'

const route = useRoute()
const router = useRouter()
const stakingStore = useStakingStore()

// Auth middleware for mainnet
definePageMeta({
	middleware: async (to, from) => {
		if (isMainnet()) {
			const config = useRuntimeConfig()
			if (config.mainnetAuthEnabled) {
				const authCookie = useCookie('monad_auth_session')
				if (!authCookie.value) {
					return navigateTo('/auth/login')
				}
			}
		}
	}
})

// SEO
useHead({
	title: "Validators - Monad Staking",
	link: [
		{
			rel: "canonical",
			href: "/staking/validators",
		},
	],
	meta: [
		{
			name: "description",
			content: "Browse and compare Monad validators. Find the best validators to stake your MON tokens based on commission rates, performance, and reliability.",
		},
		{
			name: "keywords",
			content: "monad validators, staking validators, MON staking, validator comparison, blockchain validators",
		},
	],
})

// State
const validators = ref([])
const allValidators = ref([])
const loading = ref(true)
const error = ref('')
const searchTerm = ref(route.query.search || '')
const selectedSort = ref(route.query.sort || 'stake')
const sortDirection = ref(route.query.dir || 'desc')
const filterType = ref(route.query.filter || 'all')
const showStakeModal = ref(false)
const selectedValidator = ref(null)
const stats = ref(null)

// Sort options
const sortOptions = [
	{ label: 'Total Stake', value: 'stake' },
	{ label: 'Commission Rate', value: 'commission' },
	{ label: 'Validator ID', value: 'valId' },
	{ label: 'Status', value: 'status' },
]

// Filter options
const filterOptions = [
	{ label: 'All Validators', value: 'all' },
	{ label: 'Active Only', value: 'active' },
	{ label: 'My Delegations', value: 'delegated' },
]

// Computed values
const isConnected = computed(() => stakingStore.isConnected)
const userDelegations = computed(() => stakingStore.userDelegations)

// Get user delegation for a validator
const getUserDelegation = computed(() => {
	return (valId) => {
		return userDelegations.value.find(d => d.valId === valId)
	}
})

// Filtered and sorted validators
const filteredValidators = computed(() => {
	let filtered = [...allValidators.value]
	
	// Search filter
	if (searchTerm.value.trim()) {
		const search = searchTerm.value.toLowerCase().trim()
		filtered = filtered.filter(validator => 
			validator.valId.toString().includes(search) ||
			validator.authAddress.toLowerCase().includes(search) ||
			(validator.name && validator.name.toLowerCase().includes(search))
		)
	}
	
	// Type filter
	switch (filterType.value) {
		case 'active':
			filtered = filtered.filter(v => v.isActive)
			break
		case 'delegated':
			if (isConnected.value) {
				const delegatedValIds = userDelegations.value.map(d => d.valId)
				filtered = filtered.filter(v => delegatedValIds.includes(v.valId))
			}
			break
	}
	
	// Sort
	filtered.sort((a, b) => {
		let aValue, bValue
		
		switch (selectedSort.value) {
			case 'stake':
				// Safely convert stake values to BigInt, handling scientific notation
				const aStake = a.consensusStake || a.stake || '0'
				const bStake = b.consensusStake || b.stake || '0'
				
				// Convert to number first, then to string without scientific notation
				const aStakeNum = Number(aStake)
				const bStakeNum = Number(bStake)
				
				// Use toLocaleString to avoid scientific notation, then remove commas
				const aStakeStr = aStakeNum.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false })
				const bStakeStr = bStakeNum.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false })
				
				aValue = BigInt(aStakeStr)
				bValue = BigInt(bStakeStr)
				break
			case 'commission':
				aValue = a.commissionRate || 0
				bValue = b.commissionRate || 0
				break
			case 'valId':
				aValue = a.valId
				bValue = b.valId
				break
			case 'status':
				aValue = a.isActive ? 1 : 0
				bValue = b.isActive ? 1 : 0
				break
			default:
				return 0
		}
		
		if (sortDirection.value === 'desc') {
			return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
		} else {
			return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
		}
	})
	
	return filtered
})

// Statistics
const validatorStats = computed(() => {
	const total = allValidators.value.length
	const active = allValidators.value.filter(v => v.isActive).length
	const userDelegated = isConnected.value ? userDelegations.value.length : 0
	
	return { total, active, userDelegated }
})

// Load validators data
async function loadValidators() {
	try {
		loading.value = true
		error.value = ''
		
		const [validatorRankings, networkStats] = await Promise.all([
			fetchValidatorRankings({
				limit: 1000, // Get all validators
				active_only: filterType.value === 'active', // Use active_only based on filter
				sortBy: 'stake',
				window: '7d'
			}),
			getStakingStats().catch(() => null),
		])
		
		// Transform validator rankings data to match staking component expectations
		if (validatorRankings.data.value?.data) {
			const validatorsList = validatorRankings.data.value.data.map(validator => {
				return {
					valId: validator.staking?.precompile_validator_id || validator.validator_id || '',
					authAddress: validator.validator_id || '', // Using validator_id as address fallback
					name: validator.infrastructure?.validator_name || `Validator ${validator.validator_id}`,
					stake: validator.staking?.real_time_stake_mon ? 
						parseFloat(validator.staking.real_time_stake_mon * 1e18).toFixed(0) : '0', // Convert to wei
					consensusStake: validator.staking?.real_time_stake_mon ? 
						parseFloat(validator.staking.real_time_stake_mon * 1e18).toFixed(0) : '0', // Convert to wei
					commissionRate: parseFloat(validator.staking?.commission?.percentage || 0),
					formattedStake: validator.staking?.real_time_stake_mon || '0',
					formattedConsensusStake: validator.staking?.real_time_stake_mon || '0',
					formattedCommissionRate: `${parseFloat(validator.staking?.commission?.percentage || 0).toFixed(2).replace(/\.?0+$/, '')}%`,
					isActive: validator.staking?.is_staking_active || false,
					// Include staking object for ValidatorList component
					staking: validator.staking,
					// Additional fields from rankings
					uptimeScore: validator.metrics?.block_proposal_ratio || 0,
					qcParticipationRate: validator.metrics?.qc_participation_rate || 0,
					provider: validator.infrastructure?.provider || 'Unknown',
					location: validator.infrastructure?.location || 'Unknown',
					logoUrl: validator.keybase?.logo_url || null
				}
			})
			
			allValidators.value = validatorsList
		}
		
		stats.value = networkStats
		
	} catch (err) {
		error.value = 'Failed to load validators. Please try again.'
	} finally {
		loading.value = false
	}
}

// Handle sort change
function handleSortChange(newSort) {
	if (newSort === selectedSort.value) {
		sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
	} else {
		selectedSort.value = newSort
		sortDirection.value = 'desc'
	}
	updateURL()
}

// Handle filter change
function handleFilterChange(newFilter) {
	filterType.value = newFilter
	updateURL()
}

// Update URL with current filters
function updateURL() {
	const query = {}
	if (searchTerm.value) query.search = searchTerm.value
	if (selectedSort.value !== 'stake') query.sort = selectedSort.value
	if (sortDirection.value !== 'desc') query.dir = sortDirection.value
	if (filterType.value !== 'all') query.filter = filterType.value
	
	router.replace({ query })
}

// Handle stake action
function handleStake(validator) {
	selectedValidator.value = validator
	showStakeModal.value = true
}

// Handle manage action
function handleManage(validator) {
	router.push(`/staking/dashboard?validator=${validator.valId}`)
}

// Initialize
onMounted(async () => {
	await loadValidators()
	
	if (isConnected.value) {
		stakingStore.fetchUserStakingData()
	}
})

// Watch search term
watch(searchTerm, () => {
	updateURL()
}, { debounce: 300 })

// Watch connection status
watch(() => stakingStore.isConnected, (connected) => {
	if (connected) {
		stakingStore.fetchUserStakingData()
	}
})

// Watch filter type changes to reload validators
watch(filterType, () => {
	loadValidators()
})
</script>

<template>
	<Flex direction="column" gap="12" wide :class="$style.wrapper">
		<Breadcrumbs
			:items="[
				{ link: '/', name: 'Dashboard' },
				{ link: '/staking', name: 'Staking' },
				{ link: '/staking/validators', name: 'Validators' },
			]"
			:class="$style.breadcrumbs"
		/>

		<Flex align="center" justify="between" wide :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="validator" size="16" color="secondary" />
				<Text size="16" weight="600" color="primary">Validator Network</Text>
			</Flex>
			<Flex align="center" gap="12" :class="$style.header_actions">
				<WalletConnect />
			</Flex>
		</Flex>

		<!-- Content -->
		<Flex direction="column" gap="20" wide :class="$style.content_container">
			<!-- Network Guard - Show warning if on wrong network -->
			<NetworkGuard />

			<!-- Stats Overview -->
			<Flex align="center" justify="between" wide :class="$style.stats_section">
				<Flex direction="column" gap="4">
					<Text size="14" weight="600" color="primary">Network Overview</Text>
					<Text size="12" color="tertiary">Choose validators to stake your MON tokens and earn rewards</Text>
				</Flex>
				<Flex align="center" gap="24">
					<Flex direction="column" align="center" gap="4">
						<Text size="18" weight="700" color="primary">{{ validatorStats.total }}</Text>
						<Text size="10" color="tertiary" transform="uppercase">Total</Text>
					</Flex>
					<Flex direction="column" align="center" gap="4">
						<Text size="18" weight="700" color="success">{{ validatorStats.active }}</Text>
						<Text size="10" color="tertiary" transform="uppercase">Active</Text>
					</Flex>
					<Flex v-if="isConnected" direction="column" align="center" gap="4">
						<Text size="18" weight="700" color="brand">{{ validatorStats.userDelegated }}</Text>
						<Text size="10" color="tertiary" transform="uppercase">Your Delegations</Text>
					</Flex>
				</Flex>
			</Flex>

				<!-- Filters and Search -->
				<div :class="$style.filters_section">
					<div :class="$style.search_section">
						<Input 
							v-model="searchTerm"
							placeholder="Search by validator ID, address, or name..."
							:class="$style.search_input"
						/>
					</div>
					
					<Flex align="center" gap="12" :class="$style.filter_controls">
						<!-- Filter Select -->
						<Flex direction="column" gap="4">
							<Text size="12" weight="600" color="tertiary">Filter</Text>
							<select 
								v-model="filterType" 
								@change="handleFilterChange(filterType)"
								:class="$style.select_input"
							>
								<option 
									v-for="option in filterOptions"
									:key="option.value"
									:value="option.value"
								>
									{{ option.label }}
								</option>
							</select>
						</Flex>
						
						<!-- Sort Select -->
						<Flex direction="column" gap="4">
							<Text size="12" weight="600" color="tertiary">Sort By</Text>
							<select 
								v-model="selectedSort" 
								@change="handleSortChange(selectedSort)"
								:class="$style.select_input"
							>
								<option 
									v-for="option in sortOptions"
									:key="option.value"
									:value="option.value"
								>
									{{ option.label }}
									{{ selectedSort === option.value ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : '' }}
								</option>
							</select>
						</Flex>
						
						<!-- Sort Direction Toggle -->
						<Flex direction="column" gap="4">
							<Text size="12" weight="600" color="tertiary">Order</Text>
							<Button 
								size="medium" 
								type="secondary"
								@click="sortDirection = sortDirection === 'desc' ? 'asc' : 'desc'"
								:class="$style.direction_button"
							>
								{{ sortDirection === 'desc' ? '↓ Desc' : '↑ Asc' }}
							</Button>
						</Flex>
					</Flex>
				</div>

				<!-- Loading State -->
				<div v-if="loading" :class="$style.loading_section">
					<div :class="$style.loading_spinner"></div>
					<p>Loading validators...</p>
				</div>

				<!-- Error State -->
				<div v-else-if="error" :class="$style.error_section">
					<div :class="$style.error_content">
						<span :class="$style.error_icon">⚠️</span>
						<span :class="$style.error_text">{{ error }}</span>
						<Button size="small" type="secondary" @click="loadValidators">
							Retry
						</Button>
					</div>
				</div>

				<!-- Validators Table -->
				<ValidatorList
					v-if="filteredValidators.length > 0"
					:validators="filteredValidators"
					:user-delegations="userDelegations"
					:total-network-stake="stats?.totalStaked || '0'"
					:loading="loading"
					@stake="handleStake"
					@manage="handleManage"
				/>

				<!-- Empty State -->
				<div v-else :class="$style.empty_section">
					<div :class="$style.empty_content">
						<div :class="$style.empty_icon">🔍</div>
						<h3>No validators found</h3>
						<p>
							{{ searchTerm ? 
								'Try adjusting your search terms or filters.' : 
								'No validators match your current filters.' 
							}}
						</p>
						<Button 
							v-if="searchTerm || filterType !== 'all'" 
							size="medium" 
							type="secondary"
							@click="searchTerm = ''; filterType = 'all'"
						>
							Clear Filters
						</Button>
					</div>
				</div>

		<!-- Stake Modal -->
		<div v-if="showStakeModal && selectedValidator" :class="$style.modal_overlay" @click.self="showStakeModal = false">
			<div :class="$style.modal_container">
				<StakingCard 
					:validator="selectedValidator"
					:delegation="getUserDelegation(selectedValidator.valId)"
				/>
				<div :class="$style.modal_actions">
					<Button 
						type="secondary" 
						@click="showStakeModal = false"
					>
						Close
					</Button>
				</div>
			</div>
		</div>
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

.stats_section {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	padding: 20px;
	
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 16px;
		align-items: flex-start !important;
	}
}

.title_section {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 32px;
	
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 20px;
	}
	
	.title_content {
		h1 {
			font-size: 32px;
			font-weight: 700;
			color: var(--txt-primary);
			margin: 0 0 8px 0;
		}
		
		p {
			font-size: 16px;
			color: var(--txt-secondary);
			margin: 0;
		}
	}
	
	.stats_summary {
		display: flex;
		gap: 24px;
		
		@media (max-width: 640px) {
			gap: 16px;
		}
		
		.stat_item {
			text-align: center;
			
			.stat_value {
				display: block;
				font-size: 24px;
				font-weight: 700;
				color: var(--txt-primary);
				margin-bottom: 4px;
			}
			
			.stat_label {
				display: block;
				font-size: 12px;
				color: var(--txt-secondary);
				text-transform: uppercase;
				font-weight: 600;
			}
		}
	}
}

.filters_section {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 16px;
	padding: 24px;
	margin-bottom: 32px;
	display: flex;
	align-items: center;
	gap: 20px;
	
	@media (max-width: 768px) {
		flex-direction: column;
		align-items: stretch;
		gap: 16px;
	}
	
	.search_section {
		flex: 1;
		
		.search_input {
			width: 100%;
		}
	}
	
	.filter_controls {
		@media (max-width: 640px) {
			flex-direction: column;
			align-items: flex-start !important;
		}
	}
}

.select_input {
	height: 32px;
	padding: 0 8px;
	border: 1px solid var(--op-5);
	border-radius: 6px;
	background: var(--op-3);
	color: var(--txt-primary);
	font-size: 13px;
	font-weight: 600;
	min-width: 120px;
	
	&:hover {
		border-color: var(--op-10);
	}
	
	&:focus {
		outline: none;
		border-color: var(--op-20);
	}
}

.direction_button {
	min-width: 80px;
}

.loading_section,
.error_section,
.empty_section {
	text-align: center;
	padding: 80px 20px;
}

.loading_section {
	.loading_spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--op-5);
		border-top: 4px solid var(--brand);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 16px;
	}
	
	p {
		color: var(--txt-secondary);
		margin: 0;
	}
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.error_section {
	.error_content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background: var(--op-5);
		border-radius: 12px;
		padding: 20px;
		max-width: 400px;
		margin: 0 auto;
		
		.error_icon {
			font-size: 20px;
		}
		
		.error_text {
			flex: 1;
			color: var(--red);
			font-weight: 500;
		}
	}
}

.empty_section {
	.empty_content {
		max-width: 400px;
		margin: 0 auto;
		
		.empty_icon {
			font-size: 48px;
			margin-bottom: 16px;
		}
		
		h3 {
			font-size: 24px;
			font-weight: 600;
			color: var(--txt-primary);
			margin: 0 0 12px 0;
		}
		
		p {
			color: var(--txt-secondary);
			margin: 0 0 20px 0;
			line-height: 1.5;
		}
	}
}

.validators_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
	gap: 24px;
	
	@media (max-width: 480px) {
		grid-template-columns: 1fr;
	}
}

.modal_overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: 20px;
}

.modal_container {
	background: var(--card-background);
	border-radius: 16px;
	max-width: 500px;
	width: 100%;
	max-height: 90vh;
	overflow-y: auto;
	
	.modal_actions {
		padding: 20px;
		border-top: 1px solid var(--op-5);
		text-align: right;
	}
}
</style>
