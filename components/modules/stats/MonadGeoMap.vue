<script setup>
/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** Composables */
import { useGeoMapData } from "@/composables/useGeoMapData"
import { useGeoMapChart } from "@/composables/useGeoMapChart"

// Use the data composable
const {
	isLoading,
	hasError,
	geoMap,
	validatorLocationData,
	processMapData,
	loadGeoData
} = useGeoMapData()

// Use the chart composable
const { buildChart } = useGeoMapChart()

// Component state
const chartView = ref("countries")
const showValidatorLabels = ref(true)
const chartEl = ref()

const handleChangeChartView = () => {
	if (chartView.value === "countries") {
		chartView.value = "cities"
	} else {
		chartView.value = "countries"
	}
}

const toggleValidatorLabels = () => {
	showValidatorLabels.value = !showValidatorLabels.value
}

// Build chart when data is ready
const buildChartWrapper = async () => {
	if (chartEl.value?.wrapper && geoMap.value) {
		await buildChart(chartEl.value.wrapper, geoMap, validatorLocationData, chartView, showValidatorLabels)
	}
}

onMounted(async () => {
	await loadGeoData()
})

watch(
	() => chartView.value,
	async () => {
		await buildChartWrapper()
	},
)

watch(
	() => showValidatorLabels.value,
	async () => {
		await buildChartWrapper()
	},
)

// Watch for when chart element is ready and geo data is loaded
watch(
	[() => chartEl.value, geoMap],
	async () => {
		await buildChartWrapper()
	},
	{ flush: 'post' }
)
</script>

<template>
	<Flex direction="column" justify="start" gap="8" wide :class="$style.wrapper">
        <Flex
            @click="handleChangeChartView"
            align="center"
            gap="12"
            :class="$style.chart_selector"
            :style="{
                background: `linear-gradient(to ${chartView === 'countries' ? 'right' : 'left'}, var(--op-5) 50%, transparent 50%)`,
            }"
        >
            <Icon
                name="earth"
                size="14"
                :style="{ fill: `${chartView === 'countries' ? 'var(--mint)' : 'var(--txt-tertiary)'}` }"
            />

            <Icon
                name="city"
                size="14"
                :style="{ fill: `${chartView === 'cities' ? 'var(--mint)' : 'var(--txt-tertiary)'}` }"
            />
        </Flex>

        <!-- Validator Labels Toggle -->
        <Flex
            @click="toggleValidatorLabels"
            align="center"
            justify="center"
            :class="[$style.labels_toggle, { [$style.active]: showValidatorLabels }]"
            :title="showValidatorLabels ? 'Hide validator labels' : 'Show validator labels'"
        >
            <Icon
                name="eye"
                size="12"
                :style="{ fill: showValidatorLabels ? 'var(--mint)' : 'var(--txt-tertiary)' }"
            />
        </Flex>

        <Tooltip v-if="chartView === 'cities'" position="start" :class="$style.chart_info">
            <Icon name="info" size="16" color="yellow" />

            <template #content>
                <Flex align="center" gap="2" :style="{ width: '200px' }">
                    <Text size="12" weight="600" color="secondary">
                        City view shows validator distribution by specific locations
                    </Text>
                </Flex>
            </template>
        </Tooltip>
        
        <Flex ref="chartEl" :class="$style.chart" />

        <Flex v-if="isLoading" align="center" direction="column" gap="8" :class="$style.loader">
            <Text size="12" color="secondary">Loading Monad validator distribution...</Text>
        </Flex>

        <Flex v-else-if="hasError" align="center" direction="column" gap="8" :class="$style.loader">
            <Text size="12" color="red">Error loading validator distribution data</Text>
        </Flex>
	</Flex>
</template>

<style module>
.wrapper {
	width: 100%;
	height: 100%;
	position: relative;
}

.chart {
	width: 100%;
	height: 100%;
	overflow: hidden;

	& svg {
		overflow: visible;
	}
}

.chart_selector {
	width: 52px;
	position: absolute;
	top: 8px;
	right: 8px;
	padding: 4px 6px;
	box-shadow: inset 0 0 0 1px var(--op-10);
	border-radius: 5px;
	cursor: pointer;
	transition: all 1s ease-in-out;
}

.labels_toggle {
	width: 28px;
	height: 28px;
	position: absolute;
	top: 8px;
	right: 68px;
	padding: 6px;
	background: var(--op-5);
	box-shadow: inset 0 0 0 1px var(--op-10);
	border-radius: 50%;
	cursor: pointer;
	transition: all 0.3s ease;
}

.labels_toggle:hover {
	background: var(--op-10);
	box-shadow: inset 0 0 0 1px var(--op-20);
	transform: scale(1.05);
}

.labels_toggle.active {
	background: linear-gradient(135deg, var(--mint-op-20), var(--mint-op-10));
	box-shadow: inset 0 0 0 1px var(--mint-op-30), 0 2px 8px var(--mint-op-20);
}

.labels_toggle.active:hover {
	background: linear-gradient(135deg, var(--mint-op-30), var(--mint-op-20));
	box-shadow: inset 0 0 0 1px var(--mint-op-40), 0 4px 12px var(--mint-op-30);
}

.chart_info {
	position: absolute;
	top: 8px;
	left: 8px;
}

.loader {
	position: absolute;
	top: 30%;
	right: 50%;
	animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
	0% { opacity: 1; }
	50% { opacity: 0.4; }
	100% { opacity: 1; }
}

@media (max-width: 1000px) {
	.wrapper {
		max-width: initial;
		width: 100%;
	}
}
</style> 