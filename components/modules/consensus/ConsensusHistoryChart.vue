<script setup>
import * as d3 from "d3"
import { DateTime } from "luxon"
import { useConsensusHistory } from "@/composables/useConsensusPolling"
import { formatPercentage } from "@/services/utils/consensus"

const { data: historyData, isLoading, isError } = useConsensusHistory(30)

const chartEl = ref()
const tooltip = ref({
	data: null,
	show: false,
	x: 0,
	y: 0,
})

const chartData = computed(() => {
	if (!historyData.value || historyData.value.length === 0) return []

	return historyData.value.map((round) => ({
		date: new Date(round.ts),
		stakeRatio: round.stake_ratio || 0,
		signedCount: round.signed_count || 0,
		round: round.round || 0,
		epoch: round.epoch || 0,
	}))
})

const buildChart = () => {
	if (!chartEl.value || chartData.value.length === 0) return

	// Clear previous chart
	d3.select(chartEl.value).selectAll("*").remove()

	const { width, height } = chartEl.value.getBoundingClientRect()
	const marginTop = 20
	const marginRight = 20
	const marginBottom = 40
	const marginLeft = 50

	// Scales
	const x = d3.scaleUtc(
		d3.extent(chartData.value, (d) => d.date),
		[marginLeft, width - marginRight]
	)

	const y = d3.scaleLinear(
		[0, Math.max(100, d3.max(chartData.value, (d) => d.stakeRatio))],
		[height - marginBottom, marginTop]
	)

	// Line generator
	const line = d3
		.line()
		.x((d) => x(d.date))
		.y((d) => y(d.stakeRatio))
		.curve(d3.curveMonotoneX)

	// SVG container
	const svg = d3
		.select(chartEl.value)
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height])
		.attr("style", "max-width: 100%;")

	// Grid lines
	svg
		.append("g")
		.attr("class", "grid")
		.attr("transform", `translate(0,${height - marginBottom})`)
		.call(
			d3
				.axisBottom(x)
				.ticks(5)
				.tickSize(-(height - marginTop - marginBottom))
				.tickFormat("")
		)
		.style("stroke-dasharray", "2,2")
		.style("stroke", "var(--op-5)")
		.style("stroke-width", "1px")

	svg
		.append("g")
		.attr("class", "grid")
		.attr("transform", `translate(${marginLeft},0)`)
		.call(
			d3
				.axisLeft(y)
				.ticks(5)
				.tickSize(-(width - marginLeft - marginRight))
				.tickFormat("")
		)
		.style("stroke-dasharray", "2,2")
		.style("stroke", "var(--op-5)")
		.style("stroke-width", "1px")

	// X axis
	svg
		.append("g")
		.attr("transform", `translate(0,${height - marginBottom})`)
		.call(
			d3
				.axisBottom(x)
				.ticks(5)
				.tickFormat((d) => DateTime.fromJSDate(d).toFormat("HH:mm"))
		)
		.style("color", "var(--txt-tertiary)")
		.style("font-size", "11px")

	// Y axis
	svg
		.append("g")
		.attr("transform", `translate(${marginLeft},0)`)
		.call(
			d3
				.axisLeft(y)
				.ticks(5)
				.tickFormat((d) => `${d}%`)
		)
		.style("color", "var(--txt-tertiary)")
		.style("font-size", "11px")

	// Line path
	svg
		.append("path")
		.datum(chartData.value)
		.attr("fill", "none")
		.attr("stroke", "var(--blue)")
		.attr("stroke-width", 2)
		.attr("d", line)

	// Area under line
	const area = d3
		.area()
		.x((d) => x(d.date))
		.y0(height - marginBottom)
		.y1((d) => y(d.stakeRatio))
		.curve(d3.curveMonotoneX)

	svg
		.append("path")
		.datum(chartData.value)
		.attr("fill", "url(#gradient)")
		.attr("d", area)

	// Gradient
	const gradient = svg
		.append("defs")
		.append("linearGradient")
		.attr("id", "gradient")
		.attr("x1", "0%")
		.attr("y1", "0%")
		.attr("x2", "0%")
		.attr("y2", "100%")

	gradient.append("stop").attr("offset", "0%").attr("stop-color", "var(--blue)").attr("stop-opacity", 0.3)

	gradient.append("stop").attr("offset", "100%").attr("stop-color", "var(--blue)").attr("stop-opacity", 0)

	// Dots for data points
	svg
		.selectAll("dot")
		.data(chartData.value)
		.enter()
		.append("circle")
		.attr("cx", (d) => x(d.date))
		.attr("cy", (d) => y(d.stakeRatio))
		.attr("r", 4)
		.attr("fill", "var(--blue)")
		.attr("stroke", "var(--card-background)")
		.attr("stroke-width", 2)
		.style("cursor", "pointer")
		.on("mouseenter", function (event, d) {
			d3.select(this).attr("r", 6)

			tooltip.value = {
				data: d,
				show: true,
				x: event.pageX,
				y: event.pageY,
			}
		})
		.on("mouseleave", function () {
			d3.select(this).attr("r", 4)

			tooltip.value = {
				data: null,
				show: false,
				x: 0,
				y: 0,
			}
		})
}

