<script setup>
/** UI */
import Badge from "@/components/ui/Badge.vue"
import Button from "@/components/ui/Button.vue"
import Toggle from "@/components/ui/Toggle.vue"
import Tooltip from "@/components/ui/Tooltip.vue"

/** Components */
import CopyButton from "@/components/CopyButton.vue"
import ValidatorLogo from "@/components/ValidatorLogo.vue"

/** Services */
import { shortHex, comma } from "@/services/utils"
import { convertUTCToLocal } from "@/services/utils/validator"

/** API */
import { fetchValidatorStakingEvents } from "@/services/api/validator"

/** Components */
import ValidatorPerformanceGrid from "./ValidatorPerformanceGrid.vue"
import ValidatorPerformanceGridDetailed from "./ValidatorPerformanceGridDetailed.vue"
import ValidatorEventsTable from "./ValidatorEventsTable.vue"
import ValidatorStakingEventsTable from "./ValidatorStakingEventsTable.vue"
import ValidatorDelegatorsTable from "./ValidatorDelegatorsTable.vue"
import ValidatorTransactionAnalytics from "./ValidatorTransactionAnalytics.vue"
import ValidatorTipRevenueTab from "./ValidatorTipRevenueTab.vue"

const route = useRoute()
const router = useRouter()

const props = defineProps({
	validator: {
		type: Object,
		required: true,
	},
	history: {
		type: Object,
		default: null,
	},
	infrastructure: {
		type: Object,
		default: null,
	},
	authorBalance: {
		type: Object,
		default: null,
	},
	tipRevenue: {
		type: Object,
		default: null,
	},
	tipHistory: {
		type: Object,
		default: null,
	},
})

const tabs = ref([
	{
		name: "Performance",
		icon: "bar-chart",
	},
	{
		name: "Tip Revenue",
		icon: "coins",
	},
	{
		name: "History",
		icon: "time",
	},
	{
		name: "Events",
		icon: "message",
	},
	{
		name: "Staking Events",
		icon: "coins",
	},
	{
		name: "Delegators",
		icon: "granters",
	},
])

const preselectedTab = route.query.tab && tabs.value.map((tab) => tab.name).includes(route.query.tab) ? route.query.tab : tabs.value[0].name
const activeTab = ref(preselectedTab)

// QC Participation toggle state
const showQcMetrics = ref(false)

// Staking Events state
const stakingEvents = ref([])
const stakingEventsNextParams = ref(null)
const stakingEventsPrevPages = ref([])
const isLoadingStakingEvents = ref(false)

// Description expand/collapse state
const isDescriptionExpanded = ref(false)
const MAX_DESCRIPTION_LENGTH = 170

onMounted(() => {
	router.replace({
		query: {
			tab: activeTab.value,
		},
	})
})

const validatorStatus = computed(() => {
	const uptime = validatorMetrics.value.uptimeScore
	
	// Handle case where uptime score is null (no block opportunities)
	if (uptime === null) {
		return {
			name: "No Block Opportunities",
			color: "var(--txt-tertiary)",
			description: ["No block proposals yet"]
		}
	}
	
	if (uptime >= 99) {
		return {
			name: "Excellent",
			color: "var(--green)",
			description: ["Performing well"]
		}
	} else if (uptime >= 95) {
		return {
			name: "Good",
			color: "var(--brand)",
			description: ["Performing good"]
		}
	} else if (uptime >= 90) {
		return {
			name: "Fair",
			color: "var(--orange)",
			description: ["Could improve"]
		}
	} else {
		return {
			name: "Warning",
			color: "var(--yellow)",
			description: ["Needs attention"]
		}
	}
})

watch(
	() => activeTab.value,
	async () => {
		router.replace({
			query: {
				tab: activeTab.value,
			},
		})

		// Fetch staking events when tab is selected
		if (activeTab.value === 'Staking Events') {
			await getStakingEvents()
		}
	},
)

