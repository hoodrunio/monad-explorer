<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"
import Input from "@/components/ui/Input.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import BookmarkButton from "@/components/BookmarkButton.vue"
import ValidatorLogo from "@/components/ValidatorLogo.vue"

/** Services */
import { comma, shortHex } from "@/services/utils"

/** API */
import { fetchValidatorRankings } from "@/services/api/validator"
import { preloadGithubValidatorData, fetchGithubValidatorInfo } from "@/services/api/github"

const route = useRoute()
const router = useRouter()

useHead({
	title: "Validators - Monad Explorer",
	link: [
		{
			rel: "canonical",
			href: "/validators",
		},
	],
	meta: [
		{
			name: "description",
			content:
				"View all validators in the Monad network. Monitor validator performance, uptime scores, QC participation rates, and infrastructure details.",
		},

	],
})

const isLoading = ref(false)
const validators = ref([])
const allValidators = ref([]) // Store all validators for filtering
const searchTerm = ref(route.query.search || "")

// Time window options
const timeWindows = ref([
	{ label: "7 Days", value: "7d" },
	{ label: "30 Days", value: "30d" },
])
const selectedTimeWindow = ref(route.query.window || "7d")

// Sort options 
const sortOptions = ref([
	{ label: "Uptime Score", value: "block_proposal_ratio" },
	{ label: "Stake", value: "stake" },
	{ label: "QC Participation", value: "qc_participation_rate" },
	{ label: "Block Proposals", value: "block_proposal_ratio" },
])
const selectedSort = ref(route.query.sortBy || "stake")
const sortDirection = ref(route.query.sortDir || "desc") // "asc" or "desc"

// Tab state for Active/All validators
const activeTab = ref(route.query.tab || "active")

// Pagination
const page = ref(route.query.page ? parseInt(route.query.page) : 1)
const limit = ref(50)
const totalValidators = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPrevPage = ref(false)
const pages = computed(() => totalPages.value || 1)

// Filtered validators based on search term only (tab filtering handled by API)
const filteredValidators = computed(() => {
	let filtered = allValidators.value
	
	if (searchTerm.value.trim()) {
		const search = searchTerm.value.toLowerCase().trim()
		filtered = filtered.filter(validator => 
			validator.name.toLowerCase().includes(search) ||
			validator.validatorId.toLowerCase().includes(search)
		)
	}
	
	// Apply client-side sorting to filtered results
	return sortValidators(filtered)
})

// Paginated validators for display
const paginatedValidators = computed(() => {
	const filtered = filteredValidators.value
	const startIndex = (page.value - 1) * limit.value
	const endIndex = startIndex + limit.value
	
	// Update pagination info for filtered results
	const filteredTotal = filtered.length
	const filteredPages = Math.ceil(filteredTotal / limit.value)
	
	// Update reactive pagination values
	totalValidators.value = filteredTotal
	totalPages.value = filteredPages || 1
	hasNextPage.value = page.value < filteredPages
	hasPrevPage.value = page.value > 1
	
	return filtered.slice(startIndex, endIndex)
})

