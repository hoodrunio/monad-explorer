<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** Services */
import { convertFromWei } from "@/services/utils/amounts"

const props = defineProps({
	selectedPeriod: Object,
	gasHistory: {
		type: Array,
		default: () => []
	},
	isLoading: {
		type: Boolean,
		default: false
	}
})

const days = [1, 2, 3, 4, 5, 6, 7]
const seriesData = ref([])
const minValue = ref(0)
const maxValue = ref(0)

const calculateOpacity = (val) => {
	if (!val || maxValue.value === minValue.value) return 0.2
	const normalizedValue = (val - minValue.value) / (maxValue.value - minValue.value)
	const opacity = 0.2 + normalizedValue * 0.8
	return opacity
}

const processGasData = () => {
	if (!props.gasHistory || props.gasHistory.length === 0) {
		seriesData.value = []
		return
	}

	// Process daily gas data for the last 7 days
	// Note: New API returns market data, not gas-specific history
	// averageGasPrice will be "0" for all entries until dedicated gas history endpoint is available
	const processedData = props.gasHistory
		.slice(0, 7)
		.map(item => ({
			date: DateTime.fromISO(item.date),
			value: item.averageGasPrice && item.averageGasPrice !== "0"
				? convertFromWei(item.averageGasPrice, 9)
				: 0,
			transactionCount: item.transactionCount || 0
		}))
	seriesData.value = processedData
	
	const validValues = processedData.filter(d => d.value > 0).map(d => d.value)
	if (validValues.length > 0) {
		minValue.value = Math.min(...validValues)
		maxValue.value = Math.max(...validValues)
	} else {
		minValue.value = 0
		maxValue.value = 1
	}
}

watch(
	() => [props.gasHistory, props.isLoading],
	() => {
		if (!props.isLoading) {
			processGasData()
		}
	},
	{ immediate: true, deep: true }
)

const getDayData = (dayOffset) => {
	const targetDate = DateTime.now().minus({ days: dayOffset - 1 }).toFormat('yyyy-MM-dd')
	return seriesData.value.find(item => item.date.toFormat('yyyy-MM-dd') === targetDate) || {
		date: DateTime.fromISO(targetDate),
		value: 0,
		transactionCount: 0
	}
}
</script>

<template>
	<div :class="$style.wrapper">
		<Flex v-if="isLoading" align="center" justify="center" :class="$style.loading">
			<Text size="13" weight="600" color="secondary">Loading gas price heatmap...</Text>
		</Flex>

		<Flex v-else-if="!gasHistory.length || !seriesData.length || maxValue === 0" align="center" justify="center" :class="$style.no_data">
			<Flex direction="column" align="center" gap="8">
				<Icon name="chart" size="24" color="tertiary" />
				<Text size="13" weight="600" color="tertiary">Gas price heatmap not available</Text>
				<Text size="11" weight="500" color="support">Historical gas data endpoint is not yet available in the new API</Text>
			</Flex>
		</Flex>
		
		<div v-else :class="$style.heatmap">
			<div :class="$style.header">
				<Text size="12" weight="600" color="tertiary">Last 7 Days - Daily Gas Prices</Text>
			</div>
			
			<div :class="$style.grid">
				<div 
					v-for="dayIdx in days" 
					:key="dayIdx"
					:class="$style.day_column"
				>
					<div :class="$style.day_header">
						<Text size="11" weight="600" color="tertiary">
							{{
								DateTime.now()
									.minus({ days: dayIdx - 1 })
									.toFormat("MMM d")
							}}
						</Text>
					</div>
					
					<div 
						:class="[$style.day_cell, !getDayData(dayIdx).value && $style.not_available]"
						:style="{ opacity: calculateOpacity(getDayData(dayIdx).value) }"
					>
						<Tooltip side="top" :disabled="!getDayData(dayIdx).value">
							<div :class="$style.inner" />

							<template #content>
								<Flex direction="column" gap="8">
									<Flex align="center" gap="12" justify="between" wide>
										<Text color="secondary">Date</Text>
										<Text color="primary">
											{{ getDayData(dayIdx).date.toFormat("LLL d, yyyy") }}
										</Text>
									</Flex>
									<Flex align="center" gap="12" justify="between" wide>
										<Text color="secondary">Avg Gas Price</Text>
										<Text color="primary">{{ getDayData(dayIdx).value.toFixed(4) }} gwei</Text>
									</Flex>
									<Flex align="center" gap="12" justify="between" wide>
										<Text color="secondary">Transactions</Text>
										<Text color="primary">{{ getDayData(dayIdx).transactionCount.toLocaleString() }}</Text>
									</Flex>
								</Flex>
							</template>
						</Tooltip>
					</div>
				</div>
			</div>
			
			<div :class="$style.legend">
				<Flex align="center" gap="8">
					<Text size="11" weight="600" color="tertiary">Less</Text>
					<div :class="$style.legend_gradient" />
					<Text size="11" weight="600" color="tertiary">More</Text>
				</Flex>
			</div>
		</div>
	</div>
</template>

<style module>
.wrapper {
	height: 180px;
	overflow: auto;
}

.loading,
.no_data {
	height: 100%;
}

.heatmap {
	display: flex;
	flex-direction: column;
	gap: 12px;
	height: 100%;
}

.header {
	text-align: center;
}

.grid {
	display: flex;
	justify-content: center;
	gap: 4px;
	flex: 1;
}

.day_column {
	display: flex;
	flex-direction: column;
	gap: 4px;
	align-items: center;
}

.day_header {
	height: 20px;
	display: flex;
	align-items: center;
}

.day_cell {
	background: var(--brand);
	border: 1px solid var(--card-background);
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.day_cell.not_available {
	opacity: 0.1 !important;
	background: var(--op-5);
}

.day_cell:hover {
	outline: 2px solid var(--txt-secondary);
	transform: scale(1.05);
}

.inner {
	width: 60px;
	height: 80px;
}

.legend {
	display: flex;
	justify-content: center;
	margin-top: auto;
}

.legend_gradient {
	width: 60px;
	height: 8px;
	border-radius: 4px;
	background: linear-gradient(to right, rgba(10, 219, 111, 0.2), rgba(10, 219, 111, 1));
}

@media (max-width: 768px) {
	.inner {
		width: 40px;
		height: 60px;
	}
	
	.day_header {
		height: 16px;
	}
}
</style>
