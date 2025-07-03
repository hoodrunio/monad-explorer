<script setup>
/** UI */
import Badge from "@/components/ui/Badge.vue"

/** Components */
import CopyButton from "@/components/CopyButton.vue"

/** Services */
import { shortHex } from "@/services/utils"

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
		name: "Infrastructure",
		icon: "server",
	},
	{
		name: "History",
		icon: "clock",
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
	return {
		uptimeScore: metrics.uptime_score || 0,
		qcParticipationRate: metrics.qc_participation_rate || 0,
		blockProposalRatio: metrics.block_proposal_ratio || 0,
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
		
		return {
			hour: entry.hour || entry.timestamp || 'Unknown',
			uptimeScore: metrics.uptime_score || 0,
			qcParticipationRate: metrics.qc_participation_rate || 0,
			blockProposalRatio: metrics.block_proposal_ratio || 0,
			blockOpportunities: activity.block_opportunities || 0,
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

					<!-- Performance Summary -->
					<Flex direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Performance Summary</Text>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">First Seen</Text>
							<Text
								v-if="validator.activity"
								size="12"
								weight="600"
								color="primary"
							>
								{{
									new Date(
										validator.activity.first_seen,
									).toLocaleString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})
								}}
							</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Uptime Score</Text>
							<Text size="12" weight="600" :color="getPerformanceColor(validatorMetrics.uptimeScore)">
								{{ formatPercentage(validatorMetrics.uptimeScore) }}
							</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">QC Participation</Text>
							<Text size="12" weight="600" :color="getPerformanceColor(validatorMetrics.qcParticipationRate)">
								{{ formatPercentage(validatorMetrics.qcParticipationRate) }}
							</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Block Proposal Ratio</Text>
							<Text size="12" weight="600" :color="getPerformanceColor(validatorMetrics.blockProposalRatio)">
								{{ formatPercentage(validatorMetrics.blockProposalRatio) }}
							</Text>
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
									<Text size="16" weight="600" :color="getPerformanceColor(validatorMetrics.blockProposalRatio)">
										{{ formatPercentage(validatorMetrics.blockProposalRatio) }}
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

					<!-- Infrastructure Tab -->
					<template v-if="activeTab === 'Infrastructure'">
						<Flex direction="column" gap="12">
							<Text size="13" weight="600" color="primary">Infrastructure Details</Text>
							
							<Flex v-if="infrastructureDetails" direction="column" gap="8">
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Validator Name</Text>
									<Text size="11" weight="600" color="secondary">{{ infrastructureDetails.validatorName }}</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Hostname</Text>
									<Text size="11" weight="600" color="secondary" mono>{{ infrastructureDetails.hostname }}</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">IP Address</Text>
									<Flex align="center" gap="4">
										<Text size="11" weight="600" color="secondary" mono>{{ infrastructureDetails.ip }}</Text>
										<CopyButton :text="infrastructureDetails.ip" />
									</Flex>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Port</Text>
									<Text size="11" weight="600" color="secondary">{{ infrastructureDetails.port }}</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Provider</Text>
									<Text size="11" weight="600" color="secondary">{{ infrastructureDetails.provider }}</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Location</Text>
									<Text size="11" weight="600" color="secondary">{{ infrastructureDetails.location }}</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Timezone</Text>
									<Text size="11" weight="600" color="secondary">{{ infrastructureDetails.timezone }}</Text>
								</Flex>
								
								<Flex v-if="infrastructureDetails.lastUpdated" align="center" justify="between">
									<Text size="11" weight="500" color="tertiary">Last Updated</Text>
									<Text size="11" weight="600" color="secondary">{{
										new Date(
											infrastructureDetails.lastUpdated,
										).toLocaleString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})
									}}</Text>
								</Flex>
							</Flex>
							
							<Flex v-else align="center" justify="center" :class="$style.no_data">
								<Text size="12" weight="500" color="tertiary">No infrastructure data available</Text>
							</Flex>
						</Flex>
					</template>

					<!-- History Tab -->
					<template v-if="activeTab === 'History'">
						<Flex direction="column" gap="12">
							<Text size="13" weight="600" color="primary">24-Hour Performance History</Text>
							
							<Flex v-if="performanceHistory.length" direction="column" gap="6" :class="$style.history_list">
								<Flex v-for="entry in performanceHistory.slice(-10)" align="center" justify="between" gap="12" :class="$style.history_item">
									<Text size="11" weight="500" color="tertiary">{{ entry.hour }}:00</Text>
									<Flex align="center" gap="16">
										<Text size="10" weight="500" :color="getPerformanceColor(entry.uptimeScore)">
											{{ formatPercentage(entry.uptimeScore) }}
										</Text>
										<Text size="10" weight="500" :color="getPerformanceColor(entry.qcParticipationRate)">
											QC: {{ formatPercentage(entry.qcParticipationRate) }}
										</Text>
										<Text size="10" weight="500" :color="getPerformanceColor(entry.blockProposalRatio)">
											BP: {{ formatPercentage(entry.blockProposalRatio) }}
										</Text>
									</Flex>
								</Flex>
							</Flex>
							
							<Flex v-else align="center" justify="center" :class="$style.no_data">
								<Text size="12" weight="500" color="tertiary">No historical data available</Text>
							</Flex>
						</Flex>
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
	min-width: 280px;
	max-width: 280px;
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

.history_list {
	max-height: 300px;
	overflow-y: auto;
}

.history_item {
	padding: 8px 12px;
	border: 1px solid var(--op-8);
	border-radius: 4px;
	background: var(--op-3);
}

.no_data {
	padding: 40px 20px;
	border: 1px dashed var(--op-8);
	border-radius: 6px;
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
}
</style>