// Staking Events fetch function
const getStakingEvents = async (params = null) => {
	// Use precompile_validator_id if available, otherwise fallback to validator_id
	const validatorId = props.validator.staking?.precompile_validator_id || props.validator.validator_id
	if (!validatorId) return

	isLoadingStakingEvents.value = true
	try {
		const queryParams = params || { items_count: 20 }
		const { data } = await fetchValidatorStakingEvents(validatorId, queryParams)

		if (data.value?.items) {
			stakingEvents.value = data.value.items
			stakingEventsNextParams.value = data.value.next_page_params || null
		} else {
			stakingEvents.value = []
			stakingEventsNextParams.value = null
		}
	} catch (error) {
		stakingEvents.value = []
		stakingEventsNextParams.value = null
	}
	isLoadingStakingEvents.value = false
}

// Staking Events pagination
const handleStakingEventsNext = () => {
	if (!stakingEventsNextParams.value) return

	stakingEventsPrevPages.value.push({
		data: [...stakingEvents.value],
		params: stakingEventsNextParams.value
	})

	getStakingEvents(stakingEventsNextParams.value)
}

const handleStakingEventsPrev = () => {
	if (stakingEventsPrevPages.value.length === 0) return

	const previousState = stakingEventsPrevPages.value.pop()
	stakingEvents.value = previousState.data
	stakingEventsNextParams.value = previousState.params
}

// Computed properties for validator data
const validatorMetrics = computed(() => {
	const metrics = props.validator.metrics || {}
	const details = props.validator.details || {}
	const blockProposals = details.block_proposals || {}
	const totalBlockOpportunities = blockProposals.total_opportunities || 0
	
	// If validator had no block opportunities, don't show 0% as it's misleading
	const blockProposalRatio = totalBlockOpportunities === 0 ? null : (metrics.block_proposal_ratio || 0)
	
	// NEW: Use block proposal ratio as the primary uptime score (instead of combined uptime_score)
	// QC participation is now a separate metric
	const uptimeScore = blockProposalRatio
	
	return {
		uptimeScore,
		qcParticipationRate: metrics.qc_participation_rate || 0,
		blockProposalRatio,
	}
})

const validatorDetails = computed(() => {
	const details = props.validator.details || {}
	const blockProposals = details.block_proposals || {}
	const qcParticipations = details.qc_participation || {}
	
	return {
		totalBlockOpportunities: blockProposals.total_opportunities || 0,
		blocksProposed: blockProposals.successful_proposals || 0,
		blocksSkipped: blockProposals.skipped_proposals || 0,
		totalQcOpportunities: qcParticipations.total_opportunities || 0,
		qcParticipations: qcParticipations.participations || 0,
	}
})

const infrastructureDetails = computed(() => {
	// Handle multiple possible data structures
	const infraData = props.infrastructure?.data || props.infrastructure || {}
	const location = infraData.location || infraData || {}

	if (!location || Object.keys(location).length === 0) return null

	// Prioritize GitHub validator name, then infrastructure name, then fallback
	const githubValidatorName = props.validator?.github?.name || props.validator?.displayName
	const infraValidatorName = props.validator?.infrastructure?.validator_name || location.validatorName || location.validator_name
	const finalValidatorName = githubValidatorName || infraValidatorName || null

	const provider = location.isp || location.provider || null
	const city = location.city || null
	const country = location.country || null
	const ip = location.ip || null

	// Build location string only if we have valid data
	let locationString = null
	if (city && country) {
		locationString = `${city}, ${country}`
	} else if (city) {
		locationString = city
	} else if (country) {
		locationString = country
	}

	// Check if we have any valid infrastructure data
	const hasAnyValidData = finalValidatorName || provider || locationString || ip

	if (!hasAnyValidData) return null

	return {
		validatorName: finalValidatorName,
		provider: provider,
		location: locationString,
		ip: ip,
		hostname: location.hostname || null,
		port: location.port || null,
		timezone: location.timezone || null,
		latitude: location.latitude || 0,
		longitude: location.longitude || 0,
		lastUpdated: location.lastUpdated || location.last_updated || null,
	}
})