const getValidators = async () => {
	isLoading.value = true

	try {
		const { data } = await fetchValidatorRankings({
			limit: 1000, // Fetch more validators to enable client-side search
			sortBy: selectedSort.value,
			window: selectedTimeWindow.value,
			page: 1, // Always fetch from page 1 to get all validators
			active_only: activeTab.value === "active" // Use active_only based on current tab
		})

		if (data.value?.data) {
			// Load GitHub validator info once and use it for mapping
			const githubMap = await fetchGithubValidatorInfo()
			const validatorsList = data.value.data.map(v => {
				const totalBlockOpportunities = v.details?.total_block_opportunities || 0
				const blockProposalRatio = v.metrics?.block_proposal_ratio || 0
				
				// Prefer GitHub name/logo when available
				const githubData = githubMap instanceof Map ? githubMap.get(v.validator_id) : null
				const preferredName = githubData?.name || v.infrastructure?.validator_name || 'unknown'
				const preferredLogo = githubData?.logo || v.keybase?.logo_url || v.logoUrl || null
				
				// Use block proposal ratio as uptime score; if no opportunities, show null
				const uptimeScore = totalBlockOpportunities === 0 ? null : blockProposalRatio
				
				return {
					rank: v.rank || 0,
					validatorId: v.validator_id || '',
					name: preferredName,
					stake: v.staking?.real_time_stake_mon ? parseFloat(v.staking.real_time_stake_mon) : '0',
					isActive: v.staking?.is_staking_active || false,
					uptimeScore,
					qcParticipationRate: v.metrics?.qc_participation_rate || 0,
					blockProposalRatio,
					provider: v.infrastructure?.provider || 'Unknown',
					location: v.infrastructure?.location || 'Unknown',
					blocksProposed: v.details?.blocks_proposed || 0,
					totalBlockOpportunities,
					qcParticipations: v.details?.qc_participations || 0,
					totalQcOpportunities: v.details?.total_qc_opportunities || 0,
					logoUrl: preferredLogo,
					// Include staking object for precompile_validator_id access
					staking: v.staking,
					precompileValidatorId: v.staking?.precompile_validator_id
				}
			})
			
			allValidators.value = validatorsList
		}
	} catch (error) {
	} finally {
		isLoading.value = false
	}
}

const handleNext = () => {
	if (!hasNextPage.value) return
	page.value += 1
}

const handlePrev = () => {
	if (!hasPrevPage.value) return
	page.value -= 1
}

const handleSearchInput = () => {
	// Reset to first page when searching
	page.value = 1
}

const clearSearch = () => {
	searchTerm.value = ""
	page.value = 1
}

const formatPercentage = (value) => {
	if (value === null || value === undefined) return 'N/A'
	return `${value.toFixed(1)}%`
}

const getPerformanceColor = (score) => {
	if (score === null || score === undefined) return 'tertiary'
	if (score >= 99) return 'green'
	if (score >= 95) return 'yellow'
	return 'red'
}

// Column sorting handler - connects to existing sort system
const handleColumnSort = (sortKey) => {
	if (selectedSort.value === sortKey) {
		// If clicking the same column, toggle direction
		sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
	} else {
		// If clicking a different column, start with descending (higher values first)
		selectedSort.value = sortKey
		sortDirection.value = "desc"
	}
}

// Handle tab change
const handleTabChange = (tab) => {
	activeTab.value = tab
	// Reset to first page when changing tabs
	page.value = 1
	// API request will be triggered by the watcher
}

// Get sort field mapping for column headers
const getSortKeyForColumn = (column) => {
	switch (column) {
		case 'stake': return 'stake'
		case 'uptime': return 'block_proposal_ratio'
		default: return null
	}
}

// Client-side sorting function
const sortValidators = (validators) => {
	if (!validators || validators.length === 0) return validators
	
	const sorted = [...validators].sort((a, b) => {
		let valueA, valueB
		
		switch (selectedSort.value) {
			case 'stake':
				valueA = a.stake || 0
				valueB = b.stake || 0
				break
			case 'block_proposal_ratio':
				valueA = a.uptimeScore || 0
				valueB = b.uptimeScore || 0
				break
			case 'qc_participation_rate':
				valueA = a.qcParticipationRate || 0
				valueB = b.qcParticipationRate || 0
				break
			default:
				// For other sorts, keep original order
				return 0
		}
		
		// Handle null/undefined values
		if (valueA === null || valueA === undefined) valueA = -1
		if (valueB === null || valueB === undefined) valueB = -1
		
		const comparison = valueB - valueA // Default descending order
		return sortDirection.value === 'asc' ? -comparison : comparison
	})
	
	return sorted
}

// Computed for tab counts - we need to fetch both active and all counts
const allValidatorsCount = ref(0)
const activeValidatorsCount = ref(0)

