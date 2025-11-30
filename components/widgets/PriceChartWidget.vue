<script setup>
/** Vendor */
import * as d3 from "d3"
import { DateTime } from "luxon"

/** UI */
import Button from "@/components/ui/Button.vue"

/** API */
import { fetchMarketStats, fetchIndexerStats } from "@/services/api/stats"

/** Services */
import { abbreviate } from "@/services/utils"

const isLoading = ref(true)
const marketData = ref(null)
const currentPrice = ref(0)
const priceChange = ref(0)
const marketCap = ref(0)
const coinImage = ref('https://coin-images.coingecko.com/coins/images/38927/small/monad.png')

const timeWindow = ref('30d')
const timeWindows = ref([
	{ value: '7d', label: '7D' },
	{ value: '14d', label: '14D' },
	{ value: '30d', label: '30D' },
])

const chartContainer = ref(null)

const loadMarketData = async () => {
	try {
		isLoading.value = true

		// Fetch both endpoints in parallel
		const [statsData, chartData] = await Promise.all([
			fetchIndexerStats(),
			fetchMarketStats()
		])

		// Use /stats endpoint for real-time price data
		if (statsData) {
			currentPrice.value = parseFloat(statsData.coin_price || 0)
			priceChange.value = parseFloat(statsData.coin_price_change_percentage || 0)
			marketCap.value = parseFloat(statsData.market_cap || 0)
			if (statsData.coin_image) {
				coinImage.value = statsData.coin_image
			}
		}

		// Use /stats/charts/market for chart data
		if (chartData?.chart_data?.length > 0) {
			marketData.value = chartData
		}
	} catch (error) {
		// Market data error
	} finally {
		isLoading.value = false
	}
}

const chartData = computed(() => {
	if (!marketData.value?.chart_data) return []

	let dataSlice = marketData.value.chart_data

	// Filter based on selected time window
	if (timeWindow.value === '7d') {
		dataSlice = dataSlice.slice(0, 7)
	} else if (timeWindow.value === '14d') {
		dataSlice = dataSlice.slice(0, 14)
	}

	// Reverse to have oldest first for chart
	return dataSlice.reverse().map(item => ({
		date: DateTime.fromISO(item.date).toJSDate(),
		price: parseFloat(item.closing_price),
		marketCap: parseFloat(item.market_cap),
		formattedDate: DateTime.fromISO(item.date).toFormat('MMM dd')
	}))
})

