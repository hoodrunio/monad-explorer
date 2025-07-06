<script setup>
/** UI */
import Badge from "@/components/ui/Badge.vue"

/** Components */
import CopyButton from "@/components/CopyButton.vue"

/** Services */
import { shortHex, comma } from "@/services/utils"
import { convertUTCToLocal } from "@/services/utils/validator"

/** Components */
import ValidatorPerformanceGrid from "./ValidatorPerformanceGrid.vue"
import ValidatorPerformanceGridDetailed from "./ValidatorPerformanceGridDetailed.vue"
import ValidatorEventsTable from "./ValidatorEventsTable.vue"

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
		icon: "clock",
	},
	{
		name: "Events",
		icon: "calendar",
	},
])

const preselectedTab = route.query.tab && tabs.value.map((tab) => tab.name).includes(route.query.tab) ? route.query.tab : tabs.value[0].name
const activeTab = ref(preselectedTab)

onMounted(() => {
	router.replace({
		query: {
			tab: activeTab.value,
		},
	})
})

const validatorStatus = computed(() => {
	const uptime = validatorMetrics.value.uptimeScore
	
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
	} else if (uptime <= 90) {
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
	// Debug logging to understand data structure
	if (process.dev) {
		console.log('Validator data structure:', props.validator)
		console.log('Infrastructure data structure:', props.infrastructure)
		console.log('History data structure:', props.history)
	}
	
	const metrics = props.validator.metrics || {}
	const details = props.validator.details || {}
	const blockProposals = details.block_proposals || {}
	const totalBlockOpportunities = blockProposals.total_opportunities || 0
	
	// If validator had no block opportunities, don't show 0% as it's misleading
	const blockProposalRatio = totalBlockOpportunities === 0 ? null : (metrics.block_proposal_ratio || 0)
	
	return {
		uptimeScore: metrics.uptime_score || 0,
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
	return `${value.toFixed(1)}%`
}

const getPerformanceColor = (score) => {
	if (score >= 99) return 'green'
	if (score >= 95) return 'brand'
	if (score >= 90) return 'yellow'
	return 'red'
}
</script>

<template>
	<Flex direction="column" gap="4">
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="validator" size="14" color="primary" />
				<Text as="h1" size="13" weight="600" color="primary">
					{{ infrastructureDetails?.validatorName || shortHex(validator.validator_id) }}
				</Text>
				<Badge :color="getPerformanceColor(validatorMetrics.uptimeScore)" type="light" size="small">
					{{ validatorStatus.name }}
				</Badge>
			</Flex>

			<Flex align="center" gap="12">
				<Text size="12" weight="600" color="secondary">
					{{ formatPercentage(validatorMetrics.uptimeScore) }} uptime
				</Text>
			</Flex>
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
							<Text size="12" weight="600" color="primary" mono>{{ infrastructureDetails.hostname }}</Text>
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
							<Icon :name="tab.icon" size="12" />
							{{ tab.name }}
						</button>
					</Flex>
				</Flex>

				<Flex direction="column" gap="16" :class="$style.tab_content">
					<!-- Performance Tab -->
					<template v-if="activeTab === 'Performance'">
						<Flex direction="column" gap="12">
							<Text size="13" weight="600" color="primary">Real-time Performance Metrics</Text>
							
							<Flex direction="column" gap="8" :class="$style.metrics_grid">
								<Flex direction="column" gap="4" :class="$style.metric_card">
									<Text size="11" weight="500" color="tertiary">Uptime Score</Text>
									<Text size="16" weight="600" :color="getPerformanceColor(validatorMetrics.uptimeScore)">
										{{ formatPercentage(validatorMetrics.uptimeScore) }}
									</Text>
								</Flex>
								
								<Flex direction="column" gap="4" :class="$style.metric_card">
									<Text size="11" weight="500" color="tertiary">QC Participation Rate</Text>
									<Text size="16" weight="600" :color="getPerformanceColor(validatorMetrics.qcParticipationRate)">
										{{ formatPercentage(validatorMetrics.qcParticipationRate) }}
									</Text>
								</Flex>
								
								<Flex direction="column" gap="4" :class="$style.metric_card">
									<Text size="11" weight="500" color="tertiary">Block Proposal Ratio</Text>
									<Text size="16" weight="600" :color="validatorMetrics.blockProposalRatio !== null ? getPerformanceColor(validatorMetrics.blockProposalRatio) : 'tertiary'">
										{{ validatorMetrics.blockProposalRatio !== null ? formatPercentage(validatorMetrics.blockProposalRatio) : 'N/A' }}
									</Text>
								</Flex>
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
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">QC Opportunities</Text>
									<Text size="11" weight="600" color="secondary">{{ validatorDetails.totalQcOpportunities }}</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">QC Participations</Text>
									<Text size="11" weight="600" color="secondary">{{ validatorDetails.qcParticipations }}</Text>
								</Flex>
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

.metric_card {
	padding: 12px;
	border: 1px solid var(--op-8);
	border-radius: 6px;
	background: var(--op-3);
}

@media (max-width: 768px) {
	.content {
		flex-direction: column;
	}
	
	.data {
		min-width: 100%;
		max-width: 100%;
	}
	
	.metrics_grid {
		grid-template-columns: 1fr;
	}
	
	.tabs_wrapper {
		overflow-x: auto;
		padding-bottom: 2px;
	}
}
</style>

