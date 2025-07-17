<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"
import Tooltip from "@/components/ui/Tooltip.vue"

/** API */
import { 
	fetchNetworkTransactionSummaryClient,
	fetchNetworkTransactionTrendsClient,
	fetchTransactionAnalyticsRankingsClient
} from "@/services/api/transaction-analytics"

/** Services */
import { abbreviate, comma, formatBytes } from "@/services/utils"

/** Components */
import TransactionAnalyticsOverview from "./TransactionAnalyticsOverview.vue"
import TransactionTrendsChart from "./TransactionTrendsChart.vue"
import ValidatorRankingsTable from "./ValidatorRankingsTable.vue"
import { TransactionAnalyticsOverviewSkeleton, TransactionTrendsChartSkeleton, ValidatorRankingsTableSkeleton } from "./skeletons"

const isLoading = ref(true)
const error = ref(null)

const networkSummary = ref(null)
const networkTrends = ref(null)
const topValidators = ref(null)

const timeWindow = ref('24h')
const timeWindows = ref([
	{ value: '1h', label: '1 Hour' },
	{ value: '24h', label: '24 Hours' },
	{ value: '7d', label: '7 Days' },
	{ value: '30d', label: '30 Days' },
])

// Load initial data using client-side functions only
const loadInitialData = async () => {
	try {
		isLoading.value = true
		error.value = null

		// Determine granularity based on time window
		const granularity = (timeWindow.value === '7d' || timeWindow.value === '30d') ? 'day' : 'hour'

		const [summaryResult, trendsResult, rankingsResult] = await Promise.all([
			fetchNetworkTransactionSummaryClient({ timeWindow: timeWindow.value }),
			fetchNetworkTransactionTrendsClient({ timeWindow: timeWindow.value, granularity }),
			fetchTransactionAnalyticsRankingsClient({ limit: 10, timeWindow: timeWindow.value })
		])

		networkSummary.value = summaryResult?.data
		networkTrends.value = trendsResult?.data
		topValidators.value = rankingsResult?.data?.rankings || rankingsResult?.data

	} catch (err) {
		error.value = 'Failed to load transaction analytics data'
		console.error('Transaction analytics error:', err)
	} finally {
		isLoading.value = false
	}
}

// Update data using client-side functions
const updateDashboardData = async () => {
	try {
		const currentWindow = timeWindow.value
		isLoading.value = true
		error.value = null

		await nextTick()

		// Determine granularity based on time window
		const granularity = (currentWindow === '7d' || currentWindow === '30d') ? 'day' : 'hour'

		const [summaryResult, trendsResult, rankingsResult] = await Promise.all([
			fetchNetworkTransactionSummaryClient({ timeWindow: currentWindow }),
			fetchNetworkTransactionTrendsClient({ timeWindow: currentWindow, granularity }),
			fetchTransactionAnalyticsRankingsClient({ limit: 10, timeWindow: currentWindow })
		])

		if (currentWindow === timeWindow.value) {
			networkSummary.value = summaryResult?.data
			networkTrends.value = trendsResult?.data
			topValidators.value = rankingsResult?.data?.rankings || rankingsResult?.data
		}

	} catch (err) {
		if (err.name !== 'AbortError') {
			error.value = 'Failed to load transaction analytics data'
			console.error('Transaction analytics error:', err)
		}
	} finally {
		isLoading.value = false
	}
}

const handleTimeWindowChange = async (newWindow) => {
	if (newWindow === timeWindow.value) return
	
	timeWindow.value = newWindow
	await nextTick()
	await updateDashboardData()
}

onMounted(() => {
	// Non-blocking initial fetch, similar to other widgets
	nextTick(() => {
		loadInitialData()
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

			<Flex align="center" gap="12">
				<Text size="12" color="tertiary">Time Window:</Text>
				<Flex align="center" gap="4">
					<Button
						v-for="window in timeWindows"
						:key="window.value"
						@click="handleTimeWindowChange(window.value)"
						:type="timeWindow === window.value ? 'primary' : 'secondary'"
						size="mini"
					>
						{{ window.label }}
					</Button>
				</Flex>
			</Flex>
		</Flex>

		<!-- Loading State -->
		<template v-if="isLoading">
			<!-- Network Overview Skeleton -->
			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Network Transaction Overview</Text>
				<TransactionAnalyticsOverviewSkeleton />
			</Flex>

			<!-- Transaction Trends Chart Skeleton -->
			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Transaction Processing Trends</Text>
				<TransactionTrendsChartSkeleton />
			</Flex>

			<!-- Top Performing Validators Skeleton -->
			<Flex direction="column" gap="16">
				<Flex align="center" justify="between">
					<Text size="14" weight="600" color="primary">Top Performing Validators</Text>
					<Button link="/validators?sort=transaction_performance" type="secondary" size="mini">
						<Icon name="validator" size="12" color="secondary" />
						View All Rankings
					</Button>
				</Flex>
				
				<ValidatorRankingsTableSkeleton :rowCount="5" />
			</Flex>
		</template>

		<!-- Error State -->
		<Flex v-else-if="error" direction="column" gap="20" align="center" :class="$style.error">
			<Text size="13" weight="600" color="red">{{ error }}</Text>
			<Button @click="updateDashboardData" type="secondary" size="mini">
				<Icon name="refresh" size="12" />
				Retry
			</Button>
		</Flex>

		<!-- Dashboard Content -->
		<template v-else-if="!isLoading && !error">
			<!-- Network Overview -->
			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Network Transaction Overview</Text>
				<TransactionAnalyticsOverview 
					v-if="networkSummary"
					:data="networkSummary" 
					:timeWindow="timeWindow"
				/>
			</Flex>

			<!-- Transaction Trends Chart -->
			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Transaction Processing Trends</Text>
				<TransactionTrendsChart 
					v-if="networkTrends"
					:data="networkTrends" 
					:timeWindow="timeWindow"
				/>
			</Flex>

			<!-- Top Performing Validators -->
			<Flex direction="column" gap="16">
				<Flex align="center" justify="between">
					<Text size="14" weight="600" color="primary">Top Performing Validators</Text>
					<Button link="/validators?sort=transaction_performance" type="secondary" size="mini">
						<Icon name="validator" size="12" color="secondary" />
						View All Rankings
					</Button>
				</Flex>
				
				<ValidatorRankingsTable 
					v-if="topValidators"
					:data="topValidators" 
					:showPagination="false"
					:compact="true"
				/>
			</Flex>
		</template>
	</Flex>
</template>

<style module>
.wrapper {
	max-width: calc(var(--base-width) + 48px);
}

.header {
	margin-bottom: 8px;
}

.error {
	padding: 40px 20px;
	text-align: center;
}

@media (max-width: 900px) {
	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}
}
</style> 