<script setup>
/** Vendor */
import * as d3 from "d3"
import { DateTime } from "luxon"

/** UI */
import Button from "@/components/ui/Button.vue"

/** API */
import { 
	fetchCurrentTpsClient,
	fetchTpsTimeSeriesClient 
} from "@/services/api/transaction-analytics"

/** Services */
import { abbreviate, comma } from "@/services/utils"

const isLoading = ref(true)
const currentTpsData = ref(null)
const tpsTimeSeriesData = ref(null)

const currentSampleWindow = ref('5m')
const sampleWindows = ref([
	{ value: '1m', label: '1m' },
	{ value: '5m', label: '5m' },
	{ value: '15m', label: '15m' },
	{ value: '30m', label: '30m' },
])

const timeWindow = ref('24h')
const timeWindows = ref([
	{ value: '24h', label: '24h' },
	{ value: '7d', label: '7d' },
	{ value: '30d', label: '30d' },
])

const chartContainer = ref(null)

// Load initial data
const loadInitialData = async () => {
	try {
		isLoading.value = true

		// Determine granularity based on time window
		const granularity = (timeWindow.value === '7d' || timeWindow.value === '30d') ? 'day' : 'hour'

		const [currentResult, timeSeriesResult] = await Promise.all([
			fetchCurrentTpsClient({ sampleWindow: currentSampleWindow.value }),
			fetchTpsTimeSeriesClient({ timeWindow: timeWindow.value, granularity })
		])

		currentTpsData.value = currentResult?.data
		tpsTimeSeriesData.value = timeSeriesResult?.data

	} catch (err) {
		console.error('TPS data error:', err)
	} finally {
		isLoading.value = false
	}
}

// Update current TPS data
const updateCurrentTps = async () => {
	try {
		const result = await fetchCurrentTpsClient({ sampleWindow: currentSampleWindow.value })
		currentTpsData.value = result?.data
	} catch (err) {
		console.error('Current TPS update error:', err)
	}
}

// Update time series data
const updateTimeSeries = async () => {
	try {
		// Determine granularity based on time window
		const granularity = (timeWindow.value === '7d' || timeWindow.value === '30d') ? 'day' : 'hour'
		
		const result = await fetchTpsTimeSeriesClient({ timeWindow: timeWindow.value, granularity })
		tpsTimeSeriesData.value = result?.data
	} catch (err) {
		console.error('Time series update error:', err)
	}
}

const handleSampleWindowChange = async (newWindow) => {
	if (newWindow === currentSampleWindow.value) return
	currentSampleWindow.value = newWindow
	await updateCurrentTps()
}

const handleTimeWindowChange = async (newWindow) => {
	if (newWindow === timeWindow.value) return
	timeWindow.value = newWindow
	await updateTimeSeries()
}

const chartData = computed(() => {
	if (!tpsTimeSeriesData.value?.timeSeries) return []
	
	const granularity = (timeWindow.value === '7d' || timeWindow.value === '30d') ? 'day' : 'hour'
	
	return tpsTimeSeriesData.value.timeSeries.map(item => {
		const dateTime = DateTime.fromSQL(item.timestamp)
		
		return {
			...item,
			timestamp: dateTime.toJSDate(),
			formattedTime: dateTime.isValid ? 
				dateTime.toFormat(granularity === 'hour' ? 'MMM dd HH:mm' : 'MMM dd') : 
				'Invalid Date'
		}
	})
})

