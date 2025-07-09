<script setup>
/** Vendor */
import { DateTime } from "luxon"
import * as d3 from "d3"
import { useDebounceFn } from "@vueuse/core"

/** Services */
import { truncate } from "@/services/utils"
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

/** Chart El */
const chartWrapperEl = ref()
const gasPriceChartEl = ref()

/** Data */
const gasPriceSeries = ref([])

/** Tooltip */
const showTooltip = ref(false)
const tooltipEl = ref()
const tooltipXOffset = ref(0)
const tooltipYOffset = ref(0)
const tooltipYDataOffset = ref(0)
const tooltipDynamicXPosition = ref(0)
const tooltipText = ref("")

const badgeEl = ref()
const badgeText = ref("")
const badgeOffset = ref(0)

const buildChart = (chartEl, data, onEnter, onLeave) => {
	if (!data || data.length === 0) return
	
	const width = chartWrapperEl.value.wrapper.getBoundingClientRect().width
	const height = 180
	const marginTop = 0
	const marginRight = 0
	const marginBottom = 24
	const marginLeft = 40

	const MAX_VALUE = d3.max(data, (d) => d.value) ? d3.max(data, (d) => d.value) : 1

	/** Scale */
	const x = d3.scaleUtc(
		d3.extent(data, (d) => d.date), // Extent: oldest (left) to newest (right)
		[marginLeft, width - marginRight],
	)
	const y = d3.scaleLinear([0, MAX_VALUE], [height - marginBottom - 6, marginTop])
	const line = d3
		.line()
		.x((d) => x(d.date))
		.y((d) => y(d.value))

	/** Tooltip */
	const bisect = d3.bisector((d) => d.date).center
	const onPointermoved = (event) => {
		onEnter()

		// Now that scale is correctly set up, use bisector normally
		const mouseX = d3.pointer(event)[0]
		const invertedDate = x.invert(mouseX)
		const idx = bisect(data, invertedDate)
		const validIdx = Math.max(0, Math.min(idx, data.length - 1))
		const point = data[validIdx]

		tooltipXOffset.value = x(point.date)
		tooltipYDataOffset.value = y(point.value)
		tooltipYOffset.value = event.layerY
		tooltipText.value = point.value

		if (tooltipEl.value) {
			if (validIdx > 12) {
				tooltipDynamicXPosition.value = tooltipXOffset.value - tooltipEl.value.wrapper.getBoundingClientRect().width - 16
			} else {
				tooltipDynamicXPosition.value = tooltipXOffset.value + 16
			}
		}

		badgeText.value = DateTime.fromJSDate(point.date).toFormat("LLL dd")

		if (!badgeEl.value) return
		if (validIdx < 1) {
			badgeOffset.value = 0
		} else if (validIdx > data.length - 2) {
			badgeOffset.value = badgeEl.value.getBoundingClientRect().width
		} else {
			badgeOffset.value = badgeEl.value.getBoundingClientRect().width / 2
		}
	}
	const onPointerleft = () => {
		onLeave()
		badgeText.value = ""
	}

	/** SVG Container */
	const svg = d3
		.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height])
		.attr("preserveAspectRatio", "none")
		.attr("style", "max-width: 100%;")
		.style("-webkit-tap-highlight-color", "transparent")
		.on("pointerenter pointermove", onPointermoved)
		.on("pointerleave", onPointerleft)
		.on("touchstart", (event) => event.preventDefault())

	/** Vertical Lines */
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--op-10)")
		.attr("stroke-width", 2)
		.attr("d", `M${marginLeft},${height - marginBottom + 2} L${marginLeft},${height - marginBottom - 5}`)
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--op-10)")
		.attr("stroke-width", 2)
		.attr("d", `M${width - 1},${height - marginBottom + 2} L${width - 1},${height - marginBottom - 5}`)

	/** Default Horizontal Line  */
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--op-10)")
		.attr("stroke-width", 2)
		.attr("d", `M${0},${height - marginBottom - 6} L${width},${height - marginBottom - 6}`)

	/** Chart Line */
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--brand)")
		.attr("stroke-width", 2)
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("d", line(data.slice(0, data.length - 1)))
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--brand)")
		.attr("stroke-width", 2)
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("stroke-dasharray", "4")
		.attr("d", line(data.slice(data.length - 2, data.length)))

	svg.append("circle")
		.attr("cx", x(data[data.length - 1].date))
		.attr("cy", y(data[data.length - 1].value))
		.attr("fill", "var(--brand)")
		.attr("r", 3)

	if (chartEl.children[0]) chartEl.children[0].remove()
	chartEl.append(svg.node())
}

const processGasHistoryData = () => {
	if (!props.gasHistory || props.gasHistory.length === 0) {
		gasPriceSeries.value = []
		return
	}

	// Process gas history data from analytics API
	gasPriceSeries.value = props.gasHistory
		.slice(0, props.selectedPeriod.value)
		.map(item => ({
			date: DateTime.fromISO(item.date).toJSDate(),
			value: convertFromWei(item.averageGasPrice, 9) // Convert to gwei
		}))
		.filter(item => item.value > 0) // Filter out empty days
		.reverse() // Reverse to show oldest to newest (left to right)
}

