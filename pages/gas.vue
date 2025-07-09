<script setup>
/** Vendor */
import { useDebounceFn } from "@vueuse/core"

/** Modules */
import GasPriceChart from "@/components/modules/gas/GasPriceChart.vue"
import GasPriceHeatmap from "@/components/modules/gas/GasPriceHeatmap.vue"
import GasEfficiencyChart from "@/components/modules/gas/GasEfficiencyChart.vue"
import GasFeeCalculator from "@/components/modules/gas/GasFeeCalculator.vue"

/** UI */
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import Button from "@/components/ui/Button.vue"

/** API */
import { fetchCurrentGasAnalytics, fetchGasHistoryAnalytics } from "@/services/api/analytics"

/** Services */
import { convertFromWei } from "@/services/utils/amounts"

const route = useRoute()

// Gas data state
const gasPrice = ref({
	fast: null,
	median: null,
	slow: null,
})

const gasHistory = ref([])
const isLoading = ref(true)

// Memoized gas history to prevent unnecessary child re-renders
const memoizedGasHistory = computed(() => {
	return gasHistory.value
})

// Fetch gas data with better error handling and optimization
const fetchGasData = async () => {
	try {
		console.log('⛽ Fetching gas data for gas page...')
		
		const [currentData, historyData] = await Promise.all([
			fetchCurrentGasAnalytics(),
			fetchGasHistoryAnalytics({ limit: 30 })
		])
		
		console.log('📊 Current gas data:', currentData)
		console.log('📊 Gas history data:', historyData)
		
		// Process current gas prices
		if (currentData?.success && currentData?.data?.recommendations) {
			const recommendations = currentData.data.recommendations
			const newGasPrice = {
				fast: convertFromWei(recommendations.fast, 9), // gwei
				median: convertFromWei(recommendations.standard, 9),
				slow: convertFromWei(recommendations.slow, 9),
			}
			
			// Only update if values actually changed to prevent unnecessary re-renders
			if (JSON.stringify(gasPrice.value) !== JSON.stringify(newGasPrice)) {
				gasPrice.value = newGasPrice
			}
		} else {
			// Fallback data
			const fallbackPrice = {
				fast: 51.0,
				median: 51.0,
				slow: 51.0,
			}
			
			if (JSON.stringify(gasPrice.value) !== JSON.stringify(fallbackPrice)) {
				gasPrice.value = fallbackPrice
			}
		}
		
		// Process gas history
		if (historyData?.success && historyData?.data?.data) {
			// Only update if data actually changed
			const newHistoryData = historyData.data.data
			if (JSON.stringify(gasHistory.value) !== JSON.stringify(newHistoryData)) {
				gasHistory.value = newHistoryData
			}
		}
		
		console.log('💰 Processed gas prices:', gasPrice.value)
		console.log('📈 Processed gas history:', gasHistory.value.length, 'entries')
		
	} catch (error) {
		console.error('❌ Error fetching gas data:', error)
		// Fallback data
		const fallbackPrice = {
			fast: 51.0,
			median: 51.0,
			slow: 51.0,
		}
		
		if (JSON.stringify(gasPrice.value) !== JSON.stringify(fallbackPrice)) {
			gasPrice.value = fallbackPrice
		}
	} finally {
		isLoading.value = false
	}
}

// Debounced fetch to prevent too frequent API calls
const debouncedFetchGasData = useDebounceFn(fetchGasData, 1000)

let fetchInterval = null

onMounted(() => {
	fetchGasData()
	
	// Use interval with cleanup and error handling
	fetchInterval = setInterval(() => {
		debouncedFetchGasData()
	}, 30000)
})

onBeforeUnmount(() => {
	if (fetchInterval) {
		clearInterval(fetchInterval)
		fetchInterval = null
	}
})

const visualizations = ref([
	{
		title: "Heatmap",
		value: "heatmap",
	},
	{
		title: "Line Chart",
		value: "line",
	},
])
const selectedVisualization = ref(visualizations.value[0].value)

const selectedPeriodIdx = ref(0)
const periods = ref([
	{
		title: "24 hours",
		value: 24,
		timeframe: "hour",
	},
	{
		title: "31 days",
		value: 30,
		timeframe: "day",
	},
])
const selectedPeriod = computed(() => periods.value[selectedPeriodIdx.value])

useHead({
	title: `Monad Gas Tracker`,
	link: [
		{
			rel: "canonical",
			href: "https://monad.hoodscan.io/gas",
		},
	],
})
</script>

