<script setup>
/** Vendor */
import * as d3 from "d3"
import { DateTime } from "luxon"

/** Services */
import { abbreviate, comma } from "@/services/utils"

const props = defineProps({
	data: {
		type: Object,
		required: true,
	},
	timeWindow: {
		type: String,
		default: '24h',
	},
})

const chartContainer = ref(null)
const isLoading = ref(false)

const chartData = computed(() => {
	if (!props.data?.trends) return []
	
	return props.data.trends.map(item => ({
		...item,
		timestamp: new Date(item.timestamp),
		formattedTime: DateTime.fromISO(item.timestamp).toFormat('MMM dd HH:mm')
	}))
})

const isMounted = ref(false)

const buildChart = () => {
	if (!isMounted.value || !chartContainer.value || !chartData.value.length) return

	// Clear previous chart
	d3.select(chartContainer.value).selectAll("*").remove()

	const margin = { top: 20, right: 30, bottom: 40, left: 60 }
	const width = chartContainer.value.offsetWidth - margin.left - margin.right
	const height = 400 - margin.top - margin.bottom

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
		.domain([0, d3.max(chartData.value, d => d.totalTransactions)])
		.nice()
		.range([height, 0])

	const throughputScale = d3.scaleLinear()
		.domain([0, d3.max(chartData.value, d => d.avgTransactionsPerBlock)])
		.nice()
		.range([height, 0])

	// Axes
	const xAxis = d3.axisBottom(xScale)
		.tickFormat(d3.timeFormat('%H:%M'))
		.ticks(6)

	const yAxisLeft = d3.axisLeft(yScale)
		.tickFormat(d => abbreviate(d))
		.ticks(6)

	const yAxisRight = d3.axisRight(throughputScale)
		.tickFormat(d => comma(d, ",", 1))
		.ticks(6)

	g.append("g")
		.attr("transform", `translate(0,${height})`)
		.call(xAxis)
		.selectAll("text")
		.style("fill", "var(--txt-tertiary)")
		.style("font-size", "11px")

	g.append("g")
		.call(yAxisLeft)
		.selectAll("text")
		.style("fill", "var(--txt-tertiary)")
		.style("font-size", "11px")

	g.append("g")
		.attr("transform", `translate(${width},0)`)
		.call(yAxisRight)
		.selectAll("text")
		.style("fill", "var(--txt-tertiary)")
		.style("font-size", "11px")

	// Line generators
	const transactionLine = d3.line()
		.x(d => xScale(d.timestamp))
		.y(d => yScale(d.totalTransactions))
		.curve(d3.curveMonotoneX)

	const throughputLine = d3.line()
		.x(d => xScale(d.timestamp))
		.y(d => throughputScale(d.avgTransactionsPerBlock))
		.curve(d3.curveMonotoneX)

	// Add lines
	g.append("path")
		.datum(chartData.value)
		.attr("fill", "none")
		.attr("stroke", "var(--mint)")
		.attr("stroke-width", 2)
		.attr("d", transactionLine)

	g.append("path")
		.datum(chartData.value)
		.attr("fill", "none")
		.attr("stroke", "var(--orange)")
		.attr("stroke-width", 2)
		.attr("stroke-dasharray", "5,5")
		.attr("d", throughputLine)

	// Add dots for interaction
	g.selectAll(".dot-transactions")
		.data(chartData.value)
		.enter().append("circle")
		.attr("class", "dot-transactions")
		.attr("cx", d => xScale(d.timestamp))
		.attr("cy", d => yScale(d.totalTransactions))
		.attr("r", 3)
		.attr("fill", "var(--mint)")
		.style("opacity", 0)

	g.selectAll(".dot-throughput")
		.data(chartData.value)
		.enter().append("circle")
		.attr("class", "dot-throughput")
		.attr("cx", d => xScale(d.timestamp))
		.attr("cy", d => throughputScale(d.avgTransactionsPerBlock))
		.attr("r", 3)
		.attr("fill", "var(--orange)")
		.style("opacity", 0)

	// Tooltip
	const tooltip = d3.select("body").append("div")
		.attr("class", "d3-tooltip")
		.style("opacity", 0)
		.style("position", "absolute")
		.style("background", "var(--card-background)")
		.style("border", "1px solid var(--op-10)")
		.style("border-radius", "8px")
		.style("padding", "12px")
		.style("font-size", "12px")
		.style("z-index", "1000")

	// Add hover area
	g.append("rect")
		.attr("width", width)
		.attr("height", height)
		.style("fill", "none")
		.style("pointer-events", "all")
		.on("mouseover", () => tooltip.style("opacity", 1))
		.on("mouseout", () => {
			tooltip.style("opacity", 0)
			g.selectAll(".dot-transactions, .dot-throughput").style("opacity", 0)
		})
		.on("mousemove", function(event) {
			const [mouseX] = d3.pointer(event)
			const x0 = xScale.invert(mouseX)
			const bisect = d3.bisector(d => d.timestamp).left
			const i = bisect(chartData.value, x0, 1)
			const d0 = chartData.value[i - 1]
			const d1 = chartData.value[i]
			const d = x0 - d0.timestamp > d1.timestamp - x0 ? d1 : d0

			g.selectAll(".dot-transactions, .dot-throughput").style("opacity", 0)
			g.selectAll(".dot-transactions")
				.filter(dot => dot.timestamp.getTime() === d.timestamp.getTime())
				.style("opacity", 1)
			g.selectAll(".dot-throughput")
				.filter(dot => dot.timestamp.getTime() === d.timestamp.getTime())
				.style("opacity", 1)

			tooltip.html(`
				<div style="color: var(--txt-primary); font-weight: 600; margin-bottom: 8px;">
					${d.formattedTime}
				</div>
				<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
					<div style="width: 8px; height: 8px; background: var(--mint); border-radius: 50%;"></div>
					<span style="color: var(--txt-secondary);">Total Transactions:</span>
					<span style="color: var(--txt-primary); font-weight: 600;">${abbreviate(d.totalTransactions)}</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
					<div style="width: 8px; height: 8px; background: var(--orange); border-radius: 50%;"></div>
					<span style="color: var(--txt-secondary);">Avg Tx/Block:</span>
					<span style="color: var(--txt-primary); font-weight: 600;">${comma(d.avgTransactionsPerBlock, ",", 1)}</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<div style="width: 8px; height: 8px; background: var(--txt-tertiary); border-radius: 50%;"></div>
					<span style="color: var(--txt-secondary);">Active Validators:</span>
					<span style="color: var(--txt-primary); font-weight: 600;">${d.validatorCount}</span>
				</div>
			`)
			.style("left", (event.pageX + 10) + "px")
			.style("top", (event.pageY - 28) + "px")
		})

	// Add legend
	const legend = g.append("g")
		.attr("transform", `translate(${width - 200}, 20)`)

	legend.append("line")
		.attr("x1", 0)
		.attr("x2", 20)
		.attr("y1", 0)
		.attr("y2", 0)
		.attr("stroke", "var(--mint)")
		.attr("stroke-width", 2)

	legend.append("text")
		.attr("x", 25)
		.attr("y", 0)
		.attr("dy", "0.35em")
		.style("fill", "var(--txt-secondary)")
		.style("font-size", "11px")
		.text("Total Transactions")

	legend.append("line")
		.attr("x1", 0)
		.attr("x2", 20)
		.attr("y1", 15)
		.attr("y2", 15)
		.attr("stroke", "var(--orange)")
		.attr("stroke-width", 2)
		.attr("stroke-dasharray", "5,5")

	legend.append("text")
		.attr("x", 25)
		.attr("y", 15)
		.attr("dy", "0.35em")
		.style("fill", "var(--txt-secondary)")
		.style("font-size", "11px")
		.text("Avg Tx per Block")
}

