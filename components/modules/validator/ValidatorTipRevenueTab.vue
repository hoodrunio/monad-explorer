<script setup>
/** Vendor */
import * as d3 from "d3"
import { DateTime } from "luxon"

/** Services */
import { comma } from "@/services/utils"

const props = defineProps({
	tipRevenue: {
		type: Object,
		default: null,
	},
	tipHistory: {
		type: Object,
		default: null,
	},
})

const chartContainer = ref(null)

const chartData = computed(() => {
	if (!props.tipHistory?.history?.length) return []

	return props.tipHistory.history.map(item => {
		// Parse SQL datetime format: "2025-11-25 15:00:00"
		const dateTime = DateTime.fromSQL(item.hour)

		return {
			...item,
			timestamp: dateTime.toJSDate(),
			formattedTime: dateTime.isValid ? dateTime.toFormat('MMM dd HH:mm') : 'Invalid Date'
		}
	})
})

const tipRevenueData = computed(() => {
	if (!props.tipRevenue) return null

	return {
		total24h: props.tipRevenue.tip_revenue?.total_mon || '0',
		rank: props.tipRevenue.rank || 'N/A',
		avgPerBlock: props.tipRevenue.tip_revenue?.avg_tip_per_block_mon || '0',
		avgPerTx: props.tipRevenue.tip_revenue?.avg_tip_per_tx_mon || '0',
		blocksProposed: props.tipRevenue.tip_revenue?.blocks_proposed || 0,
		totalTransactions: props.tipRevenue.tip_revenue?.total_transactions || 0,
		cumulativeTotal: props.tipRevenue.cumulative?.total_mon || '0',
		cumulativeBlocks: props.tipRevenue.cumulative?.total_blocks || 0,
	}
})