const performanceHistory = computed(() => {
	const historyData = props.history?.history || props.history?.data || []
	if (!Array.isArray(historyData)) return []
	
	return historyData.map(entry => {
		const metrics = entry.metrics || {}
		const activity = entry.activity || {}
		const blockOpportunities = activity.block_opportunities || 0
		
		// If validator had no block opportunities, don't show 0% as it's misleading
		const blockProposalRatio = blockOpportunities === 0 ? null : (metrics.block_proposal_ratio || 0)
		
		// Convert UTC timestamp to local time
		const originalHour = entry.hour || entry.timestamp || 'Unknown'
		const localHour = originalHour !== 'Unknown' ? convertUTCToLocal(originalHour).toISOString() : originalHour
		
		return {
			hour: localHour,
			uptimeScore: metrics.uptime_score || 0,
			qcParticipationRate: metrics.qc_participation_rate || 0,
			blockProposalRatio,
			blockOpportunities,
			blocksProposed: activity.blocks_proposed || 0,
			qcOpportunities: activity.qc_opportunities || 0,
			qcParticipations: activity.qc_participations || 0,
		}
	})
})

const formatPercentage = (value) => {
	if (value === null || value === undefined) return 'N/A'
	return `${value.toFixed(1)}%`
}

const getPerformanceColor = (score) => {
	if (score === null || score === undefined) return 'tertiary'
	if (score >= 99) return 'green'
	if (score >= 95) return 'brand'
	if (score >= 90) return 'yellow'
	return 'red'
}

const validatorLogoUrl = computed(() => {
	return props.validator?.keybase?.logo_url || props.validator?.logoUrl || null
})

const validatorInfo = computed(() => {
	const github = props.validator?.github
	let displayName

	// Priority 1: Use already computed displayName from mergeValidatorData
	if (props.validator?.displayName && props.validator.displayName !== 'unknown') {
		displayName = props.validator.displayName
	}
	// Priority 2: GitHub name
	else if (github?.name) {
		displayName = github.name
	}
	// Priority 3: Infrastructure validator name
	else if (props.validator?.infrastructure?.validator_name &&
	         props.validator.infrastructure.validator_name !== 'unknown') {
		displayName = props.validator.infrastructure.validator_name
	}
	// Priority 4: Validator #<precompile_validator_id>
	else if (props.validator?.staking?.precompile_validator_id) {
		displayName = `Validator #${props.validator.staking.precompile_validator_id}`
	}
	// Priority 5: Short hex of validator_id
	else {
		const validatorId = props.validator?.validator_id
		if (validatorId && validatorId.length > 16) {
			displayName = `${validatorId.slice(0, 8)} ••• ${validatorId.slice(-8)}`
		} else {
			displayName = validatorId || 'Unknown'
		}
	}

	return {
		name: displayName,
		description: github?.description || null,
		website: github?.website || null,
		twitter: github?.x || null,
		hasGithubInfo: !!github
	}
})

const displayedDescription = computed(() => {
	const description = validatorInfo.value.description
	if (!description) return null
	
	if (description.length <= MAX_DESCRIPTION_LENGTH) return description
	
	return isDescriptionExpanded.value 
		? description 
		: description.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
})

const needsDescriptionToggle = computed(() => {
	const description = validatorInfo.value.description
	return description && description.length > MAX_DESCRIPTION_LENGTH
})

const toggleDescription = () => {
	isDescriptionExpanded.value = !isDescriptionExpanded.value
}

const formatBalance = (balance) => {
	if (!balance || balance === '0') return '0'

	try {
		// Convert from wei to ether (divide by 10^18)
		const balanceInEther = parseFloat(balance) / Math.pow(10, 18)

		// Format with appropriate decimal places
		if (balanceInEther >= 1000000) {
			return comma(balanceInEther.toFixed(2))
		} else if (balanceInEther >= 1) {
			return comma(balanceInEther.toFixed(4))
		} else {
			return balanceInEther.toFixed(6)
		}
	} catch (error) {
		return '0'
	}
}