const debouncedRedraw = () => {
	setTimeout(() => {
		buildChart()
	}, 100)
}

onMounted(() => {
	isMounted.value = true
	nextTick(() => {
		buildChart()
	})
	window.addEventListener("resize", debouncedRedraw)
})

onBeforeUnmount(() => {
	isMounted.value = false
	window.removeEventListener("resize", debouncedRedraw)
	// Clean up tooltip
	d3.select("body").selectAll(".d3-tooltip").remove()
})

watch(() => props.data, () => {
	if (isMounted.value) {
		buildChart()
	}
}, { deep: true })
</script>

<template>
	<Flex direction="column" :class="$style.wrapper">
		<Flex align="center" justify="between" :class="$style.header">
			<Text size="13" weight="600" color="secondary">
				Transaction Processing Trends
			</Text>
			<Text size="11" color="tertiary">
				{{ chartData.length }} data points
			</Text>
		</Flex>

		<div ref="chartContainer" :class="$style.chart_container" />
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	padding: 16px;
	box-shadow: inset 0 0 0 1px var(--op-3);
}

.header {
	margin-bottom: 16px;
}

.chart_container {
	width: 100%;
	min-height: 400px;
}

@media (max-width: 768px) {
	.chart_container {
		min-height: 300px;
	}
}
</style> 