const buildGasTrackingCharts = () => {
	if (props.isLoading) return
	
	processGasHistoryData()
	
	if (gasPriceSeries.value.length > 0) {
		buildChart(
			gasPriceChartEl.value.wrapper,
			gasPriceSeries.value,
			() => (showTooltip.value = true),
			() => (showTooltip.value = false),
		)
	}
}

watch(
	() => [props.selectedPeriod, props.gasHistory, props.isLoading],
	() => {
		buildGasTrackingCharts()
	},
	{ deep: true }
)

const debouncedRedraw = useDebounceFn((e) => {
	buildGasTrackingCharts()
}, 500)

onMounted(async () => {
	window.addEventListener("resize", debouncedRedraw)
	buildGasTrackingCharts()
})

onBeforeUnmount(() => {
	window.removeEventListener("resize", debouncedRedraw)
})
</script>

<template>
	<Flex direction="column" gap="24" wide>
		<Flex v-if="isLoading" align="center" justify="center" :class="$style.loading">
			<Text size="13" weight="600" color="secondary">Loading gas price history...</Text>
		</Flex>
		
		<Flex v-else-if="!gasHistory.length" align="center" justify="center" :class="$style.no_data">
			<Text size="13" weight="600" color="tertiary">No gas price data available</Text>
		</Flex>
		
		<Flex v-else ref="chartWrapperEl" direction="column" :class="$style.chart_wrapper">
			<Flex direction="column" justify="between" :class="[$style.axis, $style.y]">
				<Text v-if="gasPriceSeries.length" size="12" weight="600" color="tertiary">
					{{ truncate(Math.max(...gasPriceSeries.map((d) => d.value))) }}
				</Text>
				<Skeleton v-else w="32" h="12" />

				<Text v-if="gasPriceSeries.length" size="12" weight="600" color="tertiary">
					{{ truncate(Math.max(...gasPriceSeries.map((d) => d.value)) / 2) }}
				</Text>
				<Skeleton v-else w="24" h="12" />

				<Text v-if="gasPriceSeries.length" size="12" weight="600" color="tertiary"> 0 </Text>
				<Skeleton v-else w="16" h="12" />
			</Flex>

			<Flex :class="[$style.axis, $style.x]">
				<Flex align="end" justify="between" wide>
					<Text size="12" weight="600" color="tertiary">
						{{
							DateTime.now()
								.minus({ days: props.selectedPeriod.value - 1 })
								.toFormat("LLL dd")
						}}
					</Text>

					<Text size="12" weight="600" color="tertiary">Today</Text>
				</Flex>
			</Flex>

			<Transition name="fastfade">
				<div v-if="showTooltip" :class="$style.tooltip_wrapper">
					<div :style="{ transform: `translate(${tooltipXOffset - 3}px, ${tooltipYDataOffset - 4}px)` }" :class="$style.dot" />
					<div :style="{ transform: `translateX(${tooltipXOffset}px)` }" :class="$style.line" />
					<div ref="badgeEl" :style="{ transform: `translateX(${tooltipXOffset - badgeOffset}px)` }" :class="$style.badge">
						<Text size="12" weight="600" color="secondary">
							{{ badgeText }}
						</Text>
					</div>
					<Flex
						ref="tooltipEl"
						:style="{ transform: `translate(${tooltipDynamicXPosition}px, ${tooltipYDataOffset - 40}px)` }"
						direction="column"
						gap="8"
						:class="$style.tooltip"
					>
						<Flex align="center" gap="16">
							<Text size="12" weight="600" color="secondary">Price</Text>
							<Text size="12" weight="600" color="primary"> {{ tooltipText.toFixed(6) }} gwei</Text>
						</Flex>
					</Flex>
				</div>
			</Transition>

			<Flex ref="gasPriceChartEl" :class="$style.chart" />
		</Flex>
	</Flex>
</template>

<style module>
.loading,
.no_data {
	height: 180px;
}

.chart_wrapper {
	position: relative;
	height: 180px;
}

.chart {
	position: absolute;

	& svg {
		overflow: visible;
	}
}

.axis {
	position: absolute;
	top: 0;
	right: 0;

	&.x {
		bottom: 6px;
		left: 40px;
	}

	&.y {
		bottom: 34px;
		left: 0;
	}
}

.tooltip_wrapper {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;

	& .dot {
		width: 6px;
		height: 6px;
		border-radius: 50px;
		background: var(--brand);

		box-shadow: 0 0 0 4px rgba(10, 222, 113, 27%);

		transition: all 0.15s ease;
	}

	& .line {
		position: absolute;
		top: 0;
		bottom: 32px;

		border-left: 1px dashed var(--op-10);

		transition: all 0.15s ease;
	}

	& .badge {
		position: absolute;
		bottom: 4px;

		background: var(--card-background);

		transition: all 0.15s ease;
	}

	& .tooltip {
		position: absolute;
		z-index: 10;

		background: var(--card-background);
		border-radius: 6px;
		box-shadow: inset 0 0 0 1px var(--op-5), 0 14px 34px rgba(0, 0, 0, 15%), 0 4px 14px rgba(0, 0, 0, 5%);

		padding: 8px;
	}
}
</style>