<template>
	<Flex direction="column" wide :class="$style.wrapper">
		<Breadcrumbs
			:items="[
				{ link: '/', name: 'Explore' },
				{ link: '/gas', name: `Gas Tracker` },
			]"
			:class="$style.breadcrumbs"
		/>

		<Flex wide direction="column" gap="4">
			<Flex justify="between" :class="$style.header">
				<Flex align="center" gap="8">
					<Icon name="gas" size="16" color="secondary" />
					<Text size="13" weight="600" color="primary">Gas Tracker</Text>
					
					<Flex v-if="!isLoading" align="center" gap="12" :class="$style.gas_prices">
						<Flex align="center" gap="4">
							<Icon name="gas_fast" size="12" color="green" />
							<Text size="11" weight="600" color="green">{{ gasPrice.fast?.toFixed(2) || '—' }} gwei</Text>
						</Flex>
						<Flex align="center" gap="4">
							<Icon name="gas_median" size="12" color="yellow" />
							<Text size="11" weight="600" color="yellow">{{ gasPrice.median?.toFixed(2) || '—' }} gwei</Text>
						</Flex>
						<Flex align="center" gap="4">
							<Icon name="gas_slow" size="12" color="secondary" />
							<Text size="11" weight="600" color="secondary">{{ gasPrice.slow?.toFixed(2) || '—' }} gwei</Text>
						</Flex>
					</Flex>
				</Flex>
			</Flex>

			<Flex gap="4" :class="$style.content">
				<Flex direction="column" justify="between" gap="20" :class="$style.left">
					<GasFeeCalculator :gasPrice="gasPrice" :isLoading="isLoading" />

					<Flex direction="column" gap="8" :class="$style.bottom">
						<Text size="12" weight="600" color="tertiary" height="140">
							Gas prices are calculated based on recent transaction fees and network conditions. 
							<Text color="secondary">Fast</Text>, <Text color="secondary">Standard</Text>, and <Text color="secondary">Slow</Text> 
							represent recommended prices for different transaction speeds.
						</Text>
					</Flex>
				</Flex>

				<Flex direction="column" gap="4" :class="$style.charts">
					<Flex direction="column" gap="16" :class="$style.card">
						<Flex align="start" justify="between">
							<Flex align="center" gap="6">
								<Icon name="chart" size="13" color="primary" />
								<Text size="13" weight="600" color="primary">Gas Price History</Text>
							</Flex>

							<Flex align="center" gap="8">
								<Dropdown>
									<Button size="mini" type="secondary">
										<Icon name="chart" size="12" color="primary" />
										<Text color="primary" style="text-transform: capitalize">{{ selectedVisualization }}</Text>
										<Icon name="chevron" size="12" color="secondary" />
									</Button>

									<template #popup>
										<DropdownItem
											v-for="visualization in visualizations"
											@click="selectedVisualization = visualization.value"
										>
											<Flex align="center" gap="8">
												<Icon
													:name="visualization.value === selectedVisualization ? 'check' : ''"
													size="12"
													color="secondary"
												/>
												{{ visualization.title }}
											</Flex>
										</DropdownItem>
									</template>
								</Dropdown>

								<Dropdown :disabled="selectedVisualization === 'heatmap'">
									<Button size="mini" type="secondary" :disabled="selectedVisualization === 'heatmap'">
										{{ selectedPeriod.title }}
										<Icon name="chevron" size="12" color="secondary" />
									</Button>

									<template #popup>
										<DropdownItem v-for="(period, idx) in periods" @click="selectedPeriodIdx = idx">
											<Flex align="center" gap="8">
												<Icon :name="idx === selectedPeriodIdx ? 'check' : ''" size="12" color="secondary" />
												{{ period.title }}
											</Flex>
										</DropdownItem>
									</template>
								</Dropdown>
							</Flex>
						</Flex>

						<GasPriceChart 
							v-if="selectedVisualization === 'line'" 
							:selectedPeriod="selectedPeriod" 
							:gasHistory="memoizedGasHistory"
							:isLoading="isLoading"
						/>
						<GasPriceHeatmap 
							v-else-if="selectedVisualization === 'heatmap'" 
							:selectedPeriod="periods[0]" 
							:gasHistory="memoizedGasHistory"
							:isLoading="isLoading"
						/>
					</Flex>

					<div :class="$style.card">
						<GasEfficiencyChart :gasHistory="memoizedGasHistory" :isLoading="isLoading" />
					</div>
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
	height: 40px;

	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);

	padding: 0 12px;
}

.gas_prices {
	padding: 4px 8px;
	background: var(--op-5);
	border-radius: 6px;
}

.content {
	display: grid;
	grid-template-columns: 384px 1fr;
}

.left {
	min-width: 384px;
	max-width: 384px;

	border-radius: 4px 4px 4px 8px;
	background: var(--card-background);

	padding: 16px;
}

.charts {
	width: 100%;
	min-width: 0;
}

.card {
	border-radius: 4px 4px 8px 4px;
	background: var(--card-background);

	padding: 16px;
}

.bottom {
	opacity: 0.6;

	padding-top: 12px;
}

@media (max-width: 800px) {
	.content {
		grid-template-columns: 1fr;
	}

	.left {
		min-width: initial;
		max-width: initial;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 32px 12px;
	}
}</style>