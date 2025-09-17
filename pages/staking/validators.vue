<script setup>
import { useStakingStore } from '~/store/staking.store'
import { getExecutionValidators, getConsensusValidators, getStakingStats } from '~/services/api/staking'

// Components
import WalletConnect from '@/components/WalletConnect.vue'
import ValidatorCard from '@/components/staking/ValidatorCard.vue'
import StakingCard from '@/components/staking/StakingCard.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

const route = useRoute()
const router = useRouter()
const stakingStore = useStakingStore()

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
			validator.authAddress.toLowerCase().includes(search)
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
				aValue = BigInt(a.consensusStake || a.stake || '0')
				bValue = BigInt(b.consensusStake || b.stake || '0')
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
		
		const [executionVals, consensusVals, networkStats] = await Promise.all([
			getExecutionValidators(),
			getConsensusValidators(),
			getStakingStats().catch(() => null),
		])
		
		// Merge execution and consensus validators
		const validatorMap = new Map()
		
		// Add execution validators
		executionVals.forEach(validator => {
			validatorMap.set(validator.valId, validator)
		})
		
		// Update with consensus info
		consensusVals.forEach(validator => {
			if (validatorMap.has(validator.valId)) {
				const existing = validatorMap.get(validator.valId)
				validatorMap.set(validator.valId, {
					...existing,
					...validator,
					isActive: true
				})
			}
		})
		
		allValidators.value = Array.from(validatorMap.values())
		stats.value = networkStats
		
	} catch (err) {
		console.error('Failed to load validators:', err)
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
</script>

<template>
	<div class="validators-page">
		<!-- Header -->
		<div class="page-header">
			<div class="header-content">
				<div class="header-nav">
					<NuxtLink to="/staking" class="back-link">
						← Staking
					</NuxtLink>
					<div class="nav-divider">/</div>
					<span class="current-page">Validators</span>
				</div>
				<div class="header-actions">
					<WalletConnect />
				</div>
			</div>
		</div>

		<!-- Page Content -->
		<div class="page-content">
			<div class="content-container">
				<!-- Title Section -->
				<div class="title-section">
					<div class="title-content">
						<h1>Validators</h1>
						<p>Choose validators to stake your MON tokens and earn rewards</p>
					</div>
					<div class="stats-summary">
						<div class="stat-item">
							<span class="stat-value">{{ validatorStats.total }}</span>
							<span class="stat-label">Total</span>
						</div>
						<div class="stat-item">
							<span class="stat-value">{{ validatorStats.active }}</span>
							<span class="stat-label">Active</span>
						</div>
						<div v-if="isConnected" class="stat-item">
							<span class="stat-value">{{ validatorStats.userDelegated }}</span>
							<span class="stat-label">Your Delegations</span>
						</div>
					</div>
				</div>

				<!-- Filters and Search -->
				<div class="filters-section">
					<div class="search-section">
						<Input 
							v-model="searchTerm"
							placeholder="Search by validator ID or address..."
							class="search-input"
						/>
					</div>
					
					<div class="filter-controls">
						<Dropdown class="filter-dropdown">
							<Button size="medium" type="secondary">
								{{ filterOptions.find(f => f.value === filterType)?.label || 'Filter' }}
								<span class="dropdown-icon">▼</span>
							</Button>
							<template #body>
								<DropdownItem 
									v-for="option in filterOptions"
									:key="option.value"
									@click="handleFilterChange(option.value)"
									:class="{ active: filterType === option.value }"
								>
									{{ option.label }}
								</DropdownItem>
							</template>
						</Dropdown>
						
						<Dropdown class="sort-dropdown">
							<Button size="medium" type="secondary">
								Sort: {{ sortOptions.find(s => s.value === selectedSort)?.label }}
								<span class="sort-direction">{{ sortDirection === 'desc' ? '↓' : '↑' }}</span>
							</Button>
							<template #body>
								<DropdownItem 
									v-for="option in sortOptions"
									:key="option.value"
									@click="handleSortChange(option.value)"
									:class="{ active: selectedSort === option.value }"
								>
									{{ option.label }}
									<span v-if="selectedSort === option.value" class="sort-indicator">
										{{ sortDirection === 'desc' ? '↓' : '↑' }}
									</span>
								</DropdownItem>
							</template>
						</Dropdown>
					</div>
				</div>

				<!-- Loading State -->
				<div v-if="loading" class="loading-section">
					<div class="loading-spinner"></div>
					<p>Loading validators...</p>
				</div>

				<!-- Error State -->
				<div v-else-if="error" class="error-section">
					<div class="error-content">
						<span class="error-icon">⚠️</span>
						<span class="error-text">{{ error }}</span>
						<Button size="small" type="secondary" @click="loadValidators">
							Retry
						</Button>
					</div>
				</div>

				<!-- Validators Grid -->
				<div v-else-if="filteredValidators.length > 0" class="validators-grid">
					<ValidatorCard
						v-for="validator in filteredValidators"
						:key="validator.valId"
						:validator="validator"
						:user-delegation="getUserDelegation(validator.valId)"
						:total-network-stake="stats?.totalStaked || '0'"
						@stake="handleStake"
						@manage="handleManage"
					/>
				</div>

				<!-- Empty State -->
				<div v-else class="empty-section">
					<div class="empty-content">
						<div class="empty-icon">🔍</div>
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
			</div>
		</div>

		<!-- Stake Modal -->
		<div v-if="showStakeModal && selectedValidator" class="modal-overlay" @click.self="showStakeModal = false">
			<div class="modal-container">
				<StakingCard 
					:validator="selectedValidator"
					:delegation="getUserDelegation(selectedValidator.valId)"
				/>
				<div class="modal-actions">
					<Button 
						type="secondary" 
						@click="showStakeModal = false"
					>
						Close
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.validators-page {
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

.title-section {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 32px;
	
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 20px;
	}
	
	.title-content {
		h1 {
			font-size: 32px;
			font-weight: 700;
			color: var(--text-primary, #000);
			margin: 0 0 8px 0;
		}
		
		p {
			font-size: 16px;
			color: var(--text-secondary, #666);
			margin: 0;
		}
	}
	
	.stats-summary {
		display: flex;
		gap: 24px;
		
		@media (max-width: 640px) {
			gap: 16px;
		}
		
		.stat-item {
			text-align: center;
			
			.stat-value {
				display: block;
				font-size: 24px;
				font-weight: 700;
				color: var(--text-primary, #000);
				margin-bottom: 4px;
			}
			
			.stat-label {
				display: block;
				font-size: 12px;
				color: var(--text-secondary, #666);
				text-transform: uppercase;
				font-weight: 600;
			}
		}
	}
}

.filters-section {
	background: var(--card-background, #ffffff);
	border: 1px solid var(--border-color, #e1e5e9);
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
	
	.search-section {
		flex: 1;
		
		.search-input {
			width: 100%;
		}
	}
	
	.filter-controls {
		display: flex;
		gap: 12px;
		
		@media (max-width: 640px) {
			flex-direction: column;
		}
		
		.dropdown-icon,
		.sort-direction {
			margin-left: 8px;
			font-size: 12px;
		}
		
		.sort-indicator {
			margin-left: auto;
		}
	}
}

.loading-section,
.error-section,
.empty-section {
	text-align: center;
	padding: 80px 20px;
}

.loading-section {
	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--border-color, #e1e5e9);
		border-top: 4px solid var(--primary-color, #007bff);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 16px;
	}
	
	p {
		color: var(--text-secondary, #666);
		margin: 0;
	}
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.error-section {
	.error-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background: var(--error-background, #fee);
		border-radius: 12px;
		padding: 20px;
		max-width: 400px;
		margin: 0 auto;
		
		.error-icon {
			font-size: 20px;
		}
		
		.error-text {
			flex: 1;
			color: var(--error-color, #dc3545);
			font-weight: 500;
		}
	}
}

.empty-section {
	.empty-content {
		max-width: 400px;
		margin: 0 auto;
		
		.empty-icon {
			font-size: 48px;
			margin-bottom: 16px;
		}
		
		h3 {
			font-size: 24px;
			font-weight: 600;
			color: var(--text-primary, #000);
			margin: 0 0 12px 0;
		}
		
		p {
			color: var(--text-secondary, #666);
			margin: 0 0 20px 0;
			line-height: 1.5;
		}
	}
}

.validators-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
	gap: 24px;
	
	@media (max-width: 480px) {
		grid-template-columns: 1fr;
	}
}

.modal-overlay {
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

.modal-container {
	background: var(--card-background, #ffffff);
	border-radius: 16px;
	max-width: 500px;
	width: 100%;
	max-height: 90vh;
	overflow-y: auto;
	
	.modal-actions {
		padding: 20px;
		border-top: 1px solid var(--border-color, #e1e5e9);
		text-align: right;
	}
}
</style>