// Tip Revenue sidebar data
const tipRevenueSidebar = computed(() => {
	if (!props.tipRevenue) return null

	return {
		total24h: props.tipRevenue.tip_revenue?.total_mon || '0',
		rank: props.tipRevenue.rank || 'N/A',
		avgPerBlock: props.tipRevenue.tip_revenue?.avg_tip_per_block_mon || '0',
		cumulativeTotal: props.tipRevenue.cumulative?.total_mon || '0',
	}
})

const formatMon = (value) => {
	if (!value) return '0'
	const num = parseFloat(value)
	return comma(num, ",", 2)
}
</script>

<template>
	<Flex direction="column" gap="4">
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<ValidatorLogo 
					:logo-url="validatorLogoUrl" 
					:validator-name="infrastructureDetails?.validatorName || shortHex(validator.validator_id)"
					size="medium"
				/>
				<Text as="h1" size="13" weight="600" color="primary">
					{{ validatorInfo.name }}
				</Text>
				<Badge :color="getPerformanceColor(validatorMetrics.uptimeScore)" type="light" size="small">
					{{ validatorStatus.name }}
				</Badge>
				
				<!-- Website and Twitter icons next to name -->
				<Flex v-if="validatorInfo.hasGithubInfo" align="center" gap="6">
					<NuxtLink v-if="validatorInfo.website" :to="validatorInfo.website" target="_blank" :class="$style.social_link">
						<Icon name="website" size="18" color="secondary" />
					</NuxtLink>
					<NuxtLink v-if="validatorInfo.twitter" :to="validatorInfo.twitter" target="_blank" :class="$style.social_link">
						<Icon name="twitter-x" size="18" color="secondary" />
					</NuxtLink>
				</Flex>
			</Flex>

			<Flex align="center" gap="12">
				<Text size="12" weight="600" color="secondary">
					{{ validatorMetrics.uptimeScore !== null ? formatPercentage(validatorMetrics.uptimeScore) + ' uptime' : 'No block opportunities' }}
				</Text>
			</Flex>
		</Flex>

		<!-- Description below header -->
		<Flex v-if="validatorInfo.description" direction="column" gap="4" :class="$style.description_section">
			<div :class="$style.description_container">
				<Text size="12" weight="500" color="primary" :class="$style.description_text">
					{{ displayedDescription }}
				</Text>
				<button 
					v-if="needsDescriptionToggle" 
					@click="toggleDescription"
					:class="$style.description_toggle"
				>
					<Text size="11" weight="600" color="brand">
						{{ isDescriptionExpanded ? 'Show less' : 'Show more' }}
					</Text>
				</button>
			</div>
		</Flex>

		<Flex gap="4" :class="$style.content">
			<Flex direction="column" :class="$style.data">
				<Flex direction="column" gap="24" :class="$style.main">
					<Flex direction="column" gap="8" :class="$style.key_value">
						<Flex align="center" justify="between">
							<Text size="13" weight="600" color="primary">Validator ID</Text>
						</Flex>
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="tertiary" mono selectable> 
								{{ shortHex(validator.validator_id) }} 
							</Text>
							<CopyButton :text="validator.validator_id" />
						</Flex>
					</Flex>

					<!-- Registration ID (from precompile_validator_id) -->
					<Flex direction="column" gap="8" :class="$style.key_value">
						<Flex align="center" justify="between">
							<Text size="13" weight="600" color="primary">Registration ID</Text>
						</Flex>
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="tertiary" mono selectable>
								{{ validator.staking?.precompile_validator_id ?? 'N/A' }}
							</Text>
							<CopyButton 
								v-if="validator.staking?.precompile_validator_id !== null && validator.staking?.precompile_validator_id !== undefined" 
								:text="String(validator.staking.precompile_validator_id)" 
							/>
						</Flex>
					</Flex>

					<!-- Author Address (from staking.auth_address) -->
					<Flex direction="column" gap="8" :class="$style.key_value">
						<Flex align="center" justify="between">
							<Text size="13" weight="600" color="primary">Author Address</Text>
						</Flex>
						<Flex align="center" gap="6">
							<NuxtLink 
								v-if="validator.staking?.auth_address"
								:to="`/address/${validator.staking.auth_address}`" 
								:class="$style.address_link"
							>
								<Text size="12" weight="600" color="brand" mono selectable>
									{{ shortHex(validator.staking.auth_address) }}
								</Text>
							</NuxtLink>
							<Text v-else size="12" weight="600" color="tertiary" mono selectable>
								N/A
							</Text>
							<CopyButton 
								v-if="validator.staking?.auth_address" 
								:text="validator.staking.auth_address" 
							/>
						</Flex>
						
						<!-- Author Balance -->
						<Flex v-if="validator.staking?.auth_address" align="center" justify="between">
							<Text size="11" weight="500" color="tertiary">Balance</Text>
							<Flex align="center" gap="4">
								<Text v-if="authorBalance?.success" size="11" weight="600" color="secondary">
									{{ formatBalance(authorBalance.balance) }} MON
								</Text>
								<Text v-else-if="authorBalance === null" size="11" weight="500" color="tertiary">
									Loading...
								</Text>
								<Text v-else size="11" weight="500" color="tertiary">
									N/A
								</Text>
							</Flex>
						</Flex>
					</Flex>
					
					<!-- Stake Information -->
					<Flex v-if="validator.stake" direction="column" gap="8" :class="$style.key_value">
						<Flex align="center" justify="between">
							<Text size="13" weight="600" color="primary">Voting Power</Text>
						</Flex>
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="secondary"> 
								{{ comma(validator.staking?.real_time_stake_mon || 0) }} MON 
							</Text>
						</Flex>
					</Flex>
					
					<!-- Commission Information -->
					<Flex v-if="validator.staking?.commission" direction="column" gap="8" :class="$style.key_value">
						<Flex align="center" justify="between">
							<Text size="13" weight="600" color="primary">Commission Rate</Text>
						</Flex>
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="secondary"> 
								{{ parseFloat(validator.staking.commission.percentage || 0).toFixed(2).replace(/\.?0+$/, '') }}%
							</Text>
						</Flex>
					</Flex>
					
					<!-- Infrastructure Details -->
					<Flex v-if="infrastructureDetails" direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Infrastructure Details</Text>

						<Flex v-if="infrastructureDetails.validatorName" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Validator Name</Text>
							<Text size="12" weight="600" color="primary">{{ infrastructureDetails.validatorName }}</Text>
						</Flex>

						<Flex v-if="infrastructureDetails.ip" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">IP Address</Text>
							<Flex align="center" gap="4">
								<Text size="12" weight="600" color="primary" mono>{{ infrastructureDetails.ip }}</Text>
								<CopyButton :text="infrastructureDetails.ip" />
							</Flex>
						</Flex>

						<Flex v-if="infrastructureDetails.provider" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Provider</Text>
							<Flex align="center" gap="4" :class="$style.provider_container">
								<Tooltip v-if="infrastructureDetails.provider.length > 30">
									<Text size="12" weight="600" color="primary" :class="$style.provider_text">{{ infrastructureDetails.provider }}</Text>
									<template #content>
										{{ infrastructureDetails.provider }}
									</template>
								</Tooltip>
								<Text v-else size="12" weight="600" color="primary">{{ infrastructureDetails.provider }}</Text>
							</Flex>
						</Flex>

						<Flex v-if="infrastructureDetails.location" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Location</Text>
							<Text size="12" weight="600" color="primary">{{ infrastructureDetails.location }}</Text>
						</Flex>
					</Flex>


					<!-- Status -->
					<Flex direction="column" gap="8">
						<Text size="12" weight="600" color="secondary">Status</Text>
						<Flex direction="column" gap="4">
							<Text size="11" weight="500" :color="validatorStatus.color">
								{{ validatorStatus.description[0] }}
							</Text>
							<Text size="11" weight="500" :color="validatorStatus.color">
								{{ validatorStatus.description[1] }}
							</Text>
						</Flex>
					</Flex>

					<!-- Validator Uptime Grid -->
					<Flex direction="column" gap="8">
						<Text size="12" weight="600" color="secondary">Validator Uptime (last 100 hours)</Text>
						<ValidatorPerformanceGrid :performance-history="performanceHistory" />
					</Flex>
				</Flex>
			</Flex>

			<Flex direction="column" gap="4" wide :class="$style.tabs_section">
				<Flex align="center" justify="between" :class="$style.tabs_wrapper">
					<Flex align="center" gap="4">
						<button
							v-for="tab in tabs"
							:key="tab.name"
							@click="activeTab = tab.name"
							:class="[$style.tab, activeTab === tab.name && $style.tab_active]"
						>
							<Icon :name="tab.icon" size="12" :color="activeTab === tab.name ? 'primary' : 'tertiary'" />
							{{ tab.name }}
						</button>
					</Flex>
				</Flex>

				<Flex direction="column" gap="16" :class="$style.tab_content">
					<!-- Performance Tab -->
					<template v-if="activeTab === 'Performance'">
						<Flex direction="column" gap="12">
							<Flex align="center" justify="between">
								<Flex direction="column" gap="4">
									<Text size="13" weight="600" color="primary">Performance Metrics</Text>
									<Text size="11" weight="500" color="tertiary">Primary uptime score based on block proposal performance.</Text>
								</Flex>
								
								<Flex align="center" gap="8" :class="$style.qc_toggle_wrapper">
									<Text size="11" weight="500" color="secondary">Show QC Metrics</Text>
									<Toggle v-model="showQcMetrics" />
									<Flex align="center" gap="6">
										<Icon name="info" size="14" color="brand" />
										<Text size="11" weight="600" color="brand">Informational only — does not affect performance</Text>
									</Flex>
								</Flex>
							</Flex>
							
							<Flex direction="column" gap="8" :class="[showQcMetrics ? $style.metrics_grid_expanded : $style.metrics_grid]">
								<Flex direction="column" gap="4" :class="$style.metric_card">
									<Text size="11" weight="500" color="tertiary">Uptime Score (Block Proposals)</Text>
									<Text size="16" weight="600" :color="validatorMetrics.uptimeScore !== null ? getPerformanceColor(validatorMetrics.uptimeScore) : 'tertiary'">
										{{ validatorMetrics.uptimeScore !== null ? formatPercentage(validatorMetrics.uptimeScore) : 'N/A' }}
									</Text>
								</Flex>
								
								<Flex direction="column" gap="4" :class="$style.metric_card">
									<Text size="11" weight="500" color="tertiary">Block Proposal Ratio</Text>
									<Text size="16" weight="600" :color="validatorMetrics.blockProposalRatio !== null ? getPerformanceColor(validatorMetrics.blockProposalRatio) : 'tertiary'">
										{{ validatorMetrics.blockProposalRatio !== null ? formatPercentage(validatorMetrics.blockProposalRatio) : 'N/A' }}
									</Text>
								</Flex>
								
								<Transition name="fade">
									<Flex v-if="showQcMetrics" direction="column" gap="4" :class="[$style.metric_card, $style.qc_metric_card]">
										<Text size="11" weight="500" color="primary">QC Participation Rate</Text>
										<Text size="16" weight="600" :color="getPerformanceColor(validatorMetrics.qcParticipationRate)">
											{{ formatPercentage(validatorMetrics.qcParticipationRate) }}
										</Text>
										<Text size="11" weight="600" color="secondary">Informational only — does not affect performance</Text>
									</Flex>
								</Transition>
							</Flex>

							<Flex direction="column" gap="8">
								<Text size="12" weight="600" color="secondary">Activity Details</Text>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Total Block Opportunities</Text>
									<Text size="11" weight="600" color="secondary">{{ validatorDetails.totalBlockOpportunities }}</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Blocks Proposed</Text>
									<Text size="11" weight="600" color="secondary">{{ validatorDetails.blocksProposed }}</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Blocks Skipped</Text>
									<Text size="11" weight="600" color="secondary">{{ validatorDetails.blocksSkipped }}</Text>
								</Flex>
								
								<Transition name="fade">
									<div v-if="showQcMetrics" :class="$style.qc_activity_wrapper">
										<Flex align="center" justify="between">
											<Text size="11" weight="500" color="primary">QC Opportunities</Text>
											<Text size="11" weight="600" color="secondary">{{ validatorDetails.totalQcOpportunities }}</Text>
										</Flex>
										
										<Flex align="center" justify="between">
											<Text size="11" weight="500" color="primary">QC Participations</Text>
											<Text size="11" weight="600" color="secondary">{{ validatorDetails.qcParticipations }}</Text>
										</Flex>
									</div>
								</Transition>
							</Flex>
						</Flex>
					</template>

					<!-- Tip Revenue Tab -->
					<template v-if="activeTab === 'Tip Revenue'">
						<ValidatorTipRevenueTab
							:tip-revenue="tipRevenue"
							:tip-history="tipHistory"
						/>
					</template>

					<!-- History Tab -->
					<template v-if="activeTab === 'History'">
						<ValidatorPerformanceGridDetailed :performance-history="performanceHistory" />
					</template>

					<!-- Events Tab -->
					<template v-if="activeTab === 'Events'">
						<ValidatorEventsTable :validator-id="validator.validator_id" />
					</template>

					<!-- Staking Events Tab -->
					<template v-if="activeTab === 'Staking Events'">
						<Flex direction="column" gap="16">
							<ValidatorStakingEventsTable
								:events="stakingEvents"
								:isLoading="isLoadingStakingEvents"
							/>

							<!-- Pagination -->
							<Flex v-if="stakingEvents.length > 0" align="center" justify="center" gap="8">
								<Button type="secondary" @click="handleStakingEventsPrev" size="mini" :disabled="stakingEventsPrevPages.length === 0">
									<Icon name="arrow-left" size="12" color="primary" />
								</Button>

								<Text size="12" weight="600" color="secondary" style="padding: 0 16px;">
									Page {{ stakingEventsPrevPages.length + 1 }}
								</Text>

								<Button @click="handleStakingEventsNext" type="secondary" size="mini" :disabled="!stakingEventsNextParams">
									<Icon name="arrow-right" size="12" color="primary" />
								</Button>
							</Flex>
						</Flex>
					</template>

					<!-- Delegators Tab -->
					<template v-if="activeTab === 'Delegators'">
						<ValidatorDelegatorsTable 
							v-if="validator.staking?.precompile_validator_id"
							:precompile-id="validator.staking.precompile_validator_id" 
						/>
						<Flex v-else direction="column" gap="12" align="center" :class="$style.no_precompile">
							<Icon name="warning" size="24" color="tertiary" />
							<Text size="12" weight="500" color="tertiary">
								No precompile validator ID available for this validator
							</Text>
						</Flex>
					</template>
				</Flex>
			</Flex>
		</Flex>

		<!-- Transaction Analytics Section -->
		<Flex direction="column" gap="4" :class="$style.analytics_section">
			<Flex align="center" gap="8" :class="$style.analytics_header">
				<Icon name="trending-up" size="16" color="primary" />
				<Text size="14" weight="600" color="primary">Transaction Analytics</Text>
			</Flex>
			<ValidatorTransactionAnalytics 
				:validatorId="props.validator.validator_id"
			/>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 20px 24px 60px 24px;
}