// Function to get validator counts for tabs
const getValidatorCounts = async () => {
	try {
		// Fetch all validators to get accurate counts
		const allResponse = await fetchValidatorRankings({
			limit: 1000, // Get all to count properly
			sortBy: selectedSort.value,
			window: selectedTimeWindow.value,
			page: 1,
			active_only: false
		})
		
		if (allResponse.data.value?.data) {
			const allValidatorsData = allResponse.data.value.data
			allValidatorsCount.value = allValidatorsData.length
			
			// Count active validators from the all validators data
			activeValidatorsCount.value = allValidatorsData.filter(validator => 
				validator.staking?.is_staking_active || false
			).length
		}
	} catch (error) {
		console.error('Failed to get validator counts:', error)
		// Fallback to current data if available
		if (activeTab.value === "all") {
			allValidatorsCount.value = allValidators.value.length
			activeValidatorsCount.value = allValidators.value.filter(v => v.isActive).length
		} else {
			// If we're on active tab, we need to fetch all to get proper counts
			allValidatorsCount.value = 0
			activeValidatorsCount.value = allValidators.value.length
		}
	}
}

// Initialize data
await getValidators()
await getValidatorCounts()

// Preload GitHub validator data to prevent multiple API calls
preloadGithubValidatorData().catch(error => {
})

// Update URL and refetch when parameters change (including activeTab)
watch([selectedSort, sortDirection, selectedTimeWindow, activeTab], async () => {
	await getValidators()
	await getValidatorCounts() // Update counts when tab changes
	
	router.replace({ 
		query: { 
			page: page.value,
			sortBy: selectedSort.value,
			sortDir: sortDirection.value,
			window: selectedTimeWindow.value,
			search: searchTerm.value || undefined,
			tab: activeTab.value !== "active" ? activeTab.value : undefined
		} 
	})
})

// Update URL when page or search changes (no refetch needed)
watch([page, searchTerm], () => {
	router.replace({ 
		query: { 
			page: page.value,
			sortBy: selectedSort.value,
			sortDir: sortDirection.value,
			window: selectedTimeWindow.value,
			search: searchTerm.value || undefined,
			tab: activeTab.value !== "active" ? activeTab.value : undefined
		} 
	})
})

// Handle URL query changes
watch(
	() => route.query,
	() => {
		if (route.query.page) page.value = parseInt(route.query.page)
		if (route.query.sortBy) selectedSort.value = route.query.sortBy
		if (route.query.sortDir) sortDirection.value = route.query.sortDir
		if (route.query.window) selectedTimeWindow.value = route.query.window
		if (route.query.search !== undefined) searchTerm.value = route.query.search || ""
		if (route.query.tab) activeTab.value = route.query.tab
	},
)

onMounted(() => {
	router.replace({ 
		query: { 
			page: page.value,
			sortBy: selectedSort.value,
			sortDir: sortDirection.value,
			window: selectedTimeWindow.value,
			search: searchTerm.value || undefined,
			tab: activeTab.value !== "active" ? activeTab.value : undefined
		} 
	})
})
</script>

