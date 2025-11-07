<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"
import Tooltip from "@/components/ui/Tooltip.vue"

/** API */
import { 
	fetchValidatorTransactionAnalyticsClient,
	fetchValidatorTransactionTrendsClient
} from "@/services/api/transaction-analytics"

/** Services */
import { abbreviate, comma } from "@/services/utils"

/** Components */
import TransactionTrendsChart from "@/components/modules/transaction-analytics/TransactionTrendsChart.vue"
import { ValidatorTransactionAnalyticsSkeleton } from "@/components/modules/transaction-analytics/skeletons"

const props = defineProps({
	validatorId: {
		type: String,
		required: true,
	},
})

const isLoading = ref(true)
const isUpdating = ref(false)
const error = ref(null)

const validatorAnalytics = ref(null)
const validatorTrends = ref(null)

const timeWindow = ref('24h')
const timeWindows = ref([
	{ value: '1h', label: '1H' },
	{ value: '24h', label: '24H' },
	{ value: '7d', label: '7D' },
	{ value: '30d', label: '30D' },
])

// Load initial data using client-side functions only
const loadInitialValidatorAnalytics = async () => {
	try {
		isLoading.value = true
		error.value = null

		// Determine granularity based on time window
		const granularity = (timeWindow.value === '7d' || timeWindow.value === '30d') ? 'day' : 'hour'

		const [analyticsResult, trendsResult] = await Promise.all([
			fetchValidatorTransactionAnalyticsClient(props.validatorId, {timeWindow: timeWindow.value, granularity}),
			fetchValidatorTransactionTrendsClient(props.validatorId, { timeWindow: timeWindow.value, granularity })
		])

		validatorAnalytics.value = analyticsResult?.data
		validatorTrends.value = trendsResult?.data

	} catch (err) {
		error.value = 'Failed to load transaction analytics'
	} finally {
		isLoading.value = false
	}
}

// Update data using client-side functions
const updateValidatorAnalytics = async () => {
	try {
		const currentWindow = timeWindow.value
		isUpdating.value = true
		error.value = null

		await nextTick()

		// Determine granularity based on time window
		const granularity = (currentWindow === '7d' || currentWindow === '30d') ? 'day' : 'hour'

		const [analyticsResult, trendsResult] = await Promise.all([
			fetchValidatorTransactionAnalyticsClient(props.validatorId, {timeWindow: currentWindow, granularity}),
			fetchValidatorTransactionTrendsClient(props.validatorId, { timeWindow: currentWindow, granularity })
		])

		if (currentWindow === timeWindow.value) {
			validatorAnalytics.value = analyticsResult?.data
			validatorTrends.value = trendsResult?.data
		}

	} catch (err) {
		if (err.name !== 'AbortError') {
			error.value = 'Failed to load transaction analytics'
		}
	} finally {
		isUpdating.value = false
	}
}

const handleTimeWindowChange = async (newWindow) => {
	if (newWindow === timeWindow.value) return
	
	timeWindow.value = newWindow
	await nextTick()
	await updateValidatorAnalytics()
}

const metrics = computed(() => {
	if (!validatorAnalytics.value) return []
	
	const data = validatorAnalytics.value
	return [
		{
			name: 'totalTransactions',
			title: 'Total Transactions',
			value: data.transactionMetrics.totalTransactions,
			icon: 'tx',
			formatter: 'comma'
		},
		{
			name: 'totalProposals',
			title: 'Total Proposals',
			value: data.transactionMetrics.totalProposals,
			icon: 'block',
			formatter: 'comma'
		},
		{
			name: 'avgTransactionsPerBlock',
			title: 'Avg Tx per Block',
			value: data.transactionMetrics.avgTransactionsPerBlock,
			icon: 'bar-chart',
			formatter: 'decimal'
		},
		{
			name: 'transactionThroughput',
			title: 'Throughput',
			value: data.transactionMetrics.transactionThroughput,
			icon: 'zap',
			formatter: 'decimal',
			suffix: 'tx/h'
		},
		{
			name: 'blockUtilizationRate',
			title: 'Block Utilization',
			value: data.transactionMetrics.blockUtilizationRate,
			icon: 'coins_up',
			formatter: 'percentage'
		}
	]
})

