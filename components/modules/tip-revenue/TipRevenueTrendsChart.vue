<script setup>
/** Vendor */
import * as d3 from "d3"
import { DateTime } from "luxon"

/** Services */
import { comma } from "@/services/utils"

const props = defineProps({
	data: {
		type: Array,
		required: true,
	},
	loading: {
		type: Boolean,
		default: false,
	},
	timeLabel: {
		type: String,
		default: '24 Hours',
	},
})

const chartContainer = ref(null)

const chartData = computed(() => {
	if (!props.data?.length) return []

	return props.data.map(item => {
		// Parse SQL datetime format: "2025-11-25 15:00:00"
		const dateTime = DateTime.fromSQL(item.hour)

		return {
			...item,
			timestamp: dateTime.toJSDate(),
			formattedTime: dateTime.isValid ? dateTime.toFormat('MMM dd HH:mm') : 'Invalid Date'
		}
	})
})

const buildChart = () => {
	if (!chartContainer.value || !chartData.value.length) return

	// Clear previous chart
	d3.select(chartContainer.value).selectAll("*").remove()

	const margin = { top: 20, right: 60, bottom: 40, left: 60 }
	const width = chartContainer.value.offsetWidth - margin.left - margin.right
	const height = 300 - margin.top - margin.bottom

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

	const avgScale = d3.scaleLinear()
		.domain([0, d3.max(chartData.value, d => d.avgTipPerBlockMon) * 1.1])
		.nice()
		.range([height, 0])

	// Axes - adapt format based on time range
	const getXAxisFormat = () => {
		if (props.timeLabel.includes('7') || props.timeLabel.includes('30')) {
			return d3.timeFormat('%b %d')
		}
		return d3.timeFormat('%H:%M')
	}

	const xAxis = d3.axisBottom(xScale)
		.tickFormat(getXAxisFormat())
		.ticks(6)

	const yAxisLeft = d3.axisLeft(yScale)
		.tickFormat(d => comma(d, ",", 2))
		.ticks(6)

	const yAxisRight = d3.axisRight(avgScale)
		.tickFormat(d => comma(d, ",", 3))
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

	// Axis labels
	g.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", -45)
		.attr("x", -height / 2)
		.attr("text-anchor", "middle")
		.style("fill", "var(--mint)")
		.style("font-size", "10px")
		.text("Total Tips (MON)")

	g.append("text")
		.attr("transform", "rotate(90)")
		.attr("y", -width - 45)
		.attr("x", height / 2)
		.attr("text-anchor", "middle")
		.style("fill", "var(--orange)")
		.style("font-size", "10px")
		.text("Avg Tip/Block (MON)")

	// Area under the line
	const area = d3.area()
		.x(d => xScale(d.timestamp))
		.y0(height)
		.y1(d => yScale(d.totalTipMon))
		.curve(d3.curveMonotoneX)

	g.append("path")
		.datum(chartData.value)
		.attr("fill", "var(--mint)")
		.attr("fill-opacity", 0.1)
		.attr("d", area)

	// Line generators
	const tipLine = d3.line()
		.x(d => xScale(d.timestamp))
		.y(d => yScale(d.totalTipMon))
		.curve(d3.curveMonotoneX)

	const avgLine = d3.line()
		.x(d => xScale(d.timestamp))
		.y(d => avgScale(d.avgTipPerBlockMon))
		.curve(d3.curveMonotoneX)

	// Add lines
	g.append("path")
		.datum(chartData.value)
		.attr("fill", "none")
		.attr("stroke", "var(--mint)")
		.attr("stroke-width", 2)
		.attr("d", tipLine)

	g.append("path")
		.datum(chartData.value)
		.attr("fill", "none")
		.attr("stroke", "var(--orange)")
		.attr("stroke-width", 2)
		.attr("stroke-dasharray", "5,5")
		.attr("d", avgLine)

	// Add dots for interaction
	g.selectAll(".dot-tips")
		.data(chartData.value)
		.enter().append("circle")
		.attr("class", "dot-tips")
		.attr("cx", d => xScale(d.timestamp))
		.attr("cy", d => yScale(d.totalTipMon))
		.attr("r", 4)
		.attr("fill", "var(--mint)")
		.style("opacity", 0)

	g.selectAll(".dot-avg")
		.data(chartData.value)
		.enter().append("circle")
		.attr("class", "dot-avg")
		.attr("cx", d => xScale(d.timestamp))
		.attr("cy", d => avgScale(d.avgTipPerBlockMon))
		.attr("r", 4)
		.attr("fill", "var(--orange)")
		.style("opacity", 0)

	// Tooltip
	const tooltip = d3.select("body").append("div")
		.attr("class", "d3-tooltip-tip-revenue")
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
			g.selectAll(".dot-tips, .dot-avg").style("opacity", 0)
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

			g.selectAll(".dot-tips, .dot-avg").style("opacity", 0)
			g.selectAll(".dot-tips")
				.filter(dot => dot.timestamp.getTime() === d.timestamp.getTime())
				.style("opacity", 1)
			g.selectAll(".dot-avg")
				.filter(dot => dot.timestamp.getTime() === d.timestamp.getTime())
				.style("opacity", 1)

			tooltip.html(`
				<div style="color: var(--txt-primary); font-weight: 600; margin-bottom: 8px;">
					${d.formattedTime}
				</div>
				<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
					<div style="width: 8px; height: 8px; background: var(--mint); border-radius: 50%;"></div>
					<span style="color: var(--txt-secondary);">Total Tips:</span>
					<span style="color: var(--txt-primary); font-weight: 600;">${comma(d.totalTipMon, ",", 2)} MON</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
					<div style="width: 8px; height: 8px; background: var(--orange); border-radius: 50%;"></div>
					<span style="color: var(--txt-secondary);">Avg Tip/Block:</span>
					<span style="color: var(--txt-primary); font-weight: 600;">${comma(d.avgTipPerBlockMon, ",", 4)} MON</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
					<div style="width: 8px; height: 8px; background: var(--txt-tertiary); border-radius: 50%;"></div>
					<span style="color: var(--txt-secondary);">Blocks:</span>
					<span style="color: var(--txt-primary); font-weight: 600;">${comma(d.totalBlocks)}</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<div style="width: 8px; height: 8px; background: var(--blue); border-radius: 50%;"></div>
					<span style="color: var(--txt-secondary);">Active Validators:</span>
					<span style="color: var(--txt-primary); font-weight: 600;">${d.activeValidators}</span>
				</div>
			`)
			.style("left", (event.pageX + 10) + "px")
			.style("top", (event.pageY - 28) + "px")
		})

	// Add legend
	const legend = g.append("g")
		.attr("transform", `translate(${width - 180}, -10)`)

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
		.text("Total Tips")

	legend.append("line")
		.attr("x1", 90)
		.attr("x2", 110)
		.attr("y1", 0)
		.attr("y2", 0)
		.attr("stroke", "var(--orange)")
		.attr("stroke-width", 2)
		.attr("stroke-dasharray", "5,5")

	legend.append("text")
		.attr("x", 115)
		.attr("y", 0)
		.attr("dy", "0.35em")
		.style("fill", "var(--txt-secondary)")
		.style("font-size", "11px")
		.text("Avg/Block")
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
	// Clean up tooltip
	d3.select("body").selectAll(".d3-tooltip-tip-revenue").remove()
})

