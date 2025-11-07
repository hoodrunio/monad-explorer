<script setup>
/** Vendor */
import { DateTime } from "luxon"
import * as d3 from "d3"
import { useDebounceFn } from "@vueuse/core"

/** Services */
import { abbreviate } from "@/services/utils"

const props = defineProps({
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
const gasUsageChartEl = ref()

/** Data */
// Optimized data processing with better memoization
const processedGasData = computed(() => {
	if (!props.gasHistory || props.gasHistory.length === 0) {
		return []
	}

	// More efficient data processing with early filtering
	// Note: New API returns market data, not gas-specific history
	// totalGasUsed will be "0" for all entries until dedicated gas history endpoint is available
	const processedData = []
	const maxItems = Math.min(14, props.gasHistory.length)

	for (let i = 0; i < maxItems; i++) {
		const item = props.gasHistory[i]
		const gasUsed = item.totalGasUsed && item.totalGasUsed !== "0"
			? parseInt(item.totalGasUsed)
			: 0

		// Skip items with no gas usage
		if (gasUsed > 0) {
			processedData.push({
				date: DateTime.fromISO(item.date).toJSDate(),
				value: gasUsed,
				txCount: item.transactionCount || 0
			})
		}
	}
	return processedData.reverse() // Reverse data to match reversed scale domain
})

// Cached max value computation for Y-axis
const maxGasValue = computed(() => {
	if (!processedGasData.value.length) return 0
	return Math.max(...processedGasData.value.map(d => d.value))
})

// Memoize data hash to avoid unnecessary rebuilds
const dataHash = computed(() => {
	if (!processedGasData.value.length) return 'empty'
	return `${processedGasData.value.length}-${maxGasValue.value}-${props.isLoading}`
})

/** Tooltip */
const showTooltip = ref(false)
const tooltipEl = ref()
const tooltipXOffset = ref(0)
const tooltipYOffset = ref(0)
const tooltipYDataOffset = ref(0)
const tooltipDynamicXPosition = ref(0)
const tooltipGasUsed = ref("")
const tooltipTxCount = ref("")

const badgeEl = ref()
const badgeText = ref("")
const badgeOffset = ref(0)

// Chart instance reference and cached dimensions
const chartInstance = ref(null)
const cachedDimensions = ref(null)

const buildChart = (chartEl, data, onEnter, onLeave) => {
	if (!data || data.length === 0) return
	
	// Use cached dimensions if available and valid
	let width, height
	if (cachedDimensions.value) {
		width = cachedDimensions.value.width
		height = cachedDimensions.value.height
	} else {
		const rect = chartWrapperEl.value.wrapper.getBoundingClientRect()
		width = rect.width
		height = 180
		cachedDimensions.value = { width, height }
	}
	
	const marginTop = 0
	const marginRight = 0
	const marginBottom = 24
	const marginLeft = 40

	const MAX_VALUE = d3.max(data, (d) => d.value) || 1

	/** Scale */
	const x = d3.scaleUtc(
		d3.extent(data, (d) => d.date), // Normal extent: oldest (left) to newest (right)
		[marginLeft, width - marginRight],
	)
	const y = d3.scaleLinear([0, MAX_VALUE], [height - marginBottom - 6, marginTop])
	const line = d3
		.line()
		.x((d) => x(d.date))
		.y((d) => y(d.value))

	/** Optimized tooltip */
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
		tooltipYOffset.value = event.layerY
		tooltipYDataOffset.value = y(point.value)
		tooltipGasUsed.value = point.value
		tooltipTxCount.value = point.txCount

		// Optimize tooltip positioning
		if (tooltipEl.value?.wrapper) {
			const tooltipWidth = tooltipEl.value.wrapper.getBoundingClientRect().width
			tooltipDynamicXPosition.value = validIdx > data.length / 2 
				? tooltipXOffset.value - tooltipWidth - 16
				: tooltipXOffset.value + 16
		}

		badgeText.value = DateTime.fromJSDate(point.date).toFormat("LLL dd")

		// Optimize badge positioning
		if (badgeEl.value) {
			const badgeWidth = badgeEl.value.getBoundingClientRect().width
			if (validIdx < 1) {
				badgeOffset.value = 0
			} else if (validIdx > data.length - 2) {
				badgeOffset.value = badgeWidth
			} else {
				badgeOffset.value = badgeWidth / 2
			}
		}
	}
	
	const onPointerleft = () => {
		onLeave()
		badgeText.value = ""
	}

	// Efficiently clear existing chart
	if (chartEl.firstChild) {
		chartEl.removeChild(chartEl.firstChild)
	}

	/** Optimized SVG Container */
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

	// Batch DOM operations for better performance
	const paths = [
		// Vertical lines
		`M${marginLeft},${height - marginBottom + 2} L${marginLeft},${height - marginBottom - 5}`,
		`M${width - 1},${height - marginBottom + 2} L${width - 1},${height - marginBottom - 5}`,
		// Horizontal line
		`M${0},${height - marginBottom - 6} L${width},${height - marginBottom - 6}`
	]

	// Add all grid lines at once
	svg.selectAll('.grid-line')
		.data(paths)
		.enter()
		.append("path")
		.attr("class", "grid-line")
		.attr("fill", "none")
		.attr("stroke", "var(--op-10)")
		.attr("stroke-width", 2)
		.attr("d", d => d)

	// Chart line (solid part)
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--brand)")
		.attr("stroke-width", 2)
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("d", line(data.slice(0, data.length - 1)))

	// Chart line (dashed part)
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--brand)")
		.attr("stroke-width", 2)
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("stroke-dasharray", "4")
		.attr("d", line(data.slice(data.length - 2, data.length)))

	// End point circle
	const lastPoint = data[data.length - 1]
	svg.append("circle")
		.attr("cx", x(lastPoint.date))
		.attr("cy", y(lastPoint.value))
		.attr("fill", "var(--brand)")
		.attr("r", 3)

	chartEl.appendChild(svg.node())
	chartInstance.value = svg
}

