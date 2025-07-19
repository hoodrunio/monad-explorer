<script setup>
/** UI */
import Badge from "@/components/ui/Badge.vue"
import Toggle from "@/components/ui/Toggle.vue"
import Tooltip from "@/components/ui/Tooltip.vue"

/** Components */
import CopyButton from "@/components/CopyButton.vue"
import ValidatorLogo from "@/components/ValidatorLogo.vue"

/** Services */
import { shortHex, comma } from "@/services/utils"
import { convertUTCToLocal } from "@/services/utils/validator"

/** Components */
import ValidatorPerformanceGrid from "./ValidatorPerformanceGrid.vue"
import ValidatorPerformanceGridDetailed from "./ValidatorPerformanceGridDetailed.vue"
import ValidatorEventsTable from "./ValidatorEventsTable.vue"
import ValidatorTransactionAnalytics from "./ValidatorTransactionAnalytics.vue"

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
})

const tabs = ref([
	{
		name: "Performance",
		icon: "bar-chart",
	},
	{
		name: "History",
		icon: "time",
	},
	{
		name: "Events",
		icon: "message",
	},
])

const preselectedTab = route.query.tab && tabs.value.map((tab) => tab.name).includes(route.query.tab) ? route.query.tab : tabs.value[0].name
const activeTab = ref(preselectedTab)

// QC Participation toggle state
const showQcMetrics = ref(false)

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
	() => {
		router.replace({
			query: {
				tab: activeTab.value,
			},
		})
	},
)

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
	
	return {
		validatorName: location.validatorName || location.validator_name || 'Unknown',
		provider: location.isp || location.provider || 'Unknown',
		location: `${location.city || 'Unknown'}, ${location.country || 'Unknown'}`,
		ip: location.ip || 'Unknown',
		hostname: location.hostname || 'Unknown',
		port: location.port || 'Unknown',
		timezone: location.timezone || 'Unknown',
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
	return {
		name: props.validator?.displayName || props.validator?.infrastructure?.validator_name || shortHex(props.validator?.validator_id || ''),
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
					
					<!-- Stake Information -->
					<Flex v-if="validator.stake" direction="column" gap="8" :class="$style.key_value">
						<Flex align="center" justify="between">
							<Text size="13" weight="600" color="primary">Voting Power</Text>
						</Flex>
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="secondary"> 
								{{ comma(validator.stake) }} 
							</Text>
						</Flex>
					</Flex>
					
					<!-- Infrastructure Details -->
					<Flex v-if="infrastructureDetails" direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Infrastructure Details</Text>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Validator Name</Text>
							<Text size="12" weight="600" color="primary">{{ infrastructureDetails.validatorName }}</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Hostname</Text>
							<Flex align="center" gap="4" :class="$style.hostname_container">
								<Tooltip>
									<Text size="12" weight="600" color="primary" mono :class="$style.hostname_text">{{ infrastructureDetails.hostname }}</Text>
									<template #content>
										{{ infrastructureDetails.hostname }}
									</template>
								</Tooltip>
								<CopyButton :text="infrastructureDetails.hostname" />
							</Flex>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">IP Address</Text>
							<Flex align="center" gap="4">
								<Text size="12" weight="600" color="primary" mono>{{ infrastructureDetails.ip }}</Text>
								<CopyButton :text="infrastructureDetails.ip" />
							</Flex>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Provider</Text>
							<Text size="12" weight="600" color="primary">{{ infrastructureDetails.provider }}</Text>
						</Flex>

						<Flex align="center" justify="between">
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
										<Text size="10" weight="500" color="brand">Additional metric</Text>
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



					<!-- History Tab -->
					<template v-if="activeTab === 'History'">
						<ValidatorPerformanceGridDetailed :performance-history="performanceHistory" />
					</template>

					<!-- Events Tab -->
					<template v-if="activeTab === 'Events'">
						<ValidatorEventsTable :validator-id="validator.validator_id" />
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

.analytics_section {
	margin-top: 24px;
	padding-top: 24px;
	border-top: 1px solid var(--op-8);
}

.analytics_header {
	margin-bottom: 16px;
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