const buildChart = () => {
	if (!chartContainer.value || !chartData.value.length) return

	// Clear previous chart
	d3.select(chartContainer.value).selectAll("*").remove()

	const margin = { top: 20, right: 60, bottom: 40, left: 60 }
	const width = chartContainer.value.offsetWidth - margin.left - margin.right
	const height = 280 - margin.top - margin.bottom

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
		.domain([0, d3.max(chartData.value, d => d.totalTipMon) * 1.1])
		.nice()
		.range([height, 0])

	const blocksScale = d3.scaleLinear()
		.domain([0, d3.max(chartData.value, d => d.blocksProposed) * 1.1])
		.nice()
		.range([height, 0])

	// Axes
	const xAxis = d3.axisBottom(xScale)
		.tickFormat(d3.timeFormat('%H:%M'))
		.ticks(6)

	const yAxisLeft = d3.axisLeft(yScale)
		.tickFormat(d => comma(d, ",", 2))
		.ticks(5)

	const yAxisRight = d3.axisRight(blocksScale)
		.tickFormat(d => d.toFixed(0))
		.ticks(5)

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

	// Area under the line
	const area = d3.area()
		.x(d => xScale(d.timestamp))
		.y0(height)
		.y1(d => yScale(d.totalTipMon))
		.curve(d3.curveMonotoneX)

	g.append("path")
		.datum(chartData.value)
		.attr("fill", "var(--green)")
		.attr("fill-opacity", 0.1)
		.attr("d", area)

	// Bar chart for blocks
	const barWidth = Math.max(4, (width / chartData.value.length) - 2)
	g.selectAll(".bar")
		.data(chartData.value)
		.enter().append("rect")
		.attr("class", "bar")
		.attr("x", d => xScale(d.timestamp) - barWidth / 2)
		.attr("y", d => blocksScale(d.blocksProposed))
		.attr("width", barWidth)
		.attr("height", d => height - blocksScale(d.blocksProposed))
		.attr("fill", "var(--blue)")
		.attr("fill-opacity", 0.3)

	// Line generator
	const tipLine = d3.line()
		.x(d => xScale(d.timestamp))
		.y(d => yScale(d.totalTipMon))
		.curve(d3.curveMonotoneX)

	// Add line
	g.append("path")
		.datum(chartData.value)
		.attr("fill", "none")
		.attr("stroke", "var(--green)")
		.attr("stroke-width", 2)
		.attr("d", tipLine)

	// Add dots for interaction
	g.selectAll(".dot-tips")
		.data(chartData.value)
		.enter().append("circle")
		.attr("class", "dot-tips")
		.attr("cx", d => xScale(d.timestamp))
		.attr("cy", d => yScale(d.totalTipMon))
		.attr("r", 4)
		.attr("fill", "var(--green)")
		.style("opacity", 0)

	// Tooltip
	const tooltip = d3.select("body").append("div")
		.attr("class", "d3-tooltip-validator-tip")
		.style("opacity", 0)
		.style("position", "absolute")
		.style("background", "var(--card-background)")
		.style("border", "1px solid var(--op-10)")
		.style("border-radius", "8px")
		.style("padding", "12px")
		.style("font-size", "12px")
		.style("z-index", "1000")
		.style("pointer-events", "none")

	// Add hover area
	g.append("rect")
		.attr("width", width)
		.attr("height", height)
		.style("fill", "none")
		.style("pointer-events", "all")
		.on("mouseover", () => tooltip.style("opacity", 1))
		.on("mouseout", () => {
			tooltip.style("opacity", 0)
			g.selectAll(".dot-tips").style("opacity", 0)
		})
		.on("mousemove", function(event) {
			const [mouseX] = d3.pointer(event)
			const x0 = xScale.invert(mouseX)
			const bisect = d3.bisector(d => d.timestamp).left
			const i = bisect(chartData.value, x0, 1)
			if (i <= 0 || i >= chartData.value.length) return
			const d0 = chartData.value[i - 1]
			const d1 = chartData.value[i]
			if (!d0 || !d1) return
			const d = x0 - d0.timestamp > d1.timestamp - x0 ? d1 : d0

			g.selectAll(".dot-tips").style("opacity", 0)
			g.selectAll(".dot-tips")
				.filter(dot => dot.timestamp.getTime() === d.timestamp.getTime())
				.style("opacity", 1)

			tooltip.html(`
				<div style="color: var(--txt-primary); font-weight: 600; font-size: 12px; margin-bottom: 8px;">
					${d.formattedTime}
				</div>
				<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
					<div style="width: 6px; height: 6px; background: var(--green); border-radius: 50%;"></div>
					<span style="color: var(--txt-tertiary); font-size: 11px;">Tips:</span>
					<span style="color: var(--txt-primary); font-weight: 600; font-size: 11px;">${comma(d.totalTipMon, ",", 2)} MON</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
					<div style="width: 6px; height: 6px; background: var(--blue); border-radius: 50%;"></div>
					<span style="color: var(--txt-tertiary); font-size: 11px;">Blocks:</span>
					<span style="color: var(--txt-primary); font-weight: 600; font-size: 11px;">${d.blocksProposed}</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<div style="width: 6px; height: 6px; background: var(--orange); border-radius: 50%;"></div>
					<span style="color: var(--txt-tertiary); font-size: 11px;">Avg/Block:</span>
					<span style="color: var(--txt-primary); font-weight: 600; font-size: 11px;">${comma(d.avgTipPerBlockMon, ",", 4)} MON</span>
				</div>
			`)
			.style("left", (event.pageX + 10) + "px")
			.style("top", (event.pageY - 28) + "px")
		})

	// Add legend
	const legend = g.append("g")
		.attr("transform", `translate(${width - 150}, -10)`)

	legend.append("line")
		.attr("x1", 0)
		.attr("x2", 20)
		.attr("y1", 0)
		.attr("y2", 0)
		.attr("stroke", "var(--green)")
		.attr("stroke-width", 2)

	legend.append("text")
		.attr("x", 25)
		.attr("y", 0)
		.attr("dy", "0.35em")
		.style("fill", "var(--txt-secondary)")
		.style("font-size", "11px")
		.text("Tips")

	legend.append("rect")
		.attr("x", 60)
		.attr("y", -5)
		.attr("width", 10)
		.attr("height", 10)
		.attr("fill", "var(--blue)")
		.attr("fill-opacity", 0.5)

	legend.append("text")
		.attr("x", 75)
		.attr("y", 0)
		.attr("dy", "0.35em")
		.style("fill", "var(--txt-secondary)")
		.style("font-size", "11px")
		.text("Blocks")
}

const formatMon = (value, decimals = 2) => {
	if (!value) return '0'
	const num = parseFloat(value)
	return comma(num, ",", decimals)
}

const debouncedRedraw = () => {
	setTimeout(() => {
		buildChart()
	}, 100)
}

onMounted(() => {
	buildChart()
	window.addEventListener("resize", debouncedRedraw)
})

onBeforeUnmount(() => {
	window.removeEventListener("resize", debouncedRedraw)
	d3.select("body").selectAll(".d3-tooltip-validator-tip").remove()
})

watch(() => props.tipHistory, () => {
	buildChart()
}, { deep: true })
</script>