const formatValue = (value, formatter, suffix = '') => {
	let formatted = value

	switch (formatter) {
		case 'comma':
			formatted = comma(value)
			break
		case 'decimal':
			formatted = comma(value, ",", 1)
			break
		case 'percentage':
			formatted = `${comma(value, ",", 1)}%`
			break
		default:
			formatted = abbreviate(value)
	}

	return suffix ? `${formatted} ${suffix}` : formatted
}

onMounted(() => {
	// Non-blocking initial fetch, similar to other widgets
	nextTick(() => {
		loadInitialValidatorAnalytics()
	})
})
</script>

<template>
	<Flex direction="column" gap="20" wide :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="bar-chart" size="16" color="secondary" />
				<Text size="16" weight="600" color="primary">Transaction Analytics</Text>
			</Flex>

			<Flex align="center" gap="4">
				<Button
					v-for="window in timeWindows"
					:key="window.value"
					@click="handleTimeWindowChange(window.value)"
					:type="timeWindow === window.value ? 'primary' : 'secondary'"
					:loading="isUpdating"
					:disabled="isUpdating"
					size="mini"
				>
					{{ window.label }}
				</Button>
			</Flex>
		</Flex>

		<!-- Loading State -->
		<ValidatorTransactionAnalyticsSkeleton v-if="isLoading && !validatorAnalytics" />

		<!-- Error State -->
		<Flex v-else-if="error && !validatorAnalytics" direction="column" gap="20" align="center" :class="$style.error">
			<Text size="13" weight="600" color="red">{{ error }}</Text>
			<Button @click="updateValidatorAnalytics" type="secondary" size="mini">
				<Icon name="refresh" size="12" />
				Retry
			</Button>
		</Flex>

		<!-- Analytics Content -->
		<template v-else-if="validatorAnalytics">
			<!-- Metrics Overview -->
			<Flex direction="column" gap="16" :class="{ [$style.updating]: isUpdating }">
				<Text size="14" weight="600" color="primary">Performance Metrics</Text>
				
				<Flex gap="16" :class="$style.metrics_grid">
					<Flex
						v-for="metric in metrics"
						:key="metric.name"
						direction="column"
						justify="between"
						:class="$style.metric_card"
					>
						<Flex align="center" gap="8">
							<Icon 
								:name="metric.icon" 
								size="14" 
								color="secondary" 
							/>
							<Text size="12" weight="600" color="tertiary">
								{{ metric.title }}
							</Text>
						</Flex>

						<Text size="16" weight="600" color="primary">
							{{ formatValue(metric.value, metric.formatter, metric.suffix) }}
						</Text>
					</Flex>
				</Flex>
			</Flex>
			<!-- Transaction Trends Chart -->
			<Flex v-if="validatorTrends" direction="column" gap="16" :class="{ [$style.updating]: isUpdating }">
				<Text size="14" weight="600" color="primary">Transaction Processing Trends</Text>
				<TransactionTrendsChart 
					:data="validatorTrends" 
					:timeWindow="timeWindow"
				/>
			</Flex>
		</template>
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	padding: 20px;
	box-shadow: inset 0 0 0 1px var(--op-3);
}

.header {
	margin-bottom: 8px;
}

.error {
	padding: 40px 20px;
	text-align: center;
	background: var(--op-3);
	border-radius: 8px;
}

.metrics_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 12px;
}

.metric_card {
	min-height: 70px;
	background: var(--op-3);
	border-radius: 8px;
	padding: 12px;
	transition: all 0.2s ease;
}

.metric_card:hover {
	background: var(--op-5);
}

.info_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	gap: 12px;
}

.info_card {
	background: var(--op-3);
	border-radius: 8px;
	padding: 12px;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}
	
	.metrics_grid {
		grid-template-columns: repeat(2, 1fr);
	}
	
	.info_grid {
		grid-template-columns: repeat(2, 1fr);
	}
	
	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}
}

@media (max-width: 480px) {
	.metrics_grid,
	.info_grid {
		grid-template-columns: 1fr;
	}
}

.updating {
	opacity: 0.6;
	pointer-events: none;
	transition: opacity 0.3s ease;
}
</style> 