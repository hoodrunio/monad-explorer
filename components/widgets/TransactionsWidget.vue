<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** Services */
import { comma, abbreviate } from "@/services/utils"

/** API */
import { fetchTransactionAnalytics } from "@/services/api/analytics"

const transactionData = ref([])
const isLoading = ref(true)
const period = ref('daily') // 'daily' or 'weekly'

const max = ref(0)
const min = ref(0)
const roundedMax = ref(0)

const togglePeriod = () => {
	period.value = period.value === 'daily' ? 'weekly' : 'daily'
	fetchTransactionData()
}

const fetchTransactionData = async () => {
	try {
		isLoading.value = true
		
		const limit = period.value === 'daily' ? 7 : 12 // 7 days or 12 weeks
		const data = await fetchTransactionAnalytics({ period: period.value, limit })
		
		if (data?.success && data?.data?.data) {
			// Get data in natural order (newest to oldest, left to right)
			transactionData.value = data.data.data.slice(0, limit)
			
			// Calculate min, max for chart scaling
			const values = transactionData.value.map(item => item.transactionCount)
			max.value = Math.max(...values)
			min.value = Math.min(...values)
			roundedMax.value = Math.ceil(max.value / 5) * 5
		}
	} catch (error) {
	} finally {
		isLoading.value = false
	}
}

let transactionInterval = null

onMounted(() => {
	// Non-blocking initial fetch
	nextTick(() => {
		fetchTransactionData()
	})
	
	// Refresh data every 5 minutes
	transactionInterval = setInterval(fetchTransactionData, 300000)
})

onUnmounted(() => {
	if (transactionInterval) {
		clearInterval(transactionInterval)
		transactionInterval = null
	}
})

const txCounter = computed(() => {
	return transactionData.value.reduce((a, b) => (a += parseInt(b.transactionCount)), 0)
})

const getPercentageRatio = (value) => {
	if (!value || roundedMax.value === 0) return 0
	const ratio = (parseInt(value) * 100) / roundedMax.value
	// Ensure minimum 2% height for visibility
	return Math.max(ratio, 2)
}

const formatDate = (item) => {
	if (period.value === 'weekly') {
		// For weekly data, show shorter format
		if (item.weekStart) {
			return DateTime.fromISO(item.weekStart).toFormat('M/d')
		}
		return DateTime.fromISO(item.week?.split(' ')[0] || item.date).toFormat('M/d')
	} else {
		// For daily data
		return DateTime.fromISO(item.date).toFormat('MM/dd')
	}
}

const getDateLabel = (item) => {
	if (period.value === 'weekly') {
		// For weekly data
		if (item.week) return item.week
		if (item.weekStart && item.weekEnd) {
			return `${DateTime.fromISO(item.weekStart).toFormat('MMM dd')} - ${DateTime.fromISO(item.weekEnd).toFormat('MMM dd')}`
		}
		return DateTime.fromISO(item.weekStart || item.date).toFormat('MMM dd')
	} else {
		// For daily data
		const date = DateTime.fromISO(item.date)
		const today = DateTime.now()
		const yesterday = today.minus({ days: 1 })
		
		if (date.hasSame(today, 'day')) return 'Today'
		if (date.hasSame(yesterday, 'day')) return 'Yesterday'
		return date.toFormat('MMM dd')
	}
}

const isCurrentPeriod = (item) => {
	if (period.value === 'weekly') {
		// Check if this week contains today
		if (item.weekStart && item.weekEnd) {
			const start = DateTime.fromISO(item.weekStart)
			const end = DateTime.fromISO(item.weekEnd)
			const today = DateTime.now()
			return today >= start && today <= end
		}
		return false
	} else {
		// For daily data
		return DateTime.fromISO(item.date).hasSame(DateTime.now(), 'day')
	}
}

const periodLabel = computed(() => period.value === 'daily' ? '7d' : '12w')
const periodSuffix = computed(() => period.value === 'daily' ? 'TXs/7d' : 'TXs/12w')
</script>