<template>
	<Flex direction="column" gap="16">
		<!-- Summary Cards -->
		<Flex v-if="tipRevenueData" gap="8" :class="$style.summary_cards">
			<Flex direction="column" gap="6" :class="$style.card">
				<Text size="11" weight="500" color="tertiary">Tips (24h)</Text>
				<Text size="14" weight="600" color="green">{{ formatMon(tipRevenueData.total24h) }} MON</Text>
			</Flex>
			<Flex direction="column" gap="6" :class="$style.card">
				<Text size="11" weight="500" color="tertiary">Rank</Text>
				<Text size="14" weight="600" color="primary">#{{ tipRevenueData.rank }}</Text>
			</Flex>
			<Flex direction="column" gap="6" :class="$style.card">
				<Text size="11" weight="500" color="tertiary">Avg / Block</Text>
				<Text size="14" weight="600" color="secondary">{{ formatMon(tipRevenueData.avgPerBlock, 4) }} MON</Text>
			</Flex>
			<Flex direction="column" gap="6" :class="$style.card">
				<Text size="11" weight="500" color="tertiary">Avg / Tx</Text>
				<Text size="14" weight="600" color="secondary">{{ formatMon(tipRevenueData.avgPerTx, 4) }} MON</Text>
			</Flex>
		</Flex>

		<!-- Chart -->
		<Flex direction="column" :class="$style.chart_section">
			<Flex align="center" :class="$style.chart_header">
				<Text size="12" weight="600" color="secondary">History (24h)</Text>
			</Flex>
			<div ref="chartContainer" :class="$style.chart_container" />
		</Flex>

		<!-- All-Time Stats -->
		<Flex v-if="tipRevenueData" direction="column" gap="12" :class="$style.cumulative_section">
			<Text size="12" weight="600" color="secondary">All-Time</Text>
			<Flex gap="8" :class="$style.cumulative_cards">
				<Flex direction="column" gap="6" :class="$style.cumulative_card">
					<Text size="11" weight="500" color="tertiary">Total Tips</Text>
					<Text size="13" weight="600" color="primary">{{ formatMon(tipRevenueData.cumulativeTotal) }} MON</Text>
				</Flex>
				<Flex direction="column" gap="6" :class="$style.cumulative_card">
					<Text size="11" weight="500" color="tertiary">Total Blocks</Text>
					<Text size="13" weight="600" color="primary">{{ comma(tipRevenueData.cumulativeBlocks) }}</Text>
				</Flex>
				<Flex direction="column" gap="6" :class="$style.cumulative_card">
					<Text size="11" weight="500" color="tertiary">Blocks (24h)</Text>
					<Text size="13" weight="600" color="primary">{{ comma(tipRevenueData.blocksProposed) }}</Text>
				</Flex>
				<Flex direction="column" gap="6" :class="$style.cumulative_card">
					<Text size="11" weight="500" color="tertiary">Transactions (24h)</Text>
					<Text size="13" weight="600" color="primary">{{ comma(tipRevenueData.totalTransactions) }}</Text>
				</Flex>
			</Flex>
		</Flex>

		<!-- No Data State -->
		<Flex v-if="!tipRevenueData && !chartData.length" direction="column" gap="12" align="center" :class="$style.no_data">
			<Icon name="coins" size="24" color="tertiary" />
			<Text size="12" weight="500" color="tertiary">No tip revenue data available</Text>
		</Flex>
	</Flex>
</template>

<style module>
.summary_cards {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 8px;
}

.card {
	padding: 12px;
	border: 1px solid var(--op-5);
	border-radius: 8px;
	background: var(--op-3);
}

.chart_section {
	background: var(--op-3);
	border: 1px solid var(--op-5);
	border-radius: 8px;
	padding: 16px;
}

.chart_header {
	margin-bottom: 8px;
}

.chart_container {
	width: 100%;
	min-height: 260px;
}

.cumulative_section {
	padding: 12px;
	background: var(--op-3);
	border: 1px solid var(--op-5);
	border-radius: 8px;
}

.cumulative_cards {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 8px;
}

.cumulative_card {
	padding: 10px 12px;
	background: var(--op-5);
	border-radius: 6px;
}

.no_data {
	padding: 32px 20px;
	text-align: center;
	border: 1px dashed var(--op-8);
	border-radius: 8px;
}

@media (max-width: 768px) {
	.summary_cards {
		grid-template-columns: repeat(2, 1fr);
	}

	.cumulative_cards {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 500px) {
	.summary_cards {
		grid-template-columns: 1fr;
	}

	.cumulative_cards {
		grid-template-columns: 1fr;
	}

	.chart_container {
		min-height: 200px;
	}
}
</style>