.header {
	margin-bottom: 16px;
}

.content {
	align-items: flex-start;
}

.data {
	min-width: 400px;
	max-width: 400px;
}

.main {
	border: 1px solid var(--op-8);
	border-radius: 8px;
	padding: 16px;
	background: var(--op-3);
}

.key_value {
	padding-bottom: 16px;
	border-bottom: 1px solid var(--op-8);
}

.tabs_section {
	min-height: 400px;
}

.tabs_wrapper {
	border-bottom: 1px solid var(--op-8);
	padding-bottom: 8px;
}

.tab {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 6px;
	background: transparent;
	border: none;
	color: var(--txt-tertiary);
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.1s ease;
}

.tab:hover {
	background: var(--op-5);
	color: var(--txt-secondary);
}

.tab_active {
	background: var(--op-8);
	color: var(--txt-primary);
}

.tab_content {
	padding: 16px 0;
}

.metrics_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 12px;
}

.metrics_grid_expanded {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 12px;
}

.metric_card {
	padding: 12px;
	border: 1px solid var(--op-8);
	border-radius: 6px;
	background: var(--op-3);
	transition: all 0.3s ease;
}

.qc_metric_card {
	border: 1px solid var(--brand);
	background: linear-gradient(135deg, var(--op-3) 0%, rgba(var(--brand-rgb), 0.05) 100%);
	box-shadow: 0 2px 8px rgba(var(--brand-rgb), 0.1);
}

