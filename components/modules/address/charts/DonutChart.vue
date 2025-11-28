<script setup>
import * as d3 from "d3"

const props = defineProps({
	data: {
		type: Array,
		required: true,
		// Expected format: [{ label: 'MON', value: 1000, color: '#18d2a5' }, ...]
	},
	size: {
		type: Number,
		default: 120,
	},
	thickness: {
		type: Number,
		default: 16,
	},
})

const chartEl = ref(null)

const buildChart = () => {
	if (!chartEl.value || !props.data.length) return

	// Clear existing chart
	d3.select(chartEl.value).selectAll("*").remove()

	const width = props.size
	const height = props.size
	const radius = Math.min(width, height) / 2
	const innerRadius = radius - props.thickness

	// Create SVG
	const svg = d3
		.select(chartEl.value)
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("transform", `translate(${width / 2}, ${height / 2})`)

	// Create pie generator
	const pie = d3
		.pie()
		.value((d) => d.value)
		.sort(null)
		.padAngle(0.02)

	// Create arc generator
	const arc = d3
		.arc()
		.innerRadius(innerRadius)
		.outerRadius(radius)
		.cornerRadius(3)

	// Create arcs
	const arcs = svg
		.selectAll("arc")
		.data(pie(props.data))
		.enter()
		.append("g")

	// Draw paths with animation
	arcs
		.append("path")
		.attr("fill", (d) => d.data.color)
		.attr("opacity", 0.9)
		.transition()
		.duration(800)
		.attrTween("d", function (d) {
			const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d)
			return function (t) {
				return arc(interpolate(t))
			}
		})

	// Add hover effect
	arcs
		.selectAll("path")
		.on("mouseenter", function () {
			d3.select(this).transition().duration(200).attr("opacity", 1).attr("transform", "scale(1.05)")
		})
		.on("mouseleave", function () {
			d3.select(this).transition().duration(200).attr("opacity", 0.9).attr("transform", "scale(1)")
		})
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
	<div ref="chartEl" :class="$style.chart" :style="{ width: `${size}px`, height: `${size}px` }" />
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