const buildChart = () => {
	if (!chartContainer.value || !chartData.value.length) return

	// Clear previous chart
	d3.select(chartContainer.value).selectAll("*").remove()

	const margin = { top: 20, right: 30, bottom: 40, left: 50 }
	const width = chartContainer.value.offsetWidth - margin.left - margin.right
	const height = 200 - margin.top - margin.bottom

	const svg = d3.select(chartContainer.value)
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)

	const g = svg.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`)

	// Scales
	const xScale = d3.scaleTime()
		.domain(d3.extent(chartData.value, d => d.timestamp))
		.range([0, width])

	const yScale = d3.scaleLinear()
		.domain([0, d3.max(chartData.value, d => d.tps)])
		.nice()
		.range([height, 0])

	// Line generator
	const line = d3.line()
		.x(d => xScale(d.timestamp))
		.y(d => yScale(d.tps))
		.curve(d3.curveMonotoneX)

	// Add line
	g.append("path")
		.datum(chartData.value)
		.attr("fill", "none")
		.attr("stroke", "var(--green)")
		.attr("stroke-width", 2)
		.attr("d", line)

	// Add area under line
	const area = d3.area()
		.x(d => xScale(d.timestamp))
		.y0(height)
		.y1(d => yScale(d.tps))
		.curve(d3.curveMonotoneX)

	g.append("path")
		.datum(chartData.value)
		.attr("fill", "var(--green)")
		.attr("fill-opacity", 0.1)
		.attr("d", area)

	// Add axes
	const granularity = (timeWindow.value === '7d' || timeWindow.value === '30d') ? 'day' : 'hour'
	const xAxis = d3.axisBottom(xScale)
		.tickFormat(d3.timeFormat(granularity === 'hour' ? '%H:%M' : '%m/%d'))
		.ticks(5)

	const yAxis = d3.axisLeft(yScale)
		.tickFormat(d => abbreviate(d))
		.ticks(4)

	g.append("g")
		.attr("transform", `translate(0,${height})`)
		.call(xAxis)
		.selectAll("text")
		.style("fill", "var(--txt-tertiary)")
		.style("font-size", "10px")

	g.append("g")
		.call(yAxis)
		.selectAll("text")
		.style("fill", "var(--txt-tertiary)")
		.style("font-size", "10px")

	// Create tooltip
	const tooltip = d3.select(chartContainer.value)
		.append("div")
		.attr("class", "chart-tooltip")
		.style("opacity", 0)
		.style("position", "absolute")
		.style("background", "var(--card-background)")
		.style("border", "1px solid var(--op-5)")
		.style("border-radius", "6px")
		.style("padding", "8px 12px")
		.style("font-size", "12px")
		.style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.15)")
		.style("pointer-events", "none")
		.style("z-index", "1000")

	// Create focus circle (invisible by default)
	const focus = g.append("g")
		.style("opacity", 0)

	focus.append("circle")
		.attr("r", 4)
		.attr("fill", "var(--green)")
		.attr("stroke", "white")
		.attr("stroke-width", 2)

	// Create vertical line
	focus.append("line")
		.attr("class", "focus-line")
		.attr("stroke", "var(--op-10)")
		.attr("stroke-width", 1)
		.attr("stroke-dasharray", "3,3")

	// Bisector for finding closest data point
	const bisect = d3.bisector(d => d.timestamp).left

	// Add invisible overlay for mouse interaction
	g.append("rect")
		.attr("width", width)
		.attr("height", height)
		.attr("fill", "none")
		.attr("pointer-events", "all")
		.on("mouseover", () => {
			focus.style("opacity", 1)
			tooltip.style("opacity", 1)
		})
		.on("mouseout", () => {
			focus.style("opacity", 0)
			tooltip.style("opacity", 0)
		})
		.on("mousemove", (event) => {
			const [mouseX] = d3.pointer(event)
			const x0 = xScale.invert(mouseX)
			const i = bisect(chartData.value, x0, 1)
			const d0 = chartData.value[i - 1]
			const d1 = chartData.value[i]
			
			if (!d0 && !d1) return
			
			const d = d1 && d0 ? (x0 - d0.timestamp > d1.timestamp - x0 ? d1 : d0) : (d0 || d1)
			
			const x = xScale(d.timestamp)
			const y = yScale(d.tps)
			
			// Update focus circle position
			focus.select("circle")
				.attr("cx", x)
				.attr("cy", y)
			
			// Update focus line
			focus.select(".focus-line")
				.attr("x1", x)
				.attr("x2", x)
				.attr("y1", 0)
				.attr("y2", height)
			
			// Update tooltip
			const tooltipX = mouseX + margin.left + 10
			const tooltipY = y + margin.top - 10
			
			tooltip
				.style("left", tooltipX + "px")
				.style("top", tooltipY + "px")
				.html(`
					<div style="font-weight: 600; color: var(--green); margin-bottom: 4px;">
						${comma(d.tps, ",", 2)} TPS
					</div>
					<div style="color: var(--txt-tertiary); font-size: 11px;">
						${d.formattedTime}
					</div>
				`)
		})
}

const debouncedRedraw = () => {
	setTimeout(() => {
		buildChart()
	}, 100)
}

let refreshInterval = null

onMounted(() => {
	// Non-blocking initial fetch, similar to other widgets
	nextTick(() => {
		loadInitialData()
	})
	
	window.addEventListener("resize", debouncedRedraw)
	
	// Auto-refresh current TPS every 30 seconds
	refreshInterval = setInterval(updateCurrentTps, 30000)
})

onBeforeUnmount(() => {
	window.removeEventListener("resize", debouncedRedraw)
	if (refreshInterval) {
		clearInterval(refreshInterval)
	}
})

watch(() => chartData.value, () => {
	buildChart()
}, { deep: true })
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between">
			<Flex align="center" gap="6">
				<Icon name="zap" size="16" color="green" />
				<Text size="14" weight="600" color="primary">Network TPS</Text>
			</Flex>
		</Flex>

		<!-- Content -->
		<Flex gap="20" :class="$style.content">
			<!-- Current TPS -->
			<Flex direction="column" gap="12" :class="$style.current_section">
				<Flex align="center" justify="between">
					<Text size="12" weight="600" color="tertiary">Real-time TPS</Text>
					<Flex align="center" gap="4">
						<Button
							v-for="window in sampleWindows"
							:key="window.value"
							@click="handleSampleWindowChange(window.value)"
							:type="currentSampleWindow === window.value ? 'primary' : 'secondary'"
							size="mini"
						>
							{{ window.label }}
						</Button>
					</Flex>
				</Flex>

				<template v-if="isLoading">
					<Skeleton w="80" h="32" />
				</template>
				<template v-else-if="currentTpsData">
					<Flex direction="column" gap="4">
						<Text size="24" weight="700" color="green">
							{{ comma(currentTpsData.currentTps, ",", 1) }}
						</Text>
						<Text size="11" color="tertiary">
							{{ comma(currentTpsData.totalTransactions) }} tx in {{ currentSampleWindow }}
						</Text>
					</Flex>
				</template>

				<!-- Additional metrics -->
				<template v-if="!isLoading && currentTpsData">
					<Flex direction="column" gap="8" :class="$style.metrics">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Avg Tx/Block</Text>
							<Text size="11" weight="600" color="secondary">
								{{ comma(currentTpsData.avgTransactionsPerBlock, ",", 1) }}
							</Text>
						</Flex>
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Active Validators</Text>
							<Text size="11" weight="600" color="secondary">
								{{ currentTpsData.activeValidators }}
							</Text>
						</Flex>
					</Flex>
				</template>
			</Flex>

			<!-- TPS Chart -->
			<Flex direction="column" gap="12" :class="$style.chart_section">
				<Flex align="center" justify="between">
					<Text size="12" weight="600" color="tertiary">TPS Trends</Text>
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

				<div ref="chartContainer" :class="$style.chart_container" />
				
				<!-- Summary metrics -->
				<template v-if="!isLoading && tpsTimeSeriesData?.summary">
					<Flex align="center" justify="between" :class="$style.summary">
						<Flex direction="column" align="center">
							<Text size="11" color="tertiary">Avg TPS</Text>
							<Text size="12" weight="600" color="secondary">
								{{ comma(tpsTimeSeriesData.summary.averageTps, ",", 1) }}
							</Text>
						</Flex>
						<Flex direction="column" align="center">
							<Text size="11" color="tertiary">Peak TPS</Text>
							<Text size="12" weight="600" color="green">
								{{ comma(tpsTimeSeriesData.summary.peakTps, ",", 1) }}
							</Text>
						</Flex>
						<Flex direction="column" align="center">
							<Text size="11" color="tertiary">Min TPS</Text>
							<Text size="12" weight="600" color="orange">
								{{ comma(tpsTimeSeriesData.summary.minTps, ",", 1) }}
							</Text>
						</Flex>
					</Flex>
				</template>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	padding: 16px;
	box-shadow: inset 0 0 0 1px var(--op-3);
	min-height: 280px;
}

.content {
	align-items: stretch;
}

.current_section {
	flex: 1;
	min-width: 200px;
	padding: 12px;
}

.chart_section {
	flex: 2;
	min-width: 300px;
}

.chart_container {
	width: 100%;
	height: 200px;
	position: relative;
}

.metrics {
	padding-top: 8px;
	border-top: 1px solid var(--op-5);
}

.summary {
	padding-top: 8px;
	border-top: 1px solid var(--op-3);
}

@media (max-width: 900px) {
	.content {
		flex-direction: column;
	}
	
	.current_section,
	.chart_section {
		min-width: auto;
	}
}
</style> 