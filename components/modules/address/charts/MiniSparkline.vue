<script setup>
import * as d3 from "d3"

const props = defineProps({
	data: {
		type: Array,
		required: true,
		// Expected format: [{ date: Date, value: Number }, ...]
	},
	width: {
		type: Number,
		default: 100,
	},
	height: {
		type: Number,
		default: 32,
	},
	color: {
		type: String,
		default: "var(--brand)",
	},
	showArea: {
		type: Boolean,
		default: true,
	},
})

const chartEl = ref(null)

const buildChart = () => {
	if (!chartEl.value || !props.data.length) return

	// Clear existing chart
	d3.select(chartEl.value).selectAll("*").remove()

	const width = props.width
	const height = props.height
	const margin = { top: 2, right: 2, bottom: 2, left: 2 }

	const innerWidth = width - margin.left - margin.right
	const innerHeight = height - margin.top - margin.bottom

	// Create SVG
	const svg = d3
		.select(chartEl.value)
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("transform", `translate(${margin.left}, ${margin.top})`)

	// Scales
	const xScale = d3
		.scaleTime()
		.domain(d3.extent(props.data, (d) => d.date))
		.range([0, innerWidth])

	const yScale = d3
		.scaleLinear()
		.domain([0, d3.max(props.data, (d) => d.value) || 1])
		.range([innerHeight, 0])

	// Line generator
	const line = d3
		.line()
		.x((d) => xScale(d.date))
		.y((d) => yScale(d.value))
		.curve(d3.curveMonotoneX)

	// Area generator (for gradient fill)
	if (props.showArea) {
		const area = d3
			.area()
			.x((d) => xScale(d.date))
			.y0(innerHeight)
			.y1((d) => yScale(d.value))
			.curve(d3.curveMonotoneX)

		// Create gradient
		const gradient = svg
			.append("defs")
			.append("linearGradient")
			.attr("id", "sparkline-gradient")
			.attr("x1", "0%")
			.attr("y1", "0%")
			.attr("x2", "0%")
			.attr("y2", "100%")

		gradient.append("stop").attr("offset", "0%").attr("stop-color", props.color).attr("stop-opacity", 0.3)

		gradient.append("stop").attr("offset", "100%").attr("stop-color", props.color).attr("stop-opacity", 0)

		// Draw area
		svg.append("path").datum(props.data).attr("fill", "url(#sparkline-gradient)").attr("d", area)
	}

	// Draw line with animation
	const path = svg
		.append("path")
		.datum(props.data)
		.attr("fill", "none")
		.attr("stroke", props.color)
		.attr("stroke-width", 1.5)
		.attr("stroke-linecap", "round")
		.attr("d", line)

	// Animate line
	const pathLength = path.node().getTotalLength()
	path
		.attr("stroke-dasharray", pathLength)
		.attr("stroke-dashoffset", pathLength)
		.transition()
		.duration(600)
		.ease(d3.easeLinear)
		.attr("stroke-dashoffset", 0)

	// Add end point
	const lastPoint = props.data[props.data.length - 1]
	svg
		.append("circle")
		.attr("cx", xScale(lastPoint.date))
		.attr("cy", yScale(lastPoint.value))
		.attr("r", 2.5)
		.attr("fill", props.color)
		.attr("opacity", 0)
		.transition()
		.delay(600)
		.duration(200)
		.attr("opacity", 1)
}

watch(
	() => props.data,
	() => {
		buildChart()
	},
	{ deep: true },
)

onMounted(() => {
	buildChart()
})
</script>

<template>
	<div ref="chartEl" :class="$style.chart" :style="{ width: `${width}px`, height: `${height}px` }" />
</template>

<style module>
.chart {
	display: flex;
	align-items: center;
	justify-content: center;
}

.chart :global(svg) {
	overflow: visible;
}
</style>