const buildChart = () => {
	if (!chartContainer.value || !chartData.value.length) return

	// Clear previous chart
	d3.select(chartContainer.value).selectAll("*").remove()

	const margin = { top: 5, right: 10, bottom: 20, left: 10 }
	const width = chartContainer.value.offsetWidth - margin.left - margin.right
	const height = 100 - margin.top - margin.bottom

	const svg = d3.select(chartContainer.value)
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)

	const g = svg.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`)

	// Scales
	const xScale = d3.scaleTime()
		.domain(d3.extent(chartData.value, d => d.date))
		.range([0, width])

	const yScale = d3.scaleLinear()
		.domain([
			d3.min(chartData.value, d => d.price) * 0.95,
			d3.max(chartData.value, d => d.price) * 1.05
		])
		.range([height, 0])

	// Gradient
	const gradient = svg.append("defs")
		.append("linearGradient")
		.attr("id", "priceGradient")
		.attr("x1", "0%")
		.attr("y1", "0%")
		.attr("x2", "0%")
		.attr("y2", "100%")

	gradient.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", priceChange.value >= 0 ? "var(--green)" : "var(--red)")
		.attr("stop-opacity", 0.3)

	gradient.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", priceChange.value >= 0 ? "var(--green)" : "var(--red)")
		.attr("stop-opacity", 0)

	// Area generator
	const area = d3.area()
		.x(d => xScale(d.date))
		.y0(height)
		.y1(d => yScale(d.price))
		.curve(d3.curveMonotoneX)

	// Line generator
	const line = d3.line()
		.x(d => xScale(d.date))
		.y(d => yScale(d.price))
		.curve(d3.curveMonotoneX)

	// Add area
	g.append("path")
		.datum(chartData.value)
		.attr("fill", "url(#priceGradient)")
		.attr("d", area)

	// Add line
	g.append("path")
		.datum(chartData.value)
		.attr("fill", "none")
		.attr("stroke", priceChange.value >= 0 ? "var(--green)" : "var(--red)")
		.attr("stroke-width", 2)
		.attr("d", line)

	// Add x-axis
	const xAxis = d3.axisBottom(xScale)
		.tickFormat(d3.timeFormat('%m/%d'))
		.ticks(5)

	g.append("g")
		.attr("transform", `translate(0,${height})`)
		.call(xAxis)
		.selectAll("text")
		.style("fill", "var(--txt-tertiary)")
		.style("font-size", "10px")

	g.selectAll(".domain, .tick line").style("stroke", "var(--op-10)")

	// Create tooltip
	const tooltip = d3.select(chartContainer.value)
		.append("div")
		.attr("class", "price-tooltip")
		.style("opacity", 0)
		.style("position", "absolute")
		.style("background", "var(--card-background)")
		.style("border", "1px solid var(--op-10)")
		.style("border-radius", "8px")
		.style("padding", "10px 14px")
		.style("font-size", "12px")
		.style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.15)")
		.style("pointer-events", "none")
		.style("z-index", "1000")

	// Focus elements
	const focus = g.append("g").style("opacity", 0)

	focus.append("circle")
		.attr("r", 5)
		.attr("fill", priceChange.value >= 0 ? "var(--green)" : "var(--red)")
		.attr("stroke", "var(--card-background)")
		.attr("stroke-width", 2)

	focus.append("line")
		.attr("class", "focus-line")
		.attr("stroke", "var(--op-15)")
		.attr("stroke-width", 1)
		.attr("stroke-dasharray", "4,4")

	const bisect = d3.bisector(d => d.date).left

	// Mouse interaction overlay
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

			const d = d1 && d0 ? (x0 - d0.date > d1.date - x0 ? d1 : d0) : (d0 || d1)

			const x = xScale(d.date)
			const y = yScale(d.price)

			focus.select("circle")
				.attr("cx", x)
				.attr("cy", y)

			focus.select(".focus-line")
				.attr("x1", x)
				.attr("x2", x)
				.attr("y1", 0)
				.attr("y2", height)

			const tooltipX = mouseX + margin.left + 15
			const tooltipY = y + margin.top - 20

			tooltip
				.style("left", tooltipX + "px")
				.style("top", tooltipY + "px")
				.html(`
					<div style="font-weight: 600; color: var(--txt-primary); margin-bottom: 4px;">
						$${d.price.toFixed(6)}
					</div>
					<div style="color: var(--txt-tertiary); font-size: 11px;">
						${d.formattedDate}
					</div>
				`)
		})
}

const handleTimeWindowChange = (newWindow) => {
	if (newWindow === timeWindow.value) return
	timeWindow.value = newWindow
	nextTick(() => buildChart())
}

const debouncedRedraw = () => {
	setTimeout(() => buildChart(), 100)
}

let refreshInterval = null

onMounted(() => {
	nextTick(() => {
		loadMarketData()
	})

	window.addEventListener("resize", debouncedRedraw)

	// Refresh every 5 minutes
	refreshInterval = setInterval(loadMarketData, 300000)
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
	<Flex direction="column" gap="12" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between">
			<Flex align="center" gap="8">
				<img
					:src="coinImage"
					alt="MON"
					:class="$style.token_icon"
				/>
				<Text size="13" weight="600" color="primary">MON Price</Text>
			</Flex>

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

		<!-- Price Display -->
		<Flex align="center" justify="between">
			<Flex align="end" gap="8">
				<template v-if="isLoading">
					<Skeleton w="100" h="24" />
				</template>
				<template v-else>
					<Text size="22" weight="700" color="primary">
						${{ currentPrice.toFixed(4) }}
					</Text>
					<Flex
						align="center"
						gap="3"
						:class="[$style.change_badge, priceChange >= 0 ? $style.positive : $style.negative]"
					>
						<Icon
							:name="priceChange >= 0 ? 'arrow-narrow-up' : 'arrow-down'"
							size="10"
							:color="priceChange >= 0 ? 'green' : 'red'"
						/>
						<Text
							size="11"
							weight="600"
							:color="priceChange >= 0 ? 'green' : 'red'"
						>
							{{ Math.abs(priceChange).toFixed(2) }}%
						</Text>
					</Flex>
				</template>
			</Flex>

			<!-- Market Cap -->
			<Flex align="center" gap="6">
				<Text size="11" color="tertiary">MCap:</Text>
				<template v-if="isLoading">
					<Skeleton w="60" h="12" />
				</template>
				<template v-else>
					<Text size="11" weight="600" color="secondary">
						${{ abbreviate(marketCap) }}
					</Text>
				</template>
			</Flex>
		</Flex>

		<!-- Chart -->
		<div ref="chartContainer" :class="$style.chart_container" />
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	padding: 12px 14px;
	box-shadow: inset 0 0 0 1px var(--op-3);
	min-height: 180px;
}

.token_icon {
	width: 20px;
	height: 20px;
	border-radius: 50%;
}

.change_badge {
	padding: 2px 6px;
	border-radius: 4px;

	&.positive {
		background: rgba(10, 219, 111, 0.15);
	}

	&.negative {
		background: rgba(255, 82, 82, 0.15);
	}
}

.chart_container {
	width: 100%;
	height: 100px;
	position: relative;
}

@media (max-width: 500px) {
	.wrapper {
		min-height: 160px;
	}

	.chart_container {
		height: 80px;
	}
}
</style>