<template>
	<Flex direction="column" wide :class="$style.wrapper">
		<Flex align="end" justify="between" :class="$style.breadcrumbs">
			<Breadcrumbs
				:items="[
					{ link: '/', name: 'Dashboard' },
					{ link: '/validators', name: `Validators` },
				]"
			/>
		</Flex>

		<Flex wide direction="column" gap="4">
			<Flex justify="between" :class="$style.header">
				<Flex align="center" gap="8">
					<Icon name="validator" size="16" color="secondary" />
					<Text as="h1" size="14" weight="600" color="primary">Validators</Text>
					<Text v-if="searchTerm && filteredValidators.length !== allValidators.length" size="12" color="tertiary">
						({{ filteredValidators.length }} of {{ allValidators.length }})
					</Text>
				</Flex>

				<Flex align="center" gap="6" :class="$style.controls">
					<!-- Search Input -->
					<div :class="$style.search_wrapper">
						<Input
							v-model="searchTerm"
							placeholder="Search validators..."
							icon="search"
							size="small"
							@input="handleSearchInput"
							:class="$style.search_input"
						/>
						<button 
							v-if="searchTerm"
							@click="clearSearch"
							:class="$style.clear_button"
							type="button"
						>
							<Icon name="close" size="10" color="tertiary" />
						</button>
					</div>

					<!-- Time Window Selector -->
					<Dropdown>
						<template #trigger="{ isOpen }">
							<Button type="secondary" size="mini">
								{{ timeWindows.find(tw => tw.value === selectedTimeWindow)?.label }}
								<Icon
									name="chevron"
									size="16"
									color="secondary"
									:style="{
										transform: `rotate(${!isOpen ? '0' : '180deg'})`,
										transition: 'all 200ms ease',
									}"
								/>
							</Button>
						</template>

						<template #popup>
							<DropdownItem 
								v-for="window in timeWindows" 
								:key="window.value"
								@click="selectedTimeWindow = window.value"
							> 
								{{ window.label }} 
							</DropdownItem>
						</template>
					</Dropdown>

					<!-- Sort Selector -->
					<Dropdown>
						<template #trigger="{ isOpen }">
							<Button type="secondary" size="mini">
								<span :class="$style.sort_label">Sort: </span>{{ sortOptions.find(so => so.value === selectedSort)?.label }}
								<Icon
									name="chevron"
									size="16"
									color="secondary"
									:style="{
										transform: `rotate(${!isOpen ? '0' : '180deg'})`,
										transition: 'all 200ms ease',
									}"
								/>
							</Button>
						</template>

						<template #popup>
							<DropdownItem 
								v-for="option in sortOptions" 
								:key="option.value"
								@click="selectedSort = option.value"
							> 
								{{ option.label }} 
							</DropdownItem>
						</template>
					</Dropdown>

					<!-- Pagination -->
					<Flex align="center" gap="6" :class="$style.pagination">
						<Button @click="page = 1" type="secondary" size="mini" :disabled="!hasPrevPage">
							<Icon name="arrow-left-stop" size="12" color="primary" />
						</Button>
						<Button type="secondary" @click="handlePrev" size="mini" :disabled="!hasPrevPage">
							<Icon name="arrow-left" size="12" color="primary" />
						</Button>

						<Button type="secondary" size="mini" disabled>
							<Text size="12" weight="600" color="primary"> {{ page }} of {{ pages }} </Text>
						</Button>

						<Button @click="handleNext" type="secondary" size="mini" :disabled="!hasNextPage">
							<Icon name="arrow-right" size="12" color="primary" />
						</Button>
						<Button @click="page = pages" type="secondary" size="mini" :disabled="!hasNextPage">
							<Icon name="arrow-right-stop" size="12" color="primary" />
						</Button>
					</Flex>
				</Flex>
			</Flex>

			<!-- Active/All Tabs -->
			<Flex align="center" gap="2" :class="$style.tabs_container">
				<Button 
					:type="activeTab === 'all' ? 'primary' : 'secondary'" 
					size="mini"
					@click="handleTabChange('all')"
					:class="$style.tab_button"
				>
					All
					<Text v-if="allValidatorsCount" size="11" :color="activeTab === 'all' ? 'white' : 'tertiary'">
						({{ allValidatorsCount }})
					</Text>
				</Button>
				<Button 
					:type="activeTab === 'active' ? 'primary' : 'secondary'" 
					size="mini"
					@click="handleTabChange('active')"
					:class="$style.tab_button"
				>
					Active
					<Text v-if="activeValidatorsCount" size="11" :color="activeTab === 'active' ? 'white' : 'tertiary'">
						({{ activeValidatorsCount }})
					</Text>
				</Button>
			</Flex>

			<Flex direction="column" gap="16" wide :class="[$style.table, isLoading && $style.disabled]">
				<div v-if="paginatedValidators.length" :class="$style.table_scroller">
					<table>
						<thead>
							<tr>
								<th :class="$style.col_rank"><Text size="12" weight="600" color="tertiary" noWrap>Rank</Text></th>
								<th :class="$style.col_validator"><Text size="12" weight="600" color="tertiary" noWrap>Validator</Text></th>
								<th 
									:class="[$style.col_stake, $style.sortable]" 
									@click="handleColumnSort('stake')"
								>
									<Flex align="center" gap="4" :class="$style.header_content">
										<Text size="12" weight="600" color="tertiary" noWrap>Stake</Text>
										<Icon 
											name="chevron" 
											size="10" 
											:color="selectedSort === 'stake' ? 'tertiary' : 'support'"
											:style="{ 
												transform: selectedSort === 'stake' 
													? (sortDirection === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)')
													: 'rotate(0deg)',
												opacity: selectedSort === 'stake' ? 1 : 0.5,
												transition: 'all 0.2s ease'
											}"
										/>
									</Flex>
								</th>
								<th 
									:class="[$style.col_uptime, $style.sortable]" 
									@click="handleColumnSort('block_proposal_ratio')"
								>
									<Flex align="center" gap="4" :class="$style.header_content">
										<Text size="12" weight="600" color="tertiary" noWrap>Uptime Score</Text>
										<Icon 
											name="chevron" 
											size="10" 
											:color="selectedSort === 'block_proposal_ratio' ? 'tertiary' : 'support'"
											:style="{ 
												transform: selectedSort === 'block_proposal_ratio' 
													? (sortDirection === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)')
													: 'rotate(0deg)',
												opacity: selectedSort === 'block_proposal_ratio' ? 1 : 0.5,
												transition: 'all 0.2s ease'
											}"
										/>
									</Flex>
								</th>
								<th :class="$style.col_location"><Text size="12" weight="600" color="tertiary" noWrap>Location</Text></th>
								<th :class="$style.col_bookmark"><Text size="12" weight="600" color="tertiary" noWrap>Bookmark</Text></th>
							</tr>
						</thead>

						<tbody>
							<tr v-for="validator in paginatedValidators" :key="validator.validatorId">
								<td :class="$style.col_rank">
									<div :class="$style.cell_content">
										<Text size="13" weight="600" color="tertiary">#{{ validator.rank }}</Text>
									</div>
								</td>
								<td :class="$style.col_validator">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Flex align="center" gap="8">
											<ValidatorLogo 
												:logo-url="validator.logoUrl" 
												:validator-name="validator.name"
												size="small"
											/>
											<Flex direction="column" gap="2">
												<Text size="13" weight="600" color="primary" mono>
													{{ validator.name !== 'unknown' ? validator.name : `Validator #${validator.precompileValidatorId || validator.staking?.precompile_validator_id || shortHex(validator.validatorId)}` }}
												</Text>
												<Text size="11" color="tertiary">
													{{ shortHex(validator.validatorId) }}
												</Text>
											</Flex>
										</Flex>
									</NuxtLink>
								</td>
								<td :class="$style.col_stake">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Text size="13" weight="600" color="primary">
											{{ comma(validator.stake) }}
										</Text>
									</NuxtLink>
								</td>
								<td :class="$style.col_uptime">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Text size="13" weight="600" :color="getPerformanceColor(validator.uptimeScore)">
											{{ formatPercentage(validator.uptimeScore) }}
										</Text>
									</NuxtLink>
								</td>
								<td :class="$style.col_location">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Text size="12" color="tertiary">
											{{ validator.location }}
										</Text>
									</NuxtLink>
								</td>
								<td :class="$style.col_bookmark">
									<div :class="$style.cell_content">
										<BookmarkButton type="validator" :id="validator.validatorId" />
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<Flex v-else-if="!isLoading && allValidators.length > 0" direction="column" gap="20" align="center" :class="$style.empty">
					<Flex direction="column" gap="8" align="center">
						<Text size="13" weight="600" color="secondary"> No validators found </Text>
						<Text size="12" weight="400" color="tertiary"> 
							{{ searchTerm ? 'Try adjusting your search term' : 'Try adjusting the time window or sort options' }}
						</Text>
					</Flex>
				</Flex>
				<Flex v-else-if="!isLoading" direction="column" gap="20" align="center" :class="$style.empty">
					<Flex direction="column" gap="8" align="center">
						<Text size="13" weight="600" color="secondary"> No validators found </Text>
						<Text size="12" weight="400" color="tertiary"> Try adjusting the time window or sort options </Text>
					</Flex>
				</Flex>
				<Flex v-else direction="column" gap="20" align="center" :class="$style.empty">
					<Text size="13" weight="600" color="secondary"> Loading validators... </Text>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 20px 24px 60px 24px;
}