.qc_toggle_wrapper {
	border: 1px solid var(--op-8);
	border-radius: 6px;
	padding: 8px 12px;
	background: var(--op-3);
	transition: all 0.2s ease;
}

.qc_toggle_wrapper:hover {
	background: var(--op-5);
}

.qc_activity_wrapper {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

/* Fade transition for QC metrics */
.fade-enter-active,
.fade-leave-active {
	transition: all 0.3s ease;
}

.fade-enter-from {
	opacity: 0;
	transform: translateY(-10px) scale(0.95);
}

.fade-leave-to {
	opacity: 0;
	transform: translateY(-10px) scale(0.95);
}

.link {
	text-decoration: none;
	transition: all 0.2s ease;
}

.link:hover {
	opacity: 0.8;
}

.social_link {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4px;
	border-radius: 4px;
	transition: all 0.2s ease;
	text-decoration: none;
}

.social_link:hover {
	background: var(--op-5);
}

.description_section {
	margin-bottom: 16px;
	padding: 12px 0;
}

.description_container {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.description_text {
	line-height: 1.5;
	word-wrap: break-word;
}

.description_toggle {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	align-self: flex-start;
	transition: opacity 0.2s ease;
}

.description_toggle:hover {
	opacity: 0.8;
}

.hostname_container {
	flex-wrap: wrap;
	gap: 4px;
}

.hostname_text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 250px; /* Adjust as needed */
}

.provider_container {
	flex-wrap: wrap;
	gap: 4px;
}

.provider_text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 200px; /* Limit provider name width */
}

.analytics_section {
	margin-top: 24px;
	padding-top: 24px;
	border-top: 1px solid var(--op-8);
}

.analytics_header {
	margin-bottom: 16px;
}

.no_precompile {
	padding: 40px 20px;
	text-align: center;
}

.address_link {
	text-decoration: none;
	transition: all 0.2s ease;
}

.address_link:hover {
	opacity: 0.8;
}

.view_all_link {
	text-decoration: none;
	transition: all 0.2s ease;
}

.view_all_link:hover {
	opacity: 0.8;
}

@media (max-width: 768px) {
	.content {
		flex-direction: column;
	}
	
	.data {
		min-width: 100%;
		max-width: 100%;
	}
	
	.metrics_grid,
	.metrics_grid_expanded {
		grid-template-columns: 1fr;
	}
	
	.qc_toggle_wrapper {
		flex-direction: column;
		gap: 4px;
		text-align: center;
	}
	
	.tabs_wrapper {
		overflow-x: auto;
		padding-bottom: 2px;
	}
	
	.header {
		flex-wrap: wrap;
		gap: 8px;
	}
	
	.description_section {
		padding: 8px 0;
		margin-bottom: 12px;
	}
}
</style>


