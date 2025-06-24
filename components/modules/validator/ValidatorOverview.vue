<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"
import Tooltip from "@/components/ui/Tooltip.vue"
import AmountInCurrency from "@/components/AmountInCurrency.vue"

/** Tables */
import BlocksTable from "./tables/BlocksTable.vue"
import DelegatorsTable from "./tables/DelegatorsTable.vue"
import JailsTable from "./tables/JailsTable.vue"

/** Services */
import { comma, numToPercent, shortHex, splitAddress } from "@/services/utils"

/** API */
import { fetchValidatorBlocks, fetchValidatorDelegators, fetchValidatorJails, fetchValidatorUptime } from "@/services/api/validator"

/** Store */
import { useCacheStore } from "@/store/cache.store"
import { useModalsStore } from "@/store/modals.store"
const cacheStore = useCacheStore()
const modalsStore = useModalsStore()

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

const isRefetching = ref(false)
const delegators = ref([])
const blocks = ref([])
const jails = ref([])
const uptime = ref([])

const page = ref(1)
const handleNextCondition = ref(true)

const handleNext = () => {
	page.value += 1
}
const handlePrev = () => {
	page.value -= 1
}

const getBlocks = async () => {
	isRefetching.value = true

	const { data } = await fetchValidatorBlocks({
		id: props.validator.id,
		limit: 10,
		offset: (page.value - 1) * 10,
	})

	if (data.value?.length) {
		blocks.value = data.value
		cacheStore.current.blocks = blocks.value
		handleNextCondition.value = blocks.value.length < 10
	}

	isRefetching.value = false
}

const getDelegators = async () => {
	isRefetching.value = true

	const { data } = await fetchValidatorDelegators({
		id: props.validator.id,
		limit: 10,
		offset: (page.value - 1) * 10,
	})

	delegators.value = data.value
	handleNextCondition.value = delegators.value.length < 10

	isRefetching.value = false
}

const getJails = async () => {
	isRefetching.value = true

	const { data } = await fetchValidatorJails({
		id: props.validator.id,
		limit: 10,
		offset: (page.value - 1) * 10,
	})

	jails.value = data.value
	handleNextCondition.value = jails.value.length < 10

	isRefetching.value = false
}

const getUptime = async () => {
	const { data } = await fetchValidatorUptime({
		id: props.validator.id,
		limit: 100,
	})

	if (data.value?.blocks?.length) {
		uptime.value = data.value.blocks.sort((a, b) => a.height - b.height)
	}
}

/** Initital fetch for delegators and uptime */
if (activeTab.value === "Delegators") await getDelegators()
if (activeTab.value === "Proposed Blocks") await getBlocks()
if (activeTab.value === "Jails") await getJails()

await getUptime()

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
			description: ["Validator performing exceptionally well", "with excellent uptime and participation"]
		}
	} else if (uptime >= 95) {
		return {
			name: "Good",
			color: "var(--brand)",
			description: ["Validator performing well", "with good uptime and participation"]
		}
	} else if (uptime >= 90) {
		return {
			name: "Warning",
			color: "var(--yellow)",
			description: ["Validator performance needs attention", "uptime below optimal levels"]
		}
	} else {
		return {
			name: "Poor",
			color: "var(--red)",
			description: ["Validator performance is poor", "immediate attention required"]
		}
	}
})

const parsedContacts = computed(() => {
	let res = []
	const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
	const emails = props.validator.contacts.match(emailRegex)

	if (emails) {
		emails.forEach((email) => {
			res.push({
				type: "email",
				value: "mailto:" + email,
			})
		})
	}

	const telegramRegex = /https?:\/\/t\.me\/([A-Za-z0-9_]+)/g
	const telegrams = props.validator.contacts.match(telegramRegex)

	if (telegrams) {
		telegrams.forEach((telegram) => {
			res.push({
				type: "telegram",
				value: telegram,
			})
		})
	}

	return res
})