.breadcrumbs {
	margin-bottom: 16px;
}

.header {
	height: 46px;

	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);

	padding: 0 16px;
}

.table_scroller {
	overflow-x: auto;
}

.table {
	border-radius: 4px 4px 8px 8px;
	background: var(--card-background);

	transition: all 0.2s ease;

	& table {
		width: calc(100% - 12px);
		height: fit-content;
		table-layout: fixed;

		border-spacing: 0px;

		padding-bottom: 12px;

		& tbody {
			& tr {
				cursor: pointer;

				transition: all 0.05s ease;

				&:hover {
					background: var(--op-5);
				}

				&:active {
					background: var(--op-8);
				}
			}
		}

		& tr th {
			text-align: left;
			padding: 16px 16px 8px 16px;
			white-space: nowrap;
			vertical-align: middle;

			& span {
				display: flex;
			}

			&.sortable {
				cursor: pointer;
				user-select: none;
			}

			&.sortable:hover {
				& span {
					color: var(--txt-secondary);
				}
				
				& svg {
					opacity: 1 !important;
					color: var(--txt-secondary) !important;
				}
			}
		}

		& tr td {
			padding: 0;
			white-space: nowrap;
			vertical-align: middle;
		}

		/* Column specific styles */
		& .col_rank {
			width: 60px;
		}

		& .col_validator {
			width: 220px;
			
			& .cell_link {
				overflow: hidden;
			}
		}

		& .col_stake {
			width: 130px;
		}

		& .col_uptime {
			width: 130px;
		}

		& .col_location {
			width: 150px;
		}

		& .col_bookmark {
			width: 80px;
		}
	}
}