watch(() => props.data, () => {
	buildChart()
}, { deep: true })
</script>

<template>
	<!-- Loading Skeleton -->
	<Flex v-if="loading" direction="column" :class="$style.wrapper">
		<Flex align="center" justify="between" :class="$style.header">
			<div :class="$style.skeleton_title" />
			<div :class="$style.skeleton_subtitle" />
		</Flex>
		<div :class="$style.skeleton_chart" />
	</Flex>

	<!-- Content -->
	<Flex v-else direction="column" :class="$style.wrapper">
		<Flex align="center" justify="between" :class="$style.header">
			<Text size="13" weight="600" color="secondary">
				Tip Revenue Trends ({{ timeLabel }})
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
	min-height: 300px;
}

.skeleton_title {
	width: 180px;
	height: 16px;
	background: var(--op-5);
	border-radius: 4px;
	animation: pulse 1.5s ease-in-out infinite;
}

.skeleton_subtitle {
	width: 80px;
	height: 12px;
	background: var(--op-5);
	border-radius: 4px;
	animation: pulse 1.5s ease-in-out infinite;
}

.skeleton_chart {
	width: 100%;
	height: 300px;
	background: var(--op-3);
	border-radius: 8px;
	animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

@media (max-width: 768px) {
	.chart_container {
		min-height: 250px;
	}
}
</style>