<template>
	<Flex direction="column" gap="20" :class="$style.wrapper">
		<Flex justify="between">
			<Flex align="center" gap="6">
				<Icon name="tx" size="16" color="primary" />
				<Flex gap="4" align="end">
					<Skeleton v-if="isLoading" w="36" h="16" />

					<Tooltip v-else>
						<Flex gap="4" align="end">
							<Text size="16" weight="600" color="primary">{{ abbreviate(txCounter) }}</Text>

							<Text size="12" weight="700" color="tertiary">TXs</Text>
						</Flex>
						<template #content>
							<Flex gap="4" align="end">
								<Text size="14" weight="600" color="primary">{{ comma(txCounter) }}</Text>
								<Text size="11" weight="700" color="tertiary">{{ periodSuffix }}</Text>
							</Flex>
						</template>
					</Tooltip>
				</Flex>
			</Flex>

			<Flex align="center" gap="8">
				<!-- Period Toggle -->
				<Flex align="center" :class="$style.toggle">
					<button 
						@click="togglePeriod"
						:class="[$style.toggle_btn, period === 'daily' && $style.active]"
					>
						<Text size="11" weight="600" :color="period === 'daily' ? 'primary' : 'tertiary'">Daily</Text>
					</button>
					<button 
						@click="togglePeriod"
						:class="[$style.toggle_btn, period === 'weekly' && $style.active]"
					>
						<Text size="11" weight="600" :color="period === 'weekly' ? 'primary' : 'tertiary'">Weekly</Text>
					</button>
				</Flex>
				
				<Text size="12" weight="600" color="tertiary">{{ periodLabel }}</Text>
			</Flex>
		</Flex>

		<!-- Chart -->
		<Flex gap="16" :class="$style.chart">
			<Flex direction="column" justify="between" :class="$style.yAxis">
				<Skeleton v-if="isLoading" w="35" h="12" />
				<Text v-else-if="roundedMax" size="12" weight="600" color="tertiary">{{ abbreviate(roundedMax) }}</Text>

				<Skeleton v-if="isLoading" w="15" h="12" />
				<Text v-else-if="min >= 0" size="12" weight="600" color="tertiary">{{ comma(min) }}</Text>
			</Flex>

			<Flex v-if="isLoading" wide :class="$style.days">
				<Flex v-for="i in (period === 'daily' ? 7 : 12)" direction="column" gap="8" wide :class="[$style.day, period === 'weekly' && $style.day_weekly]">
					<Flex direction="column" justify="end" gap="6" :class="$style.dayColumn">
						<div :class="[$style.dot, period === 'weekly' && $style.dot_weekly]" />
					</Flex>
					<Skeleton :w="period === 'weekly' ? '15' : '20'" h="12" />
				</Flex>
			</Flex>

			<Flex v-else wide :class="$style.days">
				<Flex v-for="item in transactionData" direction="column" gap="8" wide :class="[$style.day, period === 'weekly' && $style.day_weekly]">
					<Tooltip>
						<Flex
							direction="column"
							justify="end"
							gap="6"
							:class="[$style.dayColumn, isCurrentPeriod(item) && $style.current]"
						>
							<div
								:style="{ flex: getPercentageRatio(item.transactionCount) / 100 }"
								:class="[$style.bar, getPercentageRatio(item.transactionCount) > 20 && $style.green, period === 'weekly' && $style.bar_weekly]"
							/>

							<div :class="[$style.dot, period === 'weekly' && $style.dot_weekly]" />
						</Flex>

						<template #content>
							<Flex direction="column" gap="4">
								<Flex justify="between" align="center" gap="8">
									<Text color="secondary">{{ period === 'weekly' ? 'Week' : 'Date' }}</Text>
									<Text color="primary">{{ getDateLabel(item) }}</Text>
								</Flex>

								<Flex justify="between" align="center" gap="8">
									<Text color="secondary">Txs</Text>
									<Text color="primary">{{ comma(item.transactionCount) }}</Text>
								</Flex>

								<Flex v-if="period === 'weekly' && item.daysIncluded" justify="between" align="center" gap="8">
									<Text color="secondary">Days</Text>
									<Text color="primary">{{ item.daysIncluded }}/7</Text>
								</Flex>

								<!-- blockCount not available in new API -->
								<Flex v-if="item.blockCount" justify="between" align="center" gap="8">
									<Text color="secondary">Blocks</Text>
									<Text color="primary">{{ comma(item.blockCount) }}</Text>
								</Flex>
							</Flex>
						</template>
					</Tooltip>

					<Text :size="period === 'weekly' ? '10' : '12'" weight="600" color="tertiary">
						{{ formatDate(item) }}
					</Text>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	height: 100%;
	min-height: 164px;

	background: var(--card-background);
	border-radius: 12px;
	overflow: hidden;

	padding: 16px;
}

.toggle {
	background: var(--op-5);
	border-radius: 6px;
	padding: 2px;
	display: flex;
}

.toggle_btn {
	padding: 4px 8px;
	border: none;
	background: transparent;
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.toggle_btn.active {
	background: var(--card-background);
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle_btn:hover {
	background: var(--op-8);
}

.toggle_btn.active:hover {
	background: var(--card-background);
}

.chart {
	flex: 1;
	min-height: 80px;
	height: 80px;
}

.yAxis {
	height: 80px;
	padding-bottom: 20px;
}

.days {
	border-left: 2px solid var(--op-5);
	border-right: 2px solid var(--op-5);
	height: 80px;
}

.day {
	border-right: 1px solid var(--op-5);
	padding: 0 8px;
	height: 100%;
}

.day_weekly {
	padding: 0 3px;
	border-right: 1px solid var(--op-3);
}

.day:last-child {
	border-right: none;
}

.dayColumn {
	height: 60px;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}

.dayColumn.current {
	.bar {
		background: var(--supply);
		animation: blink 1.5s ease infinite;
	}
}

@keyframes blink {
	0% {
		opacity: 0.4;
	}

	50% {
		opacity: 0.8;
	}

	100% {
		opacity: 0.4;
	}
}

.bar {
	width: 4px;
	min-height: 2px;
	border-radius: 50px;
	background: var(--txt-tertiary);
	transition: all 0.2s ease;
}

.bar_weekly {
	width: 2px;
	border-radius: 2px;
}

.bar.green {
	background: var(--brand);
}

.dot {
	min-width: 4px;
	min-height: 4px;
	border-radius: 50%;
	background: var(--op-5);
}

.dot_weekly {
	min-width: 2px;
	min-height: 2px;
}

@media (max-width: 1100px) {
	.bar {
		width: 8px;
	}

	.dot {
		min-width: 8px;
		min-height: 8px;
	}
}

@media (max-width: 540px) {
	.bar {
		width: 4px;
	}

	.dot {
		min-width: initial;
		min-height: initial;
	}
}
</style>