.cell_content {
	display: flex;
	align-items: center;
	min-height: 44px;
	padding: 0 16px;
}

.cell_link {
	display: flex;
	align-items: center;
	min-height: 44px;
	padding: 0 16px;
}

.header_content {
	justify-content: flex-start;
	min-height: 20px;
}

.table.disabled {
	opacity: 0.5;
	pointer-events: none;
}

.search_wrapper {
	position: relative;
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.search_input {
	min-width: 200px;
}

.search_input :global(.base) {
	padding-right: 32px !important;
}

.clear_button {
	position: absolute;
	right: 8px;
	z-index: 2;
	padding: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	transition: background-color 0.2s ease;
}

.clear_button:hover {
	background-color: var(--op-5);
}

@media (max-width: 768px) {
	.wrapper {
		padding: 20px 16px;
	}

	.header {
		flex-direction: column;
		gap: 12px;
		height: initial;
		padding: 12px;
	}
	
	.controls {
		flex-wrap: wrap;
		gap: 8px;
	}
	
	.sort_label {
		display: none;
	}
	
	.pagination {
		gap: 4px;
	}
	
	.table {
		& table {
			& tbody tr {
				border-bottom: 1px solid var(--op-10);
				
				&:last-child {
					border-bottom: none;
				}
			}
			
			& .col_location {
				display: none;
			}
		}
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 32px 12px;
	}

	.header {
		gap: 8px;
		padding: 8px;
	}
	
	.controls {
		flex-direction: column;
		gap: 12px;
		width: 100%;
	}
	
	.search_wrapper {
		width: 100%;
		order: -1; /* Show search first on mobile */
	}
	
	.search_input {
		min-width: auto;
		width: 100%;
	}
	
	.pagination {
		justify-content: center;
		gap: 3px;
	}
	
	.table {
		& table {
			& tbody tr {
				border-bottom: 1px solid var(--op-10);
				
				&:last-child {
					border-bottom: none;
				}
			}
			
			& .col_rank {
				display: none;
			}
			
			& .col_location {
				display: none;
			}
			
			& tr th {
				padding: 12px 8px 6px 12px;
			}
		}
	}
	
	.cell_content {
		min-height: 40px !important;
		padding: 0 8px 0 12px !important;
	}
	
	.cell_link {
		min-height: 40px !important;
		padding: 0 8px 0 12px !important;
	}
}

.empty {
	padding: 16px 0;
}

.tabs_container {
	margin-bottom: 8px;
}

.tab_button {
	position: relative;
	gap: 6px;
	
	&:hover {
		transform: none;
	}
}
</style>