watch(chartData, () => {
	nextTick(() => {
		buildChart()
	})
})

onMounted(() => {
	buildChart()

	// Rebuild on window resize
	window.addEventListener("resize", buildChart)
})

onUnmounted(() => {
	window.removeEventListener("resize", buildChart)
})
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between">
			<Flex align="center" gap="8">
				<Icon name="activity" size="16" color="secondary" />
				<Text size="14" weight="600" color="primary">
					Recent History
				</Text>
			</Flex>

			<Text v-if="!isLoading && chartData.length > 0" size="11" weight="500" color="tertiary">
				Last {{ chartData.length }} rounds
			</Text>
		</Flex>

		<!-- Loading state -->
		<Flex v-if="isLoading" justify="center" :class="$style.loading">
			<Text size="12" weight="500" color="tertiary">
				Loading history data...
			</Text>
		</Flex>

		<!-- Error state -->
		<Flex v-else-if="isError" align="center" gap="8" :class="$style.error">
			<Icon name="close" size="14" color="red" />
			<Text size="12" weight="500" color="red">
				Failed to load history data
			</Text>
		</Flex>

		<!-- Empty state -->
		<Flex v-else-if="chartData.length === 0" direction="column" gap="8" align="center" :class="$style.empty">
			<Text size="13" weight="600" color="secondary">
				No history data available
			</Text>
		</Flex>

		<!-- Chart -->
		<div v-else ref="chartEl" :class="$style.chart" />

		<!-- Tooltip -->
		<Teleport to="body">
			<div
				v-if="tooltip.show && tooltip.data"
				:class="$style.tooltip"
				:style="{
					left: `${tooltip.x + 10}px`,
					top: `${tooltip.y - 60}px`,
				}"
			>
				<Flex direction="column" gap="6">
					<Text size="11" weight="600" color="primary">
						Epoch {{ tooltip.data.epoch }} • Round {{ tooltip.data.round }}
					</Text>
					<Flex direction="column" gap="2">
						<Text size="12" weight="500" color="secondary">
							Stake Ratio: {{ formatPercentage(tooltip.data.stakeRatio) }}
						</Text>
						<Text size="12" weight="500" color="secondary">
							Signed: {{ tooltip.data.signedCount }}
						</Text>
					</Flex>
					<Text size="10" weight="400" color="tertiary">
						{{ DateTime.fromJSDate(tooltip.data.date).toFormat("yyyy-MM-dd HH:mm:ss") }}
					</Text>
				</Flex>
			</div>
		</Teleport>
	</Flex>
</template>

<style module>
.wrapper {
	border-radius: 8px;
	background: var(--card-background);
	padding: 20px 24px;
}

.loading,
.empty {
	padding: 32px 16px;
}

.error {
	padding: 16px;
	border-radius: 6px;
	background: rgba(239, 68, 68, 0.1);
	border: 1px solid rgba(239, 68, 68, 0.3);
}

.chart {
	width: 100%;
	height: 300px;
	position: relative;
}

.tooltip {
	position: fixed;
	z-index: 9999;
	padding: 12px 16px;
	border-radius: 8px;
	background: var(--card-background);
	border: 1px solid var(--op-10);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	pointer-events: none;
	max-width: 250px;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}

	.chart {
		height: 250px;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 12px;
	}

	.chart {
		height: 200px;
	}
}
</style>