/** Refetch Blobs/Messages on new page */
watch(
	() => page.value,
	() => {
		switch (activeTab.value) {
			case "Delegators":
				getDelegators()
				break
			case "Proposed Blocks":
				getBlocks()
				break
			case "Jails":
				getJails()
				break
		}
	},
)

watch(
	() => activeTab.value,
	() => {
		router.replace({
			query: {
				tab: activeTab.value,
			},
		})

		page.value = 1

		switch (activeTab.value) {
			case "Delegators":
				getDelegators()
				break
			case "Proposed Blocks":
				getBlocks()
				break
			case "Jails":
				getJails()
				break
		}
	},
)

const handleDelegate = () => {
	modalsStore.open("staking")
}

// Computed properties for validator data
const validatorMetrics = computed(() => {
	return {
		uptimeScore: props.validator.metrics?.uptime_score || 0,
		qcParticipationRate: props.validator.metrics?.qc_participation_rate || 0,
		blockProposalRatio: props.validator.metrics?.block_proposal_ratio || 0,
	}
})

const validatorDetails = computed(() => {
	return {
		totalBlockOpportunities: props.validator.details?.total_block_opportunities || 0,
		blocksProposed: props.validator.details?.blocks_proposed || 0,
		blocksSkipped: props.validator.details?.blocks_skipped || 0,
		totalQcOpportunities: props.validator.details?.total_qc_opportunities || 0,
		qcParticipations: props.validator.details?.qc_participations || 0,
	}
})

const infrastructureDetails = computed(() => {
	if (!props.infrastructure?.data?.location) return null
	
	const location = props.infrastructure.data.location
	return {
		validatorName: location.validatorName || 'Unknown',
		provider: location.isp || 'Unknown',
		location: `${location.city || 'Unknown'}, ${location.country || 'Unknown'}`,
		ip: location.ip || 'Unknown',
		hostname: location.hostname || 'Unknown',
		port: location.port || 'Unknown',
		timezone: location.timezone || 'Unknown',
		latitude: location.latitude || 0,
		longitude: location.longitude || 0,
		lastUpdated: location.lastUpdated || null,
	}
})