const buildGasUsageCharts = () => {
	if (props.isLoading || !gasUsageChartEl.value?.wrapper || !processedGasData.value.length) {
		return
	}
	
	buildChart(
		gasUsageChartEl.value.wrapper,
		processedGasData.value,
		() => (showTooltip.value = true),
		() => (showTooltip.value = false),
	)
}

// Single optimized watcher to prevent double rendering
const lastDataHash = ref('')
watch(
	dataHash,
	(newHash) => {
		if (newHash !== lastDataHash.value && !props.isLoading && processedGasData.value.length > 0) {
			lastDataHash.value = newHash
			nextTick(() => {
				buildGasUsageCharts()
			})
		}
	},
	{ immediate: false }
)

// Optimized resize handler with frame throttling
const debouncedRedraw = useDebounceFn(() => {
	// Clear cached dimensions on resize
	cachedDimensions.value = null
	buildGasUsageCharts()
}, 250)

// Intersection observer for performance optimization
const isVisible = ref(true)
let intersectionObserver

onMounted(() => {
	window.addEventListener("resize", debouncedRedraw)
	
	// Set up intersection observer for performance
	if ('IntersectionObserver' in window && chartWrapperEl.value?.wrapper) {
		intersectionObserver = new IntersectionObserver(
			(entries) => {
				isVisible.value = entries[0].isIntersecting
			},
			{ threshold: 0.1 }
		)
		intersectionObserver.observe(chartWrapperEl.value.wrapper)
	}
	
	nextTick(() => {
		if (processedGasData.value.length > 0 && !props.isLoading) {
			buildGasUsageCharts()
		}
	})
})

onBeforeUnmount(() => {
	window.removeEventListener("resize", debouncedRedraw)
	if (intersectionObserver) {
		intersectionObserver.disconnect()
	}
	chartInstance.value = null
	cachedDimensions.value = null
})

// Only rebuild when component becomes visible and has data
watch(isVisible, (visible) => {
	if (visible && processedGasData.value.length > 0 && !props.isLoading) {
		nextTick(() => {
			buildGasUsageCharts()
		})
	}
})
</script>

<template>
	<Flex direction="column" gap="24" wide>
		<Flex align="center" justify="between">
			<Flex align="center" gap="6">
				<Icon name="stars" size="13" color="primary" />
				<Text size="13" weight="600" color="primary">Gas Usage Trends</Text>
			</Flex>

			<Flex align="center" gap="12">
				<Flex align="center" gap="6">
					<div style="width: 10px; height: 3px; border-radius: 50px; background: var(--brand)" />
					<Text size="11" weight="600" color="tertiary">Daily Gas Used</Text>
				</Flex>
			</Flex>
		</Flex>

		<Flex v-if="isLoading" align="center" justify="center" :class="$style.loading">
			<Text size="13" weight="600" color="secondary">Loading gas usage data...</Text>
		</Flex>

		<Flex v-else-if="!gasHistory.length || !processedGasData.length" align="center" justify="center" :class="$style.no_data">
			<Flex direction="column" align="center" gap="8">
				<Icon name="stars" size="24" color="tertiary" />
				<Text size="13" weight="600" color="tertiary">Gas usage trends not available</Text>
				<Text size="11" weight="500" color="support">Historical gas data endpoint is not yet available in the new API</Text>
			</Flex>
		</Flex>

		<Flex v-else ref="chartWrapperEl" direction="column" :class="$style.chart_wrapper">
			<Flex direction="column" justify="between" :class="[$style.axis, $style.y]">
				<Text v-if="processedGasData.length" size="12" weight="600" color="tertiary">
					{{ abbreviate(maxGasValue) }}
				</Text>
				<Skeleton v-else w="32" h="12" />

				<Text v-if="processedGasData.length" size="12" weight="600" color="tertiary">
					{{ abbreviate(maxGasValue / 2) }}
				</Text>
				<Skeleton v-else w="24" h="12" />

				<Text v-if="processedGasData.length" size="12" weight="600" color="tertiary"> 0 </Text>
				<Skeleton v-else w="16" h="12" />
			</Flex>

			<Flex :class="[$style.axis, $style.x]">
				<Flex align="end" justify="between" wide>
					<Text size="12" weight="600" color="tertiary">
						{{ DateTime.now().minus({ days: 13 }).toFormat("LLL dd") }}
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
						:style="{ transform: `translate(${tooltipDynamicXPosition}px, ${tooltipYDataOffset - 60}px)` }"
						direction="column"
						gap="8"
						:class="$style.tooltip"
					>
						<Flex align="center" justify="between" gap="16">
							<Text size="12" weight="600" color="secondary">Gas Used</Text>
							<Text size="12" weight="600" color="primary">{{ abbreviate(tooltipGasUsed) }}</Text>
						</Flex>

						<Flex align="center" justify="between" gap="16">
							<Text size="12" weight="600" color="secondary">Transactions</Text>
							<Text size="12" weight="600" color="primary">{{ tooltipTxCount.toLocaleString() }}</Text>
						</Flex>
					</Flex>
				</div>
			</Transition>

			<Flex ref="gasUsageChartEl" :class="$style.chart" />
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