const performanceHistory = computed(() => {
	if (!props.history?.history) return []
	
	return props.history.history.map(entry => ({
		hour: entry.hour,
		uptimeScore: entry.metrics?.uptime_score || 0,
		qcParticipationRate: entry.metrics?.qc_participation_rate || 0,
		blockProposalRatio: entry.metrics?.block_proposal_ratio || 0,
		blockOpportunities: entry.activity?.block_opportunities || 0,
		blocksProposed: entry.activity?.blocks_proposed || 0,
		qcOpportunities: entry.activity?.qc_opportunities || 0,
		qcParticipations: entry.activity?.qc_participations || 0,
	}))
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

const formatDateTime = (dateString) => {
	if (!dateString) return 'Unknown'
	try {
		return new Date(dateString).toLocaleString()
	} catch {
		return 'Invalid date'
	}
}
</script>

<template>
	<Flex direction="column" gap="4">
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="validator" size="14" color="primary" />
				<Text as="h1" size="13" weight="600" color="primary">
					{{ validator.infrastructure?.validator_name || shortHex(validator.validator_id) }}
				</Text>
			</Flex>

			<Flex align="center" gap="12">
				<Button @click="handleDelegate" type="secondary" size="mini">
					<Icon name="coins_up" size="12" color="primary" />
					Delegate
				</Button>
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

					<Flex v-if="validator.details" direction="column" gap="6">
						<Text size="12" weight="600" color="secondary">Description</Text>

						<Flex align="center" gap="6">
							<Text size="12" height="140" weight="600" color="tertiary" mono selectable :class="$style.memo">
								{{ validator.details }}
							</Text>
						</Flex>
					</Flex>
					<Flex v-if="validator.website || parsedContacts.length" align="center" justify="start" gap="12">
						<Tooltip v-if="validator.website" position="start" delay="500">
							<a :href="validator.website" target="_blank">
								<Icon name="globe" size="14" color="secondary" :class="$style.btn" />
							</a>

							<template #content>
								{{ validator.website }}
							</template>
						</Tooltip>

						<template v-for="c in parsedContacts">
							<Tooltip v-if="c.type !== 'unknown'" position="start" delay="500">
								<a :href="c.value" target="_blank">
									<Icon :name="c.type" size="14" color="secondary" :class="$style.btn" />
								</a>

								<template #content>
									{{ c.value }}
								</template>
							</Tooltip>
						</template>
					</Flex>

					<!-- Staking -->
					<Flex direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Staking</Text>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Voting Power</Text>
							<AmountInCurrency
								:amount="{ value: validator.voting_power, unit: 'TIA' }"
								:styles="{ amount: { color: 'tertiary' } }"
							/>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Outgoing Rewards</Text>
							<AmountInCurrency :amount="{ value: validator.rewards }" :styles="{ amount: { color: 'tertiary' } }" />
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Commissions</Text>
							<AmountInCurrency :amount="{ value: validator.commissions }" :styles="{ amount: { color: 'tertiary' } }" />
						</Flex>
					</Flex>

					<!-- Details -->
					<Flex direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Details</Text>

						<Flex v-if="!parsedContacts.length && validator.contacts" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Contact</Text>
							<Text size="12" weight="600" color="tertiary" selectable> {{ validator.contacts }} </Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Delegator Address</Text>
							<Flex gap="6">
								<AddressBadge :account="validator.delegator" color="tertiary" />
								<CopyButton :text="validator.delegator.hash" />
							</Flex>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Consensus Address</Text>
							<Flex gap="6">
								<Text size="12" weight="600" color="tertiary"> {{ shortHex(validator.cons_address) }} </Text>
								<CopyButton :text="validator.cons_address" />
							</Flex>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Identity</Text>
							<Flex gap="6">
								<Text size="12" weight="600" color="tertiary"> {{ validator.identity }} </Text>
								<CopyButton :text="validator.identity" />
							</Flex>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Rate</Text>
							<Text size="12" weight="600" color="secondary"> {{ numToPercent(validator.rate) }} </Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Max Rate</Text>
							<Text size="12" weight="600" color="secondary"> {{ numToPercent(validator.max_rate) }} </Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Max Change Rate</Text>
							<Text size="12" weight="600" color="secondary"> {{ numToPercent(validator.max_change_rate) }} </Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Min Self Delegation</Text>
							<Text size="12" weight="600" color="secondary"> {{ comma(validator.min_self_delegation) }} </Text>
						</Flex>

						<div :class="$style.horizontal_divider" />

						<!-- Validator Uptime -->
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="secondary">Validator Uptime</Text>
							<Text size="12" weight="600" color="tertiary">(last 100 blocks)</Text>
						</Flex>

						<Flex :class="$style.uptime_wrapper">
							<Tooltip v-for="t in uptime">
								<Flex
									:class="$style.uptime"
									:style="{
										background: t.signed ? 'rgb(10, 219, 111)' : 'red',
									}"
								/>

								<template #content>
									<Flex direction="column" gap="4">
										<Text color="primary">{{ t.height }}</Text>
										<Text color="secondary">{{ t.signed ? "Signed" : "Missed" }}</Text>
									</Flex>
								</template>
							</Tooltip>
						</Flex>
					</Flex>
				</Flex>
			</Flex>

			<Flex direction="column" gap="4" wide :class="$style.tabs_section">
				<Flex align="center" justify="between" :class="$style.tabs_wrapper">
					<Flex gap="4" :class="$style.tabs">
						<Flex
							@click="activeTab = tab.name"
							v-for="tab in tabs"
							align="center"
							gap="6"
							:class="[$style.tab, activeTab === tab.name && $style.active]"
						>
							<Icon :name="tab.icon" size="12" color="secondary" />
							<Text size="13" weight="600">{{ tab.name }}</Text>
						</Flex>
					</Flex>
				</Flex>

				<Flex direction="column" gap="16" :class="$style.tab_content">
					<!-- Performance Tab -->
					<template v-if="activeTab === 'Performance'">
						<Flex direction="column" gap="12">
							<Text size="14" weight="600" color="primary">Current Performance</Text>
							
							<div :class="$style.metrics_grid">
								<div :class="$style.metric_card">
									<Text size="11" color="tertiary">Uptime Score</Text>
									<Text size="18" weight="700" :color="getPerformanceColor(validatorMetrics.uptimeScore)">
										{{ formatPercentage(validatorMetrics.uptimeScore) }}
									</Text>
								</div>
								
								<div :class="$style.metric_card">
									<Text size="11" color="tertiary">QC Participation</Text>
									<Text size="18" weight="700" :color="getPerformanceColor(validatorMetrics.qcParticipationRate)">
										{{ formatPercentage(validatorMetrics.qcParticipationRate) }}
									</Text>
								</div>
								
								<div :class="$style.metric_card">
									<Text size="11" color="tertiary">Block Proposals</Text>
									<Text size="18" weight="700" :color="getPerformanceColor(validatorMetrics.blockProposalRatio)">
										{{ formatPercentage(validatorMetrics.blockProposalRatio) }}
									</Text>
								</div>
							</div>
						</Flex>
					</template>

					<!-- Infrastructure Tab -->
					<template v-if="activeTab === 'Infrastructure'">
						<Flex v-if="infrastructureDetails" direction="column" gap="12">
							<Text size="14" weight="600" color="primary">Infrastructure Details</Text>
							
							<Flex direction="column" gap="8">
								<Flex align="center" justify="between">
									<Text size="12" weight="600" color="tertiary">Hostname</Text>
									<Text size="12" weight="600" color="secondary" mono>
										{{ infrastructureDetails.hostname }}
									</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="12" weight="600" color="tertiary">IP Address</Text>
									<Text size="12" weight="600" color="secondary" mono>
										{{ infrastructureDetails.ip }}
									</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="12" weight="600" color="tertiary">Port</Text>
									<Text size="12" weight="600" color="secondary">
										{{ infrastructureDetails.port }}
									</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="12" weight="600" color="tertiary">Timezone</Text>
									<Text size="12" weight="600" color="secondary">
										{{ infrastructureDetails.timezone }}
									</Text>
								</Flex>
								
								<Flex align="center" justify="between">
									<Text size="12" weight="600" color="tertiary">Last Updated</Text>
									<Text size="12" weight="600" color="secondary">
										{{ formatDateTime(infrastructureDetails.lastUpdated) }}
									</Text>
								</Flex>
							</Flex>
						</Flex>
						
						<Flex v-else direction="column" gap="8" align="center" :class="$style.empty">
							<Text size="13" weight="600" color="secondary">No infrastructure data available</Text>
						</Flex>
					</template>

					<!-- History Tab -->
					<template v-if="activeTab === 'History'">
						<Flex v-if="performanceHistory.length" direction="column" gap="12">
							<Text size="14" weight="600" color="primary">Performance History (24h)</Text>
							
							<div :class="$style.history_table">
								<div :class="$style.history_header">
									<Text size="11" weight="600" color="tertiary">Time</Text>
									<Text size="11" weight="600" color="tertiary">Uptime</Text>
									<Text size="11" weight="600" color="tertiary">QC Rate</Text>
									<Text size="11" weight="600" color="tertiary">Blocks</Text>
								</div>
								
								<div v-for="entry in performanceHistory.slice(0, 10)" :key="entry.hour" :class="$style.history_row">
									<Text size="11" color="secondary">{{ new Date(entry.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</Text>
									<Text size="11" weight="600" :color="getPerformanceColor(entry.uptimeScore)">
										{{ formatPercentage(entry.uptimeScore) }}
									</Text>
									<Text size="11" weight="600" :color="getPerformanceColor(entry.qcParticipationRate)">
										{{ formatPercentage(entry.qcParticipationRate) }}
									</Text>
									<Text size="11" color="secondary">{{ entry.blocksProposed }}/{{ entry.blockOpportunities }}</Text>
								</div>
							</div>
						</Flex>
						
						<Flex v-else direction="column" gap="8" align="center" :class="$style.empty">
							<Text size="13" weight="600" color="secondary">No performance history available</Text>
						</Flex>
					</template>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.header {
	height: 40px;
	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);
	padding: 0 16px;
}

.content {
	min-height: 400px;
}

.data {
	min-width: 384px;
	border-radius: 4px 4px 4px 8px;
	background: var(--card-background);
}

.main {
	padding: 16px;
}

.key_value {
	max-width: 100%;
}

.tabs_section {
	min-width: 0;
}

.tabs_wrapper {
	min-height: 44px;
	overflow-x: auto;
	border-radius: 4px;
	background: var(--card-background);
	padding: 0 8px;
}

.tabs_wrapper::-webkit-scrollbar {
	display: none;
}

.tabs {
	display: flex;
	gap: 4px;
}

.tab {
	height: 28px;
	cursor: pointer;
	border-radius: 6px;
	padding: 0 8px;
	transition: all 0.1s ease;
	white-space: nowrap;

	& span {
		color: var(--txt-tertiary);
		transition: all 0.1s ease;
	}

	&:hover {
		& span {
			color: var(--txt-secondary);
		}
	}
}

.tab.active {
	background: var(--op-8);

	& span {
		color: var(--txt-primary);
	}
}

.tab_content {
	background: var(--card-background);
	border-radius: 4px;
	padding: 16px;
	min-height: 300px;
}

.metrics_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 12px;
}

.metric_card {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 12px;
	border: 1px solid var(--op-8);
	border-radius: 6px;
	background: var(--op-3);
}

.history_table {
	display: flex;
	flex-direction: column;
	gap: 1px;
}

.history_header {
	display: grid;
	grid-template-columns: 80px 80px 80px 1fr;
	gap: 12px;
	padding: 8px 12px;
	background: var(--op-5);
	border-radius: 4px 4px 0 0;
}

.history_row {
	display: grid;
	grid-template-columns: 80px 80px 80px 1fr;
	gap: 12px;
	padding: 8px 12px;
	background: var(--op-3);
	border-bottom: 1px solid var(--op-5);

	&:last-child {
		border-radius: 0 0 4px 4px;
	}

	&:hover {
		background: var(--op-8);
	}
}

.empty {
	padding: 40px 20px;
	text-align: center;
}

.memo {
	max-width: 352px;
	text-overflow: ellipsis;
	overflow: hidden;
}

.uptime_wrapper {
	max-width: 384px;
	flex-wrap: wrap;
}

.uptime {
	/* width: 10px;
	height: 10px; */
	width: 0.6rem;
	height: 0.6rem;

	border-radius: 2px;
	cursor: pointer;

	margin-right: 0.35rem;
	margin-bottom: 0.35rem;
}

.horizontal_divider {
	width: 100%;
	height: 2px;
	background: var(--op-5);

	margin-top: 4px;
	margin-bottom: 4px;
}

.btn {
	margin-left: 4px;
}

@media (max-width: 768px) {
	.content {
		flex-direction: column;
	}

	.data {
		min-width: initial;
		border-radius: 8px;
	}

	.metrics_grid {
		grid-template-columns: 1fr;
	}
	
	.history_header,
	.history_row {
		grid-template-columns: 60px 60px 60px 1fr;
		gap: 8px;
		padding: 6px 8px;
	}
}
</style>

